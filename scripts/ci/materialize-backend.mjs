#!/usr/bin/env node
// Fail-closed, filesystem-only CI materialization of the private Backend snapshot.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { constants, copyFileSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const COMMIT = '2f26f839c3fa0ae690cf5c3795a983d62e1b6c47';
const MANIFEST_SHA256 = 'eb2dfee779a15634927cfbf25fcd6ffc59df591a585d1ec8f5f3d40e5caaf1dd';
const TEST_GIT_BLOBS = Object.freeze({
  'supabase/tests/admin_medium_operation.test.sql': 'f16c9bffec7ec425e1f3cd5539d495f8305c772d',
  'supabase/tests/admin_reviewed_contract.test.sql': 'b39a60d563fee243555354653ac57df30e96441c',
  'supabase/tests/listings_insert_category_eligibility.test.sql': '80809f1edcc954245ff10be8eaffdf967803aa6c',
  'supabase/tests/moderation_vault_dispatch_auth.test.sql': '327e6921f554c9dcfcb29080e8c469239a9a15ee',
  'supabase/tests/pending_review_media_invalidation.test.sql': 'eedc8cf8f59eea47c26a0434a47c1f0371d54ba0',
  'supabase/tests/schema_email_outbox.test.sql': 'e38330fe05fd06e68e1c7435905c5233446a0776',
  'supabase/tests/schema_listings.test.sql': 'e8876694c1535724dd5949eed2240582cfbd8274',
  'supabase/tests/schema_post_ad_category_metadata.test.sql': '35e51e444488116eaf6bc0952a075d70d5154b6b',
  'supabase/tests/schema_security.test.sql': 'b0816a46135daf42daf6d61656d80909be9092f9',
  'supabase/tests/seller_listing_category_context.test.sql': '90c3d7a7235c172136eeabaf3b87fb378fd2c524'
});
// Backend-owned code is temporarily mirrored in Web for local tests/Edge imports.
// Fail CI if either side drifts from the independently reviewed pinned Git blobs.
const MIRRORED_CODE_GIT_BLOBS = Object.freeze({
  'supabase/functions/_shared/email-outbox-worker.ts': 'ee176f43f992d73d412aa9b9e3a1333b09561fcb',
  'supabase/functions/_shared/listing-moderation-worker.ts': '764af1986305bc763d2a53c9909727528a4b2b4e',
  'src/lib/moderation/checker.ts': 'dd8655bf58bc1d6ca0b47c48ee0104d81629eb2c',
  'src/lib/moderation/contract.ts': 'e14984a5f4bdcc36c4e4ab42c309e46c2dc828ca',
  'src/lib/moderation/rules.ts': 'aefb6cafca49a34321ee8f66bfca8f16ea8690c7',
  'src/lib/moderation/target-guard.ts': '77f8e94aaf3d65643d3b0401088c743c5ec9683c'
});
const web = fileURLToPath(new URL('../../', import.meta.url));
const stop = message => { throw Error('STOP - Backend snapshot rejected: ' + message); };
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const blobSha = bytes => createHash('sha1').update('blob ' + bytes.length + '\0').update(bytes).digest('hex');
const read = (dir, path) => {
  const full = join(dir, path);
  if (!existsSync(full) || !lstatSync(full).isFile()) stop('missing/nonregular ' + path);
  return readFileSync(full);
};
const sqlNames = (dir, subdir) => {
  const full = join(dir, subdir);
  if (!existsSync(full)) return [];
  if (!lstatSync(full).isDirectory()) stop('non-directory ' + subdir);
  return readdirSync(full).filter(name => name.endsWith('.sql')).sort();
};
function main() {
  if (process.argv.length !== 3 || !isAbsolute(process.argv[2])) stop('usage: node scripts/ci/materialize-backend.mjs ABSOLUTE_PINNED_BACKEND_CHECKOUT');
  const source = resolve(process.argv[2]);
  if (!existsSync(source) || !lstatSync(source).isDirectory() || realpathSync(source) === realpathSync(web)) stop('invalid Backend checkout');
  let sha, toplevel;
  try {
    sha = execFileSync('git', ['-C', source, 'rev-parse', 'HEAD'], {encoding:'utf8'}).trim();
    toplevel = execFileSync('git', ['-C', source, 'rev-parse', '--show-toplevel'], {encoding:'utf8'}).trim();
  } catch { stop('missing Git identity'); }
  if (sha !== COMMIT || realpathSync(toplevel) !== realpathSync(source)) stop('unexpected Backend Git HEAD / root');
  const manifest = read(source, 'docs/extraction/MIGRATION_MANIFEST.sha256');
  if (sha256(manifest) !== MANIFEST_SHA256) stop('migration manifest checksum drift');
  const lines = manifest.toString('utf8').trimEnd().split(/\r?\n/);
  if (lines.length !== 58) stop('expected exactly 58 migration entries');
  const migrations = lines.map(line => {
    const match = /^([0-9a-f]{64})  (supabase\/migrations\/\d{14}_[A-Za-z0-9_-]+\.sql)$/.exec(line);
    if (!match) stop('malformed manifest');
    const bytes = read(source, match[2]);
    if (sha256(bytes) !== match[1]) stop('source bytes drift: ' + match[2]);
    return {path:match[2], bytes};
  });
  if (new Set(migrations.map(x => x.path)).size !== 58) stop('duplicate migration entry');
  if (JSON.stringify(sqlNames(source, 'supabase/migrations')) !== JSON.stringify(migrations.map(x=>x.path.split('/').at(-1)).sort())) stop('source migration inventory drift');
  const tests = Object.entries(TEST_GIT_BLOBS).map(([path, expected]) => {
    const bytes = read(source, path);
    if (blobSha(bytes) !== expected) stop('source pgTAP bytes drift: ' + path);
    return {path,bytes};
  });
  if (tests.length !== 10 || JSON.stringify(sqlNames(source,'supabase/tests')) !== JSON.stringify(tests.map(x=>x.path.split('/').at(-1)).sort())) stop('source pgTAP inventory drift');
  if (!read(source,'supabase/config.toml').equals(read(web,'supabase/config.toml'))) stop('Web local config differs from Backend');
  for (const [path, expected] of Object.entries(MIRRORED_CODE_GIT_BLOBS)) {
    const backendBytes = read(source, path);
    const webBytes = read(web, path);
    if (blobSha(backendBytes) !== expected) stop('pinned Backend mirrored code drift: ' + path);
    if (blobSha(webBytes) !== expected || !webBytes.equals(backendBytes)) stop('Web mirrored code drift: ' + path);
  }

  const files = [...migrations,...tests], approved = new Set(files.map(x=>x.path));
  for (const folder of ['supabase/migrations','supabase/tests']) {
    for (const name of sqlNames(web,folder)) if (!approved.has(folder+'/'+name)) stop('unapproved Web SQL file '+folder+'/'+name);
  }
  // Never overwrite different local files, and verify every collision before any write.
  for (const {path,bytes} of files) {
    const target=join(web,path);
    if (existsSync(target) && (!lstatSync(target).isFile() || !readFileSync(target).equals(bytes))) stop('conflicting existing file '+path);
  }
  for (const {path,bytes} of files) {
    const target=join(web,path);
    if (!existsSync(target)) {
      mkdirSync(dirname(target),{recursive:true});
      copyFileSync(join(source,path),target,constants.COPYFILE_EXCL);
      if (!readFileSync(target).equals(bytes)) stop('copied content mismatch '+path);
    }
  }
  console.log('PASS: materialized 58 exact migrations + 10 pgTAP tests from private Backend commit '+sha+'; no hosted database operations');
}
try { main(); } catch(e) { console.error(e instanceof Error?e.message:String(e)); process.exitCode=1; }
