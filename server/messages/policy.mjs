const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const KEY = /^[A-Za-z0-9:_-]{8,100}$/;

export function normalizeMessageRequest(value) {
  const tutorSlug =
    typeof value?.tutorId === "string"
      ? value.tutorId.trim().toLowerCase()
      : "";
  const conversationId =
    typeof value?.conversationId === "string" && UUID.test(value.conversationId)
      ? value.conversationId
      : "";
  const text = typeof value?.text === "string" ? value.text.trim() : "";
  const clientMessageId =
    typeof value?.clientMessageId === "string"
      ? value.clientMessageId.trim()
      : "";
  const errors = [];
  if (!tutorSlug && !conversationId)
    errors.push("A tutor or conversation is required.");
  if (text.length < 1 || text.length > 2000)
    errors.push("Message must be between 1 and 2000 characters.");
  if (!KEY.test(clientMessageId))
    errors.push("A valid message idempotency key is required.");
  return {
    value: { tutorSlug, conversationId, text, clientMessageId },
    errors,
  };
}

export function normalizeModerationRequest(value) {
  const action = new Set(["report", "block", "unblock"]).has(value?.action)
    ? value.action
    : "";
  const messageId =
    typeof value?.messageId === "string" && UUID.test(value.messageId)
      ? value.messageId
      : "";
  const reason = typeof value?.reason === "string" ? value.reason.trim() : "";
  const errors = [];
  if (!action) errors.push("A valid moderation action is required.");
  if (action === "report" && !messageId)
    errors.push("A message is required for a report.");
  if (action !== "unblock" && (reason.length < 5 || reason.length > 1000))
    errors.push("A reason between 5 and 1000 characters is required.");
  return { value: { action, messageId, reason }, errors };
}

export function messageRetryDelaySeconds(attemptCount) {
  return Math.min(3600, 30 * 2 ** Math.max(0, Math.min(attemptCount - 1, 7)));
}

export function normalizeWhatsAppStatus(status) {
  return new Set(["sent", "delivered", "read", "failed"]).has(status)
    ? status
    : null;
}
