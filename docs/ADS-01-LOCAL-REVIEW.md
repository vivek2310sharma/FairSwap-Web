# ADS-01 isolated local review — 23 October 2026

Prepared for owner/ChatGPT review. Local and uncommitted; no push, PR, merge, deployment, migration, Backend edit or hosted data mutation.

## Base and source review

- Branch: `codex/ads-01-staging-cleanup`.
- Worktree: `Documents/FairSwap-Codex/ads-01`.
- Fetched `origin --prune`; staging base: `37ddf10c4852d5e7cd0e9f8ae9ba7f0456bb3954`.
- [PR #228](https://github.com/vivek2310sharma/FairSwap-Web/pull/228): open, targets main, four commits, 93 files, +1720/-3621; HEAD verified as `be350670fe88c843b033d4c9b92f6e885a9a9466`.
- Reviewed all four commit summaries and the feature paths: `a9a802b`, `f92872b`, `13df3c5`, `be35067`. The second commit includes unrelated reversions across CI, security, media, account and listing families. No full merge or cherry-pick was used.
- The latest Jules `.range()` mock fixes are included in the four affected regression suites. A real installed Supabase SDK transport test also exercises `.order().order().range()`.
- Original ACC-01 checkout and SRCH-04 worktree HEADs remain `1d07cce` and `a6520ae`. Their files were not edited.

## Diff and behavior

- Eight navigation tabs: All, Active, Under review, Drafts, Needs action, Paused, Expired, Sold. These are tab groupings, not a replacement database enum: Active includes active/reserved, Needs action maps to rejected, and removed listings remain accessible under All. Reserved badges and all existing status badges remain intact.
- Server-side seller and status predicates, exact filtered totals, ten rows per page and deterministic updated_at/id ordering. Request-scoped cookie client and existing RLS remain authoritative.
- URL links preserve selected status during pagination, reset pagination on tab change and support browser history. Invalid status/page input falls back safely; pages beyond available results redirect to the first page of that status.
- Optional existing-name `get_my_listing_counts()` RPC is validated for complete, nonnegative safe integers and coherent totals. Missing/error/malformed RPC responses use eight concurrent owner-scoped HEAD exact-count queries, avoiding truncated row aggregation. If fallback fails, counts display a dash and an unavailable message rather than false zeros.
- Accessible navigation links use aria-current and remain keyboard reachable. Tabs have 44px minimum height; tab prefetch is disabled to avoid unnecessary count/data work. Dashboard width prevents mobile horizontal overflow.
- Staging family lookup, draft eligibility, submission warnings, moderation badges, sharing visibility and seller action logic were retained. Shared Pagination only gains an optional baseUrl; its search default remains `/search`.

## Verification

PASS:

- `corepack pnpm install --frozen-lockfile`.
- `corepack pnpm typecheck`.
- `corepack pnpm lint`.
- `corepack pnpm build` (final runtime change included).
- Focused Vitest command below: **195 tests across 13 suites**.
- `corepack pnpm playwright test --config playwright.ads-01.config.ts`: **6 checks**, Chromium at 320/360/390/1280px, real built dashboard with synthetic loopback Auth/REST. Covers counts with missing RPC fallback, Reserved grouping, pagination, Back/Forward, empty state, invalid parameters, out-of-range recovery and unauthenticated redirect. Screenshots under ignored `test-results/`; mobile screenshot visually inspected.
- `git diff --check`.

```powershell
corepack pnpm vitest run tests/unit/my-ads-status-tabs.test.tsx tests/security/my-ads-counts.test.ts src/__tests__/moderation-listings-page.test.tsx src/__tests__/my-listings-revision.test.tsx tests/unit/share.test.tsx tests/unit/post-ad-journey-dashboard.test.tsx tests/unit/cars-server.test.ts tests/unit/cars-v1.test.ts tests/unit/two-wheeler-server.test.ts tests/unit/two-wheeler-v1.test.ts tests/unit/property-server.test.ts tests/unit/property-v1.test.ts tests/unit/property-publication-gate.test.ts
```

The requested additional `production-family-submission-boundary.test.ts` filename did not exist on this staging base and was not counted as executed. Vitest covered Goods/dashboard family eligibility plus Cars, Two-Wheelers and Property server/domain/publication logic. Security transport tests verify actual SDK query construction and owner predicates, malformed/error RPC fallback, counts over 1,000 rows, unsafe page values and double failure. They do not prove PostgreSQL RLS.

FAIL (existing repository documentation dependency): `corepack pnpm docs:check` reports one missing target in unchanged `docs/MOD_03A_AUTOMATIC_MODERATION.md`: `../supabase/migrations/20261013235311_moderation_vault_dispatch_auth.sql`. Backend SQL is intentionally absent in a fresh Web worktree; this task did not materialize or restore SQL. An initial invocation also hit sandbox Git ownership validation, resolved with process-scoped Git configuration rather than changing global settings.

Initial runs exposed outdated mocks/accessibility assertions and mobile overflow; these were corrected. The build exits successfully with metadataBase warnings and a logged sitemap enrichment failure against unavailable local data. Test tooling needed execution outside the sandbox because esbuild ancestor-directory resolution was denied. Tests used installed Node 24.15.0; CI uses Node 20, so CI parity remains pending.

## Backend dependencies and remaining acceptance

No required schema change. The optional RPC type describes the expected JSON response only; it is not evidence of deployment. The function was not found in the canonical local Backend SQL searched during this task. No PR-provided SQL or mocked SQL security tests were copied into Web. If Backend later supplies this RPC, review authenticated-only execution, auth.uid()-scoped counts, SECURITY INVOKER/RLS behavior and the eight-key grouping contract there under separate authorization.

NOT RUN: hosted Test acceptance, live RPC/schema inspection, actual two-owner PostgreSQL RLS tests, full mutating Goods/Cars/Two-Wheeler/Property posting journeys, full unit/security suite and full Playwright suite. Browser fixtures are synthetic and reject dashboard reads lacking the seller predicate; that is client/server flow evidence, not hosted RLS certification. Database-backed acceptance remains a review/release gate.

## Recommendation and rollback

Replace the oversized main-targeted PR #228 with a focused staging-targeted PR after owner review and CI. Do not retarget or merge #228 wholesale. This branch excludes its unrelated changes and does not depend on deploying new SQL. Actual database acceptance should precede release claims. No PR was opened.

Rollback is a reviewed revert of these Web-only changes after integration; no database rollback is needed. Current work remains uncommitted for review.

## Independent review follow-up — 23 October 2026

This section supersedes the earlier local-only/RPC checkpoint above. PR #233 remains DRAFT against staging; no merge or hosted mutation is authorized.

- Runtime counts now use exact owner-scoped HEAD queries directly. The absent, unaudited RPC call and speculative database type were removed; any future RPC requires separate Backend security review, including auth.uid(), invoker/RLS semantics, execute grants, grouping and two-owner isolation.
- Pages are capped at 1,000 (10,000 accessible rows); larger/invalid inputs fall back to page one, and pagination never links beyond the cap. Counts remain exact across all seller listings.
- Natural empty-state headings replace generated phrases. The selected status link is scrolled horizontally into view after hydration and status changes, without moving the page vertically; mobile deep links to Expired/Sold are covered.
- Node 20 GitHub Actions now explicitly runs the ADS-01 unit/security suites and isolated Playwright suite. The existing disposable database job also runs an opted-in ADS-01 test with two new owners, unequal private-draft totals, real Data API row/count queries, adversarial foreign seller predicates, and scoped fixture cleanup. It fails closed outside the identified disposable GitHub runner and loopback target. No SQL source or RLS policy is changed.
- CI image pulls use the official Supabase GHCR mirror to avoid the ECR download failure seen in run #300; CLI/image versions and rehearsal assertions remain unchanged. Reference: https://github.com/supabase/cli/blob/v2.117.0/apps/cli-go/internal/utils/docker.go (GetRegistryImageUrl).
- Local PASS: 191 tests across 13 suites; eight Playwright checks; typecheck; lint; production build (same metadataBase/local sitemap warnings); diff check. The one real-DB acceptance test is intentionally skipped locally and must execute in CI; no local Docker runtime is available.
- Hosted two-owner acceptance and full posting/full regression release gates remain outstanding. CI results for the pushed follow-up must be checked independently; local mocks do not certify database isolation.

## Exact isolated changed files

```text
.github/workflows/ci.yml
README.md
docs/ADS-01-LOCAL-REVIEW.md
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
tests/unit/my-ads-status-tabs.test.tsx
tests/unit/post-ad-journey-dashboard.test.tsx
tests/unit/share.test.tsx
```
