import {Buffer} from 'buffer';
import {Transaction, PublicKey} from '@solana/web3.js';
import {derivePresentation, enrollmentBytes, hex, unhex} from './crypto.mjs';
import {createController} from './controller.mjs';

const $ = id => document.getElementById(id);
let keys, session, activeChallenge, pendingPresentation, previewSnapshot, displayedReference;
let previewGeneration = 0;
let working = false;
const receiverOnly = location.pathname === '/receiver';
const text = (id, value) => { if ($(id)) $(id).textContent = value; };
const show = (id, value) => { if ($(id)) $(id).hidden = !value; };
const json = data => JSON.stringify(data, null, 2);
const on = (id, fn) => $(id)?.addEventListener('click', () => run(fn));

async function api(path, data) {
  const response = await fetch(`/api/${path}`, {
    method: data === undefined ? 'GET' : 'POST', cache: 'no-store', credentials: 'same-origin',
    headers: data === undefined ? {} : {'Content-Type': 'application/json'},
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  if (!response.ok) {
    if (path === 'verify' || path === 'summary') {
      text('verification', '');
      text('verification-status', 'Access denied — no current proof or data disclosed.');
    }
    throw new Error('Request denied or dependency unavailable. No access granted. Refresh status or create a new challenge.');
  }
  return response.json();
}

async function run(fn) {
  if (working) return;
  working = true;
  text('global-status', 'Working…');
  const buttons = [...document.querySelectorAll('button')];
  buttons.forEach(b => { b.disabled = true; });
  try { await fn(); text('global-status', 'Done.'); }
  catch (error) { text('global-status', error.message); }
  finally { working = false; buttons.forEach(b => { b.disabled = false; }); }
}

async function signTransaction(base64) {
  if (!keys) throw new Error('Start a new browser-held session first.');
  const tx = Transaction.from(Buffer.from(base64, 'base64'));
  const signature = await keys.sign(tx.serializeMessage());
  tx.addSignature(new PublicKey(unhex(session.publicKey)), Buffer.from(signature));
  return tx.serialize({requireAllSignatures: false, verifySignatures: false}).toString('base64');
}

function fieldSelection() {
  return ['identity', 'healthProfile'].filter(f => $(`field-${f}`)?.checked);
}

async function preview() {
  if (!$('mode')) return;
  const generation = ++previewGeneration;
  previewSnapshot = undefined;
  $('consent').checked = false;
  const summary = $('mode').value === 'summary';
  show('summary-fields', summary);
  if (summary && session) {
    try {
      const result = await api('preview', {fields: fieldSelection()});
      if (generation !== previewGeneration) return;
      previewSnapshot = result.snapshot;
      text('preview', json(result));
    } catch {
      if (generation === previewGeneration) text('preview', 'Preview unavailable. No data will be shared.');
    }
  } else {
    text('preview', 'demo: true\nclaimType: at-least-seven-distinct-synthetic-days-in-thirty-day-window\nqualifies: true\nwindowStart / windowEnd / expiry\nrandom permission reference / controller public key\n\nExact signed values appear after credential issuance.\nHidden: full name, daily records, measurements.');
  }
}

function link(container, label, value, kind = 'tx') {
  if (!value) return;
  const a = document.createElement('a');
  a.href = `https://explorer.solana.com/${kind}/${encodeURIComponent(value)}?cluster=devnet`;
  a.target = '_blank'; a.rel = 'noopener noreferrer'; a.textContent = label;
  container.append(a, document.createTextNode('  '));
}

function button(container, label, fn, style = 'secondary') {
  const b = document.createElement('button');
  b.textContent = label; b.className = style;
  b.addEventListener('click', () => run(fn)); container.append(b);
}

function renderPermissions(items, owner) {
  const target = $(owner ? 'owner-permissions' : 'receiver-permissions');
  if (!target) return;
  target.replaceChildren();
  for (const p of items.filter(p => owner ? p.holderId === session.id : p.receiverId === session.id)) {
    const item = document.createElement('article'); item.className = 'permission';
    const title = document.createElement('h3'); title.textContent = `${p.mode === 'proof' ? 'BBS proof only' : 'Separate private summary'} · ${p.reference.slice(0, 12)}…`;
    const state = document.createElement('span');
    state.className = `state ${p.localRevoked ? 'revoked' : p.createState}`;
    state.textContent = p.localRevoked
      ? `LOCAL ACCESS BLOCKED · chain revoke ${p.revokeState}`
      : `Creation ${p.createState} · expires ${new Date(p.expiresAt).toLocaleTimeString()}`;
    const ref = document.createElement('p'); ref.className = 'mono'; ref.textContent = p.reference;
    item.append(title, state, ref);
    link(item, 'Creation receipt ↗', p.createSignature);
    link(item, 'Revocation receipt ↗', p.revokeSignature);
    const actions = document.createElement('div'); actions.className = 'actions';
    if (owner) {
      button(actions, p.localRevoked ? 'Retry chain revocation' : 'Revoke — block access now', async () => {
        // The server sets the local deny flag before any chain work.
        try {
          const result = await api('revoke', {reference: p.reference});
          const transaction = await signTransaction(result.prepared.transaction);
          await api('submit', {reference: p.reference, operation: 'revoke', transaction});
        } finally { await refresh(); }
      }, 'danger');
    } else if (p.mode === 'proof') {
      button(actions, '1. Create one-time challenge', async () => {
        const result = await api('challenge', {reference: p.reference});
        activeChallenge = result.context;
        text('verification-status', 'Challenge created. Give this ID to the holder to derive a new proof.');
        text('verification', json(result.context));
      });
      button(actions, '2. Verify new presentation', async () => {
        if (!activeChallenge || activeChallenge.permissionRef !== p.reference) throw new Error('Create a challenge for this permission first.');
        const result = await api('verify', {challengeId: activeChallenge.id});
        displayedReference = p.reference;
        text('verification-status', 'Receipt: BBS verified off-chain · Devnet permission checked at this request. A new access requires a new check.');
        text('verification', json(result));
        activeChallenge = null;
      });
    } else {
      button(actions, 'Read authorized summary only', async () => {
        const result = await api('summary', {reference: p.reference});
        displayedReference = p.reference;
        text('verification-status', 'Separate summary permission checked on Solana devnet — no BBS claim of medical validity.');
        text('verification', json(result));
      });
    }
    item.append(actions); target.append(item);
  }
  if (!target.childNodes.length) target.textContent = 'No permissions in this session yet.';
}

async function refresh() {
  if (!session) return;
  try {
    const state = await api('status');
    if (state.session.id !== session.id) throw new Error('Session changed. Use separate browser profiles for holder and recipient.');
    renderPermissions(state.permissions, true); renderPermissions(state.permissions, false);
    const displayed = state.permissions.find(p => p.reference === displayedReference);
    if (displayedReference && (!displayed || displayed.localRevoked || Date.parse(displayed.expiresAt) <= Date.now() || displayed.createState !== 'confirmed')) {
      text('verification', '');
      text('verification-status', 'Access is no longer current. Previous copies cannot be recalled.');
      displayedReference = undefined;
    }
    const deployment = $('deployment'); deployment.replaceChildren();
    const p = document.createElement('p');
    p.textContent = state.config.program ? 'Solana devnet configured — each access still requires a live check.' : 'BLOCKED: devnet program/sponsor is not configured. No simulated permission will grant access.';
    deployment.append(p);
    link(deployment, 'Program on Solana devnet ↗', state.config.program, 'address');
    const key = document.createElement('p'); key.className = 'mono';
    key.textContent = `Trusted ephemeral VitalID Demo issuer key: ${state.config.issuerPublicKey}`;
    deployment.append(key);
  } catch (error) {
    text('verification', ''); text('verification-status', 'State check failed — prior results are not a current access grant.');
    throw error;
  }
}

on('start', async () => {
  keys = await createController();
  const challenge = await api('start', {});
  const publicKey = hex(keys.publicKey);
  const signature = hex(await keys.sign(enrollmentBytes(challenge, publicKey)));
  const result = await api('auth', {publicKey, signature});
  session = result.session;
  $('receiver-code').value = session.id;
  text('key-info', `Public control key: ${publicKey} · ${keys.implementation}. Private key stays in this page. Refreshing loses it.`);
  show('identity', true); show('workspace', true); show('start', false);
  await refresh(); await preview();
});
on('copy-id', () => navigator.clipboard.writeText(session.id));
on('refresh', refresh);
on('tab-holder', async () => {
  show('holder', true); show('receiver', false);
  $('tab-holder').setAttribute('aria-pressed', 'true'); $('tab-receiver').setAttribute('aria-pressed', 'false');
});
on('tab-receiver', async () => {
  show('holder', false); show('receiver', true);
  $('tab-holder').setAttribute('aria-pressed', 'false'); $('tab-receiver').setAttribute('aria-pressed', 'true');
  await refresh();
});
on('create', async () => {
  if (!$('consent').checked) throw new Error('Explicit permission is required.');
  if ($('mode').value === 'summary' && !previewSnapshot) throw new Error('Wait for the exact summary preview.');
  const result = await api('prepare', {
    receiverId: $('recipient').value.trim(), mode: $('mode').value, fields: $('mode').value === 'summary' ? fieldSelection() : [],
    consent: true,
    expectedSnapshot: $('mode').value === 'summary' ? previewSnapshot : undefined,
  });
  const transaction = await signTransaction(result.prepared.transaction);
  await api('submit', {reference: result.permission.reference, operation: 'create', transaction});
  $('consent').checked = false;
  await refresh();
});
on('present', async () => {
  pendingPresentation = undefined;
  show('send-presentation', false);
  const {context, credential} = await api('credential', {challengeId: $('challenge').value.trim()});
  text('holder-result', 'Checking issuer signature and deriving real BBS proof in this browser…');
  const presentation = await derivePresentation(credential, context, keys);
  pendingPresentation = {challengeId: context.id, presentation};
  text('holder-result', json({note: 'Exact presentation preview — NOT sent yet. Name and records are excluded.', presentation}));
  show('send-presentation', true);
});
on('send-presentation', async () => {
  if (!pendingPresentation) throw new Error('Derive and review a presentation first.');
  await api('present', pendingPresentation);
  text('holder-result', json({note: 'Only the reviewed presentation was sent.', presentation: pendingPresentation.presentation}));
  pendingPresentation = undefined;
  show('send-presentation', false);
});
$('recipient')?.addEventListener('input', () => { $('consent').checked = false; });
$('mode')?.addEventListener('change', preview);
for (const field of ['identity', 'healthProfile']) $(`field-${field}`)?.addEventListener('change', preview);
if (!receiverOnly) preview();
setInterval(() => { if (session && !working) refresh().catch(error => text('global-status', error.message)); }, 8000);
