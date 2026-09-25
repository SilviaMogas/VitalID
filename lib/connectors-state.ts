// Selected connectors for the local Vital ID — client-side only.
// Nothing is stored as "connected": a selection marks providers the user wants
// to sync once their API goes live. Demo user selections live in localStorage;
// member selections are persisted via /api/onboarding (setup.connectors).
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useMembership } from "@/components/providers/MembershipProvider";
import {
  PROVIDERS,
  categoriesOf,
  initialStatusFor,
  isConnectorCategory,
  isConnectorStatus,
  isProviderId,
  type ConnectorCategory,
  type ProviderId,
  type UserConnector,
} from "@/lib/connectors";
import type { UserSetup } from "@/lib/onboarding/types";

export const CONNECTORS_STORAGE_KEY = "vitalid.connectors";

const DEFAULT_SELECTION: UserConnector[] = [
  { provider: "circular_ring", category: "wearables", status: "sample_data", connectedAt: null },
];

function readDemoSelection(): UserConnector[] {
  if (typeof window === "undefined") return DEFAULT_SELECTION;
  try {
    const raw = window.localStorage.getItem(CONNECTORS_STORAGE_KEY);
    if (!raw) return DEFAULT_SELECTION;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return DEFAULT_SELECTION;
    const list: UserConnector[] = [];
    for (const c of parsed as Record<string, unknown>[]) {
      if (!c || !isProviderId(c.provider) || !isConnectorCategory(c.category)) continue;
      list.push({
        provider: c.provider,
        category: c.category,
        status: isConnectorStatus(c.status) ? c.status : initialStatusFor(c.provider),
        connectedAt: null,
      });
    }
    return list.length ? list : DEFAULT_SELECTION;
  } catch {
    return DEFAULT_SELECTION;
  }
}

function writeDemoSelection(connectors: UserConnector[]) {
  window.localStorage.setItem(CONNECTORS_STORAGE_KEY, JSON.stringify(connectors));
  window.dispatchEvent(new Event("vitalid:connectors"));
}

export function useConnectorSelection() {
  const { isDemoUser, connectorLimit, loading } = useMembership();
  const [connectors, setConnectors] = useState<UserConnector[]>([]);
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    if (isDemoUser) {
      setConnectors(readDemoSelection());
      setReady(true);
      return;
    }
    try {
      const res = await fetch("/api/onboarding", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const setup = (await res.json()) as UserSetup;
      setConnectors(setup.connectors);
    } catch {
      setConnectors([]);
    } finally {
      setReady(true);
    }
  }, [isDemoUser]);

  useEffect(() => {
    if (loading) return;
    setReady(false);
    void load();
  }, [loading, load]);

  // Keep in sync when another component writes the demo selection.
  useEffect(() => {
    if (!isDemoUser) return;
    const sync = () => setConnectors(readDemoSelection());
    window.addEventListener("vitalid:connectors", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("vitalid:connectors", sync);
      window.removeEventListener("storage", sync);
    };
  }, [isDemoUser]);

  const count = useMemo(() => new Set(connectors.map((c) => c.provider)).size, [connectors]);
  const limit = connectorLimit;
  const atLimit = limit !== null && count >= limit;

  const selectedProviders = useMemo(
    () => Array.from(new Set(connectors.map((c) => c.provider))),
    [connectors],
  );

  const isSelected = useCallback(
    (provider: ProviderId) => connectors.some((c) => c.provider === provider),
    [connectors],
  );

  const toggle = useCallback(
    (provider: ProviderId, category?: ConnectorCategory) => {
      const def = PROVIDERS[provider];
      if (def.announcedOnly) return;
      const selected = connectors.some((c) => c.provider === provider);
      if (!selected && limit !== null && count >= limit) return;
      const next: UserConnector[] = selected
        ? connectors.filter((c) => c.provider !== provider)
        : [
            ...connectors,
            {
              provider,
              category: category ?? categoriesOf(provider)[0],
              status: initialStatusFor(provider),
              connectedAt: null,
            },
          ];
      const prev = connectors;
      setConnectors(next);
      if (isDemoUser) {
        writeDemoSelection(next);
        return;
      }
      void fetch("/api/onboarding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectors: next }),
      }).then((res) => {
        if (!res.ok) setConnectors(prev);
      }).catch(() => setConnectors(prev));
    },
    [connectors, count, limit, isDemoUser],
  );

  return useMemo(
    () => ({ connectors, selectedProviders, isSelected, toggle, count, limit, atLimit, ready }),
    [connectors, selectedProviders, isSelected, toggle, count, limit, atLimit, ready],
  );
}
