import type { MobileAccount, MobileSession, MobileShare, MobileShareSummary } from '@/types/mobile';
import { getAccountState } from '@/lib/auth/next-route';
import {
  authenticateMobileAccessToken,
  refreshMobile,
  signInMobile,
  signOutMobile,
} from '@/lib/auth/mobile';
import { withRequestAuthUser } from '@/lib/auth/request-user';
import { getConsentStore } from '@/lib/consent';
import { CONSENT_POLICY_VERSIONS } from '@/lib/legal';
import { hasFeature } from '@/lib/plans';
import { buildSnapshot, SHARE_DURATIONS, SHARE_FIELDS } from '@/lib/sharing';
import { isSameOrigin } from '@/lib/share-api';
import { resolveUserData } from '@/lib/user-data';
import {
  GET as listSharesHandler,
  POST as createShareHandler,
} from '@/app/api/share/route';
import { POST as previewShareHandler } from '@/app/api/share/preview/route';
import { GET as readShareHandler } from '@/app/api/share/[id]/route';
import { POST as revokeShareHandler } from '@/app/api/share/[id]/revoke/route';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ path: string[] }> };
type JsonObject = Record<string, unknown>;
type ParsedBody = { ok: true; value: JsonObject } | { ok: false; response: Response };

const MAX_BODY_BYTES = 128 * 1024;
const MAX_STRING_LENGTH = 8192;
const SHARE_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const VERSION_KEYS = ['health_data', 'terms_of_service', 'privacy_policy'] as const;

function json(body: unknown, status = 200, tokenResponse = false): Response {
  const headers = new Headers({
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8',
  });
  if (tokenResponse) headers.set('Pragma', 'no-cache');
  return Response.json(body, { status, headers });
}

function normalizeResponse(response: Response, tokenResponse = false): Response {
  const headers = new Headers(response.headers);
  headers.set('Cache-Control', 'no-store');
  if (tokenResponse) headers.set('Pragma', 'no-cache');
  headers.delete('Set-Cookie');
  for (const name of Array.from(headers.keys())) {
    if (name.toLowerCase().startsWith('access-control-')) headers.delete(name);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function isObject(value: unknown): value is JsonObject {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasBoundedJsonValues(value: unknown, depth = 0): boolean {
  if (depth > 16) return false;
  if (typeof value === 'string') return value.length <= MAX_STRING_LENGTH;
  if (typeof value === 'number') return Number.isFinite(value);
  if (value === null || typeof value === 'boolean') return true;
  if (Array.isArray(value)) {
    return value.length <= 256 && value.every((item) => hasBoundedJsonValues(item, depth + 1));
  }
  if (!isObject(value)) return false;
  const entries = Object.entries(value);
  return entries.length <= 256 && entries.every(
    ([key, item]) => key.length <= 128 && hasBoundedJsonValues(item, depth + 1),
  );
}

async function readJsonObject(request: Request): Promise<ParsedBody> {
  const declaredLength = request.headers.get('content-length');
  if (declaredLength !== null) {
    const length = Number(declaredLength);
    if (!Number.isFinite(length) || length < 0) {
      return { ok: false, response: json({ error: 'invalid_request' }, 400) };
    }
    if (length > MAX_BODY_BYTES) {
      return { ok: false, response: json({ error: 'request_too_large' }, 413) };
    }
  }
  if (!request.body) return { ok: false, response: json({ error: 'invalid_json' }, 400) };
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BODY_BYTES) {
      await reader.cancel();
      return { ok: false, response: json({ error: 'request_too_large' }, 413) };
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  let value: unknown;
  try {
    value = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return { ok: false, response: json({ error: 'invalid_json' }, 400) };
  }
  if (!isObject(value) || !hasBoundedJsonValues(value)) {
    return { ok: false, response: json({ error: 'invalid_request' }, 400) };
  }
  return { ok: true, value };
}

function isVersionSet(value: unknown): value is Record<(typeof VERSION_KEYS)[number], string> {
  if (!isObject(value)) return false;
  return Object.keys(value).length === VERSION_KEYS.length &&
    VERSION_KEYS.every((key) => typeof value[key] === 'string');
}

function currentConsent(consents: Record<string, { policyVersion?: string }> | null): {
  healthCurrent: boolean;
  termsCurrent: boolean;
  privacyCurrent: boolean;
} {
  return {
    healthCurrent: consents?.health_data?.policyVersion === CONSENT_POLICY_VERSIONS.health_data,
    termsCurrent: consents?.terms_of_service?.policyVersion === CONSENT_POLICY_VERSIONS.terms_of_service,
    privacyCurrent: consents?.privacy_policy?.policyVersion === CONSENT_POLICY_VERSIONS.privacy_policy,
  };
}

async function hasCurrentConsent(userId: string): Promise<boolean> {
  const status = currentConsent(await getConsentStore().latest(userId));
  return status.healthCurrent && status.termsCurrent && status.privacyCurrent;
}

async function requireCurrentConsent(userId: string): Promise<Response | null> {
  return await hasCurrentConsent(userId) ? null : json({ error: 'consent_required' }, 403);
}

function sessionResponse(session: {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user: { id: string; email: string | null };
}): MobileSession {
  return {
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    expiresAt: session.expiresAt,
    user: session.user,
  };
}

async function delegatedJson(
  response: Response,
  project?: (body: unknown) => unknown,
): Promise<Response> {
  if (response.status >= 500) return json({ error: 'unavailable' }, 503);
  if (response.status < 200 || response.status >= 300) return response;
  if (!project) return response;
  const body: unknown = await response.json();
  return json(project(body), response.status);
}

function isMobileShareSummary(value: unknown): value is MobileShareSummary {
  if (!isObject(value)) return false;
  return typeof value.id === 'string' &&
    typeof value.purpose === 'string' &&
    typeof value.createdAt === 'string' &&
    typeof value.expiresAt === 'string' &&
    typeof value.revoked === 'boolean' &&
    Array.isArray(value.selectedFields) &&
    value.selectedFields.every((field) => typeof field === 'string');
}

function projectSummaryList(value: unknown): MobileShareSummary[] {
  return Array.isArray(value) ? value.filter(isMobileShareSummary).map((share) => ({
    id: share.id,
    purpose: share.purpose,
    createdAt: share.createdAt,
    expiresAt: share.expiresAt,
    revoked: share.revoked,
    selectedFields: share.selectedFields.filter((field) =>
      SHARE_FIELDS.includes(field as (typeof SHARE_FIELDS)[number])),
  })) : [];
}

async function withJsonBody(request: Request, body: JsonObject): Promise<Request> {
  const headers = new Headers(request.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.set('content-type', 'application/json');
  return new Request(request.url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: request.signal,
  });
}

function bearerToken(request: Request): string | null {
  const value = request.headers.get('authorization');
  const match = value?.match(/^Bearer\s+([^\s]+)$/i);
  return match && match[1].length <= MAX_STRING_LENGTH ? match[1] : null;
}

async function dispatchAuthorized(
  request: Request,
  segments: string[],
  method: string,
  user: { id: string; email: string | null },
  accessToken: string,
): Promise<Response> {
  const path = segments.join('/');

  if (method === 'POST' && path === 'auth/signout') {
    return await signOutMobile(accessToken)
      ? json({ ok: true })
      : json({ error: 'unavailable' }, 503);
  }

  if (method === 'GET' && path === 'account') {
    const [state, latest] = await Promise.all([
      getAccountState(user.id),
      getConsentStore().latest(user.id),
    ]);
    const plan = state.plan;
    const body: MobileAccount = {
      user,
      onboardingCompleted: state.onboardingCompleted,
      plan,
      consent: currentConsent(latest),
      versions: CONSENT_POLICY_VERSIONS,
      durations: hasFeature(plan, 'configurableExpiry') ? [...SHARE_DURATIONS] : [60],
    };
    return json(body);
  }

  if (method === 'POST' && path === 'consent') {
    const parsed = await readJsonObject(request);
    if (!parsed.ok) return parsed.response;
    const { healthAccepted, termsAccepted, versions } = parsed.value;
    if (healthAccepted !== true || termsAccepted !== true || !isVersionSet(versions)) {
      return json({ error: 'invalid_request' }, 400);
    }
    if (VERSION_KEYS.some((key) => versions[key] !== CONSENT_POLICY_VERSIONS[key])) {
      return json({ error: 'consent_version_mismatch' }, 409);
    }
    const store = getConsentStore();
    await store.record(user.id, 'privacy_policy', CONSENT_POLICY_VERSIONS.privacy_policy);
    await store.record(user.id, 'terms_of_service', CONSENT_POLICY_VERSIONS.terms_of_service);
    await store.record(user.id, 'health_data', CONSENT_POLICY_VERSIONS.health_data);
    return json({ ok: true });
  }

  if (method === 'GET' && path === 'identity') {
    const gate = await requireCurrentConsent(user.id);
    if (gate) return gate;
    const { snapshot, owner } = await resolveUserData();
    if (owner !== 'member') return json({ error: 'unavailable' }, 403);
    return json({ snapshot: buildSnapshot(snapshot, SHARE_FIELDS) });
  }

  if (method === 'GET' && path === 'shares') {
    const response = await listSharesHandler();
    return delegatedJson(response, projectSummaryList);
  }

  if (method === 'POST' && path === 'shares/preview') {
    const parsed = await readJsonObject(request);
    if (!parsed.ok) return parsed.response;
    const gate = await requireCurrentConsent(user.id);
    if (gate) return gate;
    const delegated = await withJsonBody(request, parsed.value);
    const response = await previewShareHandler(delegated);
    return delegatedJson(response);
  }

  if (method === 'POST' && path === 'shares') {
    const parsed = await readJsonObject(request);
    if (!parsed.ok) return parsed.response;
    const gate = await requireCurrentConsent(user.id);
    if (gate) return gate;
    const body = parsed.value;
    if (body.authorized !== true) return json({ error: 'authorization_required' }, 403);
    if (body.purpose !== 'custom' || !Array.isArray(body.selectedFields)) {
      return json({ error: 'invalid_request' }, 400);
    }
    const { plan } = await getAccountState(user.id);
    if (
      !SHARE_DURATIONS.includes(body.durationMinutes as (typeof SHARE_DURATIONS)[number]) ||
      (!hasFeature(plan, 'configurableExpiry') && body.durationMinutes !== 60)
    ) {
      return json({ error: 'duration_not_available' }, 403);
    }
    const shareBody = { ...body };
    delete shareBody.authorized;
    const delegated = await withJsonBody(request, shareBody);
    const response = await createShareHandler(delegated);
    return delegatedJson(response);
  }

  const shareId = segments[1];
  if (segments[0] === 'shares' && shareId && SHARE_ID_PATTERN.test(shareId)) {
    if (method === 'POST' && segments.length === 3 && segments[2] === 'revoke') {
      const response = await revokeShareHandler(request, { params: Promise.resolve({ id: shareId }) });
      return delegatedJson(response);
    }
    if (method === 'GET' && segments.length === 2) {
      const gate = await requireCurrentConsent(user.id);
      if (gate) return gate;
      const response = await readShareHandler(request, { params: Promise.resolve({ id: shareId }) });
      return delegatedJson(response, (body) => {
        if (!isObject(body)) return body;
        const selectedFields = Array.isArray(body.selectedFields)
          ? body.selectedFields.filter((field): field is string =>
            typeof field === 'string' && SHARE_FIELDS.includes(field as (typeof SHARE_FIELDS)[number]))
          : [];
        const share: MobileShare = {
          id: typeof body.id === 'string' ? body.id : shareId,
          purpose: typeof body.purpose === 'string' ? body.purpose : 'custom',
          createdAt: typeof body.createdAt === 'string' ? body.createdAt : '',
          expiresAt: typeof body.expiresAt === 'string' ? body.expiresAt : '',
          revoked: body.revoked === true,
          selectedFields: selectedFields as MobileShare['selectedFields'],
          snapshot: isObject(body.snapshot) ? body.snapshot as MobileShare['snapshot'] : {},
        };
        if (typeof body.sharedBy === 'string') share.sharedBy = body.sharedBy;
        return share;
      });
    }
  }

  return json({ error: 'not_found' }, 404);
}

async function dispatch(request: Request, context: RouteContext, method: string): Promise<Response> {
  let tokenResponse = false;
  try {
    if (!isSameOrigin(request)) return normalizeResponse(json({ error: 'unavailable' }, 403));
    const { path } = await context.params;
    const segments = Array.isArray(path) ? path : [];
    const joined = segments.join('/');
    tokenResponse = method === 'POST' && (joined === 'auth/signin' || joined === 'auth/refresh');
    if (request.url.includes('?') || request.url.includes('#')) {
      return normalizeResponse(json({ error: 'invalid_request' }, 400), tokenResponse);
    }
    if (method !== 'GET' && method !== 'POST') {
      return normalizeResponse(json({ error: 'method_not_allowed' }, 405), tokenResponse);
    }
    if (method === 'POST' && joined === 'auth/signin') {
      const parsed = await readJsonObject(request);
      if (!parsed.ok) return normalizeResponse(parsed.response, true);
      const { email, password } = parsed.value;
      if (
        typeof email !== 'string' || email.length === 0 || email.length > 320 ||
        typeof password !== 'string' || password.length === 0 || password.length > 1024
      ) {
        return normalizeResponse(json({ error: 'invalid_request' }, 400), true);
      }
      const result = await signInMobile(email, password);
      return normalizeResponse(result.ok
        ? json(sessionResponse(result), 200, true)
        : json({ error: result.error }, result.status, true), true);
    }
    if (method === 'POST' && joined === 'auth/refresh') {
      const parsed = await readJsonObject(request);
      if (!parsed.ok) return normalizeResponse(parsed.response, true);
      const refreshToken = parsed.value.refreshToken;
      if (typeof refreshToken !== 'string' || refreshToken.length === 0 || refreshToken.length > MAX_STRING_LENGTH) {
        return normalizeResponse(json({ error: 'invalid_request' }, 400), true);
      }
      const result = await refreshMobile(refreshToken);
      return normalizeResponse(result.ok
        ? json(sessionResponse(result), 200, true)
        : json({ error: result.error }, result.status, true), true);
    }
    const token = bearerToken(request);
    if (!token) {
      return normalizeResponse(json({ error: 'unauthenticated' }, 401), tokenResponse);
    }
    const auth = await authenticateMobileAccessToken(token);
    if (!auth.ok) {
      return normalizeResponse(json({ error: auth.error }, auth.status), tokenResponse);
    }
    const response = await withRequestAuthUser(auth.user, () =>
      dispatchAuthorized(request, segments, method, auth.user, token),
    );
    return normalizeResponse(response, tokenResponse);
  } catch {
    return normalizeResponse(json({ error: 'unavailable' }, 503), tokenResponse);
  }
}

export function GET(request: Request, context: RouteContext) {
  return dispatch(request, context, 'GET');
}

export function POST(request: Request, context: RouteContext) {
  return dispatch(request, context, 'POST');
}

export function PUT(request: Request, context: RouteContext) {
  return dispatch(request, context, 'PUT');
}

export function PATCH(request: Request, context: RouteContext) {
  return dispatch(request, context, 'PATCH');
}

export function DELETE(request: Request, context: RouteContext) {
  return dispatch(request, context, 'DELETE');
}

export function OPTIONS(request: Request, context: RouteContext) {
  return dispatch(request, context, 'OPTIONS');
}
