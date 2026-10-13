import { getCurrentUser } from "@/lib/auth/server";
import { getConsentStore } from "@/lib/consent";
import { CONSENT_POLICY_VERSIONS } from "@/lib/legal";
import { isSameOrigin, shareJson } from "@/lib/share-api";
import {
  callWellnessStore,
  type WellnessAction,
} from "@/lib/wellness/store";
import type {
  Exercise,
  SupplementData,
  WellnessData,
  WellnessKind,
  WorkoutData,
} from "@/lib/wellness/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_BODY_BYTES = 32 * 1024;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_TIMESTAMP_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
const ACTIONS = new Set<WellnessAction>(["list", "create", "update", "delete"]);
const RPC_ERRORS: Record<string, number> = {
  invalid_request: 400,
  unauthenticated: 401,
  not_found: 404,
  conflict: 409,
  entry_limit: 409,
  rate_limited: 429,
};

function errorResponse(error: string, status: number, includeStatus = false): Response {
  return shareJson(includeStatus ? { error, status } : { error }, status);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isKind(value: unknown): value is WellnessKind {
  return value === "workout" || value === "supplement";
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function isTimestamp(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = ISO_TIMESTAMP_PATTERN.exec(value);
  if (!match) return false;
  const [, year, month, day, hour, minute, second] = match.map(Number);
  const monthDays = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return (
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= monthDays &&
    hour >= 0 &&
    hour <= 23 &&
    minute >= 0 &&
    minute <= 59 &&
    second >= 0 &&
    second <= 59 &&
    Number.isFinite(Date.parse(value))
  );
}

function length(value: string): number {
  return Array.from(value).length;
}

function optionalText(
  input: Record<string, unknown>,
  key: string,
  max: number,
): string | null {
  const value = input[key];
  if (value === undefined) return "";
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return length(trimmed) <= max ? trimmed : null;
}

function requiredText(
  input: Record<string, unknown>,
  key: string,
  max: number,
): string | null {
  const value = optionalText(input, key, max);
  return value && length(value) > 0 ? value : null;
}

function validateExercise(value: unknown): Exercise | null {
  if (!isRecord(value)) return null;
  const name = requiredText(value, "name", 80);
  const reps = optionalText(value, "reps", 40);
  const note = optionalText(value, "note", 200);
  const sets = value.sets;
  if (
    !name ||
    reps === null ||
    note === null ||
    typeof sets !== "number" ||
    !Number.isInteger(sets) ||
    sets < 1 ||
    sets > 20
  ) {
    return null;
  }
  return { name, sets, reps, note };
}

function validateWorkout(value: unknown): WorkoutData | null {
  if (!isRecord(value) || !Array.isArray(value.exercises)) return null;
  const title = requiredText(value, "title", 80);
  const notes = optionalText(value, "notes", 1000);
  if (
    !title ||
    notes === null ||
    value.exercises.length < 1 ||
    value.exercises.length > 20
  ) {
    return null;
  }
  const exercises = value.exercises.map(validateExercise);
  if (exercises.some((exercise) => exercise === null)) return null;
  return { title, exercises: exercises as Exercise[], notes };
}

function validateSupplement(value: unknown): SupplementData | null {
  if (!isRecord(value)) return null;
  const name = requiredText(value, "name", 80);
  const amount = optionalText(value, "amount", 80);
  const schedule = optionalText(value, "schedule", 120);
  const note = optionalText(value, "note", 500);
  if (!name || amount === null || schedule === null || note === null) return null;
  return { name, amount, schedule, note };
}

function validateData(value: unknown, kind: WellnessKind): WellnessData | null {
  return kind === "workout" ? validateWorkout(value) : validateSupplement(value);
}

async function readJson(
  req: Request,
): Promise<{ ok: true; value: unknown } | { ok: false; status: 400 | 413 }> {
  const contentLength = req.headers.get("content-length");
  if (contentLength !== null) {
    if (!/^\d+$/.test(contentLength)) return { ok: false, status: 400 };
    if (Number(contentLength) > MAX_BODY_BYTES) return { ok: false, status: 413 };
  }
  if (!req.body) return { ok: false, status: 400 };
  let reader: ReadableStreamDefaultReader<Uint8Array>;
  try {
    reader = req.body.getReader();
  } catch {
    return { ok: false, status: 400 };
  }
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!(value instanceof Uint8Array)) return { ok: false, status: 400 };
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) {
        await reader.cancel().catch(() => undefined);
        return { ok: false, status: 413 };
      }
      chunks.push(value);
    }
  } catch {
    return { ok: false, status: 400 };
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return {
      ok: true,
      value: JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)),
    };
  } catch {
    return { ok: false, status: 400 };
  }
}

async function authorize(req: Request): Promise<{ userId: string } | { response: Response }> {
  if (
    req.headers.get("sec-fetch-site")?.toLowerCase() === "cross-site" ||
    !isSameOrigin(req)
  ) {
    return { response: errorResponse("unavailable", 403) };
  }
  try {
    const user = await getCurrentUser();
    return user
      ? { userId: user.id }
      : { response: errorResponse("unauthenticated", 401) };
  } catch {
    return { response: errorResponse("unavailable", 503) };
  }
}

async function requireConsent(userId: string): Promise<Response | null> {
  try {
    const latest = await getConsentStore().latest(userId);
    if (latest?.health_data?.policyVersion !== CONSENT_POLICY_VERSIONS.health_data) {
      return errorResponse("consent_required", 403);
    }
    return null;
  } catch {
    return errorResponse("unavailable", 503);
  }
}

async function runAction(
  userId: string,
  input: {
    action: WellnessAction;
    kind: WellnessKind;
    id?: string;
    data?: WellnessData;
    updatedAt?: string;
  },
): Promise<Response> {
  try {
    const result = await callWellnessStore({ userId, ...input });
    if (!isRecord(result)) return errorResponse("unavailable", 503);
    if ("error" in result || "status" in result) {
      const error = result.error;
      if (typeof error === "string") {
        const status = RPC_ERRORS[error];
        if (status !== undefined && result.status === status) {
          return errorResponse(error, status, true);
        }
      }
      return errorResponse("unavailable", 503);
    }
    return shareJson(result);
  } catch {
    return errorResponse("unavailable", 503);
  }
}

export async function GET(req: Request): Promise<Response> {
  const auth = await authorize(req);
  if ("response" in auth) return auth.response;
  let kind: string | null;
  try {
    kind = new URL(req.url).searchParams.get("kind");
  } catch {
    return errorResponse("invalid_request", 400);
  }
  if (!isKind(kind)) return errorResponse("invalid_request", 400);
  const consentError = await requireConsent(auth.userId);
  if (consentError) return consentError;
  return runAction(auth.userId, { action: "list", kind });
}

export async function POST(req: Request): Promise<Response> {
  const auth = await authorize(req);
  if ("response" in auth) return auth.response;
  const parsed = await readJson(req);
  if (!parsed.ok) return errorResponse("invalid_request", parsed.status);
  if (!isRecord(parsed.value)) return errorResponse("invalid_request", 400);

  const input = parsed.value;
  const action = input.action;
  const kind = input.kind;
  if (
    typeof action !== "string" ||
    !ACTIONS.has(action as WellnessAction) ||
    !isKind(kind)
  ) {
    return errorResponse("invalid_request", 400);
  }
  if (action !== "delete") {
    const consentError = await requireConsent(auth.userId);
    if (consentError) return consentError;
  }
  if (action === "create") {
    const data = validateData(input.data, kind);
    if (!data) return errorResponse("invalid_request", 400);
    return runAction(auth.userId, { action, kind, data });
  }
  if (action === "update") {
    const id = input.id;
    const updatedAt = input.updatedAt;
    if (!isUuid(id) || !isTimestamp(updatedAt)) {
      return errorResponse("invalid_request", 400);
    }
    const data = validateData(input.data, kind);
    if (!data) return errorResponse("invalid_request", 400);
    return runAction(auth.userId, {
      action,
      kind,
      id,
      data,
      updatedAt,
    });
  }
  if (action === "delete") {
    const id = input.id;
    const updatedAt = input.updatedAt;
    if (!isUuid(id) || !isTimestamp(updatedAt)) {
      return errorResponse("invalid_request", 400);
    }
    return runAction(auth.userId, {
      action,
      kind,
      id,
      updatedAt,
    });
  }
  return errorResponse("invalid_request", 400);
}
