"use client";

import { useEffect, useState } from "react";
import { useLang } from "@/app/providers";
import SyntheticBadge from "@/components/SyntheticBadge";
import ReadAloud from "@/components/ReadAloud";
import InformationPackView from "@/components/InformationPackView";
import { readPack } from "@/lib/informationPack";

type Payload =
  | { status: "active"; recipientLabel: string; fields: Record<string, string | number>; expiresAt: number }
  | { status: "expired" | "revoked" | "not_found" };

const isSignalKey = (k: string) => k.startsWith("signal:");

export default function RecipientClient({ id, token, initial }: { id: string; token: string; initial: Payload }) {
  const { t, lang } = useLang();
  const [data, setData] = useState<Payload>(initial);

  useEffect(() => {
    const poll = setInterval(async () => {
      try {
        const res = await fetch(`/api/shares/${id}/status?t=${encodeURIComponent(token)}`, { cache: "no-store" });
        if (!res.ok) return;
        const d = (await res.json()) as { status: Payload["status"] };
        setData((prev) => (d.status === "active" ? prev : { status: d.status }));
      } catch {
        // keep last state
      }
    }, 5000);
    return () => clearInterval(poll);
  }, [id, token]);

  if (data.status !== "active") {
    const msgs = {
      expired: { msg: t("recipient.expired"), testId: "state-expired" },
      revoked: { msg: t("recipient.revoked"), testId: "state-revoked" },
      not_found: { msg: t("recipient.notfound"), testId: "state-notfound" },
    } as const;
    const m = msgs[data.status];
    return <FullState msg={m.msg} testId={m.testId} />;
  }

  const active = data as Extract<Payload, { status: "active" }>;
  const pack = readPack(active.fields);
  if (pack) return <div className="pt-6 flex flex-col gap-5" data-testid="recipient-active">
    <InformationPackView pack={pack} recipient={active.recipientLabel} expiresAt={active.expiresAt}
      download={documentId=>`/api/shares/${id}/documents/${documentId}?t=${encodeURIComponent(token)}`}/>
  </div>;
  const live = active.fields["signal:source"] === "whoop";
  const said = Object.entries(active.fields).filter(([k]) => !isSignalKey(k));
  const signals = Object.entries(active.fields).filter(([k]) => isSignalKey(k) && k !== "signal:source");

  const speech = [...said.map(([, v]) => String(v)), ...signals.map(([, v]) => String(v))].join(". ");
  const expiresStr = new Date(active.expiresAt).toLocaleString(lang === "ar" ? "ar-AE" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div className="pt-6 flex flex-col gap-5" data-testid="recipient-active">
      <p className="text-sm" style={{ color: "var(--muted)" }}>
        {t("recipient.from")} <strong>{active.recipientLabel}</strong>
      </p>
      <div className="flex gap-2 no-print">
        <ReadAloud text={speech} className="flex-1" />
        <button type="button" className="btn btn-outline flex-1" onClick={() => window.print()} data-testid="print-btn">
          🖨 {t("recipient.print")}
        </button>
      </div>
      {said.length > 0 && (
        <section>
          <h2 className="text-xl font-bold" style={{ color: "var(--accent)" }}>
            💬 {t("recipient.said")}
          </h2>
          <ul className="flex flex-col gap-2 mt-2">
            {said.map(([k, v]) => (
              <li key={k} className="card" data-testid={`field-${k}`}>
                “{v}”
              </li>
            ))}
          </ul>
        </section>
      )}
      {signals.length > 0 && (
        <section className="flex flex-col gap-2">
          <SyntheticBadge source={live ? "whoop" : "synthetic"} />
          <h2 className="text-xl font-bold" style={{ color: "#6b4e00" }}>
            ⌚ {t("recipient.signals")}
          </h2>
          <ul className="flex flex-col gap-2 mt-2">
            {signals.map(([k, v]) => (
              <li key={k} className="card" data-testid={`field-${k}`}>
                {v}{" "}
                <span className={live ? "badge badge-live" : "badge badge-warn"}>
                  {live ? t("summary.live") : t("summary.synthetic")}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
      <p className="text-sm" style={{ color: "var(--muted)" }}>
        {t("recipient.expiresAt")} {expiresStr}
      </p>
      <p className="text-sm" style={{ color: "var(--muted)" }}>
        {t("recipient.disclaimer")}
      </p>
      <p className="print-only text-sm" style={{ color: "#444", borderTop: "1px solid #999", paddingTop: "0.75rem" }}>
        {t("recipient.print.footer", { date: expiresStr })}
      </p>
    </div>
  );
}

function FullState({ msg, testId }: { msg: string; testId: string }) {
  return (
    <div className="pt-24 flex flex-col items-center text-center gap-4" data-testid={testId}>
      <span style={{ fontSize: 48 }} aria-hidden>
        ⛔
      </span>
      <h1 className="text-2xl font-bold">{msg}</h1>
    </div>
  );
}
