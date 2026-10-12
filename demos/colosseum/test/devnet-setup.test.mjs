import assert from 'node:assert/strict';
import test from 'node:test';
import {chmod, mkdtemp, mkdir, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {resolveSolanaCli} from '../scripts/solana-cli.mjs';

test('Solana CLI path must resolve to an absolute executable non-writable by group or others', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'vitalid-solana-cli-'));
  t.after(() => rm(directory, {recursive: true, force: true}));
  const executable = join(directory, 'solana');
  await writeFile(executable, '#!/bin/sh\nexit 0\n', {mode: 0o755});
  await chmod(executable, 0o755);

  assert.equal(await resolveSolanaCli(executable), executable);
  await assert.rejects(resolveSolanaCli('solana'), /must be an absolute path/);
  await chmod(executable, 0o775);
  await assert.rejects(resolveSolanaCli(executable), /not group- or other-writable/);

  const nonExecutable = join(directory, 'not-executable');
  await writeFile(nonExecutable, 'content', {mode: 0o644});
  await assert.rejects(resolveSolanaCli(nonExecutable), /must be an executable regular file/);
  const subdirectory = join(directory, 'directory');
  await mkdir(subdirectory);
  await assert.rejects(resolveSolanaCli(subdirectory), /must be an executable regular file/);
});
