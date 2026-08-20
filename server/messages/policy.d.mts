export function normalizeMessageRequest(value: unknown): {
  value: {
    tutorSlug: string;
    conversationId: string;
    text: string;
    clientMessageId: string;
  };
  errors: string[];
};
export function normalizeModerationRequest(value: unknown): {
  value: {
    action: "report" | "block" | "unblock" | "";
    messageId: string;
    reason: string;
  };
  errors: string[];
};
export function messageRetryDelaySeconds(attemptCount: number): number;
export function normalizeWhatsAppStatus(
  status: unknown,
): "sent" | "delivered" | "read" | "failed" | null;
