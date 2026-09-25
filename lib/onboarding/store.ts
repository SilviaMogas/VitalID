import 'server-only';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import {
  isConnectorCategory,
  isConnectorStatus,
  isProviderId,
  type UserConnector,
} from '@/lib/connectors';
import {
  ACTIVITY_LEVELS,
  GENDERS,
  ONBOARDING_STEPS,
  emptySetup,
  isGoalId,
  type Baseline,
  type HealthProfileData,
  type UserProfile,
  type UserSetup,
  type UserSetupPatch,
} from './types';

/**
 * Per-user onboarding persistence. Supabase (service key) when configured,
 * in-memory otherwise (dev without env). Keyed by Supabase Auth user id.
 */
export interface OnboardingStore {
  get(userId: string): Promise<UserSetup | null>;
  patch(userId: string, patch: UserSetupPatch): Promise<UserSetup>;
}

/* ------------------------------------------------------------------ */
/* Patch sanitising (shared by both backends)                           */
/* ------------------------------------------------------------------ */

const str = (v: unknown, max = 200): string | undefined =>
  typeof v === 'string' ? v.trim().slice(0, max) : undefined;
const num = (v: unknown, min: number, max: number): number | null | undefined => {
  if (v === null || v === '') return null;
  if (typeof v !== 'number' || !Number.isFinite(v)) return undefined;
  return Math.min(max, Math.max(min, v));
};
const oneOf = <T extends string>(v: unknown, values: readonly T[]): T | '' | undefined => {
  if (v === '') return '';
  return typeof v === 'string' && (values as readonly string[]).includes(v) ? (v as T) : undefined;
};
const assign = <T extends object>(target: T, patch: Partial<Record<keyof T, unknown>>) => {
  for (const [k, v] of Object.entries(patch) as [keyof T, unknown][]) {
    if (v !== undefined) (target as Record<keyof T, unknown>)[k] = v;
  }
};

/** Validates an untrusted JSON body into a clean patch. Unknown/invalid fields are dropped. */
export function sanitizePatch(input: unknown): UserSetupPatch {
  const raw = (input ?? {}) as Record<string, unknown>;
  const out: UserSetupPatch = {};

  if (raw.profile && typeof raw.profile === 'object') {
    const p = raw.profile as Record<string, unknown>;
    const profile: Partial<UserProfile> = {};
    assign(profile, {
      firstName: str(p.firstName, 80),
      lastName: str(p.lastName, 80),
      dob: typeof p.dob === 'string' && /^(\d{4}-\d{2}-\d{2})?$/.test(p.dob) ? p.dob : undefined,
      gender: oneOf(p.gender, GENDERS),
      nationality: str(p.nationality, 80),
      country: str(p.country, 80),
      city: str(p.city, 80),
      heightCm: num(p.heightCm, 50, 260),
      weightKg: num(p.weightKg, 20, 400),
    });
    out.profile = profile;
  }
  if (Array.isArray(raw.goals)) {
    out.goals = Array.from(new Set(raw.goals.filter(isGoalId)));
  }
  if (raw.health && typeof raw.health === 'object') {
    const h = raw.health as Record<string, unknown>;
    const health: Partial<HealthProfileData> = {};
    assign(health, {
      allergies: str(h.allergies, 500),
      medications: str(h.medications, 500),
      conditions: str(h.conditions, 500),
      bloodType: str(h.bloodType, 3),
      emergencyContactName: str(h.emergencyContactName, 120),
      emergencyContactPhone: str(h.emergencyContactPhone, 40),
      notes: str(h.notes, 1000),
    });
    out.health = health;
  }
  if (raw.baseline && typeof raw.baseline === 'object') {
    const b = raw.baseline as Record<string, unknown>;
    const baseline: Partial<Baseline> = {};
    assign(baseline, {
      sleepHours: num(b.sleepHours, 0, 24),
      restingHr: num(b.restingHr, 25, 220),
      steps: num(b.steps, 0, 100000),
      workoutsPerWeek: num(b.workoutsPerWeek, 0, 21),
      activityLevel: oneOf(b.activityLevel, ACTIVITY_LEVELS),
      hydrationGoalMl: num(b.hydrationGoalMl, 0, 10000),
      calorieTarget: num(b.calorieTarget, 0, 10000),
      proteinTargetG: num(b.proteinTargetG, 0, 600),
    });
    out.baseline = baseline;
  }
  if (Array.isArray(raw.connectors)) {
    const seen = new Set<string>();
    const list: UserConnector[] = [];
    for (const c of raw.connectors as Record<string, unknown>[]) {
      if (!c || !isProviderId(c.provider) || !isConnectorCategory(c.category)) continue;
      const key = `${c.provider}:${c.category}`;
      if (seen.has(key)) continue;
      seen.add(key);
      // Clients may only request pending states; `connected` is set by real integrations server-side.
      const status = isConnectorStatus(c.status) && c.status !== 'connected' ? c.status : 'waiting_implementation';
      list.push({ provider: c.provider, category: c.category, status, connectedAt: null });
    }
    out.connectors = list;
  }
  if (typeof raw.planSelected === 'boolean') out.planSelected = raw.planSelected;
  if (typeof raw.onboardingStep === 'number' && Number.isInteger(raw.onboardingStep)) {
    out.onboardingStep = Math.min(ONBOARDING_STEPS, Math.max(1, raw.onboardingStep));
  }
  if (typeof raw.onboardingCompleted === 'boolean') out.onboardingCompleted = raw.onboardingCompleted;
  return out;
}

export function applyPatch(base: UserSetup, patch: UserSetupPatch): UserSetup {
  const next: UserSetup = {
    ...base,
    profile: { ...base.profile, ...(patch.profile ?? {}) },
    health: { ...base.health, ...(patch.health ?? {}) },
    baseline: { ...base.baseline, ...(patch.baseline ?? {}) },
    goals: patch.goals ?? base.goals,
    connectors: patch.connectors ?? base.connectors,
    planSelected: patch.planSelected ?? base.planSelected,
    onboardingStep: patch.onboardingStep ?? base.onboardingStep,
    onboardingCompleted: patch.onboardingCompleted ?? base.onboardingCompleted,
  };
  // Never lose a real connection when the client re-sends its preference list.
  if (patch.connectors) {
    for (const prev of base.connectors) {
      if (prev.status !== 'connected') continue;
      const idx = next.connectors.findIndex((c) => c.provider === prev.provider && c.category === prev.category);
      if (idx >= 0) next.connectors[idx] = prev;
    }
  }
  return next;
}

/* ------------------------------------------------------------------ */
/* Memory backend                                                       */
/* ------------------------------------------------------------------ */

class MemoryOnboardingStore implements OnboardingStore {
  private rows = new Map<string, UserSetup>();
  async get(userId: string) {
    return this.rows.get(userId) ?? null;
  }
  async patch(userId: string, patch: UserSetupPatch) {
    const next = applyPatch(this.rows.get(userId) ?? emptySetup(), patch);
    this.rows.set(userId, next);
    return next;
  }
}

/* ------------------------------------------------------------------ */
/* Supabase backend                                                     */
/* ------------------------------------------------------------------ */

interface ProfileRow {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  dob: string | null;
  gender: string | null;
  nationality: string | null;
  country: string | null;
  city: string | null;
  height_cm: number | string | null;
  weight_kg: number | string | null;
  plan_selected: boolean;
  onboarding_step: number;
  onboarding_completed: boolean;
}
interface HealthRow {
  allergies: string | null;
  medications: string | null;
  conditions: string | null;
  blood_type: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  notes: string | null;
}
interface GoalsRow {
  goals: string[] | null;
}
interface BaselineRow {
  sleep_hours: number | string | null;
  resting_hr: number | null;
  steps: number | null;
  workouts_per_week: number | null;
  activity_level: string | null;
  hydration_goal_ml: number | null;
  calorie_target: number | null;
  protein_target_g: number | null;
}
interface ConnectorRow {
  provider: string;
  category: string;
  status: string;
  connected_at: string | null;
}

const toNum = (v: number | string | null): number | null =>
  v === null ? null : typeof v === 'number' ? v : Number(v);

class SupabaseOnboardingStore implements OnboardingStore {
  async get(userId: string): Promise<UserSetup | null> {
    const sb = getSupabaseServerClient();
    const [p, h, g, b, c] = await Promise.all([
      sb.from('vital_id_user_profiles').select('*').eq('user_id', userId).maybeSingle(),
      sb.from('vital_id_health_profiles').select('*').eq('user_id', userId).maybeSingle(),
      sb.from('vital_id_health_goals').select('goals').eq('user_id', userId).maybeSingle(),
      sb.from('vital_id_health_baselines').select('*').eq('user_id', userId).maybeSingle(),
      sb.from('vital_id_user_connectors').select('provider,category,status,connected_at').eq('user_id', userId),
    ]);
    for (const r of [p, h, g, b, c]) {
      if (r.error) throw new Error(`onboarding get failed: ${r.error.message}`);
    }
    if (!p.data) return null;
    const pr = p.data as ProfileRow;
    const hr = (h.data ?? {}) as Partial<HealthRow>;
    const gr = (g.data ?? {}) as Partial<GoalsRow>;
    const br = (b.data ?? {}) as Partial<BaselineRow>;
    const base = emptySetup();
    return {
      profile: {
        firstName: pr.first_name ?? '',
        lastName: pr.last_name ?? '',
        dob: pr.dob ?? '',
        gender: oneOf(pr.gender ?? '', GENDERS) ?? '',
        nationality: pr.nationality ?? '',
        country: pr.country ?? '',
        city: pr.city ?? '',
        heightCm: toNum(pr.height_cm),
        weightKg: toNum(pr.weight_kg),
      },
      goals: (gr.goals ?? []).filter(isGoalId),
      health: {
        allergies: hr.allergies ?? '',
        medications: hr.medications ?? '',
        conditions: hr.conditions ?? '',
        bloodType: hr.blood_type ?? '',
        emergencyContactName: hr.emergency_contact_name ?? '',
        emergencyContactPhone: hr.emergency_contact_phone ?? '',
        notes: hr.notes ?? '',
      },
      baseline: {
        ...base.baseline,
        sleepHours: toNum(br.sleep_hours ?? null),
        restingHr: br.resting_hr ?? null,
        steps: br.steps ?? null,
        workoutsPerWeek: br.workouts_per_week ?? null,
        activityLevel: oneOf(br.activity_level ?? '', ACTIVITY_LEVELS) ?? '',
        hydrationGoalMl: br.hydration_goal_ml ?? null,
        calorieTarget: br.calorie_target ?? null,
        proteinTargetG: br.protein_target_g ?? null,
      },
      connectors: ((c.data ?? []) as ConnectorRow[]).flatMap((row) =>
        isProviderId(row.provider) && isConnectorCategory(row.category) && isConnectorStatus(row.status)
          ? [{ provider: row.provider, category: row.category, status: row.status, connectedAt: row.connected_at }]
          : [],
      ),
      planSelected: pr.plan_selected,
      onboardingStep: pr.onboarding_step,
      onboardingCompleted: pr.onboarding_completed,
    };
  }

  async patch(userId: string, patch: UserSetupPatch): Promise<UserSetup> {
    const sb = getSupabaseServerClient();
    const current = (await this.get(userId)) ?? emptySetup();
    const next = applyPatch(current, patch);
    const now = new Date().toISOString();

    const profileUpsert = sb.from('vital_id_user_profiles').upsert({
      user_id: userId,
      first_name: next.profile.firstName || null,
      last_name: next.profile.lastName || null,
      dob: next.profile.dob || null,
      gender: next.profile.gender || null,
      nationality: next.profile.nationality || null,
      country: next.profile.country || null,
      city: next.profile.city || null,
      height_cm: next.profile.heightCm,
      weight_kg: next.profile.weightKg,
      plan_selected: next.planSelected,
      onboarding_step: next.onboardingStep,
      onboarding_completed: next.onboardingCompleted,
      updated_at: now,
    });
    const { error: pErr } = await profileUpsert;
    if (pErr) throw new Error(`onboarding profile save failed: ${pErr.message}`);

    const writes: PromiseLike<{ error: { message: string } | null }>[] = [];
    if (patch.health) {
      writes.push(
        sb.from('vital_id_health_profiles').upsert({
          user_id: userId,
          allergies: next.health.allergies || null,
          medications: next.health.medications || null,
          conditions: next.health.conditions || null,
          blood_type: next.health.bloodType || null,
          emergency_contact_name: next.health.emergencyContactName || null,
          emergency_contact_phone: next.health.emergencyContactPhone || null,
          notes: next.health.notes || null,
          updated_at: now,
        }),
      );
    }
    if (patch.goals) {
      writes.push(sb.from('vital_id_health_goals').upsert({ user_id: userId, goals: next.goals, updated_at: now }));
    }
    if (patch.baseline) {
      writes.push(
        sb.from('vital_id_health_baselines').upsert({
          user_id: userId,
          sleep_hours: next.baseline.sleepHours,
          resting_hr: next.baseline.restingHr,
          steps: next.baseline.steps,
          workouts_per_week: next.baseline.workoutsPerWeek,
          activity_level: next.baseline.activityLevel || null,
          hydration_goal_ml: next.baseline.hydrationGoalMl,
          calorie_target: next.baseline.calorieTarget,
          protein_target_g: next.baseline.proteinTargetG,
          source: 'manual',
          updated_at: now,
        }),
      );
    }
    const results = await Promise.all(writes);
    for (const r of results) if (r.error) throw new Error(`onboarding save failed: ${r.error.message}`);

    if (patch.connectors) {
      const { error: delErr } = await sb.from('vital_id_user_connectors').delete().eq('user_id', userId);
      if (delErr) throw new Error(`connector save failed: ${delErr.message}`);
      if (next.connectors.length) {
        const { error: insErr } = await sb.from('vital_id_user_connectors').insert(
          next.connectors.map((c) => ({
            user_id: userId,
            provider: c.provider,
            category: c.category,
            status: c.status,
            connected_at: c.connectedAt,
            updated_at: now,
          })),
        );
        if (insErr) throw new Error(`connector save failed: ${insErr.message}`);
      }
    }
    return next;
  }
}

interface StoreGlobal {
  __vitalIdOnboardingStore?: { backend: 'supabase' | 'memory'; store: OnboardingStore };
}

export function getOnboardingStore(): OnboardingStore {
  const g = globalThis as StoreGlobal;
  const backend = isSupabaseConfigured() ? 'supabase' : 'memory';
  if (g.__vitalIdOnboardingStore?.backend === backend) return g.__vitalIdOnboardingStore.store;
  const store = backend === 'supabase' ? new SupabaseOnboardingStore() : new MemoryOnboardingStore();
  g.__vitalIdOnboardingStore = { backend, store };
  return store;
}
