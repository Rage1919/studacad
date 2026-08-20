"use client";

import { useCallback, useEffect, useState } from "react";
import type { TutorMessage } from "./tutorMessages";

export function useTutorMessages(tutorId?: string) {
  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

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
      setError("");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to load messages.",
      );
      throw cause;
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

  return { messages, ready, error, refresh };
}
