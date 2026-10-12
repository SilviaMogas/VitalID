import assert from 'node:assert/strict';
import {createHash, randomBytes} from 'node:crypto';
import {lstat, mkdir, readFile, writeFile} from 'node:fs/promises';
import {dirname, resolve} from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
import {fileURLToPath} from 'node:url';
import {Connection, Keypair, PublicKey, Transaction, VersionedTransaction} from '@solana/web3.js';
import {DevnetAdapter, GENESIS, RPC} from '../src/solana.mjs';
import {hex} from '../src/crypto.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const demo = resolve(here, '..');
const local = resolve(demo, '.local');
const payerFile = resolve(local, 'payer.json');
const programKeyFile = resolve(local, 'sbf/vitalid_permission-keypair.json');
const deploymentFile = resolve(local, 'deployment.json');
const evidenceDir = resolve(demo, 'evidence');
const evidenceFile = resolve(evidenceDir, 'devnet.json');
const artifact = resolve(local, 'sbf/vitalid_permission.so');

async function privateKeypair(path) {
  const file = await lstat(path);
  if (file.isSymbolicLink() || !file.isFile() || (file.mode & 0o077) !== 0) {
    throw new Error(`Local key file must be a private regular file: ${path}`);
  }
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(await readFile(path, 'utf8'))));
}

async function signPrepared(prepared, controller, privateKey) {
  const transaction = Transaction.from(Buffer.from(prepared.transaction, 'base64'));
  const signature = await crypto.subtle.sign('Ed25519', privateKey, transaction.serializeMessage());
  transaction.addSignature(new PublicKey(Buffer.from(controller, 'hex')), Buffer.from(signature));
  return transaction.serialize({requireAllSignatures: false, verifySignatures: false}).toString('base64');
}

async function waitConfirmed(adapter, receipt) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const state = await adapter.transactionState(receipt);
    if (state.state === 'confirmed') return state;
    if (state.state === 'failed') throw new Error('Devnet transaction failed or expired.');
    await delay(3000);
  }
  throw new Error('Devnet transaction remained pending after 20 confirmation checks.');
}

async function main() {
  const deployment = JSON.parse(await readFile(deploymentFile, 'utf8'));
  if (deployment.network !== 'devnet' || deployment.rpc !== RPC || deployment.genesis !== GENESIS) {
    throw new Error('Local deployment receipt is not pinned to the expected devnet.');
  }
  const programKeypair = await privateKeypair(programKeyFile);
  const payer = await privateKeypair(payerFile);
  if (programKeypair.publicKey.toBase58() !== deployment.program
      || payer.publicKey.toBase58() !== deployment.payer) {
    throw new Error('Local public keys do not match the deployment receipt.');
  }
  const programBytes = await readFile(artifact);
  const artifactSha256 = createHash('sha256').update(programBytes).digest('hex');
  if (artifactSha256 !== deployment.artifactSha256) {
    throw new Error('Current SBF artifact differs from the deployed artifact.');
  }
  const connection = new Connection(RPC, {
    commitment: 'confirmed',
    disableRetryOnRateLimit: true,
    fetch: (url, options) => fetch(url, {...options, signal: AbortSignal.timeout(12000)}),
  });
  const adapter = new DevnetAdapter({program: deployment.program, payer, connection});
  if (await connection.getGenesisHash() !== GENESIS) throw new Error('RPC did not return the official devnet genesis.');
  await adapter.assertNetwork();

  const holder = await crypto.subtle.generateKey('Ed25519', false, ['sign', 'verify']);
  const controller = hex(new Uint8Array(await crypto.subtle.exportKey('raw', holder.publicKey)));
  const permission = {
    reference: randomBytes(32).toString('hex'),
    controller,
    expiresAt: new Date(Math.floor((Date.now() + 15 * 60 * 1000) / 1000) * 1000).toISOString(),
    program: deployment.program,
    genesis: GENESIS,
    localRevoked: false,
  };
  const createPrepared = await adapter.prepare(permission, 'create');

  const wrongHolder = await crypto.subtle.generateKey('Ed25519', false, ['sign', 'verify']);
  const wrongTransaction = Transaction.from(Buffer.from(createPrepared.transaction, 'base64'));
  const wrongSignature = await crypto.subtle.sign('Ed25519', wrongHolder.privateKey, wrongTransaction.serializeMessage());
  wrongTransaction.addSignature(new PublicKey(Buffer.from(controller, 'hex')), Buffer.from(wrongSignature));
  await assert.rejects(
    adapter.submit(
      permission,
      createPrepared,
      wrongTransaction.serialize({requireAllSignatures: false, verifySignatures: false}).toString('base64'),
    ),
    /Holder signature required/,
  );

  const createTransaction = await signPrepared(createPrepared, controller, holder.privateKey);
  const createReceipt = await adapter.submit(permission, createPrepared, createTransaction);
  const createConfirmation = await waitConfirmed(adapter, createReceipt);
  permission.createReceipt = createReceipt;
  const checked = await adapter.check(permission);
  assert.equal(checked.state, 'confirmed');

  permission.localRevoked = true;
  const revokePrepared = await adapter.prepare(permission, 'revoke');
  const revokeTransaction = await signPrepared(revokePrepared, controller, holder.privateKey);
  const revokeReceipt = await adapter.submit(permission, revokePrepared, revokeTransaction);
  const revokeConfirmation = await waitConfirmed(adapter, revokeReceipt);
  await assert.rejects(adapter.check(permission), /Locally revoked/);
  await assert.rejects(adapter.check({...permission, localRevoked: false}), /Permission denied/);

  const retry = {...permission, localRevoked: false};
  const recreatePrepared = await adapter.prepare(retry, 'create');
  const recreateTransaction = await signPrepared(recreatePrepared, controller, holder.privateKey);
  const recreate = Transaction.from(Buffer.from(recreateTransaction, 'base64'));
  recreate.partialSign(payer);
  const simulation = await connection.simulateTransaction(
    VersionedTransaction.deserialize(recreate.serialize()),
    {sigVerify: true, commitment: 'confirmed'},
  );
  assert.deepEqual(
    simulation.value.err,
    {InstructionError: [0, 'AccountAlreadyInitialized']},
    'Only the expected program rejection is evidence; network errors are not.',
  );
  const record = {
    network: 'devnet',
    rpc: RPC,
    genesis: GENESIS,
    program: deployment.program,
    payer: deployment.payer,
    upgradeAuthority: deployment.upgradeAuthority,
    artifactSha256,
    artifactBytes: programBytes.length,
    reference: permission.reference,
    wrongHolderRejectedByAdapter: true,
    create: {
      signature: createReceipt.signature,
      state: 'confirmed',
      slot: createConfirmation.slot,
    },
    revoke: {
      signature: revokeReceipt.signature,
      state: 'confirmed',
      slot: revokeConfirmation.slot,
    },
    chainCheckAfterRevokeDenied: true,
    sameReferenceRecreateRejectedByRpcSimulation: true,
    recreateSimulationSlot: simulation.context.slot,
    recreateSimulationError: simulation.value.err,
    checkedAt: new Date().toISOString(),
  };
  await mkdir(evidenceDir, {recursive: true, mode: 0o755});
  await writeFile(evidenceFile, `${JSON.stringify(record, null, 2)}\n`, {flag: 'wx', mode: 0o644});
  process.stdout.write(`${JSON.stringify(record, null, 2)}\n`);
}

main().catch(error => {
  process.stderr.write(`Devnet smoke blocked: ${error.message}\n`);
  process.exitCode = 1;
});
