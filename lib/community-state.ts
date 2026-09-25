// Community picks (hobbies + cities) for the local Vital ID — client-side only.
// Selections are personal preferences, not shared data; they live in localStorage.
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { isHobbyId, type HobbyId } from "@/lib/community";

export const COMMUNITY_STORAGE_KEY = "vitalid.community";

interface CommunitySelection {
  hobbies: HobbyId[];
  cities: string[];
}

const EMPTY: CommunitySelection = { hobbies: [], cities: [] };

function readSelection(): CommunitySelection {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(COMMUNITY_STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const hobbies = Array.isArray(parsed.hobbies) ? parsed.hobbies.filter(isHobbyId) : [];
    const cities = Array.isArray(parsed.cities)
      ? parsed.cities.filter((c): c is string => typeof c === "string")
      : [];
    return { hobbies, cities };
  } catch {
    return EMPTY;
  }
}

function writeSelection(sel: CommunitySelection) {
  window.localStorage.setItem(COMMUNITY_STORAGE_KEY, JSON.stringify(sel));
  window.dispatchEvent(new Event("vitalid:community"));
}

export function useCommunitySelection() {
  const [selection, setSelection] = useState<CommunitySelection>(EMPTY);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSelection(readSelection());
    setReady(true);
  }, []);

  // Keep in sync when another component writes the selection.
  useEffect(() => {
    const sync = () => setSelection(readSelection());
    window.addEventListener("vitalid:community", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("vitalid:community", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const toggleHobby = useCallback(
    (hobby: HobbyId) => {
      const next: CommunitySelection = selection.hobbies.includes(hobby)
        ? { ...selection, hobbies: selection.hobbies.filter((h) => h !== hobby) }
        : { ...selection, hobbies: [...selection.hobbies, hobby] };
      setSelection(next);
      writeSelection(next);
    },
    [selection],
  );

  const toggleCity = useCallback(
    (cityId: string) => {
      const next: CommunitySelection = selection.cities.includes(cityId)
        ? { ...selection, cities: selection.cities.filter((c) => c !== cityId) }
        : { ...selection, cities: [...selection.cities, cityId] };
      setSelection(next);
      writeSelection(next);
    },
    [selection],
  );

  const isHobbySelected = useCallback((h: HobbyId) => selection.hobbies.includes(h), [selection]);
  const isCitySelected = useCallback((c: string) => selection.cities.includes(c), [selection]);

  return useMemo(
    () => ({ ...selection, ready, toggleHobby, toggleCity, isHobbySelected, isCitySelected }),
    [selection, ready, toggleHobby, toggleCity, isHobbySelected, isCitySelected],
  );
}
