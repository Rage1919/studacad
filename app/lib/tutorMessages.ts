export type TutorMessage = {
  id: string;
  conversationId: string;
  tutorId: string;
  tutorName: string;
  text: string;
  direction: "outbound" | "inbound";
  channel: "in_app" | "whatsapp";
  status: "queued" | "sent" | "delivered" | "read" | "failed";
  providerStatus:
    | "queued"
    | "sending"
    | "sent"
    | "delivered"
    | "read"
    | "retry_required"
    | "failed"
    | "support_required"
    | null;
  createdAt: string;
  canReport: boolean;
};
