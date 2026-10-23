# ADS-01 production release preparation — 23 October 2026

Local, uncommitted handoff for ChatGPT to publish and independently review. No push, PR creation, merge, deployment, hosted database mutation or Production data access was performed.

## Provenance and scope

- Existing release branch: `release/ads-01-main-20261023`, checked out locally from its existing remote branch in `Documents/FairSwap-Codex/ads-01-main`.
- Exact base: `bad68d0078a6613cd0d75cddeed3e81f7521eed3`, equal to fetched `origin/main` at preparation time. The base includes the approved SRCH-04 production port.
- Reviewed ADS-01 source: staging `de4bff2abdaa7fe1b23345e6b17946d0a21064f5`. No staging merge or whole-commit cherry-pick.
- Shared ADS-01 helper, navigation and focused tests were transferred selectively; the dashboard and CI were edited against main's implementation.
- Main's complete status-badge function, family-context lookup, listing-card/action rendering, expiry projection and production category messaging remain intact. The action matrix, seller mutations, family flags, moderation modules, listing enum and Supabase clients were not changed. All 48 pre-existing CI step names and both existing workflow files' production checks are retained; only ADS-01 steps are added to CI.

## Runtime contract

Eight My Ads tabs: All, Active, Under review, Drafts, Needs action, Paused, Expired, Sold. Active groups active/reserved while retaining Reserved badges; Needs action maps to rejected; removed listings remain in All. The database status enum is unchanged.

The request-scoped authenticated client and `auth.getUser()` determine the seller. Listings are filtered server-side by seller/status, counted exactly and ordered by `updated_at DESC, id DESC`; pages contain ten rows. Page input and generated links are bounded to 1,000 pages (maximum offset 9,990). Counts include all seller rows; page access is bounded to the first 10,000 rows of the selected group. Invalid input resets to page one and pages beyond the available result count recover to the selected group's first page.

Counts use eight owner-filtered exact HEAD queries. No unaudited count RPC is called or declared. Count failure renders unavailable counts rather than false zeroes. RLS and grants remain authoritative; no service client is introduced in request code. The opt-in disposable CI test uses privileged local credentials only to create/clean synthetic fixtures, then tests real authenticated two-owner row and count isolation.

Navigation uses normal URL/history links, resets pagination on status changes, supports Back/Forward, and scrolls the selected link horizontally into view for mobile deep links. Links have 44px minimum height. Empty-state labels are status-specific.

## Verification evidence

- PASS: frozen dependency installation.
- PASS: 116 tests in 11 focused suites, including ADS-01, real SDK query construction, production action matrix, seller dashboard, sharing, moderation/revision labels, production category gates and production family submission boundaries.
- PASS: production build after correcting two invalid Testing Library type options in the new test. Build logs retain metadataBase warnings and local sitemap enrichment failure; build exits successfully.
- PASS: ESLint, with one warning in unchanged `tests/unit/production-family-submission-boundary.test.ts:86` (unused variable).
- PASS: source preservation checks for main's badge/family/card/action code and all 48 original CI steps.
- PASS: final `corepack pnpm typecheck`.
- PASS: all eight ADS-01 isolated Playwright checks against the main-based production build. A final 360px case was repeated for screenshot review; no horizontal overflow was observed.
- PASS: all 26 existing isolated search browser checks using an ignored local runner config bound to `127.0.0.1:3013` with one worker. The first unmodified runner attempt failed all 26 at `localhost:3001` navigation with connection resets, before feature assertions. No search source or existing runner config was changed to work around the local host issue.
- FAIL: full Vitest command below: 140 test files, 1,821 tests; 1,661 passed, 3 failed assertions and 157 pending/skipped. Nine files were marked failed: six database-dependent files failed during setup without local Supabase; `point13-support-fixes` requires an absent materialized migration; one media-deletion assertion expects 200 but receives 409; one CSV source-snapshot SHA-256 assertion mismatches. The last two failures were independently reproduced against a pristine `git archive` export of base `bad68d0` (33 passed, 2 failed). They are baseline failures, not fixed in this scoped port.
- FAIL: `corepack pnpm docs:check` reports the existing missing link to `supabase/migrations/20261013235311_moderation_vault_dispatch_auth.sql` in unchanged `docs/MOD_03A_AUTOMATIC_MODERATION.md`. Backend SQL was not materialized/restored.

Focused command:

```powershell
corepack pnpm vitest run tests/unit/my-ads-status-tabs.test.tsx tests/security/my-ads-counts.test.ts tests/unit/my-ads-production.test.tsx tests/unit/action-matrix.test.ts tests/unit/listing-actions-container.test.tsx tests/unit/post-ad-journey-dashboard.test.tsx tests/unit/share.test.tsx src/__tests__/moderation-listings-page.test.tsx src/__tests__/my-listings-revision.test.tsx tests/unit/production-category-gates.test.ts tests/unit/production-family-submission-boundary.test.ts
```

Full regression invocation (required DB suites fail closed rather than falsely pass offline):

```powershell
$env:REQUIRE_DB_TESTS='true'
corepack pnpm vitest run --maxWorkers=4 --reporter=json --outputFile=artifacts/ads-01-full-vitest.json
```

The six failed DB-dependent files are `email-outbox-security`, `india-location-security`, `legal-acceptance-audit`, `listings-rls`, `pilot-policy-reacceptance`, and `seller-media-db-lifecycle`. Full JSON and baseline-comparison reports are retained under ignored `artifacts/`. The real ADS-01 disposable DB test remains opt-in and was not executed on this release branch. Its prior staging CI success is provenance only, not release acceptance.

The new production-specific dashboard test checks renewal limits, Reserved and Removed handling, draft-only family messaging, private review badges, expiry projection and seller filtering. Local SDK/browser mock tests do not prove hosted RLS or successful real posting.

## Acceptance gaps and release risks

- Authenticated FairSwapTest browser acceptance is NOT RUN: no configured Test session or credentials were supplied in this isolated worktree. No synthetic hosted signup, ad creation or hosted configuration change was attempted. Production data was not accessed.
- No Docker/local Supabase stack is available. Real two-owner Data API tests, pgTAP and complete mutating Goods/Cars/Two-Wheeler/Property posting journeys therefore require an identified disposable environment or separately authorized FairSwapTest acceptance.
- Production category-family gates remain unchanged. A disabled category journey is not to be opened merely to make an acceptance test pass; draft/submission/publication availability needs a separately reviewed category release configuration.
- Full local regression results and any unavailable database paths must not be represented as hosted acceptance. Some older tests return early when their database is offline; explicit DB-gated results are reported separately.
- Local runtime is Node 24.15.0; the prepared workflow retains Node 20. No release-branch CI was triggered, because publishing/GitHub operations belong to ChatGPT.
- Exact HEAD counts cost eight database requests plus the paginated count/list query; no new caching or RPC is introduced. The page cap intentionally bounds deep offset cost.

## Publication and rollback

Apply the supplied complete patch only to base `bad68d0078a6613cd0d75cddeed3e81f7521eed3` on `release/ads-01-main-20261023`, then independently review the complete diff and run CI, disposable database acceptance and hosted Test acceptance as authorized. Keep Production publishing behind owner review. No database migration or new RPC deployment is required. Rollback after integration is a focused Web revert; no database rollback is needed.

## Exact changed-file manifest

```text
.github/workflows/ci.yml
README.md
docs/ADS-01-PRODUCTION-HANDOFF.md
docs/CURRENT_STATE.md
docs/ROADMAP.md
docs/WORKFLOW.md
e2e-isolated/helpers/my-ads-setup.ts
e2e-isolated/my-ads.spec.ts
playwright.ads-01.config.ts
src/__tests__/moderation-listings-page.test.tsx
src/__tests__/my-listings-revision.test.tsx
src/app/account/listings/page.tsx
src/components/account/MyAdsStatusTabs.tsx
src/components/account/MyAdsTabScroller.tsx
src/components/listings/Pagination.tsx
src/lib/listings/my-ads.ts
tests/security/my-ads-counts.test.ts
tests/security/my-ads-disposable-db.test.ts
tests/unit/my-ads-production.test.tsx
tests/unit/my-ads-status-tabs.test.tsx
tests/unit/post-ad-journey-dashboard.test.tsx
tests/unit/share.test.tsx
```
