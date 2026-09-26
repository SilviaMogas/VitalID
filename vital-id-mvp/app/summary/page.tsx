"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "../providers";
import RequireConsent from "@/components/RequireConsent";
import { getItem, setItem, STORAGE_KEYS } from "@/lib/storage";
import { summarize, type SaidItem } from "@/lib/summarize";
import { formatSignalValue, signalTileByKey, syntheticSignals, type SignalTile, type StoredSignals } from "@/data/syntheticSignals";
import SyntheticBadge from "@/components/SyntheticBadge";
import ReadAloud from "@/components/ReadAloud";
import type { DictKey } from "@/lib/i18n";
import { buildDailyRecap, type DailyEntry } from "@/lib/daily";

export interface SignalSummaryItem {
  id: string;
  kind: "signal";
  skey: SignalTile["key"];
  label: string;
}

export type SummaryItem =
  | (SaidItem & { kind: "said" })
  | SignalSummaryItem;

const SIGNAL_LABEL_KEYS: Record<SignalTile["key"], DictKey> = {
  sleep: "signals.sleep",
  rhr: "signals.rhr",
  hrv: "signals.hrv",
  recovery: "signals.recovery",
};

function EditableSaid({
  item,
  onChange,
  onDelete,
}: {
  item: SaidItem & { kind: "said" };
  onChange: (it: SaidItem & { kind: "said" }) => void;
  onDelete: () => void;
}) {
  const { t } = useLang();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.text);

  return (
    <li className="card flex flex-col gap-3" data-testid={`said-${item.id}`}>
      {editing ? (
        <>
          <textarea rows={3} value={draft} onChange={(e) => setDraft(e.target.value)} />
          <div className="flex gap-2">
            <button
              className="btn btn-primary flex-1"
              style={{ minHeight: 48 }}
              onClick={() => {
                onChange({ ...item, text: draft, original: item.original ?? item.text, edited: true });
                setEditing(false);
              }}
            >
              {t("summary.save")}
            </button>
            <button
              className="btn btn-outline flex-1"
              style={{ minHeight: 48 }}
              onClick={() => {
                setDraft(item.text);
                setEditing(false);
              }}
            >
              {t("summary.cancel")}
            </button>
          </div>
        </>
      ) : (
        <>
          <blockquote className="text-lg" style={{ borderInlineStart: "4px solid var(--accent)", paddingInlineStart: "0.75rem" }}>
            “{item.text}”
          </blockquote>
          <div className="flex gap-2 flex-wrap">
            <button
              className="btn btn-outline"
              style={{ minHeight: 48 }}
              onClick={() => {
                setDraft(item.text);
                setEditing(true);
              }}
            >
              {t("summary.edit")}
            </button>
            <button className="btn btn-outline" style={{ minHeight: 48, color: "var(--error)", borderColor: "var(--error)" }} onClick={onDelete}>
              {t("summary.delete")}
            </button>
            {item.edited && item.original && (
              <button
                className="btn btn-outline"
                style={{ minHeight: 48 }}
                onClick={() => onChange({ ...item, text: item.original!, original: undefined, edited: false })}
              >
                {t("summary.restore")}
              </button>
            )}
          </div>
        </>
      )}
    </li>
  );
}

export default function SummaryPage() {
  const { t, lang } = useLang();
  const router = useRouter();
  const [said, setSaid] = useState<(SaidItem & { kind: "said" })[]>([]);
  const [signals, setSignals] = useState<SignalSummaryItem[]>([]);
  const [storedSignals, setStoredSignals] = useState<StoredSignals | null>(null);
  const [daily, setDaily] = useState<DailyEntry | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [loaded, setLoaded] = useState(false);

  const dailyRecap = daily ? buildDailyRecap(daily, lang, storedSignals) : null;
  const speechText = [
    ...(dailyRecap?.lines ?? []),
    ...said.map((s) => s.text),
    ...(signals.length
      ? [
          t("summary.signals") + ": " +
            signals
              .map((item) => {
                const tile = signalTileByKey(item.skey, storedSignals);
                const src = storedSignals?.source === "whoop" ? t("summary.live") : t("summary.synthetic");
                return `${t(item.label as DictKey)} ${tile ? formatSignalValue(tile, lang) : ""} (${src})`;
              })
              .join(". "),
        ]
      : []),
  ].join(". ");

  useEffect(() => {
    const stored = getItem<StoredSignals>(STORAGE_KEYS.signals);
    setStoredSignals(stored);
    setDaily(getItem<DailyEntry>(STORAGE_KEYS.currentDaily));
    const saved = getItem<{ said: (SaidItem & { kind: "said" })[]; signals: SignalSummaryItem[] }>(STORAGE_KEYS.summary);
    if (saved) {
      setSaid(saved.said);
      setSignals(saved.signals);
    } else {
      const transcript = getItem<string>(STORAGE_KEYS.transcript) ?? "";
      const items = summarize(transcript).map((s) => ({ ...s, kind: "said" as const }));
      setSaid(items);
      const include = getItem<boolean>(STORAGE_KEYS.includeSignals) !== false;
      if (include) {
        setSignals(
          (stored?.tiles ?? syntheticSignals).map((s) => ({
            id: s.id,
            kind: "signal" as const,
            skey: s.key,
            label: SIGNAL_LABEL_KEYS[s.key],
          }))
        );
      }
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) setItem(STORAGE_KEYS.summary, { said, signals });
  }, [said, signals, loaded]);

  const addNote = () => {
    const text = noteDraft.trim();
    if (!text) return;
    setSaid((prev) => [...prev, { id: `note-${Date.now()}`, topic: "note", text, kind: "said" }]);
    setNoteDraft("");
  };

  return (
    <RequireConsent>
      <div className="pt-6 flex flex-col gap-5">
        <h1 className="text-2xl font-bold">{t("summary.title")}</h1>
        {(said.length > 0 || signals.length > 0 || dailyRecap) && <ReadAloud text={speechText} />}

        {dailyRecap && (
          <section className="card daily-recap" aria-labelledby="daily-recap-heading">
            <p className="eyebrow">{lang === "ar" ? "صوتك + أفعالك + بياناتك" : "Your voice + actions + data"}</p>
            <h2 id="daily-recap-heading" className="text-xl font-bold">{dailyRecap.title}</h2>
            <ul className="recap-list mt-3">{dailyRecap.lines.map((line, index) => <li key={index}>{line}</li>)}</ul>
            {dailyRecap.watch && <p className="support-note mt-3">{dailyRecap.watch}</p>}
            <p className="text-sm mt-3" style={{ color: "var(--muted)" }}>{dailyRecap.disclaimer}</p>
          </section>
        )}

        <section aria-labelledby="said-heading">
          <h2 id="said-heading" className="text-xl font-bold flex items-center gap-2" style={{ color: "var(--accent)" }}>
            <span aria-hidden>💬</span> {t("summary.said")}
          </h2>
          {said.length === 0 && <p style={{ color: "var(--muted)" }}>{t("summary.empty")}</p>}
          <ul className="flex flex-col gap-3 mt-3">
            {said.map((item) => (
              <EditableSaid
                key={item.id}
                item={item}
                onChange={(it) => setSaid((p) => p.map((x) => (x.id === it.id ? it : x)))}
                onDelete={() => setSaid((p) => p.filter((x) => x.id !== item.id))}
              />
            ))}
          </ul>
          <div className="flex gap-2 mt-3">
            <input
              type="text"
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              placeholder={t("summary.addnote.placeholder")}
              aria-label={t("summary.addnote")}
              style={{ minHeight: 56 }}
            />
            <button className="btn btn-outline" onClick={addNote} disabled={!noteDraft.trim()}>
              {t("summary.add")}
            </button>
          </div>
        </section>

        {signals.length > 0 && (
          <section aria-labelledby="signals-heading">
            <SyntheticBadge source={storedSignals?.source ?? "synthetic"} fetchedAt={storedSignals?.fetchedAt} />
            <h2 id="signals-heading" className="text-xl font-bold flex items-center gap-2" style={{ color: "#6b4e00" }}>
              <span aria-hidden>⌚</span> {t("summary.signals")}
            </h2>
            <ul className="flex flex-col gap-3 mt-3">
              {signals.map((item) => (
                <li key={item.id} className="card flex items-center justify-between gap-3" data-testid={item.id}>
                  <div>
                    <p className="font-semibold">
                      {t(item.label as DictKey)}{" "}
                      <span className={storedSignals?.source === "whoop" ? "badge badge-live" : "badge badge-warn"} style={{ fontSize: "0.75rem" }}>
                        {storedSignals?.source === "whoop" ? t("summary.live") : t("summary.synthetic")}
                      </span>
                    </p>
                    <p className="text-xl font-bold">
                      {signalTileByKey(item.skey, storedSignals) ? formatSignalValue(signalTileByKey(item.skey, storedSignals)!, lang) : ""}
                    </p>
                  </div>
                  <button
                    className="btn btn-outline"
                    style={{ minHeight: 48, color: "var(--error)", borderColor: "var(--error)" }}
                    onClick={() => setSignals((p) => p.filter((x) => x.id !== item.id))}
                  >
                    {t("summary.delete")}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="text-sm" style={{ color: "var(--muted)" }}>
          {t("summary.disclaimer")}
        </p>
        <button
          className="btn btn-primary w-full"
          onClick={() => router.push("/share")}
          disabled={said.length + signals.length === 0}
        >
          {t("summary.continue")}
        </button>
        <button className="btn btn-outline w-full" onClick={() => router.push("/history")}>
          {lang === "ar" ? "عرض سجلي اليومي" : "View my daily history"}
        </button>
      </div>
    </RequireConsent>
  );
}
