// Shared plumbing for the small, personal, client-only bits of state that
// live in localStorage (daily challenge, work focus, community picks): a
// JSON read with a safe fallback, a write that notifies this tab's own
// listeners, and the "resync on that event or on another tab's write" effect.
"use client";

import { useEffect } from "react";

export function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJSON(key: string, value: unknown, eventName: string): void {
  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new Event(eventName));
}

/** Runs `sync` once on mount, then again whenever `eventName` fires or another tab writes to storage. */
export function useStorageSync(eventName: string, sync: () => void): void {
  useEffect(() => {
    sync();
    window.addEventListener(eventName, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(eventName, sync);
      window.removeEventListener("storage", sync);
    };
  }, [eventName, sync]);
}
