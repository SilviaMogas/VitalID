import test from 'node:test';
import assert from 'node:assert/strict';
import * as bbs from '@digitalbazaar/bbs-signatures';
import {createController} from '../src/controller.mjs';
import {
  assessRecords, issuerKey, issueCredential, derivePresentation, verifyPresentation,
  hex, unhex, utf8, SCHEMA, CIPHERSUITE, authorizationBytes,
} from '../src/crypto.mjs';

const now = Date.now();
const keys = await issuerKey();
const holder = await crypto.subtle.generateKey('Ed25519', false, ['sign', 'verify']);
const controller = hex(new Uint8Array(await crypto.subtle.exportKey('raw', holder.publicKey)));
const permission = {
  reference: 'ab'.repeat(32), controller, holderId: 'holder-session',
  receiverId: 'receiver-session', receiverKey: 'cd'.repeat(32),
  expiresAt: new Date(now + 3600000).toISOString(),
  program: 'expected-program', genesis: 'expected-devnet-genesis',
};
const context = {
  id: 'challenge-id', nonce: 'ef'.repeat(32), receiverId: permission.receiverId,
  receiverKey: permission.receiverKey, holderId: permission.holderId,
  permissionRef: permission.reference, program: permission.program, genesis: permission.genesis,
  expiresAt: new Date(now + 120000).toISOString(),
};
const records = Array.from({length: 7}, (_, i) => ({
  date: new Date(now - i * 86400000).toISOString().slice(0, 10), sleep: 7.1, hrv: 62,
}));
const credential = await issueCredential({keys, records, name: 'Fatima Al Mansoori', permission, now});
const presentation = await derivePresentation(credential, context, holder.privateKey);
const verify = (p = presentation, c = context, permissionOverride = permission, key = keys.publicKey, time = now) =>
  verifyPresentation({presentation: p, context: c, trustedPublicKey: key, permission: permissionOverride, now: time});

test('portable browser controller produces native-verifiable Ed25519 and real BBS authorization', async () => {
  const portable = await createController({portable: true});
  const message = utf8('independent verification');
  const publicKey = await crypto.subtle.importKey('raw', portable.publicKey, 'Ed25519', false, ['verify']);
  assert.equal(await crypto.subtle.verify('Ed25519', publicKey, await portable.sign(message), message), true);
  const boundPermission = {...permission, controller: hex(portable.publicKey)};
  const credential = await issueCredential({keys, records, name: 'Synthetic', permission: boundPermission, now});
  const proof = await derivePresentation(credential, context, portable);
  assert.equal(await verify(proof, context, boundPermission), true);
  assert.equal(Object.hasOwn(portable, 'privateKey'), false);
});

test('issuer signature, real BBS selective proof and independent verification', async () => {
  assert.equal(await bbs.verifySignature({
    ...keys, signature: unhex(credential.signature), header: utf8(SCHEMA),
    messages: credential.messages.map(unhex), ciphersuite: CIPHERSUITE,
  }), true);
  assert.equal(await verify(), true);
  assert.deepEqual(Object.keys(presentation).sort(), ['authorization', 'claims', 'issuer', 'proof', 'publicKey', 'schema']);
  assert.deepEqual(Object.keys(presentation.claims).sort(), [
    'claimType', 'controller', 'demo', 'expiresAt', 'permissionRef', 'qualifies', 'windowEnd', 'windowStart',
  ]);
});

test('altered proof and revealed attribute fail, even with a valid controller signature', async () => {
  const tampered = structuredClone(presentation);
  tampered.proof = (tampered.proof.startsWith('00') ? '01' : '00') + tampered.proof.slice(2);
  tampered.authorization = hex(new Uint8Array(await crypto.subtle.sign(
    'Ed25519', holder.privateKey, await authorizationBytes(context, tampered.proof),
  )));
  assert.equal(await verify(tampered), false);
  const changed = structuredClone(presentation);
  changed.claims.windowStart = new Date(Date.parse(changed.claims.windowStart) - 86400000).toISOString();
  changed.claims.windowEnd = new Date(Date.parse(changed.claims.windowEnd) - 86400000).toISOString();
  assert.equal(await verify(changed), false);
});

test('untrusted issuer rejected', async () => {
  const other = await issuerKey();
  assert.equal(await verify(presentation, context, permission, other.publicKey), false);
});

test('valid issuer signature on an insufficient-days assertion is not accepted', async () => {
  const wrong = structuredClone(credential);
  wrong.claims.qualifies = false;
  wrong.messages[2] = hex(utf8(JSON.stringify(['qualifies', false])));
  wrong.signature = hex(await bbs.sign({
    ...keys, header: utf8(SCHEMA), messages: wrong.messages.map(unhex), ciphersuite: CIPHERSUITE,
  }));
  const p = await derivePresentation(wrong, context, holder.privateKey);
  assert.equal(await verify(p), false);
  await assert.rejects(issueCredential({keys, records: records.slice(0, 6), name: 'Demo', permission, now}));
});

test('window assessment counts distinct dates only inside the 30-day window', () => {
  const {windowStart, windowEnd} = credential.claims;
  assert.equal(assessRecords(records, windowStart, windowEnd), true);
  assert.equal(assessRecords(Array(30).fill(records[0]), windowStart, windowEnd), false);
  assert.equal(assessRecords([...records.slice(0, 6), {date: '1900-01-01'}], windowStart, windowEnd), false);
});

test('wrong holder, recipient, permission, program, network, nonce and cross-session reuse rejected', async () => {
  for (const field of ['holderId', 'receiverId', 'receiverKey', 'permissionRef', 'program', 'genesis', 'id', 'nonce']) {
    assert.equal(await verify(presentation, {...context, [field]: 'wrong'}), false, field);
  }
  const other = await crypto.subtle.generateKey('Ed25519', false, ['sign', 'verify']);
  const wrongHolder = await derivePresentation(credential, context, other.privateKey);
  assert.equal(await verify(wrongHolder), false);
});

test('missing context, expired presentation and credential rejected', async () => {
  assert.equal(await verifyPresentation({presentation, trustedPublicKey: keys.publicKey, permission, now}), false);
  assert.equal(await verify(presentation, {...context, expiresAt: new Date(now - 1).toISOString()}), false);
  assert.equal(await verify(presentation, context, permission, keys.publicKey, now + 3600001), false);
});

test('even valid proofs cannot omit a challenge id or nonce', async () => {
  for (const field of ['id', 'nonce']) {
    const incomplete = {...context};
    delete incomplete[field];
    const proof = await derivePresentation(credential, incomplete, holder.privateKey);
    assert.equal(await verify(proof, incomplete), false);
  }
});
