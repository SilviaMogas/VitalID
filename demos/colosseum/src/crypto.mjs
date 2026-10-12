import * as bbs from '@digitalbazaar/bbs-signatures';

export const CIPHERSUITE = 'BLS12-381-SHA-256';
export const SCHEMA = 'VitalID Demo BBS messages v1';
export const CLAIM = 'at-least-seven-distinct-synthetic-days-in-thirty-day-window';
export const FIELDS = ['demo', 'claimType', 'qualifies', 'windowStart', 'windowEnd', 'expiresAt', 'permissionRef', 'controller'];
export const DISCLOSED = FIELDS.map((_, i) => i);
export const utf8 = value => new TextEncoder().encode(value);
export const hex = bytes => Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
export function unhex(value) {
  if (typeof value !== 'string' || value.length % 2 || !/^[a-f0-9]*$/.test(value)) throw new Error('Invalid encoding');
  return Uint8Array.from(value.match(/../g) ?? [], b => parseInt(b, 16));
}
const header = utf8(SCHEMA);
const message = (field, value) => utf8(JSON.stringify([field, value]));
export const disclosedMessages = claims => FIELDS.map(field => message(field, claims[field]));

export function enrollmentBytes(c, publicKey) {
  return utf8(JSON.stringify(['VitalID demo enrollment v1', c.id, c.nonce, c.expiresAt, publicKey]));
}

export function contextBytes(c) {
  return utf8(JSON.stringify([
    'VitalID presentation v1', c.id, c.nonce, c.receiverId, c.receiverKey,
    c.holderId, c.permissionRef, c.program, c.genesis, c.expiresAt,
  ]));
}

export async function authorizationBytes(context, proof) {
  const digest = hex(new Uint8Array(await crypto.subtle.digest('SHA-256', unhex(proof))));
  return utf8(JSON.stringify(['VitalID controller authorization v1', hex(contextBytes(context)), digest]));
}

export function assessRecords(records, windowStart, windowEnd) {
  const start = Date.parse(windowStart), end = Date.parse(windowEnd);
  if (!Number.isFinite(start) || end - start !== 30 * 86400000) throw new Error('Invalid window');
  const days = new Set(records.filter(r => {
    const time = Date.parse(`${r.date}T00:00:00.000Z`);
    return /^\d{4}-\d{2}-\d{2}$/.test(r.date) && Number.isFinite(time)
      && new Date(time).toISOString().slice(0, 10) === r.date && time >= start && time < end;
  }).map(r => r.date));
  return days.size >= 7;
}

export async function issuerKey() {
  return bbs.generateKeyPair({ciphersuite: CIPHERSUITE});
}

export async function issueCredential({keys, records, name, permission, now = Date.now()}) {
  const end = new Date(now);
  end.setUTCHours(0, 0, 0, 0);
  end.setUTCDate(end.getUTCDate() + 1);
  const windowEnd = end.toISOString();
  const windowStart = new Date(+end - 30 * 86400000).toISOString();
  const claims = {
    demo: true, claimType: CLAIM,
    qualifies: assessRecords(records, windowStart, windowEnd),
    windowStart, windowEnd, expiresAt: permission.expiresAt,
    permissionRef: permission.reference, controller: permission.controller,
  };
  if (!claims.qualifies) throw new Error('Synthetic records do not meet requested condition');
  const messages = [
    ...disclosedMessages(claims), message('name', name), message('dailyRecords', records),
  ];
  const signature = await bbs.sign({...keys, header, messages, ciphersuite: CIPHERSUITE});
  return {
    schema: SCHEMA, issuer: 'VitalID Demo', publicKey: hex(keys.publicKey),
    claims, messages: messages.map(hex), signature: hex(signature),
  };
}

export async function derivePresentation(credential, context, privateKey) {
  const publicKey = unhex(credential.publicKey);
  const signature = unhex(credential.signature);
  const messages = credential.messages.map(unhex);
  if (!await bbs.verifySignature({publicKey, signature, header, messages, ciphersuite: CIPHERSUITE})) {
    throw new Error('Invalid issuer signature');
  }
  const proof = hex(await bbs.deriveProof({
    publicKey, signature, header, messages, ciphersuite: CIPHERSUITE,
    presentationHeader: contextBytes(context), disclosedMessageIndexes: DISCLOSED,
  }));
  const authorization = hex(new Uint8Array(await crypto.subtle.sign(
    'Ed25519', privateKey, await authorizationBytes(context, proof),
  )));
  return {schema: SCHEMA, issuer: 'VitalID Demo', publicKey: credential.publicKey, claims: credential.claims, proof, authorization};
}

export async function verifyPresentation({presentation: p, context, trustedPublicKey, permission, now = Date.now()}) {
  try {
    if (!p || p.schema !== SCHEMA || p.issuer !== 'VitalID Demo'
        || p.publicKey !== hex(trustedPublicKey)
        || typeof p.proof !== 'string' || p.proof.length > 10000
        || typeof p.authorization !== 'string' || p.authorization.length !== 128) return false;
    const c = p.claims;
    if (!c || Object.keys(c).sort().join(',') !== [...FIELDS].sort().join(',')
        || c.demo !== true || c.claimType !== CLAIM || c.qualifies !== true
        || c.permissionRef !== permission.reference || c.controller !== permission.controller
        || c.expiresAt !== permission.expiresAt || Date.parse(c.expiresAt) <= now
        || !Number.isFinite(Date.parse(c.expiresAt))
        || Date.parse(c.windowEnd) - Date.parse(c.windowStart) !== 30 * 86400000
        || !Number.isFinite(Date.parse(c.windowStart))
        || Date.parse(c.windowEnd) > now + 86400000
        || Date.parse(c.windowEnd) < now - 86400000
        || context.permissionRef !== permission.reference
        || context.holderId !== permission.holderId
        || context.receiverId !== permission.receiverId
        || context.receiverKey !== permission.receiverKey
        || context.program !== permission.program || context.genesis !== permission.genesis
        || typeof context.id !== 'string' || !context.id
        || typeof context.nonce !== 'string' || !/^[a-f0-9]{64}$/.test(context.nonce)
        || Date.parse(context.expiresAt) > Date.parse(c.expiresAt)
        || !Number.isFinite(Date.parse(context.expiresAt)) || Date.parse(context.expiresAt) <= now) return false;
    const key = await crypto.subtle.importKey('raw', unhex(c.controller), 'Ed25519', false, ['verify']);
    if (!await crypto.subtle.verify('Ed25519', key, unhex(p.authorization), await authorizationBytes(context, p.proof))) return false;
    return await bbs.verifyProof({
      publicKey: trustedPublicKey, proof: unhex(p.proof), header,
      presentationHeader: contextBytes(context), disclosedMessages: disclosedMessages(c),
      disclosedMessageIndexes: DISCLOSED, ciphersuite: CIPHERSUITE,
    });
  } catch {
    return false;
  }
}
