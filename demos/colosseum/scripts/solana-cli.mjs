import {lstat, realpath} from 'node:fs/promises';
import {homedir} from 'node:os';
import {isAbsolute, resolve} from 'node:path';

const DEFAULT_SOLANA_CLI = resolve(homedir(), '.local/share/solana/install/active_release/bin/solana');

export async function resolveSolanaCli(configured = process.env.SOLANA_CLI_PATH) {
  if (configured !== undefined && !isAbsolute(configured)) {
    throw new Error('SOLANA_CLI_PATH must be an absolute path.');
  }
  const requested = configured ?? DEFAULT_SOLANA_CLI;
  let resolved;
  try {
    resolved = await realpath(requested);
  } catch {
    throw new Error(`Solana CLI was not found at ${requested}. Set SOLANA_CLI_PATH to an absolute executable path.`);
  }
  const file = await lstat(resolved);
  if (!file.isFile() || (file.mode & 0o111) === 0 || (file.mode & 0o022) !== 0) {
    throw new Error('Solana CLI must be an executable regular file that is not group- or other-writable.');
  }
  return resolved;
}
