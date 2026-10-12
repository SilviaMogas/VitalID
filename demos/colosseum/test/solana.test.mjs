import assert from 'node:assert/strict';
import test from 'node:test';
import {
  Keypair, Transaction,
} from '@solana/web3.js';
import {
  DevnetAdapter, GENESIS, decodePermission, permissionAddress,
} from '../src/solana.mjs';
import {hex} from '../src/crypto.mjs';

const program = Keypair.generate().publicKey;
const payer = Keypair.generate();
const holder = Keypair.generate();
const blockhash = Keypair.generate().publicKey.toBase58();
const expiry = new Date(Math.floor((Date.now() + 15 * 60 * 1000) / 1000) * 1000).toISOString();

function permission(overrides = {}) {
  return {
    reference: 'ab'.repeat(32),
    controller: hex(holder.publicKey.toBytes()),
    expiresAt: expiry,
    program: program.toBase58(),
    genesis: GENESIS,
    localRevoked: false,
    ...overrides,
  };
}

function encoded(value = permission()) {
  const data = Buffer.alloc(74);
  data[0] = 1;
  Buffer.from(value.reference, 'hex').copy(data, 1);
  Buffer.from(value.controller, 'hex').copy(data, 33);
  data.writeBigInt64LE(BigInt(Date.parse(value.expiresAt) / 1000), 65);
  data[73] = value.revoked ? 1 : 0;
  return data;
}

class StubConnection {
  constructor() {
    this.genesis = GENESIS;
    this.programAccount = {executable: true};
    this.permissionAccount = {
      executable: false,
      owner: program,
      data: encoded(),
    };
    this.status = {err: null, confirmationStatus: 'confirmed', slot: 9};
    this.height = 10;
    this.sent = [];
    this.fail = null;
  }

  async getGenesisHash() {
    if (this.fail === 'genesis') throw new Error('simulated RPC error');
    return this.genesis;
  }

  async getAccountInfo(address) {
    if (this.fail === 'account') throw new Error('simulated RPC error');
    return address.equals(program) ? this.programAccount : this.permissionAccount;
  }

  async getLatestBlockhash() {
    if (this.fail === 'blockhash') throw new Error('simulated RPC error');
    return {blockhash, lastValidBlockHeight: 20};
  }

  async getBlockHeight() {
    if (this.fail === 'height') throw new Error('simulated RPC error');
    return this.height;
  }

  async sendRawTransaction(raw) {
    if (this.fail === 'send') throw new Error('simulated RPC error');
    this.sent.push(Buffer.from(raw));
    return 'simulated-public-signature';
  }

  async getSignatureStatuses() {
    if (this.fail === 'status') throw new Error('simulated RPC error');
    return {value: [this.status]};
  }
}

function adapter(connection = new StubConnection()) {
  return {connection, adapter: new DevnetAdapter({program: program.toBase58(), payer, connection})};
}

test('holder signs the exact prepared message and distinct payer only sponsors it', async () => {
  const {connection, adapter: subject} = adapter();
  const value = permission();
  const prepared = await subject.prepare(value, 'create');
  const unsigned = Transaction.from(Buffer.from(prepared.transaction, 'base64'));
  assert.equal(unsigned.feePayer.equals(payer.publicKey), true);
  assert.equal(unsigned.signatures.find(item => item.publicKey.equals(holder.publicKey)).signature, null);
  unsigned.partialSign(holder);
  const holderSigned = unsigned.serialize({
    requireAllSignatures: false,
    verifySignatures: false,
  }).toString('base64');
  const receipt = await subject.submit(value, prepared, holderSigned);
  assert.equal(receipt.signature, 'simulated-public-signature');
  const sent = Transaction.from(connection.sent[0]);
  assert.equal(sent.verifySignatures(), true);
  assert.notEqual(sent.signatures.find(item => item.publicKey.equals(holder.publicKey)).signature, null);
  assert.notEqual(sent.signatures.find(item => item.publicKey.equals(payer.publicKey)).signature, null);
  assert.equal(hex(sent.serializeMessage()), prepared.message);
  assert.notEqual(holder.publicKey.toBase58(), payer.publicKey.toBase58());
});

test('payer cannot replace the holder and no caller can alter the prepared message', async () => {
  const {adapter: subject} = adapter();
  const value = permission();
  const prepared = await subject.prepare(value, 'create');
  const payerOnly = Transaction.from(Buffer.from(prepared.transaction, 'base64'));
  payerOnly.partialSign(payer);
  await assert.rejects(subject.submit(
    value,
    prepared,
    payerOnly.serialize({requireAllSignatures: false, verifySignatures: false}).toString('base64'),
  ), /Holder signature required/);

  const changed = Transaction.from(Buffer.from(prepared.transaction, 'base64'));
  changed.instructions[0].data[0] = 1;
  changed.partialSign(holder);
  await assert.rejects(subject.submit(
    value,
    prepared,
    changed.serialize({requireAllSignatures: false, verifySignatures: false}).toString('base64'),
  ), /Transaction changed/);
});

test('network and executable program checks fail closed', async () => {
  const wrongNetwork = adapter();
  wrongNetwork.connection.genesis = 'wrong-genesis';
  await assert.rejects(wrongNetwork.adapter.prepare(permission(), 'create'), /Wrong network/);

  const wrongProgram = adapter();
  wrongProgram.connection.programAccount = null;
  await assert.rejects(wrongProgram.adapter.prepare(permission(), 'create'), /Wrong program/);

  const rpcFailure = adapter();
  rpcFailure.connection.fail = 'genesis';
  await assert.rejects(rpcFailure.adapter.prepare(permission(), 'create'), /simulated RPC error/);
});

test('permission account decoding and chain checks bind owner, reference, controller, expiry and revoke flag', async () => {
  const {connection, adapter: subject} = adapter();
  const value = permission({
    createReceipt: {signature: 'create-signature', lastValidBlockHeight: 20},
  });
  assert.deepEqual(decodePermission(encoded(value)), {
    reference: value.reference,
    controller: value.controller,
    expiresAt: value.expiresAt,
    revoked: false,
  });
  const checked = await subject.check(value);
  assert.equal(checked.state, 'confirmed');
  assert.equal(checked.address, permissionAddress(program, value.reference).toBase58());

  const cases = [
    ['missing', null],
    ['executable', {...connection.permissionAccount, executable: true}],
    ['owner', {...connection.permissionAccount, owner: Keypair.generate().publicKey}],
    ['reference', {...connection.permissionAccount, data: encoded({...value, reference: 'cd'.repeat(32)})}],
    ['controller', {...connection.permissionAccount, data: encoded({...value, controller: 'ef'.repeat(32)})}],
    ['expiry', {...connection.permissionAccount, data: encoded({...value, expiresAt: new Date(Date.parse(value.expiresAt) + 1000).toISOString()})}],
    ['revoked', {...connection.permissionAccount, data: encoded({...value, revoked: true})}],
  ];
  for (const [label, account] of cases) {
    connection.permissionAccount = account;
    await assert.rejects(subject.check(value), undefined, label);
  }
});

test('transaction state distinguishes pending, failed, expired and RPC unavailable', async () => {
  const {connection, adapter: subject} = adapter();
  const receipt = {signature: 'create-signature', lastValidBlockHeight: 20};
  connection.status = null;
  assert.deepEqual(await subject.transactionState(receipt), {state: 'pending'});
  connection.height = 21;
  assert.deepEqual(await subject.transactionState(receipt), {state: 'failed'});
  connection.status = {err: {InstructionError: [0, 'Custom']}, confirmationStatus: 'confirmed', slot: 9};
  assert.deepEqual(await subject.transactionState(receipt), {state: 'failed'});
  connection.status = {err: null, confirmationStatus: 'processed', slot: 9};
  connection.height = 10;
  assert.deepEqual(await subject.transactionState(receipt), {state: 'pending'});
  connection.status = {err: null, confirmationStatus: 'confirmed', slot: 12};
  assert.deepEqual(await subject.transactionState(receipt), {state: 'confirmed', slot: 12});
  connection.fail = 'status';
  await assert.rejects(subject.transactionState(receipt), /simulated RPC error/);
});

test('locally revoked or wrong-deployment permissions never pass adapter check', async () => {
  const {adapter: subject} = adapter();
  const receipt = {signature: 'create-signature', lastValidBlockHeight: 20};
  await assert.rejects(subject.check(permission({createReceipt: receipt, localRevoked: true})), /Locally revoked/);
  await assert.rejects(subject.check(permission({
    createReceipt: receipt,
    program: Keypair.generate().publicKey.toBase58(),
  })), /Wrong deployment/);
  await assert.rejects(subject.check(permission({
    createReceipt: receipt,
    genesis: 'wrong-genesis',
  })), /Wrong deployment/);
});
