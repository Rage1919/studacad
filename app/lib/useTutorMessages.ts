"use client";

import { useCallback, useEffect, useState } from "react";
import type { TutorMessage } from "./tutorMessages";

const STORAGE_KEY = "studacad-tutor-messages";

const normaliseMessage = (value: Partial<TutorMessage> & { tutorId?: string; tutorName?: string; text?: string; createdAt?: string }, index: number): TutorMessage | null => {
  if (!value.tutorId || !value.tutorName || !value.text) return null;
  const createdAt = value.createdAt ?? new Date().toISOString();
  return {
    id: value.id ?? `legacy-${value.tutorId}-${createdAt}-${index}`,
    tutorId: value.tutorId,
    tutorName: value.tutorName,
    text: value.text,
    direction: value.direction ?? "outbound",
    channel: "whatsapp",
    status: value.status ?? "saved",
    createdAt,
    whatsappMessageId: value.whatsappMessageId
  };
};

const mergeMessages = (...groups: TutorMessage[][]) => Array.from(
  new Map(groups.flat().map(message => [message.id, message])).values()
).sort((a, b) => a.createdAt.localeCompare(b.createdAt));

const readLocalMessages = () => {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]") as Array<Partial<TutorMessage>>;
    return parsed.map(normaliseMessage).filter((message): message is TutorMessage => Boolean(message));
  } catch {
    return [];
  }
};

const writeLocalMessages = (messages: TutorMessage[]) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  } catch {
    // The server conversation remains available if browser storage is blocked.
  }
};

export function useTutorMessages(tutorId?: string) {
  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    const local = readLocalMessages();
    try {
      const query = tutorId ? `?tutorId=${encodeURIComponent(tutorId)}` : "";
      const response = await fetch(`/api/messages${query}`, { cache: "no-store" });
      const payload = await response.json() as { messages?: TutorMessage[] };
      const combined = mergeMessages(local, payload.messages ?? []);
      writeLocalMessages(combined);
      setMessages(tutorId ? combined.filter(message => message.tutorId === tutorId) : combined);
    } catch {
      setMessages(tutorId ? local.filter(message => message.tutorId === tutorId) : local);
    } finally {
      setReady(true);
    }
  }, [tutorId]);

  useEffect(() => {
    void refresh();
    const interval = window.setInterval(refresh, 6000);
    return () => window.clearInterval(interval);
  }, [refresh]);

  const saveLocal = useCallback((message: TutorMessage) => {
    const allMessages = mergeMessages(readLocalMessages(), [message]);
    writeLocalMessages(allMessages);
    setMessages(tutorId ? allMessages.filter(item => item.tutorId === tutorId) : allMessages);
  }, [tutorId]);

  return { messages, ready, refresh, saveLocal };
}
