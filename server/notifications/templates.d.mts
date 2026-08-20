export const notificationTemplateKeys: readonly string[];
export function renderNotification(
  templateKey: string,
  input: { recipientName: string; appUrl: string },
): { subject: string; text: string; html: string };
