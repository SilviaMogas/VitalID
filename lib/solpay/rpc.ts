import 'server-only';

// Minimal Solana JSON-RPC client over fetch — no SDK dependency.
// `fetchImpl` is injectable so tests can stub the network.

export interface SolanaRpc {
  url: string;
  call<T>(method: string, params: unknown[]): Promise<T>;
}

type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

export function createRpc(url: string, fetchImpl?: FetchLike): SolanaRpc {
  const doFetch = fetchImpl ?? ((u, init) => fetch(u, { ...init, signal: AbortSignal.timeout(12_000) }));
  let nextId = 0;
  return {
    url,
    async call<T>(method: string, params: unknown[]): Promise<T> {
      nextId += 1;
      const res = await doFetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: nextId, method, params }),
      });
      if (!res.ok) throw new Error(`rpc_http_${res.status}`);
      const body = (await res.json()) as { result?: T; error?: { code?: number; message?: string } };
      if (body.error) throw new Error(`rpc_error_${body.error.code ?? 'unknown'}`);
      if (body.result === undefined) throw new Error('rpc_empty_result');
      return body.result;
    },
  };
}

export async function getSignaturesForAddress(
  rpc: SolanaRpc,
  address: string,
  limit = 10,
): Promise<{ signature: string; err: unknown }[]> {
  const result = await rpc.call<{ signature: string; err: unknown }[]>('getSignaturesForAddress', [
    address,
    { limit },
  ]);
  return Array.isArray(result) ? result : [];
}

interface ParsedInstruction {
  program?: string;
  programId?: string;
  parsed?: { type?: string; info?: Record<string, unknown> };
}

export interface ParsedTransaction {
  blockTime?: number | null;
  meta: {
    err: unknown;
    fee?: number;
    innerInstructions?: { index: number; instructions: ParsedInstruction[] }[] | null;
  } | null;
  transaction: {
    message: {
      accountKeys: ({ pubkey: string; signer?: boolean } | string)[];
      instructions: ParsedInstruction[];
    };
  };
}

export async function getParsedTransaction(
  rpc: SolanaRpc,
  signature: string,
  commitment: 'confirmed' | 'finalized',
): Promise<ParsedTransaction | null> {
  return rpc.call<ParsedTransaction | null>('getTransaction', [
    signature,
    { encoding: 'jsonParsed', commitment, maxSupportedTransactionVersion: 0 },
  ]);
}
