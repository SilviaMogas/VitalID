"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLang } from "../providers";
import RequireConsent from "@/components/RequireConsent";
import { getItem, setItem, STORAGE_KEYS, type IssuedLink } from "@/lib/storage";
import type { DictKey } from "@/lib/i18n";
import type { SaidItem } from "@/lib/summarize";
import type { DailyEntry } from "@/lib/daily";
import { formatSignalValue, signalTileByKey, type StoredSignals } from "@/data/syntheticSignals";

interface StoredSummary {
  said: (SaidItem & { kind: "said" })[];
  signals: { id: string; kind: "signal"; skey: string; label: string }[];
}

function signalText(s: StoredSummary["signals"][number], lang: "ar" | "en", t: (k: DictKey) => string, stored?: StoredSignals | null): string {
  const tile = signalTileByKey(s.skey, stored);
  return `${t(s.label as DictKey)}: ${tile ? formatSignalValue(tile, lang) : ""}`;
}

const TTL_OPTIONS: { minutes: number; key: DictKey }[] = [
  { minutes: 15, key: "share.ttl.15" },
  { minutes: 60, key: "share.ttl.60" },
  { minutes: 1440, key: "share.ttl.1440" },
  { minutes: 2, key: "share.ttl.demo" },
];

export default function SharePage() {
  const { t, lang } = useLang();
  const router = useRouter();
  const [summary, setSummary] = useState<StoredSummary>({ said: [], signals: [] });
  const [storedSignals, setStoredSignals] = useState<StoredSignals | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [recipient, setRecipient] = useState<"doctor" | "daughter" | "other">("doctor");
  const [otherName, setOtherName] = useState("");
  const [ttl, setTtl] = useState(2);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    const saved = getItem<StoredSummary>(STORAGE_KEYS.summary);
    if (saved) setSummary(saved);
    else {
      const latest = (getItem<DailyEntry[]>(STORAGE_KEYS.dailyHistory) ?? [])[0];
      if (latest) {
        const said = [
          latest.note && { id: "diary-note", topic: "note", text: latest.note, kind: "said" as const },
          latest.food && { id: "diary-food", topic: "appetite", text: latest.food, kind: "said" as const },
          latest.movement && { id: "diary-movement", topic: "activity", text: latest.movement, kind: "said" as const },
        ].filter(Boolean) as StoredSummary["said"];
        setSummary({ said, signals: [] });
      }
    }
    setStoredSignals(getItem<StoredSignals>(STORAGE_KEYS.signals));
  }, []);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const recipientLabel =
    recipient === "doctor"
      ? t("share.doctor")
      : recipient === "daughter"
        ? t("share.daughter")
        : otherName.trim() || t("share.other");

  const create = async () => {
    if (selected.size === 0) {
      setErr(t("share.needfields"));
      return;
    }
    setErr("");
    setBusy(true);
    const fields: Record<string, string> = {};
    for (const item of summary.said) if (selected.has(item.id)) fields[item.id] = item.text;
    for (const item of summary.signals)
      if (selected.has(item.id)) fields[`signal:${item.skey}`] = signalText(item, lang, t, storedSignals);
    if (storedSignals?.source === "whoop") fields["signal:source"] = "whoop";
    try {
      const res = await fetch("/api/shares", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fields, recipientLabel, ttlMinutes: ttl }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { id: string; token: string; expiresAt: number; url: string };
      const link: IssuedLink = {
        id: data.id,
        token: data.token,
        recipientLabel,
        expiresAt: data.expiresAt,
        revokedAt: null,
        url: data.url,
      };
      const list = getItem<IssuedLink[]>(STORAGE_KEYS.shares) ?? [];
      setItem(STORAGE_KEYS.shares, [link, ...list]);
      router.push(`/share/issued/${data.id}`);
    } catch {
      setErr("Error");
    } finally {
      setBusy(false);
    }
  };

  const allItems = [
    ...summary.said.map((s) => ({ id: s.id, label: `“${s.text}”` })),
    ...summary.signals.map((s) => ({
      id: s.id,
      label: `${signalText(s, lang, t, storedSignals)} (${storedSignals?.source === "whoop" ? t("summary.live") : t("summary.synthetic")})`,
    })),
  ];

  return (
    <RequireConsent>
      <div className="pt-6 flex flex-col gap-5">
        <h1 className="text-2xl font-bold">{t("share.title")}</h1>
        <Link className="btn btn-outline" href="/onboarding">{lang==="ar"?"إنشاء حزمة معلومات مختارة، مع المستندات":"Create a selective information pack with documents"}</Link>
        <p className="card">{lang === "ar" ? "هذا الرابط مؤقت وللقراءة فقط. تختارين المعلومات التي تظهر فيه ومدة صلاحيته، ويمكنك إلغاؤه. لا يشارك لوحة بياناتك كاملة." : "This makes a temporary, read-only link. Choose exactly which details appear and when access ends. You can revoke it. Your full dashboard is never shared."}</p>
        {allItems.length === 0 && <div className="card"><p>{lang === "ar" ? "سجّلي يومك أولاً حتى تختاري ما تريدين مشاركته." : "Check in first to choose details to share."}</p><Link href="/checkin" className="underline">{lang === "ar" ? "سجّلي اليوم" : "Check in today"}</Link></div>}

        <fieldset>
          <legend className="font-bold mb-2">{t("share.pick")}</legend>
          <div className="flex flex-col gap-2">
            {allItems.map((item) => (
              <label key={item.id} className="field-check card" data-testid={`field-${item.id}`}>
                <input type="checkbox" checked={selected.has(item.id)} onChange={() => toggle(item.id)} />
                <span>{item.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="font-bold mb-2">{t("share.recipient")}</legend>
          <div className="flex flex-col gap-2">
            <label className="field-check card">
              <input type="radio" name="recipient" checked={recipient === "doctor"} onChange={() => setRecipient("doctor")} />
              <span>{t("share.doctor")}</span>
            </label>
            <label className="field-check card">
              <input type="radio" name="recipient" checked={recipient === "daughter"} onChange={() => setRecipient("daughter")} />
              <span>{t("share.daughter")}</span>
            </label>
            <label className="field-check card">
              <input type="radio" name="recipient" checked={recipient === "other"} onChange={() => setRecipient("other")} />
              <span>{t("share.other")}</span>
            </label>
            {recipient === "other" && (
              <input
                type="text"
                value={otherName}
                onChange={(e) => setOtherName(e.target.value)}
                placeholder={t("share.other.placeholder")}
                aria-label={t("share.other.placeholder")}
                style={{ minHeight: 56 }}
              />
            )}
          </div>
        </fieldset>

        <label className="font-bold flex flex-col gap-2">
          {t("share.ttl")}
          <select value={ttl} onChange={(e) => setTtl(Number(e.target.value))} aria-label={t("share.ttl")}>
            {TTL_OPTIONS.map((o) => (
              <option key={o.minutes} value={o.minutes}>
                {t(o.key)}
              </option>
            ))}
          </select>
        </label>

        {err && (
          <p role="alert" style={{ color: "var(--error)" }}>
            {err}
          </p>
        )}
        <button className="btn btn-primary w-full" onClick={create} disabled={busy || selected.size === 0}>
          {t("share.create")}
        </button>
        <Link href="/share/history" className="btn btn-outline w-full text-center">
          {t("share.history")}
        </Link>
      </div>
    </RequireConsent>
  );
}
