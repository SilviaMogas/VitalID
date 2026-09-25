/**
 * Connector catalogue (client-safe).
 *
 * Status model — a provider is only ever `connected` when a real OAuth/API
 * integration has run for that user. Everything in this catalogue today is
 * pending; users can still pick providers as *preferences*.
 *
 *   connected              real integration active, data flows in
 *   waiting_implementation provider selected by the user; integration not built yet
 *   coming_soon            provider is announced but not selectable yet
 *   disconnected           integration exists but the user is not linked
 *
 * To ship a real integration later: set `integration: "oauth"` (or similar) on
 * the provider, and have the OAuth callback upsert `status: "connected"` via
 * the onboarding store — no UI redesign needed.
 */

export type ConnectorStatus = "connected" | "waiting_implementation" | "coming_soon" | "disconnected";

export type ConnectorCategory =
  | "wearables"
  | "diet"
  | "activity"
  | "sleep"
  | "records"
  | "hydration";

export type ProviderId =
  | "whoop"
  | "oura"
  | "fitbit"
  | "garmin"
  | "apple_health"
  | "myfitnesspal"
  | "cronometer"
  | "macrofactor"
  | "lifesum"
  | "strava"
  | "medical_records"
  | "uae_health";

export interface ProviderDef {
  id: ProviderId;
  name: string;
  /** Short 1–2 letter mark used when no logo asset exists. */
  mark: string;
  /** Brand tint for the mark badge. */
  tint: string;
  /** "none" = no integration built yet → selecting it yields waiting_implementation. */
  integration: "none" | "oauth" | "api";
  /** Not selectable yet; shown as coming soon. */
  announcedOnly?: boolean;
}

export const PROVIDERS: Record<ProviderId, ProviderDef> = {
  whoop: { id: "whoop", name: "WHOOP", mark: "W", tint: "#111111", integration: "none" },
  oura: { id: "oura", name: "Oura", mark: "O", tint: "#2b2b2b", integration: "none" },
  fitbit: { id: "fitbit", name: "Fitbit", mark: "fb", tint: "#00B0B9", integration: "none" },
  garmin: { id: "garmin", name: "Garmin", mark: "G", tint: "#007CC3", integration: "none" },
  apple_health: { id: "apple_health", name: "Apple Health", mark: "♥", tint: "#FF2D55", integration: "none" },
  myfitnesspal: { id: "myfitnesspal", name: "MyFitnessPal", mark: "MFP", tint: "#0066EE", integration: "none" },
  cronometer: { id: "cronometer", name: "Cronometer", mark: "C", tint: "#F5A623", integration: "none" },
  macrofactor: { id: "macrofactor", name: "MacroFactor", mark: "MF", tint: "#6C4BF4", integration: "none" },
  lifesum: { id: "lifesum", name: "Lifesum", mark: "L", tint: "#E94E3D", integration: "none" },
  strava: { id: "strava", name: "Strava", mark: "S", tint: "#FC4C02", integration: "none" },
  medical_records: { id: "medical_records", name: "Generic Medical Records", mark: "MR", tint: "#3B7A57", integration: "none" },
  uae_health: { id: "uae_health", name: "UAE health integrations", mark: "UAE", tint: "#00732F", integration: "none", announcedOnly: true },
};

export const CONNECTOR_CATEGORIES: { id: ConnectorCategory; providers: ProviderId[] }[] = [
  { id: "wearables", providers: ["whoop", "oura", "fitbit", "garmin", "apple_health"] },
  { id: "diet", providers: ["myfitnesspal", "cronometer", "macrofactor", "lifesum"] },
  { id: "activity", providers: ["strava", "garmin", "apple_health", "fitbit"] },
  { id: "sleep", providers: ["oura", "whoop", "apple_health", "fitbit"] },
  { id: "records", providers: ["apple_health", "medical_records", "uae_health"] },
  { id: "hydration", providers: ["apple_health", "cronometer", "lifesum"] },
];

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
  return def.integration === "none" ? "waiting_implementation" : "disconnected";
}

export function isProviderId(v: unknown): v is ProviderId {
  return typeof v === "string" && v in PROVIDERS;
}

export function isConnectorCategory(v: unknown): v is ConnectorCategory {
  return CONNECTOR_CATEGORIES.some((c) => c.id === v);
}

export function isConnectorStatus(v: unknown): v is ConnectorStatus {
  return v === "connected" || v === "waiting_implementation" || v === "coming_soon" || v === "disconnected";
}
