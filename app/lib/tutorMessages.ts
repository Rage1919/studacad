export type TutorMessage = {
  id: string;
  tutorId: string;
  tutorName: string;
  text: string;
  direction: "outbound" | "inbound";
  channel: "whatsapp";
  status: "saved" | "sent" | "received" | "failed";
  createdAt: string;
  whatsappMessageId?: string;
};

const messageGlobal = globalThis as typeof globalThis & {
  __studacadTutorMessages?: TutorMessage[];
};

const messages = messageGlobal.__studacadTutorMessages ?? [];
messageGlobal.__studacadTutorMessages = messages;

export const listTutorMessages = (tutorId?: string) => messages
  .filter(message => !tutorId || message.tutorId === tutorId)
  .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

export const saveTutorMessage = (message: TutorMessage) => {
  const existing = messages.findIndex(item => item.id === message.id);
  if (existing >= 0) messages[existing] = { ...messages[existing], ...message };
  else messages.push(message);
  return message;
};
