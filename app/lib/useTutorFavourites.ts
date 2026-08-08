"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "studacad-favourite-tutors";

export function useTutorFavourites() {
  const [favouriteIds, setFavouriteIds] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) setFavouriteIds(JSON.parse(stored));
    } catch {
      // Favourites still work for the current session when storage is unavailable.
    } finally {
      setReady(true);
    }
  }, []);

  const update = (next: string[]) => {
    setFavouriteIds(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Keep the in-memory list available for this session.
    }
  };

  const toggleFavourite = (tutorId: string) => {
    const next = favouriteIds.includes(tutorId)
      ? favouriteIds.filter(id => id !== tutorId)
      : [...favouriteIds, tutorId];
    update(next);
    return next.includes(tutorId);
  };

  return { favouriteIds, ready, toggleFavourite };
}
