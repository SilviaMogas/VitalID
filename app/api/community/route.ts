import { getCurrentUser } from "@/lib/auth/server";
import { isCommunityGroupId } from "@/lib/community/catalog";
import { callCommunityStore, type CommunityAction } from "@/lib/community/store";
import { isSameOrigin, shareJson } from "@/lib/share-api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_REQUEST_BYTES = 8 * 1024;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_TIMESTAMP_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
const REPORT_REASONS = new Set(["spam", "unsafe", "privacy", "other"]);
const ACTIONS = new Set<CommunityAction>([
  "join",
  "leave",
  "post",
  "comment",
  "delete_post",
  "delete_comment",
  "report_post",
  "report_comment",
]);
const RPC_ERRORS: Record<string, number> = {
  invalid_request: 400,
  unauthenticated: 401,
  join_required: 403,
  not_found: 404,
  rate_limited: 429,
};

function errorResponse(error: string, status: number): Response {
  return shareJson({ error, status }, status);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function isIsoTimestamp(value: unknown): value is string {
  return (
    typeof value === "string" &&
    ISO_TIMESTAMP_PATTERN.test(value) &&
    Number.isFinite(Date.parse(value))
  );
}

function codePointLength(value: string): number {
  return Array.from(value).length;
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
    if (!user) return { response: errorResponse("unauthenticated", 401) };
    return { userId: user.id };
  } catch {
    return { response: errorResponse("unavailable", 503) };
  }
}

async function runAction(
  userId: string,
  input: {
    action: CommunityAction;
    groupId?: string;
    entityId?: string;
    body?: string;
    alias?: string;
    before?: string;
    beforeId?: string;
  },
): Promise<Response> {
  try {
    const result = await callCommunityStore({ userId, ...input });
    if (!isRecord(result)) return errorResponse("unavailable", 503);
    if ("error" in result || "status" in result) {
      const error = result.error;
      if (typeof error === "string") {
        const status = RPC_ERRORS[error];
        if (status !== undefined && result.status === status) {
          return errorResponse(error, status);
        }
      }
      return errorResponse("unavailable", 503);
    }
    return shareJson(result);
  } catch {
    return errorResponse("unavailable", 503);
  }
}

function queryValue(url: URL, name: string): { valid: boolean; value: string | null } {
  const values = url.searchParams.getAll(name);
  return { valid: values.length <= 1, value: values[0] ?? null };
}

async function readJsonBody(
  req: Request,
): Promise<{ ok: true; value: unknown } | { ok: false; status: 400 | 413 }> {
  const contentLength = req.headers.get("content-length");
  if (contentLength !== null) {
    if (!/^\d+$/.test(contentLength)) return { ok: false, status: 400 };
    if (Number(contentLength) > MAX_REQUEST_BYTES) return { ok: false, status: 413 };
  }
  if (!req.body) return { ok: false, status: 400 };

  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!(value instanceof Uint8Array)) return { ok: false, status: 400 };
      size += value.byteLength;
      if (size > MAX_REQUEST_BYTES) {
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
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch {
    return { ok: false, status: 400 };
  }
}

export async function GET(req: Request): Promise<Response> {
  const authorization = await authorize(req);
  if ("response" in authorization) return authorization.response;

  let url: URL;
  try {
    url = new URL(req.url);
  } catch {
    return errorResponse("invalid_request", 400);
  }

  const viewParam = queryValue(url, "view");
  const groupParam = queryValue(url, "group");
  const postParam = queryValue(url, "post");
  const beforeParam = queryValue(url, "before");
  const beforeIdParam = queryValue(url, "beforeId");
  if (
    !viewParam.valid ||
    !groupParam.valid ||
    !postParam.valid ||
    !beforeParam.valid ||
    !beforeIdParam.valid
  ) {
    return errorResponse("invalid_request", 400);
  }

  const view = viewParam.value ?? "groups";
  const hasBefore = beforeParam.value !== null;
  const hasBeforeId = beforeIdParam.value !== null;
  if (hasBefore !== hasBeforeId) return errorResponse("invalid_request", 400);
  if (
    hasBefore &&
    (!isIsoTimestamp(beforeParam.value) || !isUuid(beforeIdParam.value))
  ) {
    return errorResponse("invalid_request", 400);
  }

  if (view === "groups") {
    if (
      groupParam.value !== null ||
      postParam.value !== null ||
      hasBefore
    ) {
      return errorResponse("invalid_request", 400);
    }
    return runAction(authorization.userId, { action: "groups" });
  }

  if (view !== "feed" && view !== "comments") {
    return errorResponse("invalid_request", 400);
  }
  if (!isCommunityGroupId(groupParam.value)) {
    return errorResponse("invalid_request", 400);
  }
  if (view === "comments") {
    if (!isUuid(postParam.value)) return errorResponse("invalid_request", 400);
    return runAction(authorization.userId, {
      action: "comments",
      groupId: groupParam.value,
      entityId: postParam.value,
      before: beforeParam.value ?? undefined,
      beforeId: beforeIdParam.value ?? undefined,
    });
  }
  if (postParam.value !== null) return errorResponse("invalid_request", 400);
  return runAction(authorization.userId, {
    action: "feed",
    groupId: groupParam.value,
    before: beforeParam.value ?? undefined,
    beforeId: beforeIdParam.value ?? undefined,
  });
}

export async function POST(req: Request): Promise<Response> {
  const authorization = await authorize(req);
  if ("response" in authorization) return authorization.response;

  const parsed = await readJsonBody(req);
  if (!parsed.ok) return errorResponse("invalid_request", parsed.status);
  if (!isRecord(parsed.value)) return errorResponse("invalid_request", 400);

  const input = parsed.value;
  const action = input.action;
  const groupId = input.groupId;
  if (
    typeof action !== "string" ||
    !ACTIONS.has(action as CommunityAction) ||
    !isCommunityGroupId(groupId)
  ) {
    return errorResponse("invalid_request", 400);
  }

  const common = { action: action as CommunityAction, groupId };
  if (action === "join") {
    const alias = typeof input.alias === "string" ? input.alias.trim() : "";
    if (
      input.acceptedRules !== true ||
      codePointLength(alias) < 2 ||
      codePointLength(alias) > 40
    ) {
      return errorResponse("invalid_request", 400);
    }
    return runAction(authorization.userId, { ...common, alias });
  }
  if (action === "leave") {
    return runAction(authorization.userId, common);
  }
  if (action === "post" || action === "comment") {
    const body = typeof input.body === "string" ? input.body.trim() : "";
    const limit = action === "post" ? 2000 : 1000;
    if (codePointLength(body) < 1 || codePointLength(body) > limit) {
      return errorResponse("invalid_request", 400);
    }
    if (action === "comment") {
      if (!isUuid(input.entityId)) return errorResponse("invalid_request", 400);
      return runAction(authorization.userId, {
        ...common,
        entityId: input.entityId,
        body,
      });
    }
    return runAction(authorization.userId, { ...common, body });
  }
  if (
    action === "delete_post" ||
    action === "delete_comment" ||
    action === "report_post" ||
    action === "report_comment"
  ) {
    if (!isUuid(input.entityId)) return errorResponse("invalid_request", 400);
    if (action === "report_post" || action === "report_comment") {
      if (
        typeof input.body !== "string" ||
        !REPORT_REASONS.has(input.body)
      ) {
        return errorResponse("invalid_request", 400);
      }
      return runAction(authorization.userId, {
        ...common,
        entityId: input.entityId,
        body: input.body,
      });
    }
    return runAction(authorization.userId, {
      ...common,
      entityId: input.entityId,
    });
  }
  return errorResponse("invalid_request", 400);
}
