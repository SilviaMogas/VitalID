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

## Shared interface expectations
- Chat A exposes stable demo data and Vital ID snapshot types.
- Chat B consumes those types for selective sharing.
- Chat B must not duplicate health/business logic.
- Chat A must not duplicate share-token logic.

## Merge principle
Small, working increments. Avoid long-lived divergent branches.
