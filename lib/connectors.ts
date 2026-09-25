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

type ConnectorExtras = Partial<
  Pick<ConnectorDefinition, "status" | "implementation" | "requiredPlan" | "website">
>;

const def = (
  id: ConnectorId,
  name: string,
  monogram: string,
  color: string,
  categories: ConnectorCategory[],
  data: ConnectorDataKind[],
  extra: ConnectorExtras = {},
): ConnectorDefinition => ({
  id,
  name,
  logo: { monogram, color },
  categories,
  data,
  status: "waiting",
  implementation: "waiting",
  requiredPlan: "free",
  ...extra,
});

export const CONNECTORS: ConnectorDefinition[] = [
  def("whoop", "WHOOP", "W", "#000000", ["wearables", "sleep", "fitness"],
    ["sleep", "recovery", "hrv", "restingHeartRate", "activity"],
    { website: "https://www.whoop.com" }),
  def("oura", "Oura", "O", "#000000", ["wearables", "sleep"],
    ["sleep", "readiness", "hrv", "restingHeartRate", "activity"],
    { website: "https://ouraring.com" }),
  def("circular-ring", "Circular Ring", "C", "#1f8a70", ["wearables", "sleep"],
    ["sleep", "hrv", "restingHeartRate", "recovery"],
    { status: "sample", website: "https://www.circular.xyz" }),
  def("fitbit", "Fitbit", "F", "#00B0B9", ["wearables", "sleep", "fitness"],
    ["sleep", "steps", "activity", "restingHeartRate"],
    { website: "https://www.fitbit.com" }),
  def("garmin", "Garmin", "G", "#007CC3", ["wearables", "fitness"],
    ["activity", "workouts", "hrv", "sleep"],
    { website: "https://www.garmin.com" }),
  def("apple-health", "Apple Health", "♥", "#FF2D55",
    ["wearables", "sleep", "fitness", "hydration", "medical"],
    ["sleep", "activity", "steps", "hydration", "medicalRecords", "restingHeartRate"],
    { website: "https://www.apple.com/health" }),
  def("myfitnesspal", "MyFitnessPal", "M", "#0066EE", ["diet"],
    ["calories", "protein", "carbs", "fat", "macros"],
    { website: "https://www.myfitnesspal.com" }),
  def("cronometer", "Cronometer", "C", "#FF6F00", ["diet", "hydration"],
    ["calories", "macros", "micronutrients", "hydration"],
    { website: "https://cronometer.com" }),
  def("macrofactor", "MacroFactor", "M", "#111111", ["diet"],
    ["calories", "macros", "protein"],
    { website: "https://macrofactorapp.com" }),
  def("lifesum", "Lifesum", "L", "#F04E45", ["diet", "hydration"],
    ["calories", "macros", "hydration", "habits"],
    { website: "https://lifesum.com" }),
  def("strava", "Strava", "S", "#FC4C02", ["fitness"],
    ["workouts", "distance", "activity"],
    { website: "https://www.strava.com" }),
  def("medical-records", "Medical Records", "+", "#5A6B7B", ["medical"],
    ["medicalRecords", "labResults"],
    { requiredPlan: "pro" }),
  def("uae-health", "UAE Health Integrations", "UAE", "#0F6E56", ["medical"],
    ["medicalRecords"],
    { status: "coming-soon", implementation: "planned", requiredPlan: "pro" }),
  def("calm", "Calm", "C", "#3E7CB1", ["mental"],
    ["meditation", "mindfulness"],
    { website: "https://www.calm.com" }),
  def("headspace", "Headspace", "H", "#F47D31", ["mental"],
    ["meditation", "stress"],
    { website: "https://www.headspace.com" }),
  def("wellbeing-future", "Wellbeing Integrations", "W", "#7C6FCF", ["mental"],
    ["mindfulness", "stress"],
    { status: "coming-soon", implementation: "planned", requiredPlan: "pro" }),
];

export function getConnector(id: ConnectorId): ConnectorDefinition | undefined {
  return CONNECTORS.find((c) => c.id === id);
}

export function connectorsInCategory(category: ConnectorCategory): ConnectorDefinition[] {
  return CONNECTORS.filter((c) => c.categories.includes(category));
}
