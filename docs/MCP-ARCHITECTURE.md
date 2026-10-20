# VitalID MCP — implementation plan and security gates

Status: design specification; **not** a deployed MCP server. Branch: `feat/vitalid-discovery-mcp-plan`.

## Evidence from main (20 October 2026)
- Next.js 15/React 19/TypeScript application with Supabase Auth/Postgres and Stripe (`package.json`, `README.md`).
- WHOOP is the only implemented wearable OAuth connection; catalogue listings are not live.
- Member sharing is a selected-field **snapshot** under authenticated recipient-account checks and exact preview equality (`app/api/share/route.ts`). It is not a BBS verifiable credential.
- Colosseum BBS/Solana devnet work is an **isolated synthetic research demo** (`docs/COLOSSEUM.md`). BBS attests to an issuer-signed assertion; the private daily threshold is calculated by the issuer, **not** by a zero-knowledge circuit. No W3C VC interoperability claim.
- Recent PRs #92–#96 focus on public/private indexing and wallet authentication. Revalidate merged status/CI before relying on each change.
- GitHub code search for `mcp` returned no hits. This is **not proof** that MCP does not exist elsewhere; inspect tree/deployments before a definitive claim.

## Product boundary
**Discovery MCP (public, read-only):** no sessions, personal credentials, medical records, health metrics or private identity metadata. Enterprise enquiry is a deliberate outbound lead operation and must not disclose PHI in logs.

**Verification MCP (private, future):** an entirely separate authenticated tool namespace and policy surface. Not to be advertised as launched.

Reuse the existing backend and brand. Avoid a second Supabase/Vercel project.

## Phase 1: Discovery MCP tools (proposed)
| Tool | Input | Result | Side effect |
| --- | --- | --- | --- |
| `get_vitalid_capabilities` | none | versioned, manually curated public feature claims and status (`live`, `demo`, `planned`) | none |
| `get_supported_credential_types` | none | supported/experimental claim types with explicit issuer and verification caveats | none |
| `get_verification_requirements` | `use_case` allowlisted | B2B workflow, proof prerequisites, explicit exclusions | none |
| `request_enterprise_demo` | organisation, business email, use case, human-approved contact consent | enquiry reference (not user PHI) | creates lead; rate limit, CAPTCHA/abuse guard and privacy notice required |

Avoid describing `request_enterprise_demo` as read-only. Implement lead capture only after verified anti-abuse protection, privacy notice, storage policy and routing. Never accept medical histories in free-form fields.

## Recommended transport and deployment
- Review current MCP protocol/sdk and host capabilities before selecting transport; prefer standard Streamable HTTP when supported.
- First implement a strict public tool registry over **static, source-controlled public facts**, with typed schemas, output caps, timeout and per-IP rate limits. Return no cookies or private database information.
- Keep public MCP under the existing approved hosting footprint only if compatible with its lifecycle and request limits. Otherwise justify one small shared service; no parallel databases.
- Authentication and private tools must use a distinct route/handler with deny-by-default server-side authorisation. Do not use a single toggle parameter to switch public tools into private mode.
- Add capability version, deployment environment and non-sensitive readiness checks. Exclude internal infrastructure details from public output.
- Test unauthenticated access to *all* private health/share routes, prompt-injection attempts, tool enumeration and malicious lead submission.

## Phase 2: Verification proof gates
Issuer trust registry; signed credential issuance; evidence provenance; scoped permission; authenticated holder; exact disclosure preview; recipient binding; nonce and replay prevention; issuer signature/proof validation; credential/status expiry; revocation semantics; audit logging; key rotation; purpose limitation; security review. Preserve synthetic lab separation until these gates pass.

Pilot contract semantics: a verifier is receiving an issuer's assertion about **existing wellness benefit eligibility**. VitalID does not decide clinical eligibility, underwrite insurance or set premiums. Revocation stops future authorisation; it cannot erase already copied proof output.

## Metrics and validation
- Public discovery: tool success, safe-tool execution, qualified enterprise enquiries, booked demos, pilot conversions; track in aggregate without medical content.
- Private pilot: verified assertions, invalid/replay rejection, verifier response time, per-verification cost, revocation propagation, proof portability, audit completeness.
- Commercial hypothesis to test: annual enterprise platform minimum plus metered verified assertions, with separate onboarding/issuer integration fee. No invented customer or contract figures.

## Acceptance criteria for implementation PR
1. Dependency and transport choice justified against current host and official documentation.
2. Public tools return **only** reviewed non-sensitive static claims and never invoke member data stores.
3. Negative access-control tests for anonymous and unauthorised tool calls.
4. Tool schema, deterministic fixture tests, lint, typecheck, production build and CI status reported.
5. No secrets, health data, auth tokens or user-identifying telemetry in tool responses/logs.
6. Demo lead form requires explicit contact permission, field validation and anti-spam controls.
7. Full endpoint tested from an independent MCP client in a non-production environment.
8. No production rollout, sensitive permission grants or material expenditure without explicit approval.

## Blocking checks
- Confirm main branch SHA and whether PRs #92–#96 merged, and review CI.
- Confirm existing public-facing enterprise contact endpoint or CRM destination.
- Review deployment/runtime compatibility and real spend before adding an MCP process.
- Security review and issuer trust model needed before Phase 2.

This document intentionally adds **no executable endpoint** or database migration.
