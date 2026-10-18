import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const STUBS = {
  'server-only': 'export {};',
  react: 'export const cache = (fn) => fn;',
  'next/server': 'export const NextResponse = { json: (body, init) => Response.json(body, init) }; export class NextRequest extends Request {}',
  'next/headers': `
    const jar = () => (globalThis.__walletCookies ??= {});
    export async function cookies() {
      return {
        get(name) { const value = jar()[name]; return value === undefined ? undefined : { value }; },
        set(name, value) { jar()[name] = value; },
        delete(name) { delete jar()[name]; },
      };
    }
  `,
  '@supabase/supabase-js': 'export function createClient(){ return globalThis.__walletAuthClient; }',
  '@/lib/supabase/server': 'export function getSupabaseServerClient(){ return globalThis.__walletSupabase; }',
  '@/lib/share-api': `
    export function isSameOrigin(request) {
      const origin = request.headers.get("origin");
      if (!origin) return true;
      try { return new URL(origin).origin === new URL(request.url).origin; } catch { return false; }
    }
  `,
};

function tryFile(base) {
  for (const ext of ['', '.ts', '.tsx', '/index.ts']) {
    const candidate = base + ext;
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  return null;
}

export async function resolve(spec, context, nextResolve) {
  if (spec in STUBS) {
    return { url: `data:text/javascript,${encodeURIComponent(STUBS[spec])}`, shortCircuit: true };
  }
  let file = null;
  if (spec.startsWith('@/')) file = tryFile(path.join(REPO, spec.slice(2)));
  else if (/^\.\.?\//.test(spec) && context.parentURL?.startsWith('file:')) {
    file = tryFile(path.join(path.dirname(fileURLToPath(context.parentURL)), spec));
  }
  if (file) return { url: pathToFileURL(file).href, shortCircuit: true };
  return nextResolve(spec, context);
}
