"use client";

import { useCallback, useEffect, useState } from "react";
import type { TutorMessage } from "./tutorMessages";

const mergeMessages = (...groups: TutorMessage[][]) =>
  Array.from(
    new Map(groups.flat().map((message) => [message.id, message])).values(),
  ).sort((a, b) => a.createdAt.localeCompare(b.createdAt));

export function useTutorMessages(tutorId?: string) {
  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const query = tutorId ? `?tutorId=${encodeURIComponent(tutorId)}` : "";
      const response = await fetch(`/api/messages${query}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        messages?: TutorMessage[];
        error?: string;
      };
      if (!response.ok)
        throw new Error(payload.error ?? "Unable to load messages.");
      setMessages(payload.messages ?? []);
    } finally {
      setReady(true);
    }
  }, [tutorId]);

  useEffect(() => {
    void refresh().catch(() => undefined);
    const interval = window.setInterval(
      () => void refresh().catch(() => undefined),
      6000,
    );
    return () => window.clearInterval(interval);
  }, [refresh]);

  const saveLocal = useCallback((message: TutorMessage) => {
    setMessages((current) => mergeMessages(current, [message]));
  }, []);

  return { messages, ready, refresh, saveLocal };
}
