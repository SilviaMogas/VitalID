"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLang } from "../providers";
import RequireConsent from "@/components/RequireConsent";
import { getItem, removeItem, setItem, STORAGE_KEYS } from "@/lib/storage";
import {
  formatSignalValue,
  syntheticSignals,
  tilesFromWhoop,
  type SignalTile,
  type StoredSignals,
} from "@/data/syntheticSignals";
import type { WhoopSignals } from "@/lib/whoop";
import SyntheticBadge from "@/components/SyntheticBadge";
import { circularDemo, circularDemoTiles } from "@/data/circularDemo";
import type { DemoProfile } from "@/lib/demo";

const LABEL_KEYS = {
  sleep: "signals.sleep",
  rhr: "signals.rhr",
  hrv: "signals.hrv",
  recovery: "signals.recovery",
} as const;

function Sparkline({ values }: { values: number[] }) {
  if (!values.length) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const w = 120;
  const h = 28;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      {values.map((v, i) => {
        const bh = 6 + ((v - min) / span) * (h - 10);
        const bw = w / values.length - 4;
        return (
          <rect
            key={i}
            x={i * (w / values.length) + 2}
            y={h - bh}
            width={bw}
            height={bh}
            rx={2}
            fill="var(--accent)"
            opacity={0.35 + (0.65 * (v - min)) / span}
          />
        );
      })}
    </svg>
  );
}

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const fn = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);
  return reduced;
}

function CountUp({ to, suffix = "" }: { to: number; suffix?: string }) {
  const reduced = useReducedMotion();
  const [val, setVal] = useState(reduced ? to : 0);
  useEffect(() => {
    if (reduced) {
      setVal(to);
      return;
    }
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const k = Math.min(1, (now - start) / 800);
      setVal(Math.round(to * k));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, reduced]);
  return (
    <span>
      {val}
      {suffix}
    </span>
  );
}

function RecoveryRing({ value }: { value: number }) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(reduced ? value : 0);
  useEffect(() => {
    if (reduced) {
      setShown(value);
      return;
    }
    const id = requestAnimationFrame(() => setShown(value));
    return () => cancelAnimationFrame(id);
  }, [value, reduced]);
  const r = 52;
  const c = 2 * Math.PI * r;
  const color = value >= 67 ? "#1f9d55" : value >= 34 ? "#d99a06" : "#c0392b";
  return (
    <svg
      width="140"
      height="140"
      viewBox="0 0 140 140"
      role="img"
      aria-label={`Recovery ${value}%`}
      data-testid="recovery-ring"
      style={{ filter: `drop-shadow(0 0 14px ${color}55)` }}
    >
      <circle cx="70" cy="70" r={r} fill="none" stroke="var(--line)" strokeWidth="12" />
      <circle
        cx="70"
        cy="70"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="12"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c - (c * shown) / 100}
        transform="rotate(-90 70 70)"
        style={{ transition: "stroke-dashoffset 1.2s ease-out" }}
      />
      <text x="70" y="70" textAnchor="middle" dominantBaseline="central" fontSize="28" fontWeight="bold" fill={color}>
        {Math.round(shown)}%
      </text>
    </svg>
  );
}

type ConnState = "loading" | "unconfigured" | "disconnected" | "connected" | "demo";

export default function SignalsPage() {
  return (
    <Suspense>
      <SignalsPageInner />
    </Suspense>
  );
}

function SignalsPageInner() {
  const { t, lang } = useLang();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [include, setInclude] = useState(true);
  const [conn, setConn] = useState<ConnState>("loading");
  const [sig, setSig] = useState<WhoopSignals | null>(null);
  const whoopErr = searchParams.get("whoop") === "error";
  const prevSource = useRef<string | null>(null);

  const persist = (stored: StoredSignals) => {
    if (prevSource.current === null) prevSource.current = getItem<StoredSignals>(STORAGE_KEYS.signals)?.source ?? "synthetic";
    if (prevSource.current !== stored.source) removeItem(STORAGE_KEYS.summary);
    setItem(STORAGE_KEYS.signals, stored);
  };

  const load = async () => {
    try {
      const res = await fetch("/api/whoop/signals", { cache: "no-store" });
      const d = (await res.json()) as { configured: boolean; connected: boolean; signals?: WhoopSignals };
      if (!d.configured) {
        setConn("unconfigured");
        persist({ source: "synthetic", tiles: syntheticSignals });
      } else if (!d.connected || !d.signals) {
        setConn("disconnected");
        persist({ source: "synthetic", tiles: syntheticSignals });
      } else {
        setConn("connected");
        setSig(d.signals);
        persist({ source: "whoop", tiles: tilesFromWhoop(d.signals), fetchedAt: d.signals.fetchedAt, firstName: d.signals.firstName });
      }
    } catch {
      setConn("unconfigured");
      persist({ source: "synthetic", tiles: syntheticSignals });
    }
  };

  useEffect(() => {
    const saved = getItem<boolean>(STORAGE_KEYS.includeSignals);
    if (saved !== null) setInclude(saved);
    if (getItem<DemoProfile>(STORAGE_KEYS.profile)?.isDemo) {
      setConn("demo");
      persist({ source: "circular-sample", tiles: circularDemoTiles });
    } else {
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const disconnect = async () => {
    await fetch("/api/whoop/disconnect", { method: "POST" });
    removeItem(STORAGE_KEYS.signals);
    removeItem(STORAGE_KEYS.summary);
    setSig(null);
    setConn("disconnected");
    persist({ source: "synthetic", tiles: syntheticSignals });
  };

  const tiles = conn === "demo" ? circularDemoTiles : conn === "connected" && sig ? tilesFromWhoop(sig) : syntheticSignals;

  return (
    <RequireConsent>
      <div className="pt-6 flex flex-col gap-5">
        <h1 className="text-2xl font-bold">{t("signals.title")}</h1>
        {whoopErr && (
          <p role="alert" style={{ color: "var(--error)" }}>
            {t("signals.error")}
          </p>
        )}
        {conn === "loading" && (
          <div className="card" aria-busy="true" aria-label="loading">
            <p style={{ color: "var(--muted)" }}>…</p>
          </div>
        )}
        {conn !== "loading" && conn !== "connected" && conn !== "demo" && (
          <>
            <SyntheticBadge source="synthetic" />
            {conn === "disconnected" && (
              <div className="card flex flex-col gap-3">
                <a href="/api/whoop/connect" className="btn btn-primary w-full" data-testid="whoop-connect">
                  {t("signals.connect")}
                </a>
                <p className="text-sm" style={{ color: "var(--muted)" }}>
                  {t("signals.privacy")} {t("signals.whoopnote")}
                </p>
              </div>
            )}
          </>
        )}
        {conn === "demo" && (
          <div className="card flex flex-col gap-3" data-testid="circular-sample">
            <SyntheticBadge source="circular-sample" />
            <div>
              <p className="eyebrow">Circular Ring · {circularDemo.snapshotDate}</p>
              <h2 className="text-xl font-bold">{lang === "ar" ? "ملخص فاطمة" : "Fátima’s daily snapshot"}</h2>
              <p className="text-sm" style={{ color: "var(--muted)" }}>{lang === "ar" ? "بيانات Circular المقدمة لهذا العرض. ليست قراءة مباشرة من خاتم فاطمة." : "From the supplied Circular sample. This is not a live reading from Fátima’s ring."}</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <span className="badge badge-neutral">{lang === "ar" ? "جودة النوم" : "Sleep score"} {circularDemo.sleepScore}/100</span>
              <span className="badge badge-neutral">{lang === "ar" ? "اليوم السابق" : "Previous day"} {circularDemo.previousSleepScore}/100</span>
              <span className="badge badge-neutral">{lang === "ar" ? "خطوات" : "Steps"} {circularDemo.steps.toLocaleString(lang === "ar" ? "ar" : "en")}</span>
            </div>
          </div>
        )}
        {conn === "connected" && sig && (
          <div className="card flex flex-col items-center gap-3" data-testid="whoop-live">
            {sig.recovery != null && <RecoveryRing value={sig.recovery} />}
            {sig.firstName && <p className="text-xl font-bold">{t("signals.connected.hello", { name: sig.firstName })}</p>}
            <SyntheticBadge source="whoop" fetchedAt={sig.fetchedAt} />
            <div className="flex gap-2 w-full">
              <button className="btn btn-outline flex-1" onClick={load}>
                {t("signals.refresh")}
              </button>
              <button className="btn btn-outline flex-1" onClick={disconnect}>
                {t("signals.disconnect")}
              </button>
            </div>
          </div>
        )}
        {conn !== "loading" && (
          <div className="grid grid-cols-2 gap-3">
            {tiles.map((s: SignalTile) => (
              <div key={s.id} className="card flex flex-col gap-1">
                <p className="text-sm font-semibold" style={{ color: "var(--muted)" }}>
                  {t(LABEL_KEYS[s.key])}
                </p>
                <p className="text-2xl font-bold">
                  {conn === "connected" && sig && s.key === "recovery" && sig.recovery != null ? (
                    <CountUp to={sig.recovery} suffix="%" />
                  ) : conn === "connected" && sig && s.key === "rhr" && sig.rhr != null ? (
                    <CountUp to={sig.rhr} suffix=" bpm" />
                  ) : conn === "connected" && sig && s.key === "hrv" && sig.hrv != null ? (
                    <CountUp to={sig.hrv} suffix=" ms" />
                  ) : (
                    formatSignalValue(s, lang)
                  )}
                </p>
                {s.sub && (
                  <p className="text-sm" style={{ color: "var(--muted)" }}>
                    {s.sub[lang]}
                  </p>
                )}
                {s.week && s.week.length > 0 && (
                  <div>
                    <p className="text-xs" style={{ color: "var(--muted)" }}>
                      {t("signals.week")}
                    </p>
                    <Sparkline values={s.week} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        {conn === "connected" && sig?.sleepStages && (
          <div className="card">
            <p className="font-bold mb-2">{t("signals.stages")}</p>
            {(() => {
              const st = sig.sleepStages!;
              const total = st.light + st.deep + st.rem + st.awake || 1;
              const parts: { key: string; v: number; color: string }[] = [
                { key: "signals.stage.awake", v: st.awake, color: "#d8cfc0" },
                { key: "signals.stage.light", v: st.light, color: "#9ec9c4" },
                { key: "signals.stage.deep", v: st.deep, color: "#0f6e67" },
                { key: "signals.stage.rem", v: st.rem, color: "#6b4e00" },
              ];
              return (
                <>
                  <div style={{ display: "flex", height: 24, borderRadius: 8, overflow: "hidden" }} role="img" aria-label={t("signals.stages")}>
                    {parts.map((p) => (
                      <div key={p.key} style={{ width: `${(p.v / total) * 100}%`, background: p.color }} />
                    ))}
                  </div>
                  <ul className="flex gap-3 mt-2 flex-wrap text-sm" style={{ color: "var(--muted)" }}>
                    {parts.map((p) => (
                      <li key={p.key}>
                        <span style={{ display: "inline-block", width: 10, height: 10, background: p.color, borderRadius: 2, marginInlineEnd: 4 }} />
                        {t(p.key as "signals.stage.light")} {Math.round((p.v / total) * 100)}%
                      </li>
                    ))}
                  </ul>
                </>
              );
            })()}
          </div>
        )}
        {conn === "connected" && sig && (sig.spo2 != null || sig.skinTempC != null || sig.respiratoryRate != null) && (
          <div className="flex gap-2 flex-wrap">
            {sig.spo2 != null && <span className="badge badge-neutral">{t("signals.spo2")} {sig.spo2}%</span>}
            {sig.skinTempC != null && <span className="badge badge-neutral">{t("signals.skintemp")} {sig.skinTempC}°C</span>}
            {sig.respiratoryRate != null && <span className="badge badge-neutral">{t("signals.resp")} {sig.respiratoryRate}/min</span>}
          </div>
        )}
        <label className="field-check card">
          <input
            type="checkbox"
            checked={include}
            onChange={(e) => {
              setInclude(e.target.checked);
              setItem(STORAGE_KEYS.includeSignals, e.target.checked);
            }}
          />
          <span>{t("signals.include")}</span>
        </label>
        <button className="btn btn-primary w-full" onClick={() => router.push("/summary")}>
          {t("signals.continue")}
        </button>
      </div>
    </RequireConsent>
  );
}
