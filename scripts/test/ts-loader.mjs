// Minimal Node ESM hooks so `node --experimental-strip-types` can import the
// app's server modules in isolation: resolves `@/…` + extensionless paths and
// stubs Next/React server-only APIs. Session is injected via globalThis.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const STUBS = {
  'next/server':
    'export const NextResponse = { json: (body, init) => Response.json(body, init), redirect: (url, status = 307) => Response.redirect(String(url), status) }; export class NextRequest extends Request {}',
  '@/lib/membership/session': 'export const DEMO_USER_KEY = "fatima"; export async function getCurrentUserKey(){ return globalThis.__testUser?.id ?? DEMO_USER_KEY; }',
  '@/lib/share-store': 'const shares = () => (globalThis.__testShares ??= new Map()); export async function createShare(p){ globalThis.__createdShare = p; shares().set(p.id, p); } export async function getShare(id){ return shares().get(id) ?? null; } export async function listShares(){ return Array.from(shares().values()); } export async function revokeShare(id){ const p = shares().get(id); if(!p) return false; shares().set(id, { ...p, revoked: true }); return true; } export async function setShareRecipients(id, sentTo){ const p = shares().get(id); if(!p) return null; const updated = { ...p, sentTo }; shares().set(id, updated); return updated; } export async function clearForOwner(ownerKey){ for(const [id, p] of shares()) if(p.ownerKey === ownerKey) shares().delete(id); }',
  'server-only': 'export {};',
  react: 'export const cache = (fn) => fn;',
  'next/headers':
    'const jar = () => (globalThis.__testCookies ??= {}); export async function cookies(){ return { get(n){ const v = jar()[n]; return v === undefined ? undefined : { value: v }; }, set(n, v){ jar()[n] = v; }, delete(n){ delete jar()[n]; } }; }',
  '@/lib/auth/server':
    'export async function getCurrentUser(){ return globalThis.__testUser ?? null; } export async function recipientAccountExists(id){ try { if (globalThis.__recipientAccountLookup) return Boolean(await globalThis.__recipientAccountLookup(id)); return id === "00000000-0000-4000-8000-00000000000b"; } catch { return false; } } export function isAuthConfigured(){ return false; } export async function signUpWithPassword(i){ return { ok: true, user: { id: globalThis.__signupId, email: i.email } }; }',
};

function tryFile(base) {
  for (const ext of ['', '.ts', '.tsx', '/index.ts']) {
    const p = base + ext;
    if (fs.existsSync(p) && fs.statSync(p).isFile()) return p;
  }
  return null;
}

export async function resolve(spec, ctx, next) {
  if (spec in STUBS) {
    return { url: 'data:text/javascript,' + encodeURIComponent(STUBS[spec]), shortCircuit: true };
  }
  let file = null;
  if (spec.startsWith('@/')) file = tryFile(path.join(REPO, spec.slice(2)));
  else if (/^\.\.?\//.test(spec) && ctx.parentURL?.startsWith('file:')) {
    file = tryFile(path.join(path.dirname(fileURLToPath(ctx.parentURL)), spec));
  }
  if (file) return { url: pathToFileURL(file).href, shortCircuit: true };
  return next(spec, ctx);
}
