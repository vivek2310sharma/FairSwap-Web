import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const localRequire = createRequire(createRequire(import.meta.url).resolve('@tailwindcss/postcss'));

test('real Tailwind/PostCSS excludes generated browser evidence but retains application sources', async () => {
  const stylesheet = path.resolve('src/app/globals.css');
  const result = await localRequire('postcss')([
    localRequire('@tailwindcss/postcss')({ base: process.cwd() }),
  ]).process(fs.readFileSync(stylesheet, 'utf8'), { from: stylesheet });
  const dependencies = result.messages.filter(message =>
    ['dependency', 'dir-dependency'].includes(message.type));
  const browserDependencies = dependencies.filter(message =>
    String(message.file || message.dir || '').includes('.playwright-mcp'));
  assert.equal(browserDependencies.length, 0,
    'Generated Playwright evidence must not become CSS file/directory dependencies');
  assert.ok(dependencies.some(message =>
    String(message.file || '').endsWith(path.join('src', 'components', 'listings', 'ListingForm.tsx'))),
  'Real Post Ad component classes must remain discoverable');
  assert.match(result.css, /\.grid\s*\{/);
});
