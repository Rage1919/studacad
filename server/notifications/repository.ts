import "server-only";
import { getDatabaseAdminClient } from "../db/client";
import type { Viewer } from "../auth/viewer";
import { readRuntimeEnvironment } from "../runtime-env.mjs";
import { renderNotification } from "./templates.mjs";
import { sendNotificationEmail } from "./provider.mjs";

export class NotificationError extends Error {
  constructor(
    message: string,
    readonly status = 500,
  ) {
    super(message);
    this.name = "NotificationError";
  }
}
const fail = (error: { message?: string } | null, message: string) => {
  throw new NotificationError(
    error?.message?.includes("Essential notifications")
      ? "Essential notifications cannot be disabled."
      : message,
    error?.message?.includes("Essential notifications") ? 400 : 500,
  );
};

export async function getNotificationCenter(viewer: Viewer) {
  const db = getDatabaseAdminClient();
  const [notifications, preferences] = await Promise.all([
    db
      .from("notifications")
      .select("*")
      .eq("user_id", viewer.id)
      .eq("channel", "in_app")
      .lte("scheduled_for", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(100),
    db.from("notification_preferences").select("*").eq("user_id", viewer.id),
  ]);
  if (notifications.error || preferences.error)
    fail(
      notifications.error ?? preferences.error,
      "Unable to load notifications.",
    );
  const saved = new Map(
    (preferences.data ?? []).map((item) => [item.category, item.enabled]),
  );
  return {
    notifications: notifications.data ?? [],
    preferences: {
      bookingReminderEmail: saved.get("booking_reminder") ?? true,
      newMessageEmail: saved.get("new_message") ?? true,
    },
  };
}

export async function updateNotificationPreferences(
  viewer: Viewer,
  input: { bookingReminderEmail: boolean; newMessageEmail: boolean },
) {
  const db = getDatabaseAdminClient();
  for (const [category, enabled] of [
    ["booking_reminder", input.bookingReminderEmail],
    ["new_message", input.newMessageEmail],
  ] as const) {
    const result = await db.rpc("set_notification_preference", {
      p_user: viewer.id,
      p_category: category,
      p_channel: "email",
      p_enabled: enabled,
    });
    if (result.error)
      fail(result.error, "Unable to update notification preferences.");
  }
  return getNotificationCenter(viewer);
}

export async function markNotificationRead(viewer: Viewer, id: string) {
  const result = await getDatabaseAdminClient().rpc("mark_notification_read", {
    p_user: viewer.id,
    p_id: id,
  });
  if (result.error)
    fail(result.error, "Unable to mark this notification read.");
  if (!result.data) throw new NotificationError("Notification not found.", 404);
  return true;
}

export async function deliverNotifications(limit = 50) {
  const db = getDatabaseAdminClient();
  const claimToken = crypto.randomUUID();
  const claimed = await db.rpc("claim_notifications", {
    p_limit: limit,
    p_claim_token: claimToken,
  });
  if (claimed.error)
    fail(claimed.error, "Unable to claim notification deliveries.");
  const rows = claimed.data ?? [];
  const userIds = [...new Set(rows.map((item) => item.user_id))];
  const accounts = userIds.length
    ? await db.from("user_accounts").select("*").in("id", userIds)
    : { data: [], error: null };
  if (accounts.error)
    fail(accounts.error, "Unable to load notification recipients.");
  const byId = new Map(
    (accounts.data ?? []).map((account) => [account.id, account]),
  );
  let sent = 0,
    retried = 0;
  for (const notification of rows) {
    const account = byId.get(notification.user_id);
    try {
      if (!account)
        throw Object.assign(new Error("recipient_missing"), {
          retryable: false,
        });
      if (notification.channel === "in_app") {
        const completed = await db.rpc("complete_notification", {
          p_id: notification.id,
          p_claim_token: claimToken,
          p_outcome: "sent",
          p_provider_message_id: null,
          p_error: null,
        });
        if (completed.error) throw new Error("completion_failed");
        sent += 1;
        continue;
      }
      const rendered = renderNotification(notification.template_key, {
        recipientName: account.display_name,
        appUrl: readRuntimeEnvironment(process.env).appUrl,
      });
      const result = await sendNotificationEmail({
        endpoint: process.env.NOTIFICATION_EMAIL_ENDPOINT,
        token: process.env.NOTIFICATION_EMAIL_TOKEN,
        to: account.email,
        ...rendered,
        idempotencyKey: notification.idempotency_key,
        notificationId: notification.id,
        userId: notification.user_id,
      });
      const completed = await db.rpc("complete_notification", {
        p_id: notification.id,
        p_claim_token: claimToken,
        p_outcome: "sent",
        p_provider_message_id: result.providerMessageId,
        p_error: null,
      });
      if (completed.error) throw new Error("completion_failed");
      sent += 1;
    } catch (error) {
      const code = error instanceof Error ? error.message : "provider_failure";
      const completed = await db.rpc("complete_notification", {
        p_id: notification.id,
        p_claim_token: claimToken,
        p_outcome: "retry",
        p_provider_message_id: null,
        p_error: code,
      });
      if (completed.error)
        fail(completed.error, "Unable to record notification failure.");
      retried += 1;
    }
  }
  return { claimed: rows.length, sent, retried };
}

export async function getNotificationFailures() {
  const db = getDatabaseAdminClient();
  const [deadLetters, suppressions] = await Promise.all([
    db
      .from("notifications")
      .select("*")
      .not("dead_lettered_at", "is", null)
      .order("dead_lettered_at", { ascending: false })
      .limit(200),
    db
      .from("notification_suppressions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200),
  ]);
  if (deadLetters.error || suppressions.error)
    fail(
      deadLetters.error ?? suppressions.error,
      "Unable to load notification failures.",
    );
  return {
    deadLetters: deadLetters.data ?? [],
    suppressions: suppressions.data ?? [],
  };
}

export async function applyEmailProviderEvent(event: {
  eventId: string;
  type: "delivered" | "bounce" | "complaint";
  notificationId: string;
  userId: string;
  providerMessageId: string;
}) {
  const db = getDatabaseAdminClient();
  const notification = await db
    .from("notifications")
    .select("*")
    .eq("id", event.notificationId)
    .eq("user_id", event.userId)
    .eq("channel", "email")
    .maybeSingle();
  if (notification.error || !notification.data)
    throw new NotificationError("Notification delivery not found.", 404);
  if (
    notification.data.provider_message_id &&
    notification.data.provider_message_id !== event.providerMessageId
  )
    throw new NotificationError("Provider message mismatch.", 409);
  if (event.type === "delivered") {
    const updated = await db
      .from("notifications")
      .update({
        delivered_at: new Date().toISOString(),
        delivery_disposition: "delivered",
      })
      .eq("id", event.notificationId);
    if (updated.error) fail(updated.error, "Unable to record email delivery.");
  } else {
    const reason = event.type;
    const suppression = await db
      .from("notification_suppressions")
      .upsert(
        {
          user_id: event.userId,
          channel: "email",
          reason,
          provider_event_id: event.eventId,
        },
        { onConflict: "user_id,channel" },
      );
    if (suppression.error)
      fail(suppression.error, "Unable to suppress failed email delivery.");
    const updated = await db
      .from("notifications")
      .update({
        failure_reason: reason,
        delivery_disposition: "provider_suppressed",
      })
      .eq("id", event.notificationId);
    if (updated.error)
      fail(updated.error, "Unable to record email suppression.");
  }
  return { type: event.type, suppressed: event.type !== "delivered" };
}

export function notificationErrorResponse(error: unknown) {
  if (error instanceof NotificationError)
    return Response.json(
      { error: error.message },
      {
        status: error.status,
        headers: { "Cache-Control": "private, no-store" },
      },
    );
  throw error;
}
