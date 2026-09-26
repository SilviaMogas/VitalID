"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clearLocalJourney } from "@/lib/accountClient";

export default function AuthCallback() {
  const router = useRouter();
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    const confirm = async () => {
      const hash = new URLSearchParams(window.location.hash.slice(1));
      const access_token = hash.get("access_token");
      const refresh_token = hash.get("refresh_token");
      window.history.replaceState({}, "", "/auth/callback");
      if (!access_token || !refresh_token) { setError("The confirmation link is missing a session. Please sign in."); return; }
      try {
        const response = await fetch("/api/auth/session", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ access_token, refresh_token, expires_in: Number(hash.get("expires_in") || 3600) }),
        });
        if (!response.ok) throw new Error("The confirmation link expired. Please sign in again.");
        clearLocalJourney();
        if (!cancelled) router.replace("/consent?account=1");
      } catch (reason) { if (!cancelled) setError(reason instanceof Error ? reason.message : "Could not confirm your account."); }
    };
    void confirm();
    return () => { cancelled = true; };
  }, [router]);
  return <main className="card" style={{ margin: "2rem 1rem" }}>
    <h1 className="text-2xl font-bold">Confirming your account</h1>
    {error ? <><p role="alert">{error}</p><Link href="/register" className="btn btn-primary">Sign in</Link></> : <p>One moment…</p>}
  </main>;
}
