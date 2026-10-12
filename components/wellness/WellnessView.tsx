"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useLocale } from "@/components/providers/LocaleProvider";
import { HealthDataConsent } from "@/components/legal/HealthDataConsent";
import { WellnessArt } from "@/components/mascot/WellnessArt";
import type { Exercise, SupplementData, WellnessKind, WorkoutData } from "@/lib/wellness/types";
import type { TranslationKey } from "@/lib/i18n";

interface Entry {
  id: string;
  kind: WellnessKind;
  data: WorkoutData | SupplementData;
  createdAt: string;
  updatedAt: string;
}

const INPUT = "w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/10";
const BUTTON = "press rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50";
const emptyWorkout = (): WorkoutData => ({ title: "", exercises: [{ name: "", sets: 1, reps: "", note: "" }], notes: "" });
const emptySupplement = (): SupplementData => ({ name: "", amount: "", schedule: "", note: "" });

type ApiResult<T> = { ok: true; data: T } | { ok: false; code: string };

async function request<T>(url: string, init?: RequestInit): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, { cache: "no-store", ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
    const data = await res.json();
    if (!res.ok) return { ok: false, code: typeof data.error === "string" ? data.error : "unavailable" };
    return { ok: true, data: data as T };
  } catch {
    return { ok: false, code: "unavailable" };
  }
}

function errorKey(code: string): TranslationKey {
  const keys: Record<string, TranslationKey> = {
    unauthenticated: "community.error.auth",
    consent_required: "wellness.consentNeeded",
    conflict: "wellness.conflict",
    entry_limit: "wellness.limit",
    rate_limited: "community.error.rate",
    invalid_request: "wellness.invalid",
    not_found: "wellness.notFound",
  };
  return keys[code] ?? "wellness.unavailable";
}

export function WellnessView({ kind }: { kind: WellnessKind }) {
  const { account, status } = useAuth();
  return <WellnessContent key={`${account?.userId ?? status}:${kind}`} kind={kind} />;
}

function WellnessContent({ kind }: { kind: WellnessKind }) {
  const { status } = useAuth();
  const { t, d } = useLocale();
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<TranslationKey | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Entry | null>(null);
  const [workout, setWorkout] = useState<WorkoutData>(emptyWorkout);
  const [supplement, setSupplement] = useState<SupplementData>(emptySupplement);
  const [removing, setRemoving] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const pending = useRef<AbortController | null>(null);
  const isWorkout = kind === "workout";

  const load = useCallback(async (): Promise<Entry[] | null> => {
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    const result = await request<{ entries: Entry[] }>(`/api/wellness?kind=${kind}`, { signal: controller.signal });
    if (controller.signal.aborted) return null;
    if (!result.ok) {
      setError(result.code);
      if (result.code === "unauthenticated" || result.code === "consent_required") setEntries(null);
      return null;
    }
    setError(null);
    setEntries(result.data.entries);
    return result.data.entries;
  }, [kind]);

  useEffect(() => {
    if (status === "member") void load();
    return () => pending.current?.abort();
  }, [status, load]);

  function start(entry?: Entry) {
    setEditing(entry ?? null);
    setWorkout(entry?.kind === "workout" ? structuredClone(entry.data) as WorkoutData : emptyWorkout());
    setSupplement(entry?.kind === "supplement" ? structuredClone(entry.data) as SupplementData : emptySupplement());
    setOpen(true);
    setError(null);
    setNotice(null);
    requestAnimationFrame(() => document.getElementById("wellness-editor")?.scrollIntoView({ block: "start", behavior: "smooth" }));
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setNotice(null);
    const result = await request("/api/wellness", {
      method: "POST",
      body: JSON.stringify({
        action: editing ? "update" : "create", kind, id: editing?.id,
        updatedAt: editing?.updatedAt, data: isWorkout ? workout : supplement,
      }),
    });
    setBusy(false);
    if (!result.ok) return setError(result.code);
    setEditing(null);
    setOpen(false);
    setNotice("wellness.saved");
    await load();
  }

  async function remove(entry: Entry) {
    setBusy(true);
    const result = await request("/api/wellness", {
      method: "POST",
      body: JSON.stringify({ action: "delete", kind, id: entry.id, updatedAt: entry.updatedAt }),
    });
    setBusy(false);
    if (!result.ok) return setError(result.code);
    if (editing?.id === entry.id) {
      setOpen(false);
      setEditing(null);
    }
    setRemoving(null);
    setNotice("wellness.deleted");
    await load();
  }

  async function acceptConsent() {
    if (!consent) return;
    setBusy(true);
    const result = await request("/api/consent", { method: "POST", body: JSON.stringify({ type: "health_data" }) });
    setBusy(false);
    if (!result.ok) return setError(result.code);
    await load();
  }

  const titleKey = isWorkout ? "wellness.workouts" : "wellness.supplements";
  const canEdit = entries !== null && status === "member" && error !== "consent_required" && error !== "unauthenticated";

  return (
    <div className="space-y-5">
      <section className="flex items-center justify-between gap-4 pb-3 pt-1">
        <div>
          <p className="eyebrow">{t("wellness.private")}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">{t(titleKey)}</h1>
          <p className="mt-2 max-w-xl text-sm text-ink-2">{t(isWorkout ? "wellness.workoutSub" : "wellness.supplementSub")}</p>
        </div>
        <span className={`rounded-2xl p-3 ${isWorkout ? "bg-brand-soft" : "bg-amber-50"}`}>
          <WellnessArt kind={isWorkout ? "movement" : "supplements"} size={48} />
        </span>
      </section>

      <nav className="segmented-control" aria-label={t("wellness.title")}>
        {(["workout", "supplement"] as const).map((tab) => (
          <Link
            key={tab}
            href={`/wellness?kind=${tab}`}
            aria-current={tab === kind ? "page" : undefined}
            className={`press rounded-full px-4 py-2 text-sm font-semibold ${tab === kind ? "bg-brand text-white" : "border border-line bg-white text-ink-2"}`}
          >
            {t(tab === "workout" ? "wellness.workouts" : "wellness.supplements")}
          </Link>
        ))}
        <Link href="/focus" className="press rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-ink-2">{t("focus.title")}</Link>
      </nav>

      <p className="rounded-2xl border border-line bg-white px-4 py-3 text-xs leading-relaxed text-ink-2">{t(isWorkout ? "wellness.workoutSafety" : "wellness.supplementSafety")}</p>

      {status === "loading" && <p className="text-sm text-muted">{t("common.loading")}</p>}
      {status !== "loading" && status !== "member" && (
        <section className="card space-y-3 p-5">
          <p className="text-sm text-ink-2">{t("wellness.membersOnly")}</p>
          <Link href="/signin" className={`${BUTTON} inline-block`}>{t("onboarding.signIn")}</Link>
        </section>
      )}
      {error && (
        <div role="alert" className="space-y-3 rounded-2xl bg-warn-soft p-4 text-sm text-ink-2">
          <p>{t(errorKey(error))}</p>
          {error === "consent_required" ? (
            <>
              <HealthDataConsent id="wellness-consent" checked={consent} onChange={setConsent} />
              <button type="button" disabled={!consent || busy} onClick={acceptConsent} className={BUTTON}>{t("wellness.enable")}</button>
            </>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                const latest = await load();
                if (latest && error === "conflict") {
                  const updated = latest.find((entry) => entry.id === editing?.id);
                  if (updated) start(updated);
                  else { setOpen(false); setEditing(null); }
                  setRemoving(null);
                }
              }}
              className="font-semibold text-brand underline"
            >
              {t(error === "conflict" ? "wellness.reloadLatest" : "community.retry")}
            </button>
          )}
        </div>
      )}
      {notice && <p role="status" className="text-sm font-medium text-brand">{t(notice)}</p>}
      {status === "member" && !error && entries === null && <p className="text-sm text-muted">{t("common.loading")}</p>}

      {canEdit && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-ink-2">{t("wellness.savedCount", { count: entries.length })}</h2>
            {!open && <button type="button" onClick={() => start()} className={BUTTON}>{t(isWorkout ? "wellness.addWorkout" : "wellness.addSupplement")}</button>}
          </div>
          {open && (
            <form id="wellness-editor" onSubmit={save} className="card scroll-mt-24 space-y-4 p-5">
              <h2 className="text-lg font-semibold">{t(editing ? "wellness.edit" : isWorkout ? "wellness.addWorkout" : "wellness.addSupplement")}</h2>
              {isWorkout ? (
                <>
                  <Field label={t("wellness.routineName")} id="workout-title">
                    <input id="workout-title" required maxLength={80} value={workout.title} onChange={(e) => setWorkout({ ...workout, title: e.target.value })} className={INPUT} />
                  </Field>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[620px] text-start text-sm">
                      <thead className="text-start text-xs text-muted">
                        <tr>{["exercise", "sets", "reps", "note", "remove"].map((field) => <th key={field} className="p-2 text-start font-medium">{t(`wellness.${field}` as TranslationKey)}</th>)}</tr>
                      </thead>
                      <tbody>
                        {workout.exercises.map((exercise, index) => (
                          <ExerciseRow
                            key={index}
                            index={index}
                            value={exercise}
                            canRemove={workout.exercises.length > 1}
                            onChange={(next) => setWorkout({ ...workout, exercises: workout.exercises.map((row, i) => i === index ? next : row) })}
                            onRemove={() => setWorkout({ ...workout, exercises: workout.exercises.filter((_, i) => i !== index) })}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <button type="button" disabled={workout.exercises.length >= 20} onClick={() => setWorkout({ ...workout, exercises: [...workout.exercises, { name: "", sets: 1, reps: "", note: "" }] })} className="text-sm font-semibold text-brand disabled:opacity-50">{t("wellness.addExercise")}</button>
                  <Field label={t("wellness.notes")} id="workout-notes">
                    <textarea id="workout-notes" maxLength={1000} rows={2} value={workout.notes} onChange={(e) => setWorkout({ ...workout, notes: e.target.value })} className={INPUT} />
                  </Field>
                </>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {(["name", "amount", "schedule", "note"] as const).map((field) => (
                    <Field key={field} id={`supplement-${field}`} label={t(`wellness.supplement.${field}` as TranslationKey)}>
                      <input id={`supplement-${field}`} required={field === "name"} maxLength={{ name: 80, amount: 80, schedule: 120, note: 500 }[field]} value={supplement[field]} onChange={(e) => setSupplement({ ...supplement, [field]: e.target.value })} className={INPUT} />
                    </Field>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <button type="submit" disabled={busy || error === "conflict"} className={BUTTON}>{t("wellness.save")}</button>
                <button type="button" disabled={busy} onClick={() => setOpen(false)} className="press rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-ink-2">{t("community.cancel")}</button>
              </div>
            </form>
          )}
          {entries.length === 0 && !open && <p className="card p-6 text-sm text-muted">{t(isWorkout ? "wellness.emptyWorkouts" : "wellness.emptySupplements")}</p>}
          <ul className="space-y-4">
            {entries.map((entry) => (
              <li key={entry.id} className="card space-y-3 p-5" data-testid={`wellness-${kind}-entry`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="break-words text-base font-semibold">{entry.kind === "workout" ? (entry.data as WorkoutData).title : (entry.data as SupplementData).name}</h3>
                    <p className="mt-1 text-[11px] text-muted">{t("wellness.updated", { date: d(entry.updatedAt) })}</p>
                  </div>
                  <div className="flex shrink-0 gap-3">
                    <button type="button" disabled={busy} onClick={() => start(entry)} className="text-xs font-semibold text-brand">{t("wellness.edit")}</button>
                    <button type="button" disabled={busy} onClick={() => setRemoving(entry.id)} className="text-xs font-semibold text-muted">{t("community.delete")}</button>
                  </div>
                </div>
                {entry.kind === "workout" ? <RoutineTable data={entry.data as WorkoutData} /> : <SupplementDetails data={entry.data as SupplementData} />}
                {removing === entry.id && (
                  <div className="flex flex-wrap items-center gap-3 rounded-xl bg-canvas p-3">
                    <p className="text-xs text-ink-2">{t("wellness.deleteConfirm")}</p>
                    <button type="button" disabled={busy} onClick={() => remove(entry)} className="text-xs font-semibold text-brand">{t("community.confirmDelete")}</button>
                    <button type="button" onClick={() => setRemoving(null)} className="text-xs text-muted">{t("community.cancel")}</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return <div><label htmlFor={id} className="mb-1 block text-xs font-medium text-ink-2">{label}</label>{children}</div>;
}

function ExerciseRow({ index, value, canRemove, onChange, onRemove }: {
  index: number; value: Exercise; canRemove: boolean; onChange: (row: Exercise) => void; onRemove: () => void;
}) {
  const { t } = useLocale();
  return (
    <tr>
      <td className="p-1"><input aria-label={`${t("wellness.exercise")} ${index + 1}`} required maxLength={80} value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })} className={INPUT} /></td>
      <td className="w-20 p-1"><input aria-label={`${t("wellness.sets")} ${index + 1}`} required type="number" min={1} max={20} step={1} value={value.sets} onChange={(e) => onChange({ ...value, sets: Number(e.target.value) })} className={INPUT} /></td>
      <td className="w-28 p-1"><input aria-label={`${t("wellness.reps")} ${index + 1}`} maxLength={40} value={value.reps} onChange={(e) => onChange({ ...value, reps: e.target.value })} className={INPUT} /></td>
      <td className="p-1"><input aria-label={`${t("wellness.note")} ${index + 1}`} maxLength={200} value={value.note} onChange={(e) => onChange({ ...value, note: e.target.value })} className={INPUT} /></td>
      <td className="p-2"><button type="button" disabled={!canRemove} onClick={onRemove} className="text-xs font-semibold text-muted disabled:opacity-30" aria-label={`${t("wellness.remove")} ${index + 1}`}>{t("wellness.remove")}</button></td>
    </tr>
  );
}

function RoutineTable({ data }: { data: WorkoutData }) {
  const { t } = useLocale();
  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[440px] text-start text-sm">
          <thead><tr>{["exercise", "sets", "reps", "note"].map((field) => <th key={field} className="border-b border-line p-2 text-start text-xs font-medium text-muted">{t(`wellness.${field}` as TranslationKey)}</th>)}</tr></thead>
          <tbody>{data.exercises.map((row, index) => <tr key={index} className="border-b border-line last:border-0"><td className="p-2">{row.name}</td><td className="p-2">{row.sets}</td><td className="p-2">{row.reps || "—"}</td><td className="p-2">{row.note || "—"}</td></tr>)}</tbody>
        </table>
      </div>
      {data.notes && <p className="whitespace-pre-wrap break-words text-xs text-ink-2">{data.notes}</p>}
    </>
  );
}

function SupplementDetails({ data }: { data: SupplementData }) {
  const { t } = useLocale();
  return (
    <dl className="grid gap-3 text-sm sm:grid-cols-3">
      {(["amount", "schedule", "note"] as const).map((field) => (
        <div key={field}><dt className="text-xs text-muted">{t(`wellness.supplement.${field}` as TranslationKey)}</dt><dd className="mt-1 whitespace-pre-wrap break-words">{data[field] || "—"}</dd></div>
      ))}
    </dl>
  );
}
