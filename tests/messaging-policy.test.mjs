import assert from "node:assert/strict";
import test from "node:test";
import {
  messageRetryDelaySeconds,
  normalizeMessageRequest,
  normalizeModerationRequest,
  normalizeWhatsAppStatus,
} from "../server/messages/policy.mjs";
import { messageWorkerAuthorized } from "../server/messages/internal-auth.mjs";
import {
  readWhatsAppConfiguration,
  WhatsAppProvider,
  WhatsAppProviderError,
  whatsappConfigurationAvailable,
} from "../server/messages/whatsapp-provider.mjs";

const configuration = {
  accessToken: "token",
  phoneNumberId: "123456",
  graphVersion: "v23.0",
};
const response = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

test("message and moderation inputs reject spoofed or oversized values", () => {
  assert.deepEqual(
    normalizeMessageRequest({
      tutorId: " Masego ",
      text: " Hello ",
      clientMessageId: "client-msg-001",
    }).errors,
    [],
  );
  assert.ok(
    normalizeMessageRequest({
      tutorId: "masego",
      text: "x".repeat(2001),
      clientMessageId: "bad key",
    }).errors.length >= 2,
  );
  assert.deepEqual(
    normalizeModerationRequest({
      action: "report",
      messageId: "10000000-0000-4000-8000-000000000001",
      reason: "Abusive content",
    }).errors,
    [],
  );
  assert.ok(
    normalizeModerationRequest({ action: "report", reason: "no" }).errors
      .length >= 2,
  );
});

test("WhatsApp configuration and worker authorization fail closed", () => {
  assert.equal(whatsappConfigurationAvailable({}), false);
  assert.throws(
    () =>
      readWhatsAppConfiguration({
        WHATSAPP_ACCESS_TOKEN: "token",
        WHATSAPP_PHONE_NUMBER_ID: "bad",
        WHATSAPP_GRAPH_VERSION: "latest",
      }),
    (error) =>
      error instanceof WhatsAppProviderError &&
      error.code === "configuration_missing",
  );
  const secret = "w".repeat(32);
  assert.equal(messageWorkerAuthorized(`Bearer ${secret}`, secret), true);
  assert.equal(messageWorkerAuthorized("Bearer wrong", secret), false);
});

test("WhatsApp delivery validates provider success and classifies failures", async () => {
  const sent = new WhatsAppProvider(configuration, async () =>
    response(200, { messages: [{ id: "wamid.test" }] }),
  );
  assert.equal(
    (await sent.sendText("+26771234567", "Hello")).providerMessageId,
    "wamid.test",
  );
  const retry = new WhatsAppProvider(configuration, async () =>
    response(503, {}),
  );
  await assert.rejects(
    retry.sendText("+26771234567", "Hello"),
    (error) => error instanceof WhatsAppProviderError && error.retryable,
  );
  const unknown = new WhatsAppProvider(configuration, async () => {
    throw new Error("network");
  });
  await assert.rejects(
    unknown.sendText("+26771234567", "Hello"),
    (error) => error instanceof WhatsAppProviderError && error.resultUnknown,
  );
  assert.equal(messageRetryDelaySeconds(1), 30);
  assert.equal(normalizeWhatsAppStatus("delivered"), "delivered");
  assert.equal(normalizeWhatsAppStatus("spoofed"), null);
});
