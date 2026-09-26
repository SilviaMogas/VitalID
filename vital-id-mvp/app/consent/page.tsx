"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "../providers";
import { activateAccount } from "@/lib/accountClient";
import { setItem, STORAGE_KEYS } from "@/lib/storage";

export default function ConsentPage() {
  const { t, lang } = useLang();
  const router = useRouter();
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  const [understand, setUnderstand] = useState(false);
  const [agree, setAgree] = useState(false);
  const ready = understand && agree;

  const bullets: { title: string; body: string }[] = [
    { title: t("consent.collect.title"), body: t("consent.collect.body") },
    { title: t("consent.where.title"), body: t("consent.where.body") },
    { title: t("consent.who.title"), body: t("consent.who.body") },
  ];

  return (
    <div className="pt-6 flex flex-col gap-5">
      <h1 className="text-2xl font-bold">{t("consent.title")}</h1>
      <ul className="flex flex-col gap-3">
        {bullets.map((b) => (
          <li key={b.title} className="card">
            <p className="font-bold">{b.title}</p>
            <p className="mt-1" style={{ color: "var(--muted)" }}>
              {b.body}
            </p>
          </li>
        ))}
      </ul>
      <label className="field-check card" data-testid="understand">
        <input type="checkbox" checked={understand} onChange={(e) => setUnderstand(e.target.checked)} />
        <span>{t("consent.understand")}</span>
      </label>
      <label className="field-check card" data-testid="agree">
        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
        <span>{t("consent.agree")}</span>
      </label>
      <button
        className="btn btn-primary w-full"
        disabled={!ready||busy}
        onClick={async () => {
          setBusy(true);setError("");
          try {
            if(new URLSearchParams(window.location.search).get("account")==="1")await activateAccount();
            setItem(STORAGE_KEYS.consent, { at: Date.now() });
            router.push("/dashboard");
          }catch{setError(lang==="ar"?"تعذر تحميل حسابك. حاول مجدداً.":"Could not load your account. Please try again.");setBusy(false);}
        }}
      >
        {t("consent.continue")}
      </button>
      {error&&<p role="alert">{error}</p>}
      <button className="btn btn-outline w-full" onClick={() => router.push("/")}>
        {t("consent.no")}
      </button>
    </div>
  );
}
