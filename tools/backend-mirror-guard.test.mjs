// Unit-only source contract test. Does not contact Backend or hosted Supabase.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const helper = readFileSync(new URL('../scripts/ci/materialize-backend.mjs', import.meta.url), 'utf8');

test('the Backend mirror guard remains fail-closed', () => {
  assert.match(helper, /const MIRRORED_CODE_GIT_BLOBS = Object\.freeze\(\{/);
  assert.match(helper, /blobSha\(backendBytes\) !== expected/);
  assert.match(helper, /blobSha\(webBytes\) !== expected/);
  assert.match(helper, /!webBytes\.equals\(backendBytes\)/);
  assert.match(helper, /stop\('Web mirrored code drift: ' \+ path\)/);
});

test('all 23 mirrored source hashes match local tracked Web files', () => {
  const block = helper.match(/const MIRRORED_CODE_GIT_BLOBS = Object\.freeze\(\{([\s\S]*?)\n\}\);/);
  assert.ok(block, 'mirror manifest is required');
  const entries = [...block[1].matchAll(/^\s*'([^']+)': '([0-9a-f]{40})',?$/gm)];
  assert.equal(entries.length, 23);
  assert.equal(new Set(entries.map(entry => entry[1])).size, entries.length);
  for (const [, path, expected] of entries) {
    assert.match(path, /^(?:src\/lib\/moderation\/|supabase\/(?:functions\/|templates\/))/);
    const bytes = readFileSync(new URL('../' + path, import.meta.url));
    const actual = createHash('sha1').update('blob ' + bytes.length + '\0').update(bytes).digest('hex');
    assert.equal(actual, expected, path);
  }
});
