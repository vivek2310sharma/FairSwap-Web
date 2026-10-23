# ADS-01 final production release verification

**Recommendation: BLOCKED.** No ADS-01-introduced runtime defect was found, but full regression and authenticated posting/hosted browser acceptance are not green. Passing focused CI does not resolve these gates.

## Candidate, boundaries and evidence

- Candidate: `e1737d965b55e8be599cf89b848e28007f2f0628`.
- Production base: `bad68d0078a6613cd0d75cddeed3e81f7521eed3`.
- Reviewed staging source: `de4bff2abdaa7fe1b23345e6b17946d0a21064f5`.
- Clean detached verification worktree: `C:/Users/VivekKumar/OneDrive - Nobly A S/Documents/FairSwap-Codex/ads-01-final-verify`.
- The earlier dirty production worktree was preserved. No commit, push, PR update, merge, deployment, branch deletion or Production data access occurred.
- Backend source was verified at pinned `b3d7eae6cb3eaeaf4fc2f4c2a4d288b69aa62367`. The existing guard materialized 58 exact migrations and 10 exact pgTAP files into ignored Web paths. No Backend file was modified.
- Windows CRLF checkout conversion initially prevented the byte-pinned materialization guard from accepting mirrored files. Verification used exact Git blob bytes, without semantic changes or bypassing the guard. The original Windows checkout bytes were restored after verification; these are not feature changes or part of the patch.
- Docker Desktop was installed but stopped. It was started for this task. A uniquely named disposable stack, `ads01-final-e1737d9`, used only loopback addresses. That stack was stopped afterward; other containers were not started, stopped or modified. Docker Desktop itself remains available.

Read-only GitHub inspection independently confirmed:

- [CI #312](https://github.com/vivek2310sharma/FairSwap-Web/actions/runs/39982330360): all three jobs successful on the candidate. Log evidence: nine pgTAP files / 270 assertions, 19 real listings-RLS tests, one actual ADS-01 disposable two-owner test and 13 moderation integration tests passed. Focused ADS-01 browser/unit, build, Node 20 checks and PostgreSQL 17 rehearsal steps succeeded.
- [Help Centre #104](https://github.com/vivek2310sharma/FairSwap-Web/actions/runs/39982330349): successful on the candidate.
- Exact-commit Preview READY and hosted SQL two-owner results (16/9 private drafts, zero foreign drafts) are owner/ChatGPT-reported evidence from the request, not new hosted HTTP/browser verification by this task.

## A. Original regression investigation

All three original assertions reproduced on the candidate and unchanged production-base export: **37 tests, 34 passed, three failed** in each initial comparison. No failing assertion was deleted, weakened or skipped to produce a pass.

| Test | Expected / actual | Root cause and baseline comparison | Disposition |
| --- | --- | --- | --- |
| `tests/media/service-and-media-hardening.test.ts` — `Service Role Client & Media Failure Hardening Tests > Delete Path Safety > commits DB deletion first via user-scoped RPC and safely tolerates subsequent storage cleanup failure` | Expected HTTP 200; actual HTTP 409, before deletion RPC | The fixture supplies `path/to/orig.jpg` and `path/to/thumb.webp`. Existing `planLegacyMediaStorageCleanup` permits only identity-bound legacy paths such as `<listing UUID>/<media UUID>/original.jpg` and `thumb.webp`. The route correctly refuses unknown paths before DB deletion. Test and guard are unchanged from `bad68d0`. | Pre-existing stale fixture/security-contract disagreement. Production fence remains intact. Correct the fixture to valid identity-bound legacy keys in separately reviewed test maintenance; do not change the guard or expected storage-safety assertions. Still fails. |
| `tests/unit/csv-field-layer.test.ts` — `separate two-wheeler proposal > covers every exact membership in source order without changing source snapshot bytes or requiredness` | Expected categories hash `9e29b7a87526d1a0fae22572e7400f4b1d46ca0a4dd9bec2d9995591e394ea43`; Windows working bytes hash `6cf6fc975e10eb3ec2bf61020a5b38c4654a0f3879b75ca8dd66f37182024f11` | Both base and candidate Git blobs have the expected categories hash. Catalogues Git hash is `dfab66421498bb02ef44352274a0f56c5bdb208f655b333f99d4b7e93ce5e1bf`; CRLF checkout hash is `d7c9cb9cdeeca9cef2e94315edb895a1359357b53aadcbc71194615cc2e8b7c6`. This is byte-sensitive fixture portability, not changed ADS data. | Environment-related. Passes when exact Git blob bytes are used. No expected digest, source data or assertion changed. |
| `tests/unit/point13-support-fixes.test.ts` — `Point 13 Support Ticket Canonical Schema Regression Tests > support_tickets table definition in migration 13 does not contain resolved_at` | Expected canonical table definition without `resolved_at`; actual ENOENT opening `supabase/migrations/20260914000013_create_support_and_appeals.sql` | Fresh Web worktrees intentionally lack Backend-owned ignored SQL. Same failure on base. | Environment prerequisite. Both support-schema tests pass after the pinned materialization workflow. No SQL restored to tracked Web source. |

### Database setup failures, now conclusively classified

- `seller-media-db-lifecycle` (26 tests), `email-outbox-security` (28), and `india-location-security` (38) fail their embedded PGlite setup: **`function storage.allow_only_operation(unknown) does not exist`**. These fixtures manually mock Supabase platform schemas but lack a platform helper now required by the migrations they replay. Its real local Supabase definition was inspected read-only: it compares the current normalized storage operation to the requested operation and fails closed. A permissive stub would weaken the test environment and was not added. These tests and their SQL pin are unchanged from the production base. They remain unexecuted at the assertion level (92 pending).
- With real local Supabase available, `tests/security/communication-and-safety.test.ts` (30) and `tests/reliability/failure-injection.test.ts` (4) fail before assertions with **`AuthRetryableFetchError: Database error creating new user`**. Their provisioning fixtures omit current mandatory policy/age consent metadata; the existing `handle_new_user` trigger rejects them. Both files are unchanged from the base. No signup/security guard was bypassed. Separate fixture maintenance is needed (34 pending).
- The first full run with injected local credential environment variables also produced 17 readiness-test failures: those tests stub synthetic Test project credentials but inherited local legacy-key aliases. The existing environment-consistency gate returned null. A clean-environment rerun eliminates all 17. This was test-process configuration interference, not an ADS-01 defect.

## B. Exact verification results

| Check | Result |
| --- | --- |
| Frozen install | PASS, 491 packages; initial sandbox EACCES resolved by authorized network execution |
| ESLint | PASS, zero errors; one pre-existing unused-variable warning at `tests/unit/production-family-submission-boundary.test.ts:86` |
| TypeScript | PASS |
| Production build | PASS; metadataBase warning retained. An initial build included unused copied scratch functions and failed their imports; removing those unused scratch copies resolved it without application changes. |
| Focused ADS-01 / seller actions / production gates | **116 passed, zero failed/skipped, 11 files** |
| New hosted-runner safety guards | **6 passed**, no hosted requests: missing sessions block; Production URL, HTTP URL, wrong project/SHA and secret key fail closed |
| Real local `listings-rls` | **19 passed**, zero failed/skipped |
| Supported local pgTAP set | **270 assertions passed in nine files**. The obsolete `schema_email_outbox.test.sql` remains excluded exactly as in existing CI; it is not claimed verified. |
| Six prioritized materialized-SQL suites | **34 passed, zero failed assertions, 92 pending**; three fixture setups failed as described above. Legal consent, policy reacceptance and support schema passed. |
| ADS-01 isolated browser | **8 passed**, zero skipped/flaky; 320/360/390/1280px, real candidate build with synthetic Auth/REST |
| Existing search isolated browser | **26 passed**, zero skipped/flaky; ignored Windows runner override uses 127.0.0.1, one worker, original specs |
| Real local listing-browser smoke | **1 passed, 1 failed**. Unauthenticated redirect passed. Authenticated seller flow remained at sign-in with an “unexpected error,” timing out before `/account`; draft/posting steps were never reached. This does not certify any complete posting journey. |
| Docs validation | PASS after materialization: 78 tracked Markdown files, nine active guides |
| Full suite with local credentials injected | **1,821 tests: 1,663 passed, 18 failed assertions, 140 pending/skipped**; environment interference described above |
| Final full candidate run with clean environment and local stack | **1,821 tests: 1,680 passed, 1 failed assertion, 140 pending/skipped; 140 files, six files marked failed** |

The final 140 pending/skipped cases are: PGlite setup failures 92, Auth fixture setup failures 34, opted-out `moderation-integration` 12, opted-out ADS-01 CI-only disposable test 1, opted-out post-ad compatibility disposable test 1. The latter two local opt-outs were not falsified as CI execution. Independent published-CI evidence is listed separately above. Some older tests can return early if their database is offline; the final full run used a running real local stack with `REQUIRE_DB_TESTS=true`.

Full-run JSON/logs are retained under ignored `artifacts/`: `initial-three.json`, `baseline-three.json`, `db-materialized-suites.json`, `db-repro.log`, `listings-rls.json`, `pgtap.log`, `focused.json`, `full-vitest.json`, `full-vitest-clean-env.json`, `api-setup-failures.log`, `ads01-browser.json`, `search-browser.json`, `local-listings-browser.json`, `hosted-runner-guards.json`. They are local evidence, not publication artifacts or session-state files.

Representative commands (all in the verification worktree):

For a fresh Windows reproduction, create the clean detached verification checkout with per-command `core.autocrlf=false` before installing/materializing. For example, from the repository: `git -c core.autocrlf=false worktree add --detach <new-verification-path> e1737d965b55e8be599cf89b848e28007f2f0628`. Do not overwrite the earlier dirty release worktree. This preserves the canonical byte-hash fixtures and Backend mirrors without changing global Git settings or weakening the guard.

```powershell
corepack pnpm install --frozen-lockfile
node scripts/ci/materialize-backend.mjs 'C:/Users/VivekKumar/OneDrive - Nobly A S/Documents/FairSwap-Codex/backend-ci-source'
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm build
corepack pnpm vitest run tests/unit/my-ads-status-tabs.test.tsx tests/security/my-ads-counts.test.ts tests/unit/my-ads-production.test.tsx tests/unit/action-matrix.test.ts tests/unit/listing-actions-container.test.tsx tests/unit/post-ad-journey-dashboard.test.tsx tests/unit/share.test.tsx src/__tests__/moderation-listings-page.test.tsx src/__tests__/my-listings-revision.test.tsx tests/unit/production-category-gates.test.ts tests/unit/production-family-submission-boundary.test.ts
corepack pnpm vitest run tests/security/ads01-hosted-runner.test.ts
$env:REQUIRE_DB_TESTS='true'
# No inherited Supabase credential aliases: tests use their standard local defaults.
corepack pnpm vitest run --maxWorkers=3 --reporter=json --outputFile=artifacts/full-vitest-clean-env.json
corepack pnpm playwright test --config playwright.ads-01.config.ts --reporter=json
```

The temporary stack used a separate `--workdir artifacts/disposable-stack`, unique project ID and pinned SQL. Only that stack was started/stopped. CLI status credentials were consumed in process memory, not printed or included in the patch. The Windows search override is local scratch tooling, not an application/config change.

## C. Posting acceptance matrix

| Journey | Verified narrower contracts | Complete journey |
| --- | --- | --- |
| Goods | PASS: draft privacy/owner boundaries, rejected edit/resubmission revisions, media direct-write/delete restrictions, reorder/photo-count rules, stale moderation and AAL requirements, renewal limit, seller actions and public-sharing guards. Real local RLS: 19 tests. Goods domain/server/edit-retention suites pass in the full run. | **BLOCKED**: authenticated local browser sign-in did not complete; real browser draft→edit→upload→submit→moderate→renew/sharing journey is unverified. |
| Cars | PASS: server/domain contracts, persisted family binding, default-off production gates, family submission boundary, seller actions and draft/private-review messaging. | **BLOCKED**: no authorized enabled Test browser session and no complete real upload/moderation workflow. Production runtime enablement was not inspected. |
| Two-Wheelers | PASS: server/domain and retention contracts, family binding/submission guards and unchanged production restrictions. CSV byte portability is classified above. | **BLOCKED**: same live-session/workflow gap; no gate was enabled for testing. |
| Property | PASS: server/domain, financial/area controls, publication gate and family restrictions. | **BLOCKED**: no complete authorized browser draft/edit/media/moderation/publication journey. |

No family release flag was changed. Source-default-off behavior is not an assertion about live Production configuration. Synthetic AAL2 claims in local RLS tests prove DB authorization conditions, not real staff MFA enrollment or a live moderation decision. The full posting matrix is deliberately not marked PASS based on unit/RPC coverage.

## D. Secure FairSwapTest HTTP/browser acceptance

**Not performed:** no two authorized Test seller storage states/public key/verified Test preview were supplied to this worktree. The no-input runner invocation returned BLOCKED without network activity. Do not create hosted accounts or listings to bypass missing access.

Executable runner: `tools/verify-ads01-test-acceptance.mjs`. It pins the FairSwapTest API host, requires a Vercel HTTPS Test preview independently verified for the candidate and Test project, rejects secret/service-role keys, verifies each seller through Auth, requires distinct authenticated Test users and fresh sessions, and performs read-only HTTP/browser checks. It reports only check labels and PASS/FAIL/BLOCKED, never tokens, passwords, user IDs, titles, cookie contents or raw API errors. It creates no screenshots/traces/session exports. Publicly readable foreign active listings are not incorrectly treated as private-row leakage.

An authorized operator must:

1. Independently verify the exact-commit Preview is configured to **FairSwapTest**, not FairSwapProd, and complete any Vercel protection authentication in the normal browser.
2. Sign into two existing authorized sellers in separate isolated browser profiles. Export their Playwright storage states privately **outside the repository**, with owner-only access. The runner currently consumes Supabase SSR cookie session format. Use fresh sessions with at least 20 minutes remaining; refresh through the normal authorized UI beforehand. Do not paste/upload these states or credentials into chat, Git, logs or this patch.
3. Supply the public Test publishable/anon key and paths through the process environment. The following commands contain placeholders, not credentials:

```powershell
$env:ADS01_TEST_APP_URL='https://EXACT-COMMIT-TEST-PREVIEW.vercel.app/'
$env:ADS01_TEST_APP_VERIFIED_SHA='e1737d965b55e8be599cf89b848e28007f2f0628'
$env:ADS01_TEST_APP_VERIFIED_PROJECT='wpppxlnbzqynvhpeuavd'
$env:ADS01_TEST_PUBLISHABLE_KEY='<authorized public Test key>'
$env:ADS01_TEST_SELLER_A_STATE='<absolute private state-file path>'
$env:ADS01_TEST_SELLER_B_STATE='<absolute private state-file path>'
node tools/verify-ads01-test-acceptance.mjs
```

4. Keep the authorized existing fixture dataset stable during the read-only run. Both sellers need private listings; at least one needs more than ten listings, and the dataset needs existing Reserved and rejected rows. The runner reports missing fixtures as BLOCKED and does not manufacture them. It checks eight exact owner count groups, first-page row content/order against HTTP, private cross-owner reads and HEAD counts, Active/Reserved grouping and badge, rejected/Needs action, second-page totals/rows, 320/360/390px deep links/history and unauthenticated redirect. Reserved badge scanning is bounded to the first 1,000 Active rows; a fixture outside that scan is explicitly BLOCKED.
5. The unauthenticated check removes Supabase session cookies and local storage while retaining any authorized Preview protection cookies; it tests application sign-in rather than attempting to bypass Vercel protection. Exit 0 means all implemented checks passed, 1 means failure and 2 means missing access/fixture coverage. Retain only sanitized result labels. The positive hosted flow has not been executed; independent review is required before trusting its eventual results.

The request's previously verified hosted SQL isolation is accepted as owner-provided evidence but is not relabeled HTTP/browser acceptance.

## E. Local changes and publication

No production application, security guard, status/action/expiry behavior, SQL, release gate or failing security assertion was changed. Local additions are only this evidence report, a read-only authorized-Test acceptance runner, six runner safety tests, and one existing CI command extended to include those tests. All existing CI steps remain. No hosted acceptance is automatically run by CI.

The separate complete patch and SHA-256 manifest are based on `e1737d965b55e8be599cf89b848e28007f2f0628`. ChatGPT owns publication/CI coordination. The original dirty port is not duplicated.

Exact changed files:

```text
.github/workflows/ci.yml
docs/ADS-01-FINAL-VERIFICATION.md
tests/security/ads01-hosted-runner.test.ts
tools/verify-ads01-test-acceptance.mjs
```

Absolute deliverable paths:

- `C:/Users/VivekKumar/OneDrive - Nobly A S/Documents/FairSwap-Codex/ads-01-final-verification.patch`
- `C:/Users/VivekKumar/OneDrive - Nobly A S/Documents/FairSwap-Codex/ads-01-final-verification-manifest.json`
- This report: `C:/Users/VivekKumar/OneDrive - Nobly A S/Documents/FairSwap-Codex/ads-01-final-verify/docs/ADS-01-FINAL-VERIFICATION.md`.

The manifest contains the patch SHA-256, exact base, candidate and per-file SHA-256 values. Patch reverse-check verifies the handoff matches this worktree. Apply only to a clean checkout of the named candidate; the patch does not include the previously published ADS-01 port, ignored SQL, scratch code, credentials or logs.

## F. Release recommendation

**BLOCKED — exact remaining reasons:**

1. One pre-existing media-deletion assertion and five pre-existing fixture setups still prevent a green full regression run. Their dispositions need independent security review and narrowly scoped fixture maintenance; no waiver was assumed.
2. Authenticated FairSwapTest HTTP/browser checks have not run. Required access is two privately managed existing seller session states, the public Test key, and a verified exact-commit Test preview (including any protection session).
3. Complete Goods/Cars/Two-Wheelers/Property posting workflows remain unverified. The attempted local authenticated smoke did not reach the dashboard; its sign-in error requires separate environment/auth-flow investigation or authorized hosted Test acceptance. Do not enable closed families as a workaround.

Focused CI, real local RLS and pgTAP are positive evidence, not release authorization. No ADS-01 runtime defect was observed, and no merge/deploy recommendation is made.
