import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';

const source = readFileSync(new URL('../src/client.mjs', import.meta.url), 'utf8');

test('client wires fresh mutation refreshes and keeps fifteen-second background polling', () => {
  assert.match(source, /createRefreshController/);
  assert.match(source, /submitWithFreshRefresh\([\s\S]*?refresh,[\s\S]*?\);/);
  assert.match(source, /refreshInFinally\([\s\S]*?refresh\);/);
  assert.match(source, /setInterval\([\s\S]*?, 15000\);/);
  assert.doesNotMatch(source, /setInterval\([\s\S]*?, 8000\);/);
});
