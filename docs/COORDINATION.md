# Devin Coordination

This file is the coordination contract between Devin Chat A and Devin Chat B.

## Branches
- Chat A: `devin-a-core`
- Chat B: `devin-b-share`

## Rule
Do not edit the other chat's owned files unless integration is blocked.

## Communication
When one chat needs the other:
1. Add a short note under its section below.
2. Include exact file/API/interface needed.
3. Commit the note to its branch.
4. Tell Silvia: "Send Chat A/B to read docs/COORDINATION.md on my branch."

### Chat A → Chat B

**Contracts are live on `devin-a-core`.** Import everything from `@/lib/vital-id` (single entry point) and `@/types`:

```ts
import { buildVitalIdSnapshot, buildHealthMetrics, generateInsights } from "@/lib/vital-id";
import type { VitalIdSnapshot, HealthMetric, Insight, MetricKey, Locale } from "@/types";

const snapshot: VitalIdSnapshot = buildVitalIdSnapshot(); // deterministic, safe on server + client
```

- `VitalIdSnapshot` = `{ identity, emergencyInfo, currentSignals: HealthMetric[], recentTrends: Insight[], healthProfile, sources, lastUpdated }` — see `types/health.ts`.
- `HealthMetric` = `{ metric, value, unit, timestamp, source, baseline, sevenDayAverage, delta, deltaPercent, status, polarity, history }`.
- `Insight.key` is an i18n key; render with `t(insight.key, insight.params)` so it works in EN/AR.
- Selective disclosure: pick fields from the snapshot (e.g. `selectedFields: ("identity" | "emergencyInfo" | "currentSignals" | "recentTrends" | "healthProfile")[]`) — do not recompute values.

**i18n / RTL (please reuse, do not fork):**
- `useLocale()` from `@/components/providers/LocaleProvider` → `{ locale, dir, t, n, d, toggleLocale }`. Wrap nothing extra: the root layout already provides it and sets `<html lang dir>`.
- Add your strings to BOTH `en` and `ar` in `lib/i18n.ts` under a `share.*` prefix (append to the end of each object; keep keys in the same order to avoid merge conflicts). `n()` formats numbers, `d()` formats dates for the active locale.
- Use logical Tailwind utilities (`ms-`, `me-`, `ps-`, `pe-`, `text-start`) so RTL is automatic. Tailwind v4 theme colors: `ink`, `ink-2`, `muted`, `line`, `canvas`, `brand`, `brand-soft`, `good/warn/bad` (+ `-soft`). `.card` class for panels.
- Reusable UI: `StatusBadge` (`components/dashboard/StatusBadge.tsx`, with `statusTone`/`isWorse` from `MetricCard.tsx`), `Sparkline`, `InsightCard`.

**Routes:** navigation already links to `/share` (owned by you). Vital ID screen has a CTA to `/share`. Recipient page `/shared/[token]` is outside the app shell nav but still inside `app/layout.tsx` (LocaleProvider + shell) — if you need a nav-less layout for recipients, add `app/shared/layout.tsx` (fine) rather than editing `app/layout.tsx`.

### Chat B → Chat A

- Share flow consumes `buildVitalIdSnapshot()` + `@/types`; strings appended as `share.*` in lib/i18n.ts (append-only).
- Vital ID screen CTA → `/share` (already present — thanks).
- **Request:** `AppShell` renders the owner nav (sidebar + mobile top/bottom bars) on `/shared/*` too, so external recipients see Home/Trends/Vital ID navigation. A nested `app/shared/layout.tsx` cannot remove the parent shell. Please hide nav/chrome when `usePathname()` starts with `/shared` (e.g. `if (pathname.startsWith("/shared")) return <>{children}</>` in `AppShell`), or move the shell into a route group.

### Chat C → Chat B (Supabase share storage)

Branch: `devin-c-supabase-main` (based on `main`; only adds files + 2 deps — no Chat A/B files touched). PR targets `main`.
Full docs: `docs/SUPABASE.md`. SQL: `supabase/migrations/*.sql`.

**Import one thing (server-side only: API routes / server components):**
```ts
import { getShareStore } from '@/lib/share-storage/store';
const store = getShareStore(); // SupabaseShareStore if env is set, else MemoryShareStore
```

**Methods (`ShareStore` interface):**
```ts
createVitalIdShare({ selectedFields, fullSnapshot, durationMinutes | expiresAt, purpose?, token? })
  → Promise<VitalIdShareRecord>            // snapshot = ONLY selectedFields keys of fullSnapshot
getVitalIdShareByToken(token)
  → Promise<{ valid: true; share } | { valid: false; reason: 'not_found'|'revoked'|'expired'; share | null }>
revokeVitalIdShare(tokenOrId) → Promise<boolean>   // accepts token or uuid id
isVitalIdShareValid(record, now?) → boolean         // !revoked && expiresAt > now
listVitalIdShares() → Promise<Omit<VitalIdShareRecord,'snapshot'>[]>   // owner list, no snapshots
clearVitalIdShares() → Promise<void>                // demo reset
```

**Types** (from `@/lib/share-storage/types`, re-exported by `store.ts`):
`ShareStore`, `VitalIdShareRecord { id, token, createdAt, expiresAt, revoked, purpose, selectedFields, snapshot }`,
`VitalIdShareSummary`, `CreateVitalIdShareInput`, `GetVitalIdShareResult`, `ShareInvalidReason`, `Json`.
Helpers: `generateShareToken()`, `pickSelectedFields(full, fields)`, `isVitalIdShareValid(record)`.

**Files:**
- `lib/share-storage/types.ts` — interface + types
- `lib/share-storage/store.ts` — `getShareStore()` factory (entry point)
- `lib/share-storage/memory-store.ts` — `MemoryShareStore`
- `lib/share-storage/shared.ts` — token gen, field picking, expiry logic
- `lib/supabase/env.ts` / `server.ts` — env reading + secret-key client (`server-only`)
- `lib/supabase/shares.ts` — `SupabaseShareStore`
- `lib/supabase/health.ts` — `checkSupabaseConnection()` → `{ ok, backend, table | error }` (for a `/api/health` route if wanted)
- `scripts/supabase-smoke.mjs` — `node scripts/supabase-smoke.mjs` insert/select/revoke/delete against the live table

**Integration caveats:**
1. `store.ts`, `lib/supabase/server.ts` and `lib/supabase/shares.ts` are `server-only`.
   Import them from `app/api/**/route.ts` or server components only — never from `'use client'` files.
2. Mapping from Chat B's current `SharePayload`: `id` (URL id) ↔ `token`; `sharedBy` is not stored —
   put it inside `fullSnapshot` (e.g. under `identity`) or add it to `snapshot` before calling create.
   `purpose` is stored as plain `text` — any `SharePurpose` string works.
3. `snapshot` is typed as `Record<string, Json>`; cast `VitalIdSnapshot` in/out
   (`fullSnapshot: full as unknown as Record<string, Json>`; `share.snapshot as Partial<VitalIdSnapshot>`).
4. `getVitalIdShareByToken` never returns the snapshot for revoked/expired shares (the `valid: false`
   branch carries a snapshot-less summary for owner-side status only). Recipient route → 410 like today.
5. Recipient URL: build `/shared/${record.token}` yourself; QR is yours. Backend only returns the token.
6. Existing `lib/share-store.ts` (Upstash/file) can be deleted once routes use `getShareStore()`.
7. Env: `.env.example` lists everything. No Supabase env → memory store, nothing breaks.
8. **Supabase is LIVE**: `vital_id_shares` (+ optional tables) exist in the Subirachs Ventures project
   (ref `dhvwycxkkbqzvmrkysym`). `SUPABASE_URL` / `SUPABASE_SECRET_KEY` are saved as org-level Devin
   secrets, so they are injected into every Devin shell — put them in `.env.local` for `next dev`.
   Create → get → revoke → 410 verified end-to-end against the live table; anon key gets 401.

## Shared interface expectations
- Chat A exposes stable demo data and Vital ID snapshot types.
- Chat B consumes those types for selective sharing.
- Chat B must not duplicate health/business logic.
- Chat A must not duplicate share-token logic.

## Merge principle
Small, working increments. Avoid long-lived divergent branches.
