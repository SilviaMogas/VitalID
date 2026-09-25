// Selected connectors for the local Vital ID — client-side only.
// Nothing is stored as "connected": a selection just marks providers the user
// wants to sync once their API goes live.
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useMembership } from "@/components/providers/MembershipProvider";
import { getConnector, type ConnectorId } from "@/lib/connectors";

export const CONNECTORS_STORAGE_KEY = "vitalid.connectors";

const DEFAULT_SELECTION: ConnectorId[] = ["circular-ring"];

function readSelection(): ConnectorId[] {
  if (typeof window === "undefined") return DEFAULT_SELECTION;
  try {
    const raw = window.localStorage.getItem(CONNECTORS_STORAGE_KEY);
    if (!raw) return DEFAULT_SELECTION;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return DEFAULT_SELECTION;
    return parsed.filter(
      (id): id is ConnectorId => typeof id === "string" && getConnector(id as ConnectorId) !== undefined,
    );
  } catch {
    return DEFAULT_SELECTION;
  }
}

function writeSelection(ids: ConnectorId[]) {
  window.localStorage.setItem(CONNECTORS_STORAGE_KEY, JSON.stringify(ids));
  window.dispatchEvent(new Event("vitalid:connectors"));
}

export function useConnectorSelection() {
  const { connectorLimit } = useMembership();
  const [selected, setSelected] = useState<ConnectorId[]>(DEFAULT_SELECTION);

  useEffect(() => {
    setSelected(readSelection());
    const sync = () => setSelected(readSelection());
    window.addEventListener("vitalid:connectors", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("vitalid:connectors", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const count = selected.length;
  const limit = connectorLimit;
  const atLimit = limit !== null && count >= limit;

  const isSelected = useCallback((id: ConnectorId) => selected.includes(id), [selected]);

  const toggle = useCallback(
    (id: ConnectorId) => {
      setSelected((prev) => {
        if (prev.includes(id)) {
          const next = prev.filter((x) => x !== id);
          writeSelection(next);
          return next;
        }
        if (limit !== null && prev.length >= limit) return prev;
        const next = [...prev, id];
        writeSelection(next);
        return next;
      });
    },
    [limit],
  );

  return useMemo(
    () => ({ selected, isSelected, toggle, count, limit, atLimit }),
    [selected, isSelected, toggle, count, limit, atLimit],
  );
}
