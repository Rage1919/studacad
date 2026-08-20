"use client";

import { useCallback, useEffect, useState } from "react";

export function useTutorFavourites() {
  const [favouriteIds, setFavouriteIds] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/favourites", { cache: "no-store" });
      if (response.status === 401) return;
      const payload = await response.json() as { tutorProfileIds?: string[]; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Unable to load tutor favourites.");
      setFavouriteIds(payload.tutorProfileIds ?? []);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load tutor favourites.");
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const toggleFavourite = useCallback(async (tutorProfileId: string) => {
    const favourite = !favouriteIds.includes(tutorProfileId);
    try {
      const response = await fetch("/api/favourites", {
        method: favourite ? "PUT" : "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tutorProfileId })
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Unable to update tutor favourites.");
      setFavouriteIds(current => favourite ? Array.from(new Set([...current, tutorProfileId])) : current.filter(id => id !== tutorProfileId));
      setError("");
      return favourite;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update tutor favourites.");
      return null;
    }
  }, [favouriteIds]);

  return { favouriteIds, ready, error, refresh, toggleFavourite };
}
