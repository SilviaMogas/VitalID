import type { UserConnector } from "@/lib/connectors";

/** Client-safe onboarding domain model (mirrors the vital_id_* onboarding tables). */

export const GOAL_IDS = [
  "sleep",
  "recovery",
  "loseWeight",
  "gainMuscle",
  "fitness",
  "stress",
  "nutrition",
  "wellbeing",
] as const;
export type GoalId = (typeof GOAL_IDS)[number];

export const GENDERS = ["female", "male", "other", "preferNot"] as const;
export type Gender = (typeof GENDERS)[number];

export const ACTIVITY_LEVELS = ["sedentary", "light", "moderate", "active", "veryActive"] as const;
export type ActivityLevel = (typeof ACTIVITY_LEVELS)[number];

export const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;

export interface UserProfile {
  firstName: string;
  lastName: string;
  /** ISO date (YYYY-MM-DD) or empty. */
  dob: string;
  gender: Gender | "";
  nationality: string;
  country: string;
  city: string;
  heightCm: number | null;
  weightKg: number | null;
}

export interface HealthProfileData {
  allergies: string;
  medications: string;
  conditions: string;
  bloodType: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  notes: string;
}

export interface Baseline {
  sleepHours: number | null;
  restingHr: number | null;
  steps: number | null;
  workoutsPerWeek: number | null;
  activityLevel: ActivityLevel | "";
  hydrationGoalMl: number | null;
  calorieTarget: number | null;
  proteinTargetG: number | null;
}

export const ONBOARDING_STEPS = 6;

export interface UserSetup {
  profile: UserProfile;
  goals: GoalId[];
  health: HealthProfileData;
  baseline: Baseline;
  connectors: UserConnector[];
  planSelected: boolean;
  /** 1-based step the user should resume at. */
  onboardingStep: number;
  onboardingCompleted: boolean;
}

export type UserSetupPatch = Partial<{
  profile: Partial<UserProfile>;
  goals: GoalId[];
  health: Partial<HealthProfileData>;
  baseline: Partial<Baseline>;
  connectors: UserConnector[];
  planSelected: boolean;
  onboardingStep: number;
  onboardingCompleted: boolean;
}>;

export function emptySetup(): UserSetup {
  return {
    profile: {
      firstName: "",
      lastName: "",
      dob: "",
      gender: "",
      nationality: "",
      country: "",
      city: "",
      heightCm: null,
      weightKg: null,
    },
    goals: [],
    health: {
      allergies: "",
      medications: "",
      conditions: "",
      bloodType: "",
      emergencyContactName: "",
      emergencyContactPhone: "",
      notes: "",
    },
    baseline: {
      sleepHours: null,
      restingHr: null,
      steps: null,
      workoutsPerWeek: null,
      activityLevel: "",
      hydrationGoalMl: null,
      calorieTarget: null,
      proteinTargetG: null,
    },
    connectors: [],
    planSelected: false,
    onboardingStep: 1,
    onboardingCompleted: false,
  };
}

export function isGoalId(v: unknown): v is GoalId {
  return typeof v === "string" && (GOAL_IDS as readonly string[]).includes(v);
}

/** Step 1 fields that must be present before onboarding can be marked complete. */
export function isProfileComplete(profile: UserProfile): boolean {
  return (
    profile.firstName.trim() !== '' &&
    profile.lastName.trim() !== '' &&
    profile.dob !== '' &&
    profile.gender !== '' &&
    profile.country.trim() !== '' &&
    profile.city.trim() !== ''
  );
}
