import {Connection, Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction} from '@solana/web3.js';
import {readFileSync} from 'node:fs';
import {hex, unhex} from './crypto.mjs';
import {createDevnetFetch} from './rpc-fetch.mjs';

export const GENESIS = 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG';
export const RPC = 'https://api.devnet.solana.com';
const SEED = Buffer.from('vitalid-permit');

export function permissionAddress(program, reference) {
  if (!/^[a-f0-9]{64}$/.test(reference)) throw new Error('Invalid reference');
  return PublicKey.findProgramAddressSync([SEED, Buffer.from(reference, 'hex')], new PublicKey(program))[0];
}

export function decodePermission(data) {
  if (data.length !== 74 || data[0] !== 1 || data[73] > 1) throw new Error('Invalid permission account');
  return {
    reference: hex(data.subarray(1, 33)), controller: hex(data.subarray(33, 65)),
    expiresAt: new Date(Number(data.readBigInt64LE(65)) * 1000).toISOString(), revoked: data[73] === 1,
  };
}

export function createInstruction(program, payer, permission) {
  const data = Buffer.alloc(41);
  data[0] = 0;
  Buffer.from(permission.reference, 'hex').copy(data, 1);
  data.writeBigInt64LE(BigInt(Date.parse(permission.expiresAt) / 1000), 33);
  return new TransactionInstruction({
    programId: new PublicKey(program),
    keys: [
      {pubkey: payer, isSigner: true, isWritable: true},
      {pubkey: new PublicKey(unhex(permission.controller)), isSigner: true, isWritable: false},
      {pubkey: permissionAddress(program, permission.reference), isSigner: false, isWritable: true},
      {pubkey: SystemProgram.programId, isSigner: false, isWritable: false},
    ],
    data,
  });
}

export function revokeInstruction(program, permission) {
  return new TransactionInstruction({
    programId: new PublicKey(program),
    keys: [
      {pubkey: new PublicKey(unhex(permission.controller)), isSigner: true, isWritable: false},
      {pubkey: permissionAddress(program, permission.reference), isSigner: false, isWritable: true},
    ],
    data: Buffer.concat([Buffer.from([1]), Buffer.from(permission.reference, 'hex')]),
  });
}

export class DevnetAdapter {
  constructor({program, payer, connection} = {}) {
    this.program = program;
    this.genesis = GENESIS;
    this.connection = connection ?? new Connection(RPC, {
      commitment: 'confirmed', disableRetryOnRateLimit: true,
      fetch: createDevnetFetch(),
    });
    this.payer = payer;
  }

  static fromEnvironment() {
    const program = process.env.DEMO_PROGRAM_ID;
    const file = process.env.DEMO_FEE_PAYER_FILE;
    const payer = file ? Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(file, 'utf8')))) : null;
    return new DevnetAdapter({program, payer});
  }

  async assertNetwork() {
    if (!this.program || !this.payer) throw new Error('Devnet program and sponsor not configured');
    if (await this.connection.getGenesisHash() !== GENESIS) throw new Error('Wrong network');
    const program = await this.connection.getAccountInfo(new PublicKey(this.program), 'confirmed');
    if (!program?.executable) throw new Error('Wrong program');
  }

  async prepare(permission, operation) {
    await this.assertNetwork();
    if (permission.program !== this.program || permission.genesis !== GENESIS) throw new Error('Wrong deployment');
    const {blockhash, lastValidBlockHeight} = await this.connection.getLatestBlockhash('confirmed');
    const tx = new Transaction({feePayer: this.payer.publicKey, blockhash, lastValidBlockHeight});
    tx.add(operation === 'create'
      ? createInstruction(this.program, this.payer.publicKey, permission)
      : revokeInstruction(this.program, permission));
    return {
      operation, message: hex(tx.serializeMessage()), lastValidBlockHeight,
      transaction: tx.serialize({requireAllSignatures: false, verifySignatures: false}).toString('base64'),
    };
  }

  async submit(permission, prepared, signedTransaction) {
    await this.assertNetwork();
    if (typeof signedTransaction !== 'string' || signedTransaction.length > 4000) throw new Error('Invalid transaction');
    const tx = Transaction.from(Buffer.from(signedTransaction, 'base64'));
    if (hex(tx.serializeMessage()) !== prepared.message) throw new Error('Transaction changed');
    const controller = new PublicKey(unhex(permission.controller));
    const signature = tx.signatures.find(s => s.publicKey.equals(controller))?.signature;
    if (!signature || !tx.verifySignatures(false)) throw new Error('Holder signature required');
    if (await this.connection.getBlockHeight('confirmed') > prepared.lastValidBlockHeight) throw new Error('Transaction expired');
    tx.partialSign(this.payer);
    const receipt = await this.connection.sendRawTransaction(tx.serialize(), {skipPreflight: false, maxRetries: 2});
    return {signature: receipt, lastValidBlockHeight: prepared.lastValidBlockHeight};
  }

  async transactionState(receipt) {
    await this.assertNetwork();
    if (!receipt) return {state: 'pending'};
    const status = (await this.connection.getSignatureStatuses([receipt.signature], {searchTransactionHistory: true})).value[0];
    if (status?.err) return {state: 'failed'};
    if (status?.confirmationStatus === 'confirmed' || status?.confirmationStatus === 'finalized') {
      return {state: 'confirmed', slot: status.slot};
    }
    if (await this.connection.getBlockHeight('confirmed') > receipt.lastValidBlockHeight) return {state: 'failed'};
    return {state: 'pending'};
  }

  async check(permission) {
    if (permission.program !== this.program || permission.genesis !== GENESIS) throw new Error('Wrong deployment');
    if (permission.localRevoked) throw new Error('Locally revoked');
    const status = await this.transactionState(permission.createReceipt);
    if (status.state !== 'confirmed') throw new Error('Unconfirmed creation');
    const account = await this.connection.getAccountInfo(permissionAddress(this.program, permission.reference), {
      commitment: 'confirmed', minContextSlot: status.slot,
    });
    if (!account || account.executable || !account.owner.equals(new PublicKey(this.program))) throw new Error('Missing permission');
    const chain = decodePermission(account.data);
    if (chain.reference !== permission.reference || chain.controller !== permission.controller
        || chain.expiresAt !== permission.expiresAt || chain.revoked || Date.parse(chain.expiresAt) <= Date.now()) {
      throw new Error('Permission denied');
    }
    return {state: 'confirmed', address: permissionAddress(this.program, permission.reference).toBase58(), slot: status.slot};
  }
}
