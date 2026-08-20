export function notificationEmailConfigurationAvailable(
  environment: NodeJS.ProcessEnv,
): boolean;
export function sendNotificationEmail(input: {
  endpoint: string | undefined;
  token: string | undefined;
  to: string;
  subject: string;
  text: string;
  html: string;
  idempotencyKey: string;
  notificationId: string;
  userId: string;
  fetchImpl?: typeof fetch;
}): Promise<{ providerMessageId: string }>;
