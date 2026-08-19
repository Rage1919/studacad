import "server-only";
import { getDatabaseAdminClient } from "../db/client";
import { appendAuditEvent } from "../db/repositories/audit-events";
import type { Viewer } from "../auth/viewer";
import type { MessageDelivery } from "../db/models";
import {
  createWhatsAppProvider,
  WhatsAppProviderError,
  whatsappConfigurationAvailable,
} from "./whatsapp-provider.mjs";
import {
  messageRetryDelaySeconds,
  normalizeWhatsAppStatus,
} from "./policy.mjs";

export class MessagingError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
    this.name = "MessagingError";
  }
}

const databaseError = (
  error: { message?: string } | null,
  fallback: string,
) => {
  const message = error?.message ?? "";
  const safe = [
    "Tutor not found",
    "You cannot message yourself",
    "Active account required",
    "Conversation not found",
    "Conversation is unavailable",
    "Messaging is blocked for this conversation",
    "Message must be between 1 and 2000 characters",
    "Invalid message idempotency key",
    "Message idempotency key was already used",
  ].find((candidate) => message.includes(candidate));
  if (safe)
    return new MessagingError(
      safe,
      safe.includes("not found")
        ? 404
        : safe.includes("blocked") || safe.includes("required")
          ? 403
          : 409,
    );
  return new MessagingError(fallback, 500);
};

export async function listMessagesForViewer(
  viewer: Viewer,
  tutorSlug?: string,
) {
  const database = getDatabaseAdminClient();
  const participantRows = await database
    .from("conversation_participants")
    .select("*")
    .eq("user_id", viewer.id)
    .is("left_at", null);
  if (participantRows.error)
    throw databaseError(participantRows.error, "Unable to load conversations.");
  const conversationIds = participantRows.data.map(
    (item) => item.conversation_id,
  );
  if (!conversationIds.length) return [];
  const conversations = await database
    .from("conversations")
    .select("*")
    .in("id", conversationIds)
    .order("updated_at", { ascending: false });
  if (conversations.error)
    throw databaseError(conversations.error, "Unable to load conversations.");
  const profileIds = conversations.data.flatMap((item) =>
    item.tutor_profile_id ? [item.tutor_profile_id] : [],
  );
  const profiles = profileIds.length
    ? await database.from("tutor_profiles").select("*").in("id", profileIds)
    : { data: [], error: null };
  if (profiles.error)
    throw databaseError(profiles.error, "Unable to load conversation tutors.");
  const tutorUserIds = profiles.data.map((profile) => profile.tutor_user_id);
  const accounts = tutorUserIds.length
    ? await database.from("user_accounts").select("*").in("id", tutorUserIds)
    : { data: [], error: null };
  if (accounts.error)
    throw databaseError(accounts.error, "Unable to load conversation tutors.");
  const profilesById = new Map(
    profiles.data.map((profile) => [profile.id, profile]),
  );
  const accountsById = new Map(
    accounts.data.map((account) => [account.id, account]),
  );
  const selectedConversations = conversations.data.filter((conversation) => {
    if (!tutorSlug) return true;
    return (
      profilesById.get(conversation.tutor_profile_id ?? "")?.slug === tutorSlug
    );
  });
  if (!selectedConversations.length) return [];
  const selectedIds = selectedConversations.map((item) => item.id);
  const messages = await database
    .from("messages")
    .select("*")
    .in("conversation_id", selectedIds)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });
  if (messages.error)
    throw databaseError(messages.error, "Unable to load messages.");
  const messageIds = messages.data.map((message) => message.id);
  const deliveries = messageIds.length
    ? await database
        .from("message_deliveries")
        .select("*")
        .in("message_id", messageIds)
    : { data: [], error: null };
  if (deliveries.error)
    throw databaseError(deliveries.error, "Unable to load delivery states.");
  const deliveriesByMessage = new Map(
    deliveries.data.map((delivery) => [delivery.message_id, delivery]),
  );
  const conversationsById = new Map(
    selectedConversations.map((conversation) => [
      conversation.id,
      conversation,
    ]),
  );
  return messages.data.map((message) => {
    const conversation = conversationsById.get(message.conversation_id)!;
    const profile = profilesById.get(conversation.tutor_profile_id ?? "");
    const tutor = profile ? accountsById.get(profile.tutor_user_id) : null;
    const delivery = deliveriesByMessage.get(message.id);
    return {
      id: message.id,
      conversationId: message.conversation_id,
      tutorId: profile?.slug ?? "support",
      tutorName: tutor?.display_name ?? "Studacad support",
      text:
        message.moderation_status === "removed"
          ? "This message was removed by moderation."
          : message.body,
      direction: message.sender_user_id === viewer.id ? "outbound" : "inbound",
      channel: message.channel,
      status: message.status,
      providerStatus: delivery?.status ?? null,
      createdAt: message.created_at,
      canReport:
        message.sender_user_id !== viewer.id &&
        message.moderation_status !== "removed",
    };
  });
}

export async function sendMessage(input: {
  viewer: Viewer;
  tutorSlug: string;
  conversationId: string;
  text: string;
  clientMessageId: string;
}) {
  const database = getDatabaseAdminClient();
  let conversationId = input.conversationId;
  if (!conversationId) {
    const started = await database.rpc("start_tutor_conversation", {
      p_actor_user_id: input.viewer.id,
      p_tutor_slug: input.tutorSlug,
    });
    if (started.error)
      throw databaseError(started.error, "Unable to start the conversation.");
    conversationId = started.data;
  }
  const sent = await database.rpc("send_conversation_message", {
    p_actor_user_id: input.viewer.id,
    p_conversation_id: conversationId,
    p_body: input.text,
    p_client_idempotency_key: input.clientMessageId,
  });
  if (sent.error)
    throw databaseError(sent.error, "Unable to send the message.");
  const delivery = await database
    .from("message_deliveries")
    .select("*")
    .eq("message_id", sent.data)
    .maybeSingle();
  if (delivery.error)
    throw databaseError(delivery.error, "Unable to load message delivery.");
  if (delivery.data && !whatsappConfigurationAvailable(process.env)) {
    await database
      .from("message_deliveries")
      .update({
        status: "failed",
        last_error_code: "configuration_missing",
        failed_at: new Date().toISOString(),
      })
      .eq("id", delivery.data.id)
      .eq("status", "queued");
  }
  await appendAuditEvent({
    actorUserId: input.viewer.id,
    action: "message.sent",
    entityType: "message",
    entityId: sent.data,
    metadata: { conversationId, whatsappQueued: Boolean(delivery.data) },
  });
  const visible = await listMessagesForViewer(
    input.viewer,
    input.tutorSlug || undefined,
  );
  return visible.find((message) => message.id === sent.data) ?? null;
}

async function conversationOtherUser(viewerId: string, conversationId: string) {
  const database = getDatabaseAdminClient();
  const own = await database
    .from("conversation_participants")
    .select("*")
    .eq("conversation_id", conversationId)
    .eq("user_id", viewerId)
    .is("left_at", null)
    .maybeSingle();
  if (own.error || !own.data)
    throw new MessagingError("Conversation not found.", 404);
  const other = await database
    .from("conversation_participants")
    .select("*")
    .eq("conversation_id", conversationId)
    .neq("user_id", viewerId)
    .is("left_at", null)
    .limit(1)
    .maybeSingle();
  if (other.error || !other.data)
    throw new MessagingError("Conversation is unavailable.", 409);
  return other.data.user_id;
}

export async function moderateConversation(input: {
  viewer: Viewer;
  conversationId: string;
  action: "report" | "block" | "unblock";
  messageId: string;
  reason: string;
}) {
  const database = getDatabaseAdminClient();
  const otherUserId = await conversationOtherUser(
    input.viewer.id,
    input.conversationId,
  );
  if (input.action === "unblock") {
    const removed = await database
      .from("contact_blocks")
      .delete()
      .eq("blocker_user_id", input.viewer.id)
      .eq("blocked_user_id", otherUserId)
      .eq("conversation_id", input.conversationId);
    if (removed.error)
      throw databaseError(removed.error, "Unable to unblock the conversation.");
  } else if (input.action === "block") {
    const blocked = await database.from("contact_blocks").upsert({
      blocker_user_id: input.viewer.id,
      blocked_user_id: otherUserId,
      conversation_id: input.conversationId,
      reason: input.reason,
    });
    if (blocked.error)
      throw databaseError(blocked.error, "Unable to block the conversation.");
  } else {
    const message = await database
      .from("messages")
      .select("*")
      .eq("id", input.messageId)
      .eq("conversation_id", input.conversationId)
      .maybeSingle();
    if (
      message.error ||
      !message.data ||
      message.data.sender_user_id === input.viewer.id
    )
      throw new MessagingError("Message not found.", 404);
    const report = await database.from("message_reports").upsert(
      {
        message_id: input.messageId,
        conversation_id: input.conversationId,
        reporter_user_id: input.viewer.id,
        reason: input.reason,
      },
      { onConflict: "message_id,reporter_user_id" },
    );
    if (report.error)
      throw databaseError(report.error, "Unable to report the message.");
    await database
      .from("messages")
      .update({ moderation_status: "reported" })
      .eq("id", input.messageId)
      .eq("moderation_status", "visible");
  }
  await appendAuditEvent({
    actorUserId: input.viewer.id,
    action: `message.${input.action}`,
    entityType: "conversation",
    entityId: input.conversationId,
    metadata: input.messageId ? { messageId: input.messageId } : {},
  });
  return { action: input.action, conversationId: input.conversationId };
}

export async function listMessageReports() {
  const database = getDatabaseAdminClient();
  const reports = await database
    .from("message_reports")
    .select("*")
    .order("created_at", { ascending: true });
  if (reports.error)
    throw databaseError(reports.error, "Unable to load message reports.");
  const messageIds = reports.data.map((report) => report.message_id);
  const messages = messageIds.length
    ? await database.from("messages").select("*").in("id", messageIds)
    : { data: [], error: null };
  if (messages.error)
    throw databaseError(messages.error, "Unable to load reported messages.");
  const byId = new Map(messages.data.map((message) => [message.id, message]));
  return reports.data.map((report) => ({
    id: report.id,
    messageId: report.message_id,
    conversationId: report.conversation_id,
    reason: report.reason,
    status: report.status,
    createdAt: report.created_at,
    messagePreview: (byId.get(report.message_id)?.body ?? "").slice(0, 200),
  }));
}

export async function resolveMessageReport(input: {
  admin: Viewer;
  reportId: string;
  status: "reviewing" | "resolved" | "dismissed";
  resolutionNote: string;
}) {
  const database = getDatabaseAdminClient();
  const updated = await database
    .from("message_reports")
    .update({
      status: input.status,
      resolution_note: input.resolutionNote,
      reviewed_by_user_id: input.admin.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", input.reportId)
    .select("*")
    .maybeSingle();
  if (updated.error || !updated.data)
    throw new MessagingError("Report not found.", 404);
  if (input.status === "resolved")
    await database
      .from("messages")
      .update({ moderation_status: "removed" })
      .eq("id", updated.data.message_id);
  await appendAuditEvent({
    actorUserId: input.admin.id,
    action: "message.report_reviewed",
    entityType: "message",
    entityId: updated.data.message_id,
    metadata: { reportId: input.reportId, status: input.status },
  });
  return updated.data;
}

async function claimDelivery(candidate: MessageDelivery) {
  const database = getDatabaseAdminClient();
  const claimed = await database
    .from("message_deliveries")
    .update({
      status: "sending",
      attempt_count: candidate.attempt_count + 1,
      last_error_code: null,
      next_retry_at: null,
    })
    .eq("id", candidate.id)
    .in("status", ["queued", "retry_required"])
    .select("*")
    .maybeSingle();
  if (claimed.error)
    throw databaseError(claimed.error, "Unable to claim message delivery.");
  return claimed.data;
}

export async function deliverQueuedMessages(limit = 10) {
  const provider = createWhatsAppProvider(process.env);
  const database = getDatabaseAdminClient();
  const now = new Date().toISOString();
  const pending = await database
    .from("message_deliveries")
    .select("*")
    .or(
      `status.eq.queued,and(status.eq.retry_required,next_retry_at.lte.${now})`,
    )
    .order("created_at")
    .limit(Math.max(1, Math.min(limit, 50)));
  if (pending.error)
    throw databaseError(pending.error, "Unable to load message delivery work.");
  const result = { sent: 0, retryRequired: 0, supportRequired: 0, skipped: 0 };
  for (const candidate of pending.data) {
    const claimed = await claimDelivery(candidate);
    if (!claimed) {
      result.skipped += 1;
      continue;
    }
    const [message, channel] = await Promise.all([
      database
        .from("messages")
        .select("*")
        .eq("id", claimed.message_id)
        .maybeSingle(),
      database
        .from("tutor_messaging_channels")
        .select("*")
        .eq("id", claimed.channel_id)
        .eq("status", "verified")
        .maybeSingle(),
    ]);
    if (message.error || channel.error || !message.data || !channel.data) {
      await database
        .from("message_deliveries")
        .update({
          status: "failed",
          last_error_code: "delivery_context_invalid",
          failed_at: new Date().toISOString(),
        })
        .eq("id", claimed.id);
      result.supportRequired += 1;
      continue;
    }
    try {
      const sent = await provider.sendText(
        channel.data.recipient_e164,
        message.data.body,
      );
      await database
        .from("message_deliveries")
        .update({
          status: "sent",
          provider_message_id: sent.providerMessageId,
          sent_at: new Date().toISOString(),
        })
        .eq("id", claimed.id)
        .eq("status", "sending");
      result.sent += 1;
    } catch (error) {
      const providerError =
        error instanceof WhatsAppProviderError ? error : null;
      const status = providerError?.retryable
        ? "retry_required"
        : "support_required";
      const nextRetryAt = providerError?.retryable
        ? new Date(
            Date.now() + messageRetryDelaySeconds(claimed.attempt_count) * 1000,
          ).toISOString()
        : null;
      await database
        .from("message_deliveries")
        .update({
          status,
          last_error_code: providerError?.code ?? "delivery_unknown",
          next_retry_at: nextRetryAt,
          failed_at:
            status === "support_required" ? new Date().toISOString() : null,
        })
        .eq("id", claimed.id);
      if (status === "retry_required") result.retryRequired += 1;
      else result.supportRequired += 1;
    }
  }
  return result;
}

type WhatsAppWebhookPayload = {
  entry?: Array<{
    changes?: Array<{
      value?: {
        statuses?: Array<{ id?: unknown; status?: unknown }>;
        messages?: Array<{
          id?: unknown;
          from?: unknown;
          context?: { id?: unknown };
          text?: { body?: unknown };
        }>;
      };
    }>;
  }>;
};

export async function applyWhatsAppWebhook(payload: WhatsAppWebhookPayload) {
  const database = getDatabaseAdminClient();
  let inboundCount = 0;
  let statusCount = 0;
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      for (const statusEvent of change.value?.statuses ?? []) {
        const status = normalizeWhatsAppStatus(statusEvent.status);
        if (!status || typeof statusEvent.id !== "string") continue;
        const patch: Partial<MessageDelivery> = {
          status,
          last_error_code: status === "failed" ? "provider_failed" : null,
        };
        if (status === "delivered")
          patch.delivered_at = new Date().toISOString();
        if (status === "read") patch.read_at = new Date().toISOString();
        if (status === "failed") patch.failed_at = new Date().toISOString();
        const updated = await database
          .from("message_deliveries")
          .update(patch)
          .eq("provider", "whatsapp")
          .eq("provider_message_id", statusEvent.id);
        if (updated.error)
          throw databaseError(
            updated.error,
            "Unable to update message delivery status.",
          );
        statusCount += 1;
      }
      for (const inbound of change.value?.messages ?? []) {
        const providerId = typeof inbound.id === "string" ? inbound.id : "";
        const contextId =
          typeof inbound.context?.id === "string" ? inbound.context.id : "";
        const text =
          typeof inbound.text?.body === "string"
            ? inbound.text.body.trim()
            : "";
        const from =
          typeof inbound.from === "string"
            ? `+${inbound.from.replace(/^\+/, "")}`
            : "";
        if (!providerId || !contextId || !text || text.length > 2000) continue;
        const delivery = await database
          .from("message_deliveries")
          .select("*")
          .eq("provider", "whatsapp")
          .eq("provider_message_id", contextId)
          .maybeSingle();
        if (delivery.error || !delivery.data) continue;
        const channel = await database
          .from("tutor_messaging_channels")
          .select("*")
          .eq("id", delivery.data.channel_id)
          .eq("recipient_e164", from)
          .eq("status", "verified")
          .maybeSingle();
        if (channel.error || !channel.data) continue;
        const original = await database
          .from("messages")
          .select("*")
          .eq("id", delivery.data.message_id)
          .maybeSingle();
        const profile = await database
          .from("tutor_profiles")
          .select("*")
          .eq("id", channel.data.tutor_profile_id)
          .maybeSingle();
        if (original.error || profile.error || !original.data || !profile.data)
          continue;
        const inserted = await database
          .from("messages")
          .insert({
            conversation_id: original.data.conversation_id,
            sender_user_id: profile.data.tutor_user_id,
            body: text,
            status: "sent",
            channel: "whatsapp",
            direction: "inbound",
            client_idempotency_key: `whatsapp:${providerId}`,
            provider_message_id: providerId,
          })
          .select("*")
          .maybeSingle();
        if (inserted.error && inserted.error.code !== "23505")
          throw databaseError(
            inserted.error,
            "Unable to save the inbound message.",
          );
        if (inserted.data) {
          await database
            .from("conversations")
            .update({ updated_at: new Date().toISOString() })
            .eq("id", original.data.conversation_id);
          inboundCount += 1;
        }
      }
    }
  }
  return { inboundCount, statusCount };
}

export function messagingErrorResponse(error: unknown) {
  if (error instanceof MessagingError)
    return Response.json(
      { error: error.message },
      {
        status: error.status,
        headers: { "Cache-Control": "private, no-store" },
      },
    );
  if (
    error instanceof WhatsAppProviderError &&
    error.code === "configuration_missing"
  )
    return Response.json(
      { error: "WhatsApp delivery is not configured." },
      { status: 503 },
    );
  throw error;
}
