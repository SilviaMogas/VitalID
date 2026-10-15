import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac, randomBytes } from 'node:crypto';
import { PocketLab, SecretBox, POLICY, verifyWebhook } from './pocket-lab.mjs';

const NOW = 1792051200000;
const API_KEY = 'pk_synthetic_abcdefgh12345678';
const SECRET = 'synthetic_webhook_secret_1234567890';
const sessions = new Map([['alice-session', 'synthetic_alice'], ['bob-session', 'synthetic_bob']]);
const selection = { recordingId: 'rec_1', summaryId: 'sum_1', consent: true };
const goodResponse = () => ({ status: 200, body: { success: true, data: {
  id: 'rec_1', recorded_by: { user_id: 'pocket_alice', email: 'synthetic@example.invalid' },
  recording_at: '2026-10-15T08:00:00Z',
  summarizations: { sum_1: { processingStatus: 'completed', v2: { summary: {
    markdown: 'Synthetic wellbeing note: enjoyed a short walk.' } } } },
  transcript: 'DO NOT PERSIST TRANSCRIPT', audio: 'DO NOT PERSIST AUDIO',
} } });
function setup(handler = async () => goodResponse()) {
  const consent = new Set(['synthetic_alice', 'synthetic_bob']);
  const calls = [];
  const lab = new PocketLab({ encryptionKey: randomBytes(32),
    provider: { mode: 'synthetic', async getRecording(request) { calls.push(request); return handler(request); } },
    authenticate: (session) => sessions.get(session), healthConsent: (owner) => consent.has(owner), now: () => NOW });
  const connect = (session = 'alice-session', extra = {}) => lab.connect(session, {
    apiKey: API_KEY, webhookSecret: SECRET, pocketUserId: 'pocket_alice', consent: true, policy: POLICY, ...extra });
  const c = connect();
  const select = () => lab.select('alice-session', c.connectionId, selection);
  const run = () => lab.importSelected('alice-session', c.connectionId, 'rec_1', 'sum_1');
  return { lab, consent, calls, connect, c, select, run };
}
function signed(event, options = {}) {
  const rawBody = options.rawBody ?? Buffer.from(JSON.stringify({ event,
    user: { id: 'pocket_alice', email: 'synthetic@example.invalid' }, recording: { id: 'rec_1' }, ...options.payload }));
  const timestamp = String(options.time ?? NOW);
  return { rawBody, timestamp, signature: createHmac('sha256', options.secret ?? SECRET).update(`${timestamp}.`).update(rawBody).digest('hex') };
}

test('server-injected session required; client owner objects are not sessions', () => {
  const f = setup();
  assert.throws(() => f.lab.status({ userId: 'synthetic_alice' }, f.c.connectionId), /unauthenticated/);
  assert.throws(() => f.lab.status('unknown', f.c.connectionId), /unauthenticated/);
});
test('only synthetic credentials and dependencies accepted; explicit current consents required', () => {
  const f = setup();
  for (const change of [{ consent: false }, { policy: 'old' }, { apiKey: 'pk_real_key' }, { webhookSecret: 'short' }]) {
    assert.throws(() => f.connect('bob-session', change));
  }
  f.consent.delete('synthetic_bob');
  assert.throws(() => f.connect('bob-session'), /consent/);
  assert.throws(() => new PocketLab({ provider: { mode: 'live' } }), /synthetic_dependencies/);
});
test('selection consent and health consent gate all imports', async () => {
  const f = setup();
  await assert.rejects(f.run(), /not_selected/);
  assert.throws(() => f.lab.select('alice-session', f.c.connectionId, { ...selection, consent: false }), /selection_consent/);
  f.select(); f.consent.clear();
  await assert.rejects(f.run(), /consent_or_connection/);
  assert.equal(f.calls.length, 0);
});
test('imports only selected summary; no transcript, email, speakers or audio in private result', async () => {
  const f = setup(); f.select();
  assert.deepEqual(await f.run(), { result: 'imported' });
  assert.equal(f.calls[0].includeTranscript, false);
  const rows = f.lab.list('alice-session', f.c.connectionId);
  assert.equal(rows.length, 1);
  assert.deepEqual(Object.keys(rows[0]).sort(), ['clinicalStatus','recordedAt','recordingId','source','summaryId','text'].sort());
  assert.equal(rows[0].source, 'pocket-synthetic');
  assert.doesNotMatch(JSON.stringify(rows), /TRANSCRIPT|AUDIO|email|apiKey/);
  assert.doesNotMatch(JSON.stringify(f.lab.status('alice-session', f.c.connectionId)), /pk_|secret/);
});
test('duplicate and concurrent imports result in one record', async () => {
  const f = setup(); f.select();
  const result = await Promise.all([f.run(), f.run()]);
  assert.equal(result.filter(x => x.result === 'imported').length, 1);
  assert.equal((await f.run()).result, 'duplicate');
  assert.equal(f.lab.list('alice-session', f.c.connectionId).length, 1);
});
test('tenant isolation applies to status, selection, import, list, deletion, consent and disconnect', async () => {
  const f = setup(); f.select(); await f.run();
  const b = 'bob-session', c = f.c.connectionId;
  for (const action of [() => f.lab.status(b,c), () => f.lab.select(b,c,selection), () => f.lab.list(b,c),
    () => f.lab.removeSelection(b,c,'rec_1','sum_1'), () => f.lab.withdrawConsent(b,c), () => f.lab.disconnect(b,c)]) {
    assert.throws(action, /unavailable/);
  }
  await assert.rejects(f.lab.importSelected(b,c,'rec_1','sum_1'), /unavailable/);
  assert.equal(f.lab.list('alice-session',c).length,1);
});
test('provider owner, recording and summary shape must match', async () => {
  for (const mutate of [r => r.body.data.recorded_by.user_id = 'pocket_bob', r => r.body.data.id = 'rec_wrong',
    r => r.body.data.summarizations = null, r => r.body.data.summarizations.sum_1.v2.summary.markdown = 'x'.repeat(16001)]) {
    const f = setup(async () => { const r = goodResponse(); mutate(r); return r; }); f.select();
    await assert.rejects(f.run()); assert.equal(f.lab.list('alice-session',f.c.connectionId).length,0);
  }
});
test('HMAC uses timestamp and exact raw bytes; rejects malformed, stale, future or missing signatures', () => {
  const e = signed('summary.completed');
  assert.equal(verifyWebhook(SECRET,e.timestamp,e.rawBody,e.signature,NOW),true);
  for (const signature of [undefined,'','aa','g'.repeat(64),'0'.repeat(64)])
    assert.equal(verifyWebhook(SECRET,e.timestamp,e.rawBody,signature,NOW),false);
  assert.equal(verifyWebhook(SECRET,e.timestamp,Buffer.concat([e.rawBody,Buffer.from(' ')]),e.signature,NOW),false);
  for (const time of [NOW-300001,NOW+300001]) {
    const x = signed('summary.completed',{time});
    assert.equal(verifyWebhook(SECRET,x.timestamp,x.rawBody,x.signature,NOW),false);
  }
  assert.equal(verifyWebhook(SECRET,e.timestamp,Buffer.alloc(262145),e.signature,NOW),false);
});
test('webhook owner, organisation scope, JSON and signature are independently checked', async () => {
  const f = setup();
  for (const event of [signed('summary.completed',{payload:{user:{id:'pocket_bob'}}}),
    signed('summary.completed',{payload:{organization:{id:'org_1'}}}),
    signed('summary.completed',{rawBody:Buffer.from('{broken')})]) {
    await assert.rejects(f.lab.webhook(f.c.connectionId,event));
  }
  await assert.rejects(f.lab.webhook(f.c.connectionId,{...signed('summary.completed'),signature:'invalid'}),/signature/);
});
test('summary notifications, repeated or unsolicited, never import payload content or start API reads', async () => {
  const f = setup();
  for (let i=0;i<2;i++) await f.lab.webhook(f.c.connectionId,signed('summary.completed',{
    payload:{transcript:['private'],summarizations:{sum_1:{text:'not selected'}}} }));
  assert.equal(f.calls.length,0);
  assert.equal(f.lab.list('alice-session',f.c.connectionId).length,0);
});
test('signed deletion purges all summaries; delayed summary cannot resurrect a deleted recording', async () => {
  const f = setup(); f.select(); await f.run();
  for (let i=0;i<2;i++) await f.lab.webhook(f.c.connectionId,signed('recording.deleted'));
  assert.equal(f.lab.list('alice-session',f.c.connectionId).length,0);
  await f.lab.webhook(f.c.connectionId,signed('summary.completed'));
  assert.throws(f.select,/recording_deleted/);
});
test('deletion during an in-flight import prevents commit', async () => {
  let finish; const f = setup(() => new Promise(resolve => { finish = resolve; })); f.select();
  const pending = f.run();
  await f.lab.webhook(f.c.connectionId,signed('recording.deleted'));
  finish(goodResponse()); await assert.rejects(pending,/removed/);
  assert.equal(f.lab.list('alice-session',f.c.connectionId).length,0);
});
test('401/403 stop sync, discard API key, and keep signed deletion possible', async () => {
  for (const status of [401,403]) {
    let revoked = false; const f = setup(async () => revoked ? {status} : goodResponse());
    f.select(); await f.run(); revoked = true;
    f.lab.select('alice-session',f.c.connectionId,{...selection,summaryId:'sum_2'});
    await assert.rejects(f.lab.importSelected('alice-session',f.c.connectionId,'rec_1','sum_2'),/reconnect/);
    assert.equal(f.lab.status('alice-session',f.c.connectionId).state,'needs_reauth');
    await assert.rejects(f.run(),/connection/);
    await f.lab.webhook(f.c.connectionId,signed('recording.deleted'));
    assert.equal(f.lab.list('alice-session',f.c.connectionId).length,0);
    assert.equal(f.calls.length,2);
  }
});
test('404 tombstones a missing recording; transient failures do not mark import complete', async () => {
  const gone=setup(async()=>({status:404})); gone.select();
  await assert.rejects(gone.run(),/recording_deleted/); assert.throws(gone.select,/recording_deleted/);
  for (const status of [429,500]) {
    let bad=true; const f=setup(async()=>bad?{status}:goodResponse()); f.select();
    await assert.rejects(f.run(),/provider_unavailable/); bad=false;
    assert.equal((await f.run()).result,'imported');
  }
});
test('removal, disconnect and consent withdrawal work after health consent is lost', async () => {
  for (const action of ['remove','disconnect','withdraw']) {
    const f=setup(); f.select(); await f.run(); f.consent.clear();
    if(action==='remove') f.lab.removeSelection('alice-session',f.c.connectionId,'rec_1','sum_1');
    if(action==='disconnect') f.lab.disconnect('alice-session',f.c.connectionId);
    if(action==='withdraw') f.lab.withdrawConsent('alice-session',f.c.connectionId);
    f.consent.add('synthetic_alice');
    if(action==='withdraw') assert.throws(()=>f.lab.list('alice-session',f.c.connectionId),/consent/);
    else assert.equal(f.lab.list('alice-session',f.c.connectionId).length,0);
  }
});
test('disconnect or consent withdrawal during fetch blocks late writes', async () => {
  for (const method of ['disconnect','withdrawConsent']) {
    let finish;const f=setup(()=>new Promise(resolve=>{finish=resolve;}));f.select();
    const pending=f.run();f.lab[method]('alice-session',f.c.connectionId);finish(goodResponse());
    await assert.rejects(pending,/consent_or_connection/);
  }
});
test('deletion remains possible without health consent; disconnect rejects former secret', async () => {
  const f=setup();f.select();await f.run();f.consent.clear();
  await f.lab.webhook(f.c.connectionId,signed('recording.deleted'));
  f.consent.add('synthetic_alice'); assert.equal(f.lab.list('alice-session',f.c.connectionId).length,0);
  f.lab.disconnect('alice-session',f.c.connectionId);
  await assert.rejects(f.lab.webhook(f.c.connectionId,signed('recording.deleted')),/unavailable/);
});
test('AES-GCM binds encrypted credentials and summaries to context; tampering fails', () => {
  const box = new SecretBox(randomBytes(32)); const sealed=box.seal({apiKey:API_KEY},'alice/key');
  assert.doesNotMatch(sealed,/pk_synthetic/);
  assert.equal(box.open(sealed,'alice/key').apiKey,API_KEY);
  assert.throws(()=>box.open(sealed,'bob/key'));
  const bytes=Buffer.from(sealed,'base64');bytes[30]^=1;
  assert.throws(()=>box.open(bytes.toString('base64'),'alice/key'));
});
test('reconnect cannot revive tombstoned recordings and requires explicit new selection', async () => {
  const f=setup();f.select();await f.run();
  await f.lab.webhook(f.c.connectionId,signed('recording.deleted'));
  f.lab.disconnect('alice-session',f.c.connectionId);const next=f.connect();
  assert.throws(()=>f.lab.select('alice-session',next.connectionId,selection),/recording_deleted/);
  await assert.rejects(f.lab.importSelected('alice-session',next.connectionId,'rec_2','sum_1'),/not_selected/);
});
