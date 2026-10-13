import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';

const source = readFileSync(new URL('../src/client.mjs', import.meta.url), 'utf8');
const refreshStart = source.indexOf('function refresh() {');
const refreshEnd = source.indexOf("\non('start'", refreshStart);
const refreshSource = source.slice(refreshStart, refreshEnd);

test('client shares an in-flight status refresh and polls every fifteen seconds', () => {
  assert.ok(refreshStart >= 0);
  assert.ok(refreshEnd > refreshStart);
  assert.match(source, /let refreshPromise;/);
  assert.match(refreshSource, /if \(refreshPromise\) return refreshPromise;/);
  assert.match(refreshSource, /const wrapped = current\.finally\(\(\) => \{/);
  assert.match(refreshSource, /if \(refreshPromise === wrapped\) refreshPromise = undefined;/);
  assert.match(refreshSource, /refreshPromise = wrapped;/);
  assert.match(source, /setInterval\([\s\S]*?, 15000\);/);
  assert.doesNotMatch(source, /setInterval\([\s\S]*?, 8000\);/);
});
