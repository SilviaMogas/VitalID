/**
 * Connector catalogue (client-safe).
 *
 * Status model — a provider is only ever `connected` when a real OAuth/API
 * integration has run for that user. Everything in this catalogue today is
 * pending; users can still pick providers as *preferences*.
 *
 *   connected              real integration active, data flows in
 *   sample_data            provider ships bundled sample data (Circular Ring)
 *   waiting_implementation provider selected by the user; integration not built yet
 *   coming_soon            provider is announced but not selectable yet
 *   disconnected           integration exists but the user is not linked
 *
 * To ship a real integration later: set `integration: "oauth"` (or similar) on
 * the provider, and have the OAuth callback upsert `status: "connected"` via
 * the onboarding store — no UI redesign needed.
 */
import type { PlanId } from "@/lib/plans";

export type ConnectorStatus =
  | "connected"
  | "sample_data"
  | "waiting_implementation"
  | "coming_soon"
  | "disconnected";

export type ConnectorCategory =
  | "wearables"
  | "diet"
  | "activity"
  | "sleep"
  | "records"
  | "hydration"
  | "mental";

export type ProviderId =
  | "whoop"
  | "oura"
  | "circular_ring"
  | "fitbit"
  | "garmin"
  | "apple_health"
  | "myfitnesspal"
  | "cronometer"
  | "macrofactor"
  | "lifesum"
  | "strava"
  | "medical_records"
  | "uae_health"
  | "calm"
  | "headspace"
  | "wellbeing_future";

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

export interface ProviderDef {
  id: ProviderId;
  name: string;
  /** Short 1–2 letter mark used when no logo asset exists. */
  mark: string;
  /** Brand tint for the mark badge. */
  tint: string;
  /** "none" = no integration built yet → selecting it yields waiting_implementation. */
  integration: "none" | "oauth" | "api";
  /** Data kinds this provider can supply once integrated. */
  data: ConnectorDataKind[];
  /** Minimum plan required to select this provider. */
  requiredPlan: PlanId;
  /** Not selectable yet; shown as coming soon. */
  announcedOnly?: boolean;
  /** Bundled sample data exists for this provider (e.g. Circular Ring). */
  sampleData?: boolean;
  website?: string;
}

export const PROVIDERS: Record<ProviderId, ProviderDef> = {
  whoop: { id: "whoop", name: "WHOOP", mark: "W", tint: "#111111", integration: "oauth", data: ["sleep", "recovery", "hrv", "restingHeartRate", "activity"], requiredPlan: "free", website: "https://www.whoop.com" },
  oura: { id: "oura", name: "Oura", mark: "O", tint: "#2b2b2b", integration: "none", data: ["sleep", "readiness", "hrv", "restingHeartRate", "activity"], requiredPlan: "free", website: "https://ouraring.com" },
  circular_ring: { id: "circular_ring", name: "Circular Ring", mark: "C", tint: "#1f8a70", integration: "none", data: ["sleep", "hrv", "restingHeartRate", "recovery"], requiredPlan: "free", sampleData: true, website: "https://www.circular.xyz" },
  fitbit: { id: "fitbit", name: "Fitbit", mark: "fb", tint: "#00B0B9", integration: "none", data: ["sleep", "steps", "activity", "restingHeartRate"], requiredPlan: "free", website: "https://www.fitbit.com" },
  garmin: { id: "garmin", name: "Garmin", mark: "G", tint: "#007CC3", integration: "none", data: ["activity", "workouts", "hrv", "sleep"], requiredPlan: "free", website: "https://www.garmin.com" },
  apple_health: { id: "apple_health", name: "Apple Health", mark: "♥", tint: "#FF2D55", integration: "none", data: ["sleep", "activity", "steps", "hydration", "medicalRecords", "restingHeartRate"], requiredPlan: "free", website: "https://www.apple.com/health" },
  myfitnesspal: { id: "myfitnesspal", name: "MyFitnessPal", mark: "MFP", tint: "#0066EE", integration: "none", data: ["calories", "protein", "carbs", "fat", "macros"], requiredPlan: "free", website: "https://www.myfitnesspal.com" },
  cronometer: { id: "cronometer", name: "Cronometer", mark: "C", tint: "#F5A623", integration: "none", data: ["calories", "macros", "micronutrients", "hydration"], requiredPlan: "free", website: "https://cronometer.com" },
  macrofactor: { id: "macrofactor", name: "MacroFactor", mark: "MF", tint: "#6C4BF4", integration: "none", data: ["calories", "macros", "protein"], requiredPlan: "free", website: "https://macrofactorapp.com" },
  lifesum: { id: "lifesum", name: "Lifesum", mark: "L", tint: "#E94E3D", integration: "none", data: ["calories", "macros", "hydration", "habits"], requiredPlan: "free", website: "https://lifesum.com" },
  strava: { id: "strava", name: "Strava", mark: "S", tint: "#FC4C02", integration: "none", data: ["workouts", "distance", "activity"], requiredPlan: "free", website: "https://www.strava.com" },
  medical_records: { id: "medical_records", name: "Generic Medical Records", mark: "MR", tint: "#3B7A57", integration: "none", data: ["medicalRecords", "labResults"], requiredPlan: "pro" },
  uae_health: { id: "uae_health", name: "UAE health integrations", mark: "UAE", tint: "#00732F", integration: "none", data: ["medicalRecords"], requiredPlan: "pro", announcedOnly: true },
  calm: { id: "calm", name: "Calm", mark: "C", tint: "#3E7CB1", integration: "none", data: ["meditation", "mindfulness"], requiredPlan: "free", website: "https://www.calm.com" },
  headspace: { id: "headspace", name: "Headspace", mark: "H", tint: "#F47D31", integration: "none", data: ["meditation", "stress"], requiredPlan: "free", website: "https://www.headspace.com" },
  wellbeing_future: { id: "wellbeing_future", name: "Wellbeing integrations", mark: "W", tint: "#7C6FCF", integration: "none", data: ["mindfulness", "stress"], requiredPlan: "pro", announcedOnly: true },
};

export const PROVIDER_LIST: ProviderDef[] = Object.values(PROVIDERS);

export const CONNECTOR_CATEGORIES: { id: ConnectorCategory; providers: ProviderId[] }[] = [
  { id: "wearables", providers: ["whoop", "oura", "circular_ring", "fitbit", "garmin", "apple_health"] },
  { id: "diet", providers: ["myfitnesspal", "cronometer", "macrofactor", "lifesum"] },
  { id: "activity", providers: ["strava", "garmin", "apple_health", "fitbit"] },
  { id: "sleep", providers: ["oura", "circular_ring", "whoop", "apple_health", "fitbit"] },
  { id: "records", providers: ["apple_health", "medical_records", "uae_health"] },
  { id: "hydration", providers: ["apple_health", "cronometer", "lifesum"] },
  { id: "mental", providers: ["calm", "headspace", "wellbeing_future"] },
];

/** Categories a provider appears in, derived from CONNECTOR_CATEGORIES. */
export function categoriesOf(provider: ProviderId): ConnectorCategory[] {
  return CONNECTOR_CATEGORIES.filter((c) => c.providers.includes(provider)).map((c) => c.id);
}

export interface UserConnector {
  provider: ProviderId;
  category: ConnectorCategory;
  status: ConnectorStatus;
  connectedAt: string | null;
}

/** Status a freshly *selected* provider gets — never `connected` without a real integration. */
export function initialStatusFor(provider: ProviderId): ConnectorStatus {
  const def = PROVIDERS[provider];
  if (def.announcedOnly) return "coming_soon";
  if (def.sampleData) return "sample_data";
  return def.integration === "none" ? "waiting_implementation" : "disconnected";
}

export function isProviderId(v: unknown): v is ProviderId {
  return typeof v === "string" && v in PROVIDERS;
}

export function isConnectorCategory(v: unknown): v is ConnectorCategory {
  return CONNECTOR_CATEGORIES.some((c) => c.id === v);
}

export function isConnectorStatus(v: unknown): v is ConnectorStatus {
  return (
    v === "connected" ||
    v === "sample_data" ||
    v === "waiting_implementation" ||
    v === "coming_soon" ||
    v === "disconnected"
  );
}
