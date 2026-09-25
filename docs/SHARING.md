# Vital ID — Secure Sharing

## Security model

- A share is a **temporary, server-side snapshot**: the owner picks purpose,
  information categories and an expiry (15 min / 1 h / 24 h). The server copies
  **only the selected top-level fields** of the demo `VitalIdSnapshot` into the
  stored payload (`buildSnapshot` in `lib/sharing.ts`).
- Links carry only an opaque **10-char base62 id** (`crypto.randomBytes`). The
  link and its QR code contain no health data.
- `GET /api/share/:id` returns `410 {status:'unavailable'}` for missing,
  expired **or revoked** shares — the snapshot is never leaked to a dead link.
  Active payloads are served with `Cache-Control: no-store` and the recipient
  page re-polls every 10 s so revocation/expiry shows up live.
- `POST /api/share/:id/revoke` sets `revoked=true` immediately.

## API

| Route | Method | Notes |
|---|---|---|
| `/api/share` | POST | `{purpose, selectedFields, durationMinutes}` → full `SharePayload` (owner side). 400 on bad input. |
| `/api/share` | GET | List summaries (id, purpose, timestamps, revoked, fields) — no snapshots. |
| `/api/share/:id` | GET | 200 payload or 410 `{status:'unavailable'}`. `no-store`. |
| `/api/share/:id/revoke` | POST | 200 or 404. |
| `/api/share/reset` | POST | Clears everything (demo reset). |

## Persistence

- If `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` are set, shares are
  stored via the Upstash REST API (`SET` with `EX` = TTL-to-expiry + 60 s,
  `GET`, `DEL`), indexed in the `vitalid:shares` set.
- Otherwise an in-memory `Map` on `globalThis` is used, mirrored best-effort to
  a JSON file (`SHARE_STORE_FILE`, default `<tmpdir>/vitalid-shares.json`) so
  shares survive a dev-server restart.

## Demo steps

```bash
npm run dev          # http://localhost:3000/share  (?lang=ar for RTL)
```

1. Pick a purpose → field checkboxes are pre-filled (still editable).
2. Choose expiry → **Generate secure link** → copy link or scan QR.
3. Open the recipient view in another browser/tab; revoke from `/share` and
   watch it flip to "expired or revoked" within ~10 s.
4. **Reset Demo** clears all shares (`POST /api/share/reset`).

All demo data is fictional/synthetic (persona "Layla Haddad").
