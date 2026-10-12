"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { PlanId } from "@/lib/plans";

/**
 * Client-side view of "who is using the app":
 *   guest  – nobody; show splash/welcome
 *   fatima – the instant demo shortcut (localStorage flag, no server auth)
 *   member – a real Supabase Auth session (httpOnly cookies, probed via /api/auth/me)
 */
export const DEMO_SESSION_KEY = "vitalid.session";

/**
 * Instant demo login ("Login as Fatima") is OFF by default — production-safe.
 * Set NEXT_PUBLIC_DEMO_LOGIN=1 at build time to re-enable it for demos.
 */
const DEMO_LOGIN_ENABLED = process.env.NEXT_PUBLIC_DEMO_LOGIN === "1";

export type NextRoute = "/pricing" | "/onboarding" | "/";

export interface AccountSnapshot {
  userId: string;
  email: string | null;
  plan: PlanId;
  planSelected: boolean;
  onboardingStep: number;
  onboardingCompleted: boolean;
  firstName: string;
  photoUrl: string | null;
  next: NextRoute;
}

export type AuthStatus = "loading" | "guest" | "fatima" | "member";

interface AuthContextValue {
  status: AuthStatus;
  account: AccountSnapshot | null;
  /** Re-probe the server session (call after sign-in / onboarding changes). */
  refresh: () => Promise<AccountSnapshot | null>;
  enterAsFatima: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function hasFatimaFlag(): boolean {
  return (
    DEMO_LOGIN_ENABLED &&
    typeof window !== "undefined" &&
    window.localStorage.getItem(DEMO_SESSION_KEY) === "fatima"
  );
}

async function probe(): Promise<AccountSnapshot | null> {
  try {
    const res = await fetch("/api/auth/me", { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as { authenticated: boolean } & Partial<AccountSnapshot>;
    if (!data.authenticated || !data.userId) return null;
    return {
      userId: data.userId,
      email: data.email ?? null,
      plan: data.plan ?? "free",
      planSelected: Boolean(data.planSelected),
      onboardingStep: data.onboardingStep ?? 1,
      onboardingCompleted: Boolean(data.onboardingCompleted),
      firstName: data.firstName ?? "",
      photoUrl: data.photoUrl ?? null,
      next: data.next ?? "/pricing",
    };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [account, setAccount] = useState<AccountSnapshot | null>(null);

  const refresh = useCallback(async () => {
    const snap = await probe();
    if (snap) {
      window.localStorage.removeItem(DEMO_SESSION_KEY);
      setAccount(snap);
      setStatus("member");
      return snap;
    }
    setAccount(null);
    setStatus(hasFatimaFlag() ? "fatima" : "guest");
    return null;
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const enterAsFatima = useCallback(async () => {
    if (!DEMO_LOGIN_ENABLED) return;
    if (status === "member") {
      await fetch("/api/auth/signout", { method: "POST" }).catch(() => undefined);
    }
    window.localStorage.setItem(DEMO_SESSION_KEY, "fatima");
    setAccount(null);
    setStatus("fatima");
  }, [status]);

  const signOut = useCallback(async () => {
    window.localStorage.removeItem(DEMO_SESSION_KEY);
    if (status === "member") {
      await fetch("/api/auth/signout", { method: "POST" }).catch(() => undefined);
    }
    setAccount(null);
    setStatus("guest");
  }, [status]);

  const value = useMemo<AuthContextValue>(
    () => ({ status, account, refresh, enterAsFatima, signOut }),
    [status, account, refresh, enterAsFatima, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
