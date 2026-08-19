export function notificationEmailConfigurationAvailable(environment) {
  return Boolean(
    environment.NOTIFICATION_EMAIL_ENDPOINT &&
    environment.NOTIFICATION_EMAIL_TOKEN,
  );
}

export async function sendNotificationEmail({
  endpoint,
  token,
  to,
  subject,
  text,
  html,
  idempotencyKey,
  notificationId,
  userId,
  fetchImpl = fetch,
}) {
  if (!endpoint || !token)
    throw Object.assign(new Error("configuration_missing"), {
      retryable: true,
    });
  const url = new URL(endpoint);
  if (url.protocol !== "https:")
    throw Object.assign(new Error("invalid_endpoint"), { retryable: false });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetchImpl(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({
        from: "Studacad <notifications@studacad.com>",
        to,
        subject,
        text,
        html,
        metadata: { notificationId, userId },
      }),
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || typeof payload.id !== "string" || payload.id.length < 3)
      throw Object.assign(
        new Error(
          response.status >= 500 || response.status === 429
            ? "provider_unavailable"
            : "provider_rejected",
        ),
        { retryable: response.status >= 500 || response.status === 429 },
      );
    return { providerMessageId: payload.id };
  } finally {
    clearTimeout(timeout);
  }
}
