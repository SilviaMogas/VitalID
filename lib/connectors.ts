// Central connector catalogue for Vital ID.
// Client-safe: no server imports — connector definitions live here only.
import type { PlanId } from "@/lib/plans";

export type ConnectorCategory =
  | "wearables"
  | "sleep"
  | "diet"
  | "fitness"
  | "hydration"
  | "medical"
  | "mental";

export const CONNECTOR_CATEGORIES: ConnectorCategory[] = [
  "wearables",
  "sleep",
  "diet",
  "fitness",
  "hydration",
  "medical",
  "mental",
];

export type ConnectorStatus =
  | "connected"
  | "sample"
  | "waiting"
  | "coming-soon"
  | "disconnected";

export type ImplementationStatus = "implemented" | "waiting" | "planned";

export type ConnectorDataKind =
  | "sleep"
  | "recovery"
  | "hrv"
  | "restingHeartRate"
  | "activity"
  | "readiness"
  | "calories"
  | "protein"
  | "carbs"
  | "fat"
  | "macros"
  | "micronutrients"
  | "workouts"
  | "distance"
  | "steps"
  | "hydration"
  | "habits"
  | "medicalRecords"
  | "labResults"
  | "meditation"
  | "mindfulness"
  | "stress";

export interface ConnectorDefinition {
  id: ConnectorId;
  /** Brand name — not translated. */
  name: string;
  /** Brand-colored monogram badge (no trademarked bitmap logos). */
  logo: { monogram: string; color: string; textColor?: string };
  categories: ConnectorCategory[];
  data: ConnectorDataKind[];
  status: ConnectorStatus;
  implementation: ImplementationStatus;
  requiredPlan: PlanId;
  website?: string;
}

export const CONNECTORS: ConnectorDefinition[] = [
  {
    id: "whoop",
    name: "WHOOP",
    logo: { monogram: "W", color: "#000000" },
    categories: ["wearables", "sleep", "fitness"],
    data: ["sleep", "recovery", "hrv", "restingHeartRate", "activity"],
    status: "waiting",
    implementation: "waiting",
    requiredPlan: "free",
    website: "https://www.whoop.com",
  },
  {
    id: "oura",
    name: "Oura",
    logo: { monogram: "O", color: "#000000" },
    categories: ["wearables", "sleep"],
    data: ["sleep", "readiness", "hrv", "restingHeartRate", "activity"],
    status: "waiting",
    implementation: "waiting",
    requiredPlan: "free",
    website: "https://ouraring.com",
  },
  {
    id: "circular-ring",
    name: "Circular Ring",
    logo: { monogram: "C", color: "#1f8a70" },
    categories: ["wearables", "sleep"],
    data: ["sleep", "hrv", "restingHeartRate", "recovery"],
    status: "sample",
    implementation: "waiting",
    requiredPlan: "free",
    website: "https://www.circular.xyz",
  },
  {
    id: "fitbit",
    name: "Fitbit",
    logo: { monogram: "F", color: "#00B0B9" },
    categories: ["wearables", "sleep", "fitness"],
    data: ["sleep", "steps", "activity", "restingHeartRate"],
    status: "waiting",
    implementation: "waiting",
    requiredPlan: "free",
    website: "https://www.fitbit.com",
  },
  {
    id: "garmin",
    name: "Garmin",
    logo: { monogram: "G", color: "#007CC3" },
    categories: ["wearables", "fitness"],
    data: ["activity", "workouts", "hrv", "sleep"],
    status: "waiting",
    implementation: "waiting",
    requiredPlan: "free",
    website: "https://www.garmin.com",
  },
  {
    id: "apple-health",
    name: "Apple Health",
    logo: { monogram: "♥", color: "#FF2D55" },
    categories: ["wearables", "sleep", "fitness", "hydration", "medical"],
    data: ["sleep", "activity", "steps", "hydration", "medicalRecords", "restingHeartRate"],
    status: "waiting",
    implementation: "waiting",
    requiredPlan: "free",
    website: "https://www.apple.com/health",
  },
  {
    id: "myfitnesspal",
    name: "MyFitnessPal",
    logo: { monogram: "M", color: "#0066EE" },
    categories: ["diet"],
    data: ["calories", "protein", "carbs", "fat", "macros"],
    status: "waiting",
    implementation: "waiting",
    requiredPlan: "free",
    website: "https://www.myfitnesspal.com",
  },
  {
    id: "cronometer",
    name: "Cronometer",
    logo: { monogram: "C", color: "#FF6F00" },
    categories: ["diet", "hydration"],
    data: ["calories", "macros", "micronutrients", "hydration"],
    status: "waiting",
    implementation: "waiting",
    requiredPlan: "free",
    website: "https://cronometer.com",
  },
  {
    id: "macrofactor",
    name: "MacroFactor",
    logo: { monogram: "M", color: "#111111" },
    categories: ["diet"],
    data: ["calories", "macros", "protein"],
    status: "waiting",
    implementation: "waiting",
    requiredPlan: "free",
    website: "https://macrofactorapp.com",
  },
  {
    id: "lifesum",
    name: "Lifesum",
    logo: { monogram: "L", color: "#F04E45" },
    categories: ["diet", "hydration"],
    data: ["calories", "macros", "hydration", "habits"],
    status: "waiting",
    implementation: "waiting",
    requiredPlan: "free",
    website: "https://lifesum.com",
  },
  {
    id: "strava",
    name: "Strava",
    logo: { monogram: "S", color: "#FC4C02" },
    categories: ["fitness"],
    data: ["workouts", "distance", "activity"],
    status: "waiting",
    implementation: "waiting",
    requiredPlan: "free",
    website: "https://www.strava.com",
  },
  {
    id: "medical-records",
    name: "Medical Records",
    logo: { monogram: "+", color: "#5A6B7B" },
    categories: ["medical"],
    data: ["medicalRecords", "labResults"],
    status: "waiting",
    implementation: "waiting",
    requiredPlan: "pro",
  },
  {
    id: "uae-health",
    name: "UAE Health Integrations",
    logo: { monogram: "UAE", color: "#0F6E56" },
    categories: ["medical"],
    data: ["medicalRecords"],
    status: "coming-soon",
    implementation: "planned",
    requiredPlan: "pro",
  },
  {
    id: "calm",
    name: "Calm",
    logo: { monogram: "C", color: "#3E7CB1" },
    categories: ["mental"],
    data: ["meditation", "mindfulness"],
    status: "waiting",
    implementation: "waiting",
    requiredPlan: "free",
    website: "https://www.calm.com",
  },
  {
    id: "headspace",
    name: "Headspace",
    logo: { monogram: "H", color: "#F47D31" },
    categories: ["mental"],
    data: ["meditation", "stress"],
    status: "waiting",
    implementation: "waiting",
    requiredPlan: "free",
    website: "https://www.headspace.com",
  },
  {
    id: "wellbeing-future",
    name: "Wellbeing Integrations",
    logo: { monogram: "W", color: "#7C6FCF" },
    categories: ["mental"],
    data: ["mindfulness", "stress"],
    status: "coming-soon",
    implementation: "planned",
    requiredPlan: "pro",
  },
];

export type ConnectorId =
  | "whoop"
  | "oura"
  | "circular-ring"
  | "fitbit"
  | "garmin"
  | "apple-health"
  | "myfitnesspal"
  | "cronometer"
  | "macrofactor"
  | "lifesum"
  | "strava"
  | "medical-records"
  | "uae-health"
  | "calm"
  | "headspace"
  | "wellbeing-future";

export function getConnector(id: ConnectorId): ConnectorDefinition | undefined {
  return CONNECTORS.find((c) => c.id === id);
}

export function connectorsInCategory(category: ConnectorCategory): ConnectorDefinition[] {
  return CONNECTORS.filter((c) => c.categories.includes(category));
}
