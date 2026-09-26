"use client";

import { useState } from "react";

export default function JudgesPage() {
  const [msg, setMsg] = useState("");
  const reset = async () => {
    localStorage.clear();
    try {
      const res = await fetch("/api/shares/reset", { method: "POST" });
      setMsg(res.ok ? "Demo reset: local storage and share links cleared." : `Reset failed (${res.status})`);
    } catch {
      setMsg("Local storage cleared; server reset failed.");
    }
  };

  return (
    <div className="pt-6 flex flex-col gap-5" dir="ltr" lang="en">
      <h1 className="text-2xl font-bold">Presenter notes — Vital ID demo</h1>

      <section className="card">
        <h2 className="font-bold">5-minute run of show</h2>
        <ol className="list-decimal ps-5 mt-2 flex flex-col gap-1">
          <li>Welcome screen → Start → consent (both boxes) → I agree.</li>
          <li>Check-in: “Use sample transcript” → Continue.</li>
          <li>Signals: point at the “Synthetic demo data” badge → Continue.</li>
          <li>Summary: edit one item, delete one, add a note → Continue.</li>
          <li>Share: pick 2–3 items, choose the doctor, select the “Demo: 2 minutes” lifetime → Create link. Do this at the start of the pitch so the link expires on stage near the end.</li>
          <li>Show the QR + countdown. Scan with a phone (LAN URL), or click “Open recipient view” — it opens the recipient page in a NEW tab so this page stays open.</li>
          <li>Keep the recipient tab open in a second window. Press “Revoke access now” on the issued page, then switch to the recipient tab — it flips to “Access was revoked” within ~5 s. Otherwise, let the 2-minute TTL run out and the same tab flips to “This link has expired”.</li>
        </ol>
      </section>

      <section className="card">
        <h2 className="font-bold">What is real vs simulated</h2>
        <ul className="list-disc ps-5 mt-2 flex flex-col gap-1">
          <li><strong>Real:</strong> the app, consent flow, field selection, expiring/revocable links, QR sharing, bilingual UI.</li>
          <li><strong>Simulated:</strong> the persona (Fatima is fictional), the transcript (a sample you paste); wearable numbers are synthetic unless WHOOP is connected.</li>
          <li><strong>Built:</strong> PLAUD import reads recordings from Silvia&apos;s own account via the official API (when <code>PLAUD_TOKENS_JSON</code> is set). WHOOP live signals via the official OAuth API (when <code>WHOOP_CLIENT_ID</code>/<code>WHOOP_CLIENT_SECRET</code> are set and the account is connected from the signals page).</li>
          <li><strong>Not built:</strong> real voice transcription in-app, accounts/authentication, production database.</li>
        </ul>
      </section>

      <section className="card">
        <h2 className="font-bold">Demo reset</h2>
        <p className="mt-1" style={{ color: "var(--muted)" }}>
          Clears local state and all issued share links on this server.
        </p>
        <button className="btn btn-danger w-full mt-3" onClick={reset}>
          Reset demo
        </button>
        {msg && <p role="status" className="mt-2">{msg}</p>}
      </section>
    </div>
  );
}
