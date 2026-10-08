// Minimal Node ESM hooks so `node --experimental-strip-types` can import the
// app's server modules in isolation: resolves `@/…` + extensionless paths and
// stubs Next/React server-only APIs. Session is injected via globalThis.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const STUBS = {
  'server-only': 'export {};',
  react: 'export const cache = (fn) => fn;',
  'next/headers':
    'export async function cookies(){ return { get(){ return undefined; }, set(){}, delete(){} }; }',
  '@/lib/auth/server':
    'export async function getCurrentUser(){ return globalThis.__testUser ?? null; } export function isAuthConfigured(){ return false; }',
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
