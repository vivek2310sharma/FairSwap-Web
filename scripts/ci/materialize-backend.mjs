#!/usr/bin/env node
// Fail-closed, filesystem-only CI materialization of the private Backend snapshot.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { constants, copyFileSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const COMMIT = 'b3d7eae6cb3eaeaf4fc2f4c2a4d288b69aa62367';
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
  'supabase/functions/process-email-outbox/index.ts': '624de9c5fa7217d9f775dc57d1f3b984860b95b5',
  'supabase/functions/process-listing-moderation/index.ts': '0a47295de371abd1a7ddee3621d91265da5de684',
  'supabase/functions/process-email-outbox/deno.json': '3315f15a8206229e7b93de14dca0f6aef6ccfc9c',
  'supabase/functions/process-listing-moderation/deno.json': '02ee4fe44c8a381ace70a5578a752f213f4c55df',
  'supabase/templates/confirm_email.html': '0072bce7085d3cef2108df6fff7c273ffb5c8de6',
  'supabase/templates/recovery_email.html': '801012488bcddc126633ffa2cb40b9de6e33f4a9',
  'supabase/templates/invite_email.html': '21d5adbc0f06fe8d136ceeac808e49f7ff53d2d4',
  'supabase/templates/email_change.html': 'd2b6db8525b86b9e24f22fa5818f69c6382e1da5',
  'supabase/templates/reauthentication.html': 'c07ce114a4f9a5dcfd31bb17830815358d313e0c',
  'supabase/templates/password_changed_notification.html': '275c23e372350e9ccb064e885689b5dba3d8b053',
  'supabase/templates/email_changed_notification.html': '73f14f3c2542d8c24cfae308d6b2d309b6fd2240',
  'supabase/templates/phone_changed_notification.html': '0ce78bbc62a84e5cc68cf90cc543a0cef79d6178',
  'supabase/templates/identity_linked_notification.html': '81593ff081bac7ab4465f8110d32b46864f274fb',
  'supabase/templates/identity_unlinked_notification.html': 'e412fe17518799c3cd33e84f3af31ba316ca9a64',
  'supabase/templates/mfa_factor_enrolled_notification.html': '1ee64f433d2b34143dff1aa5f5353c5fc611889c',
  'supabase/templates/mfa_factor_unenrolled_notification.html': 'fdc1d806cf91cee1730b450bec07815d782518e3',
  'supabase/templates/magic_link.html': '6750981793cdffe32bd9760eae59dfc50da04d9c',
  'supabase/functions/_shared/email-outbox-worker.ts': '35274ab227d176bf43d522197884ac6c5c98bb85',
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
