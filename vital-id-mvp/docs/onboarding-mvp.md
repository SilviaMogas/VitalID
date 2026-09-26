# Vital ID onboarding and insurer information pack

## Product and boundaries
Vital ID organises information and lets a person choose an expiring read-only snapshot.
A recipient is named by the user; the name does not authenticate that recipient.
Nothing is sent automatically. There are no insurer integrations, acceptance claims,
eligibility decisions, premium predictions or wearable-based health-risk inference.

The new entry point is /onboarding, also linked from the existing sharing page.
The existing dashboard, journal, authentication, WHOOP and legacy sharing remain.
A new pack stores its versioned JSON under pack:v1 in the existing fields column;
no database migration is needed. Its separate owner capability is stored under
pack:owner, excluded from recipient responses. A recipient's token cannot revoke
new packs. Legacy links retain their existing capability behaviour.

## Five screens
1. Plain-language explanation and purpose: appointment, caregiver, insurer pack.
2. Essential processing consent; separate, unchecked optional WHOOP permission.
   Explain browser-session draft, server shared copy, bearer-link access and revocation.
3. Manual entry, fictional demo, or configured WHOOP. Other devices are unavailable.
4. Edit/remove entries; choose fields and supporting documents (nothing preselected).
   Every entry shows source, date type, date and verification status. WHOOP's existing
   adapter supplies retrieval time, not measurement time; that distinction is explicit.
5. Reuse the exact recipient renderer for preview. Name recipient and review expiry.
   The final confirmation is the only operation uploading health content to the share store.

Account forms request essential processing consent before enabling name, email or password entry; the auth API rejects missing consent. Signing in authenticates, then requires separate health consent before loading account health history.
The original Fátima dashboard requires explicit demo consent. Its Circular card is a supplied
sample, not an active connection. The new pack demo is entirely synthetic, including the
fictional Cedar Example Insurance recipient and its supporting plain-text document.

## Data and access
- Draft: sessionStorage in this browser tab; switching accounts/signing out clears it.
  Clear draft removes that draft, not issued links. Optional WHOOP receipt lasts 24 hours.
- Manual fields: unverified, editable/removable, time of entry/correction.
- WHOOP: real OAuth/API only when configured and separately authorised. Dev mock cannot
  be imported as real pack data. Imported readings are device-reported, never medically verified.
- Documents: PDF, PNG, JPEG or plain text; 250 KB per document, at most 3, 600 KB total.
  MIME/signature checks reduce accidental mismatches; no malware scanning is implemented.
  Stored as bounded base64 inside selected pack JSON, not as public URLs.
- Downloads require an active token and use attachment, nosniff, sandbox and no-store headers.
  Expiry/revocation checks also apply to downloads. Preview downloads use the local draft.
- Expiry is fixed at preview and validated at confirmation (maximum 7 days).
  A delayed/expired preview must be reviewed again.
- Shared recipient fields contain no owner management capability.
- Owner management links remain in existing device-local share history; keep this browser.
  This is not cross-device account ownership or recipient authentication.
- Audit records created time, last 50 page opens, revoked time and expiry deadline.
  Open events do not prove identity, receipt or acceptance; your own opens count.
  Expiry is derived from deadline, not a background job or separate logged event.
  No automatic notification is sent. Concurrent backend updates are not tamper-evident or
  transactional; this is an MVP access history, not a compliance-grade audit log.
- Production requires configured Redis or Supabase shares storage. Vercel's nonpersistent
  file fallback blocks personal packs, but permits explicitly fictional exploration.
  Supabase rows have no automatic deletion; Redis retains records until one day after
  expiry. Revocation blocks future access and does not erase stored/downloaded copies.
  Retention/deletion policies need definition before sensitive production use.

## 60-second demo
0–10s: Open onboarding, read the promise and choose Insurer information pack.
10–20s: Show storage/access/revocation explanation. Accept essential consent;
        leave optional WHOOP unchecked.
20–30s: Choose Fictional demo. Point out fictional Fátima, source/date/status,
        and Cedar Example Insurance (fictional). Nothing is preselected.
30–40s: Select name and one supporting document; leave sleep unselected.
        Review named recipient and one-hour expiry, then show exact preview.
40–50s: Confirm creation, open the read-only recipient link and show that sleep
        is absent. Download the selected fictional note and show the Opened event.
50–60s: Revoke access; recipient and download stop working. Toggle Arabic/RTL
        to show the same flow. Explain that no insurer was contacted.

## Assumptions and interviews
- A small user-selected snapshot is useful; account creation is not needed to prepare it.
- Device dates cannot be assumed to be measurement dates.
- Supporting documents remain unverified; the user decides relevance.
- A bearer link and device-local owner history are adequate only for a limited MVP.

Interview users about comprehension within two minutes, comfort with bearer links,
recipient naming, revocation versus copies, missing dates, document sizes and Arabic wording.
Interview actual insurer staff about requested fields, formats, consent/retention expectations
and whether they would accept this preparation pack through their own approved channels.
A real agreement, technical integration and acceptance evidence would be required for any
insurer-partner claim. None exists or is assumed by this implementation.

## Checks
Run npm run lint, npm run typecheck, npm test, npm run build and npm run test:e2e.
New tests cover provenance, selection, upload validation, consent/confirmation gates,
separate owner token, expiry/revocation for downloads, access history, identical previews,
manual corrections/removal, WHOOP consent and OAuth return, English/Arabic and mobile overflow.
Existing dashboard and daily journal regression checks remain.
