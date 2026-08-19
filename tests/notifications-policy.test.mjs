import assert from "node:assert/strict";
import test from "node:test";
import {
  renderNotification,
  notificationTemplateKeys,
} from "../server/notifications/templates.mjs";
import {
  notificationEmailConfigurationAvailable,
  sendNotificationEmail,
} from "../server/notifications/provider.mjs";
import { notificationWorkerAuthorized } from "../server/notifications/internal-auth.mjs";

test("transactional template catalog covers required events without sensitive content", () => {
  for (const key of [
    "auth.verification",
    "auth.recovery",
    "tutor_application.approved",
    "booking.confirmed",
    "booking.rescheduled",
    "booking.cancelled",
    "booking.reminder_24h",
    "booking.reminder_1h",
    "meeting.ready",
    "message.received",
    "payment.deposit_recorded",
    "booking.refunded",
    "payout.paid",
  ])
    assert.ok(notificationTemplateKeys.includes(key), key);
  for (const key of notificationTemplateKeys) {
    const rendered = renderNotification(key, {
      recipientName: "<Learner>",
      appUrl: "https://studacad.com",
    });
    assert.match(rendered.html, /&lt;Learner&gt;/);
    assert.doesNotMatch(
      `${rendered.text}${rendered.html}`,
      /meet\.google\.com|account number|password reset token/i,
    );
  }
});

test("email gateway is HTTPS, idempotent, validated, and fails closed", async () => {
  assert.equal(notificationEmailConfigurationAvailable({}), false);
  assert.equal(
    notificationEmailConfigurationAvailable({
      NOTIFICATION_EMAIL_ENDPOINT: "https://email.example",
      NOTIFICATION_EMAIL_TOKEN: "secret",
    }),
    true,
  );
  let request;
  const result = await sendNotificationEmail({
    endpoint: "https://email.example/send",
    token: "secret",
    to: "learner@example.test",
    subject: "Subject",
    text: "Text",
    html: "<p>Text</p>",
    idempotencyKey: "notification-1",
    notificationId: "10000000-0000-4000-8000-000000000001",
    userId: "10000000-0000-4000-8000-000000000002",
    fetchImpl: async (url, init) => {
      request = { url: String(url), init };
      return new Response(JSON.stringify({ id: "provider-1" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    },
  });
  assert.equal(result.providerMessageId, "provider-1");
  assert.equal(request.init.headers["Idempotency-Key"], "notification-1");
  assert.doesNotMatch(JSON.stringify(request), /password|meet\.google/);
  await assert.rejects(
    sendNotificationEmail({
      endpoint: "http://email.example",
      token: "secret",
      to: "a@b.test",
      subject: "x",
      text: "x",
      html: "x",
      idempotencyKey: "x",
      notificationId: "x",
      userId: "x",
    }),
    /invalid_endpoint/,
  );
  assert.equal(
    notificationWorkerAuthorized(
      "Bearer sufficiently-long-worker-secret",
      "sufficiently-long-worker-secret",
    ),
    true,
  );
});
