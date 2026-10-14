import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const STUBS = {
  "server-only": "export {};",
  react: "export const cache = (fn) => fn;",
  "next/server":
    "export const NextResponse = { json: (body, init) => Response.json(body, init), redirect: (url, status = 307) => Response.redirect(String(url), status) }; export class NextRequest extends Request {}",
  "next/headers":
    "const jar = () => (globalThis.__mobileCookies ??= {}); export async function cookies(){ return { get(n){ const v = jar()[n]; return v === undefined ? undefined : { value: v }; }, set(n, v){ jar()[n] = v; }, delete(n){ delete jar()[n]; } }; }",
  "@supabase/supabase-js": `
    function userForToken(token) {
      return (globalThis.__mobileAuthUsers ?? {})[token] ?? null;
    }
    function fakeUser(email) {
      const users = globalThis.__mobileUsersByEmail ?? {};
      return users[email] ?? null;
    }
    export function createClient(_url, _key) {
      const auth = {
        async getUser(token) {
          if (token === "infra-error") throw new Error("service unavailable");
          const user = userForToken(token);
          return user ? { data: { user }, error: null } : { data: { user: null }, error: { status: 401, code: "invalid_token" } };
        },
        async signInWithPassword({ email, password }) {
          const record = (globalThis.__mobileCredentials ?? {})[email];
          if (!record || record.password !== password) return { data: { session: null, user: null }, error: { status: 400, code: "invalid_credentials", message: "Invalid login credentials" } };
          return { data: { session: record.session, user: record.user }, error: null };
        },
        async refreshSession({ refresh_token: token }) {
          if ((globalThis.__mobileRefreshErrors ?? {})[token]) return { data: { session: null, user: null }, error: (globalThis.__mobileRefreshErrors ?? {})[token] };
          const record = (globalThis.__mobileRefreshes ?? {})[token];
          return record ? { data: { session: record.session, user: record.user }, error: null } : { data: { session: null, user: null }, error: { status: 400, code: "refresh_token_not_found", message: "refresh token not found" } };
        },
        admin: {
          async signOut() {
            if (globalThis.__mobileSignoutError) return { error: globalThis.__mobileSignoutError };
            return { error: null };
          },
          async getUserById(id) {
            const user = Object.values(globalThis.__mobileAuthUsers ?? {}).find((item) => item.id === id);
            return user ? { data: { user }, error: null } : { data: { user: null }, error: { status: 404 } };
          },
        },
      };
      return { auth };
    }
  `,
  "@/lib/consent": `
    const state = () => (globalThis.__mobileConsents ??= new Map());
    export function getConsentStore() {
      return {
        async latest(userId) { return state().get(userId) ?? null; },
        async record(userId, type, policyVersion) {
          const current = state().get(userId) ?? {};
          const record = { type, policyVersion, consentedAt: new Date().toISOString() };
          state().set(userId, { ...current, [type]: record });
          return record;
        },
      };
    }
  `,
  "@/lib/share-store": `
    const shares = () => (globalThis.__mobileShares ??= new Map());
    export async function createShare(payload) { shares().set(payload.id, payload); }
    export async function getShare(id) { return shares().get(id) ?? null; }
    export async function listShares() { return [...shares().values()]; }
    export async function revokeShare(id) { const value = shares().get(id); if (!value) return false; shares().set(id, { ...value, revoked: true }); return true; }
  `,
  "@/lib/membership/store": `
    export function getMembershipStore() {
      return { async upsert({ userKey }) { return { plan: (globalThis.__mobilePlans ?? {})[userKey] ?? "free", userKey }; } };
    }
  `,
  "@/lib/onboarding/store": `
    export function getOnboardingStore() {
      return { async get(userId) { return (globalThis.__mobileSetups ?? {})[userId] ?? null; }, async patch() { throw new Error("not used"); }, async setConnectorStatus() { throw new Error("not used"); } };
    }
  `,
  "@/lib/connectors/whoop": `
    export async function getWhoopStatus() { return { connected: false, provider: "whoop", lastSyncedAt: null }; }
    export async function getWhoopDaily() { return []; }
    export async function getWhoopBody() { return null; }
  `,
};

function tryFile(base) {
  for (const ext of ["", ".ts", ".tsx", "/index.ts"]) {
    const candidate = base + ext;
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  return null;
}

export async function resolve(spec, context, nextResolve) {
  if (spec in STUBS) {
    return {
      url: "data:text/javascript," + encodeURIComponent(STUBS[spec]),
      shortCircuit: true,
    };
  }
  let file = null;
  if (spec.startsWith("@/")) file = tryFile(path.join(REPO, spec.slice(2)));
  else if (/^\.\.?\//.test(spec) && context.parentURL?.startsWith("file:")) {
    file = tryFile(path.join(path.dirname(fileURLToPath(context.parentURL)), spec));
  }
  if (file) return { url: pathToFileURL(file).href, shortCircuit: true };
  return nextResolve(spec, context);
}
