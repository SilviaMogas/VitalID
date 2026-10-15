/** Node-only, synthetic domain laboratory. No HTTP server or live transport. */
import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export const POLICY = 'pocket-summary-lab-v1';
const MAX_BODY = 256 * 1024;
const MAX_SUMMARY = 16000;
const id = (x) => typeof x === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(x);
const fail = (code) => { throw new Error(code); };
const tuple = (...parts) => JSON.stringify(parts);

// Authenticated encryption with owner/connection/record purpose as associated data.
export class SecretBox {
  #key;
  constructor(key) {
    if (!Buffer.isBuffer(key) || key.length !== 32) fail('invalid_encryption_key');
    this.#key = Buffer.from(key);
  }
  seal(value, context) {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.#key, iv);
    cipher.setAAD(Buffer.from(context));
    const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value)), cipher.final()]);
    return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString('base64');
  }
  open(value, context) {
    const bytes = Buffer.from(value, 'base64');
    const decipher = createDecipheriv('aes-256-gcm', this.#key, bytes.subarray(0, 12));
    decipher.setAAD(Buffer.from(context));
    decipher.setAuthTag(bytes.subarray(12, 28));
    return JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString());
  }
}

export function verifyWebhook(secret, timestamp, rawBody, signature, now = Date.now()) {
  if (!Buffer.isBuffer(rawBody) || rawBody.length > MAX_BODY ||
      typeof timestamp !== 'string' || !/^\d{13}$/.test(timestamp) ||
      Math.abs(now - Number(timestamp)) > 300000 ||
      typeof signature !== 'string' || !/^[a-f0-9]{64}$/.test(signature)) return false;
  const digest = createHmac('sha256', secret).update(`${timestamp}.`).update(rawBody).digest();
  return timingSafeEqual(digest, Buffer.from(signature, 'hex'));
}

function projectSummary(response, recordingId, summaryId, pocketUserId) {
  const d = response?.data;
  if (response?.success !== true || d?.id !== recordingId ||
      d?.recorded_by?.user_id !== pocketUserId) fail('provider_owner_mismatch');
  // REST examples leave summarizations null. This map shape follows webhooks and
  // is an explicit unverified REST assumption; real payload validation is a blocker.
  const s = d.summarizations?.[summaryId];
  const text = s?.v2?.summary?.markdown;
  if (s?.processingStatus !== 'completed' || typeof text !== 'string' ||
      !text.trim() || Buffer.byteLength(text) > MAX_SUMMARY) fail('summary_unavailable');
  return { source: 'pocket-synthetic', recordingId, summaryId,
    text, recordedAt: d.recording_at ?? null, clinicalStatus: 'unverified_personal_note' };
}

/**
 * Synthetic sessions and consent callbacks are injected by the test harness.
 * These are trusted server dependencies, NOT request-body fields or real Auth.
 * Memory operations commit synchronously after each await. No distributed guarantees.
 */
export class PocketLab {
  #connections = new Map();
  #rows = new Map();
  #tombstones = new Set();
  #box;
  #provider;
  #authenticate;
  #healthConsent;
  #now;
  constructor({ encryptionKey, provider, authenticate, healthConsent, now = Date.now }) {
    if (provider?.mode !== 'synthetic' || typeof provider.getRecording !== 'function' ||
        typeof authenticate !== 'function' || typeof healthConsent !== 'function') fail('synthetic_dependencies_required');
    this.#box = new SecretBox(encryptionKey);
    this.#provider = provider;
    this.#authenticate = authenticate;
    this.#healthConsent = healthConsent;
    this.#now = now;
  }
  #owner(session) {
    const owner = this.#authenticate(session);
    if (typeof owner !== 'string' || !/^synthetic_[a-zA-Z0-9_-]+$/.test(owner)) fail('unauthenticated');
    return owner;
  }
  #connection(owner, connectionId) {
    const c = this.#connections.get(connectionId);
    if (!c || c.owner !== owner) fail('unavailable');
    return c;
  }
  #allowed(c) {
    if (c.state !== 'active' || c.policy !== POLICY || !this.#healthConsent(c.owner)) fail('consent_or_connection_required');
  }
  #context(c, purpose) { return tuple(c.owner, c.id, purpose); }
  #recordKey(c, recordingId) { return tuple(c.owner, c.pocketUserId, recordingId); }
  #rowKey(c, recordingId, summaryId) { return tuple(c.owner, c.id, recordingId, summaryId); }
  #stop(c, state, purge) {
    c.state = state;
    c.generation++;
    c.apiKey = null;
    c.selections.clear();
    if (purge) for (const [k, r] of this.#rows) if (r.connectionId === c.id) this.#rows.delete(k);
    // Keep the signing secret solely for signed deletion events, until disconnect.
  }
  connect(session, { apiKey, webhookSecret, pocketUserId, consent, policy }) {
    const owner = this.#owner(session);
    if (consent !== true || policy !== POLICY || !this.#healthConsent(owner)) fail('consent_required');
    if (typeof apiKey !== 'string' || !/^pk_synthetic_[a-zA-Z0-9_-]{8,128}$/.test(apiKey) ||
        typeof webhookSecret !== 'string' || !/^synthetic_[a-zA-Z0-9_-]{16,128}$/.test(webhookSecret) ||
        !id(pocketUserId)) fail('synthetic_credentials_required');
    // Single binding prevents duplicate imports and ambiguous deletion across reconnects.
    for (const c of this.#connections.values()) {
      if (c.owner === owner && c.state !== 'disconnected') fail('disconnect_first');
    }
    const connectionId = randomBytes(24).toString('hex');
    const c = { id: connectionId, owner, pocketUserId, state: 'active', policy,
      consentedAt: this.#now(), generation: 0, selections: new Set() };
    c.apiKey = this.#box.seal(apiKey, this.#context(c, 'api-key'));
    c.webhookSecret = this.#box.seal(webhookSecret, this.#context(c, 'webhook-secret'));
    this.#connections.set(connectionId, c);
    return { connectionId, state: c.state, mode: 'synthetic' };
  }
  select(session, connectionId, { recordingId, summaryId, consent }) {
    const c = this.#connection(this.#owner(session), connectionId);
    this.#allowed(c);
    if (consent !== true || !id(recordingId) || !id(summaryId)) fail('selection_consent_required');
    if (this.#tombstones.has(this.#recordKey(c, recordingId))) fail('recording_deleted');
    if (c.selections.size >= 100) fail('selection_limit');
    c.selections.add(tuple(recordingId, summaryId));
  }
  async importSelected(session, connectionId, recordingId, summaryId) {
    const c = this.#connection(this.#owner(session), connectionId);
    this.#allowed(c);
    if (!c.selections.has(tuple(recordingId, summaryId))) fail('not_selected');
    if (this.#tombstones.has(this.#recordKey(c, recordingId))) fail('recording_deleted');
    const rowKey = this.#rowKey(c, recordingId, summaryId);
    if (this.#rows.has(rowKey)) return { result: 'duplicate' };
    const generation = c.generation;
    let response;
    try {
      response = await this.#provider.getRecording({
        apiKey: this.#box.open(c.apiKey, this.#context(c, 'api-key')),
        recordingId, summaryId, includeTranscript: false,
      });
    } catch { fail('provider_unavailable'); }
    // Never allow an in-flight read to write after deletion/revocation/disconnect.
    this.#allowed(c);
    if (c.generation !== generation) fail('connection_changed');
    if (response?.status === 401 || response?.status === 403) {
      this.#stop(c, 'needs_reauth', false);
      fail('reconnect_required');
    }
    if (response?.status === 404) { this.#deleteRecording(c, recordingId); fail('recording_deleted'); }
    if (response?.status !== 200) fail('provider_unavailable');
    if (!c.selections.has(tuple(recordingId, summaryId)) ||
        this.#tombstones.has(this.#recordKey(c, recordingId))) fail('selection_or_recording_removed');
    const record = projectSummary(response.body, recordingId, summaryId, c.pocketUserId);
    if (this.#rows.has(rowKey)) return { result: 'duplicate' };
    this.#rows.set(rowKey, { connectionId, recordingId, summaryId,
      encrypted: this.#box.seal(record, this.#context(c, rowKey)) });
    return { result: 'imported' };
  }
  #deleteRecording(c, recordingId) {
    this.#tombstones.add(this.#recordKey(c, recordingId));
    for (const other of this.#connections.values()) {
      if (other.owner !== c.owner || other.pocketUserId !== c.pocketUserId) continue;
      for (const s of other.selections) if (JSON.parse(s)[0] === recordingId) other.selections.delete(s);
      for (const [k, r] of this.#rows) if (r.connectionId === other.id && r.recordingId === recordingId) this.#rows.delete(k);
    }
  }
  async webhook(connectionId, { timestamp, rawBody, signature }) {
    const c = this.#connections.get(connectionId);
    if (!c || c.state === 'disconnected' || !c.webhookSecret) fail('unavailable');
    const secret = this.#box.open(c.webhookSecret, this.#context(c, 'webhook-secret'));
    if (!verifyWebhook(secret, timestamp, rawBody, signature, this.#now())) fail('invalid_signature');
    let event;
    try { event = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(rawBody)); }
    catch { fail('invalid_payload'); }
    if (!id(event?.recording?.id) || event?.user?.id !== c.pocketUserId || event.organization != null) fail('invalid_owner_or_scope');
    const recordingId = event.recording.id;
    if (event.event === 'recording.deleted') {
      this.#deleteRecording(c, recordingId);
      return { result: 'deleted' }; // Works without active sync/health consent.
    }
    if (event.event !== 'summary.completed') return { result: 'ignored' };
    this.#allowed(c);
    // Never store/use summary/transcript/title/email from webhook payload.
    // Selection is already recorded; authenticated reads revalidate provider owner.
    return { result: 'notification_only', recordingId };
  }
  list(session, connectionId) {
    const c = this.#connection(this.#owner(session), connectionId);
    if (!this.#healthConsent(c.owner) || c.policy !== POLICY) fail('consent_required');
    const records = [];
    for (const [k, r] of this.#rows) if (r.connectionId === c.id) records.push(this.#box.open(r.encrypted, this.#context(c, k)));
    return records;
  }
  removeSelection(session, connectionId, recordingId, summaryId) {
    const c = this.#connection(this.#owner(session), connectionId);
    c.selections.delete(tuple(recordingId, summaryId));
    this.#rows.delete(this.#rowKey(c, recordingId, summaryId));
  }
  withdrawConsent(session, connectionId) {
    const c = this.#connection(this.#owner(session), connectionId);
    this.#stop(c, 'consent_withdrawn', true);
    c.policy = null;
  }
  disconnect(session, connectionId) {
    const c = this.#connection(this.#owner(session), connectionId);
    this.#stop(c, 'disconnected', true);
    c.webhookSecret = null;
  }
  status(session, connectionId) {
    const c = this.#connection(this.#owner(session), connectionId);
    return { state: c.state, mode: 'synthetic' };
  }
}
