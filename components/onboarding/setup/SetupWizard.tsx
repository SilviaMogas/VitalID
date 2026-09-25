"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale } from "@/components/providers/LocaleProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { useMembership } from "@/components/providers/MembershipProvider";
import { Broccoli } from "@/components/mascot/Broccoli";
import { Companion } from "@/components/companions/Companion";
import { ConnectorBadge, ProviderMark } from "@/components/connectors/ConnectorBadge";
import {
  CONNECTOR_CATEGORIES,
  PROVIDERS,
  initialStatusFor,
  type ConnectorCategory,
  type ProviderId,
  type UserConnector,
} from "@/lib/connectors";
import {
  ACTIVITY_LEVELS,
  BLOOD_TYPES,
  GENDERS,
  GOAL_IDS,
  ONBOARDING_STEPS,
  emptySetup,
  type GoalId,
  type UserSetup,
  type UserSetupPatch,
} from "@/lib/onboarding/types";
import { PLANS } from "@/lib/plans";
import type { TranslationKey } from "@/lib/i18n";
import { Choice, Field, NumberInput, StepHeader, SummaryRow, inputClass } from "./ui";

const GOAL_ICON: Record<GoalId, string> = {
  sleep: "🌙",
  recovery: "💪",
  loseWeight: "⚖️",
  gainMuscle: "🏋️",
  fitness: "🏃",
  stress: "🧘",
  nutrition: "🥗",
  wellbeing: "🌿",
};

const CATEGORY_KEY: Record<ConnectorCategory, TranslationKey> = {
  wearables: "connectors.cat.wearables",
  diet: "connectors.cat.diet",
  activity: "connectors.cat.activity",
  sleep: "connectors.cat.sleep",
  records: "connectors.cat.records",
  hydration: "connectors.cat.hydration",
  mental: "connectors.cat.mental",
};

function clampStep(n: number): number {
  return Math.min(ONBOARDING_STEPS, Math.max(1, Math.round(n) || 1));
}

export function SetupWizard() {
  const { t, locale, toggleLocale } = useLocale();
  const router = useRouter();
  const params = useSearchParams();
  const { status, account, refresh: refreshAuth, signOut } = useAuth();
  const { plan } = useMembership();

  const [setup, setSetup] = useState<UserSetup | null>(null);
  const [step, setStep] = useState<number>(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "guest") router.replace("/signin");
    if (status === "fatima") router.replace("/");
  }, [status, router]);

  useEffect(() => {
    if (status !== "member") return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/onboarding", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as UserSetup;
        if (cancelled) return;
        setSetup(data);
        const requested = Number(params.get("step"));
        setStep(clampStep(requested || data.onboardingStep));
      } catch {
        if (!cancelled) {
          setSetup(emptySetup());
          setError(t("common.error"));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status, params, t]);

  const persist = useCallback(
    async (patch: UserSetupPatch): Promise<UserSetup | null> => {
      setSaving(true);
      setError(null);
      try {
        const res = await fetch("/api/onboarding", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as UserSetup;
        setSetup(data);
        return data;
      } catch {
        setError(t("common.error"));
        return null;
      } finally {
        setSaving(false);
      }
    },
    [t],
  );

  const update = (patch: UserSetupPatch) =>
    setSetup((s) => {
      if (!s) return s;
      return {
        ...s,
        ...patch,
        profile: { ...s.profile, ...patch.profile },
        health: { ...s.health, ...patch.health },
        baseline: { ...s.baseline, ...patch.baseline },
        goals: patch.goals ?? s.goals,
        connectors: patch.connectors ?? s.connectors,
      };
    });

  const stepPatch = (s: UserSetup, n: number): UserSetupPatch => {
    switch (n) {
      case 1:
        return { profile: s.profile };
      case 2:
        return { goals: s.goals };
      case 3:
        return { health: s.health };
      case 4:
        return { baseline: s.baseline };
      case 5:
        return { connectors: s.connectors };
      default:
        return {};
    }
  };

  async function goNext() {
    if (!setup) return;
    const nextStep = clampStep(step + 1);
    const saved = await persist({
      ...stepPatch(setup, step),
      onboardingStep: Math.max(nextStep, setup.onboardingStep),
    });
    if (saved) {
      setStep(nextStep);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function goBack() {
    setStep((s) => clampStep(s - 1));
  }

  async function finish() {
    const saved = await persist({ onboardingStep: ONBOARDING_STEPS, onboardingCompleted: true });
    if (!saved) return;
    await refreshAuth();
    router.push("/");
  }

  const progress = useMemo(() => (step / ONBOARDING_STEPS) * 100, [step]);

  if (status === "loading" || (status === "member" && !setup)) {
    return <div className="min-h-[60dvh]" aria-busy />;
  }
  if (status !== "member" || !setup) return null;

  const stepTitle: TranslationKey[] = [
    "setup.step1.title",
    "setup.step2.title",
    "setup.step3.title",
    "setup.step4.title",
    "setup.step5.title",
    "setup.step6.title",
  ];

  const step1Valid =
    setup.profile.firstName.trim() !== "" &&
    setup.profile.lastName.trim() !== "" &&
    setup.profile.dob !== "" &&
    setup.profile.gender !== "" &&
    setup.profile.country.trim() !== "" &&
    setup.profile.city.trim() !== "";

  const canContinue =
    step === 1 ? step1Valid : step === 2 ? setup.goals.length > 0 : true;

  return (
    <div className="space-y-6 pb-8">
      <header className="flex items-center justify-between">
        <span className="text-base font-semibold tracking-tight text-brand">{t("app.name")}</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleLocale}
            aria-label={t("lang.label")}
            lang={locale === "en" ? "ar" : "en"}
            className="press rounded-full border border-line bg-white/80 px-3.5 py-1.5 text-sm font-medium text-ink-2"
          >
            {t("lang.switch")}
          </button>
          <button
            type="button"
            onClick={() => void signOut().then(() => router.push("/welcome"))}
            className="press rounded-full border border-line bg-white/80 px-3.5 py-1.5 text-sm font-medium text-ink-2"
          >
            {t("auth.signOut")}
          </button>
        </div>
      </header>

      {/* progress */}
      <div>
        <div className="flex items-center justify-between text-xs font-medium text-muted">
          <span>{t("setup.progress", { step, total: ONBOARDING_STEPS })}</span>
          <span>{t(stepTitle[step - 1])}</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line/70" role="progressbar" aria-valuenow={step} aria-valuemin={1} aria-valuemax={ONBOARDING_STEPS}>
          <div className="h-full rounded-full bg-brand transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div key={step} className="rise space-y-6" style={{ ["--i" as string]: 0 }}>
        {step === 1 && <StepProfile setup={setup} update={update} />}
        {step === 2 && <StepGoals setup={setup} update={update} />}
        {step === 3 && <StepHealth setup={setup} update={update} />}
        {step === 4 && <StepBaseline setup={setup} update={update} />}
        {step === 5 && <StepConnectors setup={setup} update={update} />}
        {step === 6 && <StepReview setup={setup} plan={account?.plan ?? plan} onEdit={setStep} locale={locale} />}
      </div>

      {error && <p className="text-sm text-bad">{error}</p>}

      <div className="sticky bottom-0 -mx-5 flex items-center gap-3 border-t border-line bg-canvas/95 px-5 py-4 backdrop-blur md:static md:mx-0 md:border-0 md:bg-transparent md:px-0">
        {step > 1 ? (
          <button
            type="button"
            onClick={goBack}
            disabled={saving}
            className="press rounded-2xl border border-line bg-white px-5 py-3 text-sm font-semibold text-ink-2 disabled:opacity-50"
          >
            {t("common.back")}
          </button>
        ) : (
          <Link href="/pricing" className="press rounded-2xl border border-line bg-white px-5 py-3 text-sm font-semibold text-ink-2">
            {t("setup.changePlan")}
          </Link>
        )}
        {step < ONBOARDING_STEPS ? (
          <button
            type="button"
            onClick={goNext}
            disabled={saving || !canContinue}
            className="press flex-1 rounded-2xl bg-brand py-3 text-sm font-semibold text-white shadow-hero transition hover:bg-brand-deep disabled:opacity-50"
          >
            {saving ? t("common.loading") : t("setup.next")}
          </button>
        ) : (
          <button
            type="button"
            onClick={finish}
            disabled={saving}
            className="press flex flex-1 items-center justify-center gap-2 rounded-2xl bg-brand py-3 text-sm font-semibold text-white shadow-hero transition hover:bg-brand-deep disabled:opacity-50"
          >
            {saving ? t("common.loading") : t("setup.finishCta")}
            <span className="inline-block rtl:-scale-x-100">→</span>
          </button>
        )}
      </div>
    </div>
  );
}

type StepProps = { setup: UserSetup; update: (p: UserSetupPatch) => void };

function StepProfile({ setup, update }: StepProps) {
  const { t } = useLocale();
  const p = setup.profile;
  const text = (k: keyof typeof p) => (e: React.ChangeEvent<HTMLInputElement>) =>
    update({ profile: { [k]: e.target.value } });
  return (
    <>
      <StepHeader eyebrow={t("setup.step1.eyebrow")} title={t("setup.step1.title")} subtitle={t("setup.step1.subtitle")} companion="shield" />
      <div className="card space-y-4 p-5">
        <div className="grid grid-cols-2 gap-3">
          <Field id="p-first" label={t("auth.firstName")}>
            <input id="p-first" required value={p.firstName} onChange={text("firstName")} className={inputClass} autoComplete="given-name" />
          </Field>
          <Field id="p-last" label={t("auth.lastName")}>
            <input id="p-last" required value={p.lastName} onChange={text("lastName")} className={inputClass} autoComplete="family-name" />
          </Field>
        </div>
        <Field id="p-dob" label={t("setup.dob")}>
          <input id="p-dob" type="date" required dir="ltr" value={p.dob} onChange={text("dob")} className={inputClass} max={new Date().toISOString().slice(0, 10)} />
        </Field>
        <div>
          <p className="mb-1.5 text-xs font-medium text-ink-2">{t("setup.gender")}</p>
          <div className="grid grid-cols-2 gap-2">
            {GENDERS.map((g) => (
              <Choice key={g} selected={p.gender === g} onClick={() => update({ profile: { gender: g } })}>
                {t(`setup.gender.${g}` as TranslationKey)}
              </Choice>
            ))}
          </div>
        </div>
        <Field id="p-nat" label={t("setup.nationality")} optional={t("setup.optional")}>
          <input id="p-nat" value={p.nationality} onChange={text("nationality")} className={inputClass} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field id="p-country" label={t("auth.country")}>
            <input id="p-country" required value={p.country} onChange={text("country")} className={inputClass} autoComplete="country-name" />
          </Field>
          <Field id="p-city" label={t("auth.city")}>
            <input id="p-city" required value={p.city} onChange={text("city")} className={inputClass} autoComplete="address-level2" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field id="p-height" label={t("setup.height")}>
            <NumberInput id="p-height" value={p.heightCm} onChange={(v) => update({ profile: { heightCm: v } })} min={50} max={250} unit="cm" placeholder="170" />
          </Field>
          <Field id="p-weight" label={t("setup.weight")}>
            <NumberInput id="p-weight" value={p.weightKg} onChange={(v) => update({ profile: { weightKg: v } })} min={20} max={400} step={0.1} unit="kg" placeholder="65" />
          </Field>
        </div>
      </div>
    </>
  );
}

function StepGoals({ setup, update }: StepProps) {
  const { t } = useLocale();
  const toggle = (g: GoalId) =>
    update({ goals: setup.goals.includes(g) ? setup.goals.filter((x) => x !== g) : [...setup.goals, g] });
  return (
    <>
      <StepHeader eyebrow={t("setup.step2.eyebrow")} title={t("setup.step2.title")} subtitle={t("setup.step2.subtitle")} companion="dumbbell" />
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {GOAL_IDS.map((g) => (
          <Choice key={g} selected={setup.goals.includes(g)} onClick={() => toggle(g)} icon={<span className="text-lg">{GOAL_ICON[g]}</span>}>
            {t(`setup.goal.${g}` as TranslationKey)}
          </Choice>
        ))}
      </div>
      <p className="text-xs text-muted">{t("setup.step2.hint")}</p>
    </>
  );
}

function StepHealth({ setup, update }: StepProps) {
  const { t } = useLocale();
  const h = setup.health;
  const text = (k: keyof typeof h) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    update({ health: { [k]: e.target.value } });
  const opt = t("setup.optional");
  return (
    <>
      <StepHeader eyebrow={t("setup.step3.eyebrow")} title={t("setup.step3.title")} subtitle={t("setup.step3.subtitle")} companion="heart" />
      <div className="flex items-start gap-3 rounded-2xl bg-sand px-4 py-3 text-sm text-ink-2 ring-1 ring-line">
        <Broccoli state="encouraging" size={40} className="shrink-0" />
        <p>{t("setup.step3.note")}</p>
      </div>
      <div className="card space-y-4 p-5">
        <Field id="h-allergies" label={t("setup.allergies")} optional={opt}>
          <input id="h-allergies" value={h.allergies} onChange={text("allergies")} className={inputClass} placeholder={t("setup.allergies.ph")} />
        </Field>
        <Field id="h-meds" label={t("setup.medications")} optional={opt}>
          <input id="h-meds" value={h.medications} onChange={text("medications")} className={inputClass} placeholder={t("setup.medications.ph")} />
        </Field>
        <Field id="h-cond" label={t("setup.conditions")} optional={opt}>
          <input id="h-cond" value={h.conditions} onChange={text("conditions")} className={inputClass} placeholder={t("setup.conditions.ph")} />
        </Field>
        <div>
          <p className="mb-1.5 flex items-baseline justify-between text-xs font-medium text-ink-2">
            <span>{t("setup.bloodType")}</span>
            <span className="text-[11px] font-normal text-muted">{opt}</span>
          </p>
          <div className="grid grid-cols-4 gap-2" dir="ltr">
            {BLOOD_TYPES.map((b) => (
              <button
                key={b}
                type="button"
                aria-pressed={h.bloodType === b}
                onClick={() => update({ health: { bloodType: h.bloodType === b ? "" : b } })}
                className={`press rounded-xl border py-2 text-sm font-semibold transition ${
                  h.bloodType === b ? "border-brand bg-brand text-white" : "border-line bg-white text-ink-2 hover:bg-canvas"
                }`}
              >
                {b}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field id="h-ecn" label={t("setup.emergencyName")} optional={opt}>
            <input id="h-ecn" value={h.emergencyContactName} onChange={text("emergencyContactName")} className={inputClass} autoComplete="off" />
          </Field>
          <Field id="h-ecp" label={t("setup.emergencyPhone")} optional={opt}>
            <input id="h-ecp" type="tel" dir="ltr" value={h.emergencyContactPhone} onChange={text("emergencyContactPhone")} className={inputClass} placeholder="+971 50 000 0000" />
          </Field>
        </div>
        <Field id="h-notes" label={t("setup.notes")} optional={opt}>
          <textarea id="h-notes" rows={3} value={h.notes} onChange={text("notes")} className={`${inputClass} resize-none`} />
        </Field>
      </div>
    </>
  );
}

function StepBaseline({ setup, update }: StepProps) {
  const { t } = useLocale();
  const b = setup.baseline;
  const num = (k: keyof typeof b) => (v: number | null) => update({ baseline: { [k]: v } });
  return (
    <>
      <StepHeader eyebrow={t("setup.step4.eyebrow")} title={t("setup.step4.title")} subtitle={t("setup.step4.subtitle")} companion="moon" />
      <div className="card space-y-4 p-5">
        <div className="grid grid-cols-2 gap-3">
          <Field id="b-sleep" label={t("setup.sleepHours")}>
            <NumberInput id="b-sleep" value={b.sleepHours} onChange={num("sleepHours")} min={0} max={16} step={0.5} unit="h" placeholder="7.5" />
          </Field>
          <Field id="b-rhr" label={t("setup.restingHr")}>
            <NumberInput id="b-rhr" value={b.restingHr} onChange={num("restingHr")} min={30} max={120} unit="bpm" placeholder="62" />
          </Field>
          <Field id="b-steps" label={t("setup.steps")}>
            <NumberInput id="b-steps" value={b.steps} onChange={num("steps")} min={0} max={60000} step={100} placeholder="8000" />
          </Field>
          <Field id="b-workouts" label={t("setup.workouts")}>
            <NumberInput id="b-workouts" value={b.workoutsPerWeek} onChange={num("workoutsPerWeek")} min={0} max={21} unit={t("setup.perWeek")} placeholder="3" />
          </Field>
        </div>
        <div>
          <p className="mb-1.5 text-xs font-medium text-ink-2">{t("setup.activityLevel")}</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {ACTIVITY_LEVELS.map((a) => (
              <Choice key={a} selected={b.activityLevel === a} onClick={() => update({ baseline: { activityLevel: a } })}>
                {t(`setup.activity.${a}` as TranslationKey)}
              </Choice>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field id="b-water" label={t("setup.hydration")}>
            <NumberInput id="b-water" value={b.hydrationGoalMl} onChange={num("hydrationGoalMl")} min={0} max={10000} step={100} unit="ml" placeholder="2500" />
          </Field>
          <Field id="b-kcal" label={t("setup.calories")}>
            <NumberInput id="b-kcal" value={b.calorieTarget} onChange={num("calorieTarget")} min={0} max={10000} step={50} unit="kcal" placeholder="2000" />
          </Field>
          <Field id="b-protein" label={t("setup.protein")}>
            <NumberInput id="b-protein" value={b.proteinTargetG} onChange={num("proteinTargetG")} min={0} max={500} step={5} unit="g" placeholder="120" />
          </Field>
        </div>
      </div>
      <p className="text-xs text-muted">{t("setup.step4.hint")}</p>
    </>
  );
}

function StepConnectors({ setup, update }: StepProps) {
  const { t } = useLocale();
  const { connectorLimit } = useMembership();
  const isSelected = (provider: ProviderId, category: ConnectorCategory) =>
    setup.connectors.some((c) => c.provider === provider && c.category === category);
  const selectedProviders = new Set(setup.connectors.map((c) => c.provider));
  const atLimit = connectorLimit !== null && selectedProviders.size >= connectorLimit;

  const toggle = (provider: ProviderId, category: ConnectorCategory) => {
    if (PROVIDERS[provider].announcedOnly) return;
    const exists = setup.connectors.find((c) => c.provider === provider && c.category === category);
    if (exists?.status === "connected") return;
    if (!exists && atLimit && !selectedProviders.has(provider)) return;
    const next: UserConnector[] = exists
      ? setup.connectors.filter((c) => c !== exists)
      : [...setup.connectors, { provider, category, status: initialStatusFor(provider), connectedAt: null }];
    update({ connectors: next });
  };

  return (
    <>
      <StepHeader eyebrow={t("setup.step5.eyebrow")} title={t("setup.step5.title")} subtitle={t("setup.step5.subtitle")} companion="muscle" />
      <div className="flex items-start gap-3 rounded-2xl bg-sand px-4 py-3 text-sm text-ink-2 ring-1 ring-line">
        <Companion name="shield" mood="calm" size={36} className="shrink-0" />
        <p>{t("setup.step5.note")}</p>
      </div>
      <div className="space-y-5">
        {CONNECTOR_CATEGORIES.map((cat) => (
          <section key={cat.id}>
            <h2 className="mb-2 text-sm font-semibold text-ink">{t(CATEGORY_KEY[cat.id])}</h2>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {cat.providers.map((pid) => {
                const def = PROVIDERS[pid];
                const selected = isSelected(pid, cat.id);
                const current = setup.connectors.find((c) => c.provider === pid && c.category === cat.id);
                const status = current?.status ?? initialStatusFor(pid);
                const overLimit = atLimit && !selectedProviders.has(pid);
                const disabled = Boolean(def.announcedOnly) || overLimit;
                return (
                  <button
                    key={pid}
                    type="button"
                    role="checkbox"
                    aria-checked={selected}
                    aria-disabled={disabled}
                    onClick={() => toggle(pid, cat.id)}
                    className={`press flex items-center gap-3 rounded-2xl border px-3.5 py-3 text-start transition ${
                      selected
                        ? "border-brand bg-brand-soft ring-1 ring-brand/30"
                        : "border-line bg-white hover:bg-canvas"
                    } ${disabled ? "cursor-not-allowed opacity-70" : ""}`}
                  >
                    <ProviderMark provider={pid} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink">{def.name}</span>
                      <ConnectorBadge status={status} className="mt-1" />
                      {overLimit && (
                        <Link
                          href="/pricing"
                          onClick={(e) => e.stopPropagation()}
                          className="mt-1 block text-[11px] font-medium text-muted underline"
                        >
                          {t("connectors.upgradeToConnectMore")}
                        </Link>
                      )}
                    </span>
                    <span
                      aria-hidden
                      className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[11px] ${
                        selected ? "border-brand bg-brand text-white" : "border-line bg-white text-transparent"
                      }`}
                    >
                      ✓
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}

function StepReview({
  setup,
  plan,
  onEdit,
  locale,
}: {
  setup: UserSetup;
  plan: keyof typeof PLANS;
  onEdit: (step: number) => void;
  locale: string;
}) {
  const { t } = useLocale();
  const p = setup.profile;
  const b = setup.baseline;
  const dash = "—";
  const fmt = (v: number | null, unit = "") => (v === null ? dash : `${v.toLocaleString(locale)}${unit ? ` ${unit}` : ""}`);
  const txt = (v: string) => (v.trim() === "" ? dash : v);

  const Section = ({ title, step, children }: { title: string; step: number; children: React.ReactNode }) => (
    <section className="card p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold">{title}</h2>
        <button type="button" onClick={() => onEdit(step)} className="text-xs font-medium text-brand">
          {t("setup.edit")}
        </button>
      </div>
      <div className="divide-y divide-line/70">{children}</div>
    </section>
  );

  return (
    <>
      <StepHeader eyebrow={t("setup.step6.eyebrow")} title={t("setup.step6.title")} subtitle={t("setup.step6.subtitle")} companion="heart" />
      <div className="space-y-3">
        <Section title={t("setup.review.profile")} step={1}>
          <SummaryRow label={t("setup.review.name")} value={txt(`${p.firstName} ${p.lastName}`)} />
          <SummaryRow label={t("setup.dob")} value={<span dir="ltr">{txt(p.dob)}</span>} />
          <SummaryRow label={t("setup.gender")} value={p.gender ? t(`setup.gender.${p.gender}` as TranslationKey) : dash} />
          <SummaryRow label={t("setup.nationality")} value={txt(p.nationality)} />
          <SummaryRow label={t("setup.review.location")} value={txt([p.city, p.country].filter(Boolean).join(", "))} />
          <SummaryRow label={t("setup.review.body")} value={<span dir="ltr">{fmt(p.heightCm, "cm")} · {fmt(p.weightKg, "kg")}</span>} />
        </Section>
        <Section title={t("setup.review.goals")} step={2}>
          <div className="flex flex-wrap gap-1.5 py-1.5">
            {setup.goals.length === 0 && <span className="text-sm text-muted">{dash}</span>}
            {setup.goals.map((g) => (
              <span key={g} className="rounded-full bg-brand-soft px-2.5 py-1 text-xs font-medium text-brand-deep">
                {GOAL_ICON[g]} {t(`setup.goal.${g}` as TranslationKey)}
              </span>
            ))}
          </div>
        </Section>
        <Section title={t("setup.review.health")} step={3}>
          <SummaryRow label={t("setup.allergies")} value={txt(setup.health.allergies)} />
          <SummaryRow label={t("setup.medications")} value={txt(setup.health.medications)} />
          <SummaryRow label={t("setup.conditions")} value={txt(setup.health.conditions)} />
          <SummaryRow label={t("setup.bloodType")} value={<span dir="ltr">{txt(setup.health.bloodType)}</span>} />
          <SummaryRow
            label={t("setup.review.emergency")}
            value={
              setup.health.emergencyContactName || setup.health.emergencyContactPhone ? (
                <span>
                  {txt(setup.health.emergencyContactName)}
                  {setup.health.emergencyContactPhone && (
                    <span dir="ltr" className="block text-xs text-muted">{setup.health.emergencyContactPhone}</span>
                  )}
                </span>
              ) : (
                dash
              )
            }
          />
        </Section>
        <Section title={t("setup.review.baseline")} step={4}>
          <SummaryRow label={t("setup.sleepHours")} value={fmt(b.sleepHours, "h")} />
          <SummaryRow label={t("setup.restingHr")} value={fmt(b.restingHr, "bpm")} />
          <SummaryRow label={t("setup.steps")} value={fmt(b.steps)} />
          <SummaryRow label={t("setup.workouts")} value={fmt(b.workoutsPerWeek)} />
          <SummaryRow label={t("setup.activityLevel")} value={b.activityLevel ? t(`setup.activity.${b.activityLevel}` as TranslationKey) : dash} />
          <SummaryRow label={t("setup.hydration")} value={fmt(b.hydrationGoalMl, "ml")} />
          <SummaryRow label={t("setup.calories")} value={fmt(b.calorieTarget, "kcal")} />
          <SummaryRow label={t("setup.protein")} value={fmt(b.proteinTargetG, "g")} />
        </Section>
        <Section title={t("setup.review.connectors")} step={5}>
          {setup.connectors.length === 0 ? (
            <p className="py-1.5 text-sm text-muted">{t("setup.review.noConnectors")}</p>
          ) : (
            <ul className="space-y-2 py-1.5">
              {setup.connectors.map((c) => (
                <li key={`${c.provider}-${c.category}`} className="flex items-center gap-2.5 text-sm">
                  <ProviderMark provider={c.provider} size={28} />
                  <span className="flex-1">
                    <span className="font-medium">{PROVIDERS[c.provider].name}</span>
                    <span className="text-muted"> · {t(CATEGORY_KEY[c.category])}</span>
                  </span>
                  <ConnectorBadge status={c.status} />
                </li>
              ))}
            </ul>
          )}
        </Section>
        <section className="card flex items-center justify-between p-4">
          <div>
            <h2 className="text-sm font-semibold">{t("setup.review.plan")}</h2>
            <p className="text-sm text-muted">{t(PLANS[plan].nameKey)}</p>
          </div>
          <Link href="/pricing" className="text-xs font-medium text-brand">
            {t("setup.changePlan")}
          </Link>
        </section>
      </div>
    </>
  );
}
