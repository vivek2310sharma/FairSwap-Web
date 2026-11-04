# Wearables V1 handoff

Prepared locally. **Nothing was committed, pushed, branched, deployed or applied to a hosted project.** GitHub delivery, CI edits and release execution belong to ChatGPT.

* Proposed branch `feature/wearables-post-ad-v1`, commit `feat(post-ad): add wearable-specific listing flow`, PR to `staging`.
* Verified bases (re-based and re-verified): Web `staging` `327338f18a758ffaa7e135f6fdfcdadca3f9c1da` (includes Accessories V1 #309), Backend `main` `43325bf5c9f5ddfd691c557d7264c2748493ba40` (includes Tablets V1), Admin `staging` `8d3efa92488f91da7c681bef86b0870e0a125165`. Cut from those, never from local checkouts. If a head moves, re-run `git apply --check` and the commands below and report any failure as BLOCKED per file.

## Result summary (PASS / FAIL / NOT RUN) on the verified bases
| Check | Result |
|---|---|
| Web typecheck / lint (clean base and patched) | PASS / PASS (0 errors; the same 1 warning exists on the clean base) |
| Web wearable unit tests (8 files, 95 tests incl. 7 new Tablet/Accessory/Phone coexistence) | PASS |
| Web full unit suite, differential vs clean base | PASS, no regression: base 2406 passed / 16 failed; patched 2502 passed / 15 failed; no test that passed on base fails; remaining failing files (`service-and-media-hardening`, `india-taxonomy-migration`, `owner-listing-display`, `point13-support-fixes`) fail identically on the clean base (they need sibling Backend SQL, `supabase/migrations` or are baseline UI failures) |
| Web `build` clean base / patched | PASS / PASS; catalogue absent from client chunks (0 matches) |
| `test:security` and DB-backed Web suites | NOT RUN as a package result (need materialized Backend SQL + local Supabase; same files fail on clean base) |
| Playwright `wearables-v1.spec.ts` (320/360 px) | NOT RUN (needs running app + Test/local Supabase with migrations) |
| Backend `verify:migrations` (58), `typecheck`, `test:unit` (93) | PASS / PASS / PASS |
| `test-wearables-v1.mjs` (PGlite, on Tablets-bearing main) | PASS, 33 |
| NEW `test-wearables-tablets-v1.mjs` (PGlite; Phones+Accessories+Tablets+Wearables installed together, both install orders) | PASS, 30 |
| Existing runners on the new main: accessories (29), posting-v2 PGlite (57), tablets (22), tablet phone-wrapper (5) | PASS |
| Native PG17.6, `tests/wearables-v1/native.mjs` (12 wearable + 4 NEW Tablet/Wearable concurrency/coexistence checks) | PASS, 16 |
| Native PG17.6 existing: posting-v212 (13) with/without `--accessories-v1`, tablets (14) | PASS |
| Admin typecheck, lint (0 warnings), unit (26 files, 615 tests), build | PASS |
| Hosted DB security, RLS, end-to-end, CI and Vercel previews | NOT RUN |

The PG17 binary was built in scratch from the checksum-pinned `postgresql-17.6` source (`tests/ratings/pg17-source.json`). Runs used the repository's own scripts; GitHub CI will build its own.

## Dependency state
Backend `main` already contains V2.1.2 recovery (#85), Accessories V1 and Tablets V1. Tablets wraps `posting_v2_session` and the phone `impl_submit_mobile_v2` (renamed to `..._before_tablets`) and never redefines `impl_posting_v2_session`, so the Wearables baseline guard holds with Tablets installed before or after Wearables (tested both ways). Required order: `20261025131116_posting_v2_mobiles` → `20261025135152_activate_posting_v2_mobiles` → `20261101234604_posting_v212_session_recovery` → `20261102164135_accessories_v1` → `20261102165946_posting_v2_tablets` (+ activation `20261102170611`) → wearables foundation `20261103090000` → wearables activation `20261103090100`. Web staging contains Accessories V1 but not a Tablets Web flow (Tablets sub-category is still `route: none`); the Web coexistence test asserts invariance, so it stays valid when Tablets Web lands.

**BLOCKED items**
1. Hosted Test/Production migration ledgers and installed function bodies are unverifiable from here. The foundation aborts on missing prerequisites or baseline drift; ChatGPT must capture target ledgers and build a ledger-matched release package.
2. Web CI pin `b3d7eae6…` materializes only the 58 immutable migrations, so DB-backed Web tests cannot see this package.
3. Admin shows the flags in the listing review page (`WearableReviewEvidence`); until Admin ships, flagged listings stay `pending_review` and a moderator must act. Admin must not be deployed ahead of the Backend migration for wearables listings (the panel only queries wearables listings, so non-wearable review pages are unaffected either way).

## Migration integrity (Backend, forward-only, immutable once chosen)
| File | sha256 |
|---|---|
| `supabase/forward-migrations/wearables-v1/supabase/migrations/20261103090000_posting_v2_wearables.sql` | `41122396afe11952126eaf474d272e88e81444863e97d0b2e646ee4cbac48b06` |
| `supabase/forward-migrations/wearables-v1/activation/supabase/migrations/20261103090100_activate_wearables_v1.sql` | `eb697df663b8c8e3551cd529d962f0c3f00d5a7595ea37c1ea7f9acf5d81c8e5` |
| `…/rollback/disable_wearables_v1.sql` (review-only) | `620a2806aa0b129f84e53b25b9faa631d233bc83f9e8ebeb2a3ea307028bfce2` |
| `…/rollback/restore_accessories_session_baseline.sql` (review-only) | `f9899ae7478bc22d7a200f0e5f7508d9b6b3d24821fe26d1054cec183f51e4cc` |
| `scripts/ci/test-wearables-v1.mjs` | `b64a60febc1ee007e008b9dc355db7d4b3650ad9dfff29f80d677df0202ceb64` |
| `scripts/ci/test-wearables-tablets-v1.mjs` | `8fb868ea937cb48b9a57b5c902dbaaed7091f628138e308a0ef598e64b2971a1` |
| `tests/wearables-v1/native.mjs` | `f40ce57479d408111d51c5dd7816267741dd554e917ce64c008c24f16c340610` |

If the migration or generated catalogue changes: rerun `node scripts/wearables/build-catalogue.mjs --migration <path>`, regenerate `SHA256SUMS`, rerun the runner.

## Environment variables
* `POST_AD_WEARABLES_V1_ENABLED` — server-side, default unset/false, add to Test then Production. `.env.example` now carries the placeholder `POST_AD_WEARABLES_V1_ENABLED=false` (in this patch).
* No new secrets. No Vercel or Supabase configuration changes.

## Changed-file manifest
**Web, new (task-owned):** `src/lib/listings/posting-base-guard.ts`; `src/lib/listings/wearables/{contract.ts,server.ts,public.ts,catalogue.generated.json}`; `src/components/listings/{WearableForm.tsx,WearableListingDetails.tsx,WearableSearchFilters.tsx}`; `src/components/listings/posting/{wearable-wizard.ts,WearableBuyerPreview.tsx}`; `src/app/api/post-ad/wearables/{sessions/route.ts,sessions/[id]/media/route.ts,submit/route.ts,models/route.ts}`; `scripts/wearables/{build-catalogue.mjs,name-key.mjs}`; `docs/reference/post-ad/wearables/{fairswap_smartwatch_wearables_catalogue_india.csv,corrections.json,catalogue-seed.generated.sql,CATALOGUE_AUDIT.md}`; `docs/plans/wearables-v1-implementation.md`; `docs/operations/WEARABLES_V1_HANDOFF.md`; tests `tests/unit/{wearable-fixture.ts,wearable-form.test.tsx,wearable-uploader-base.test.tsx,wearables-catalogue.test.ts,wearables-contract.test.ts,wearables-routes.test.ts,wearables-server.test.ts,wearables-wiring.test.tsx}` and `tests/browser/{wearables-v1.config.ts,wearables-fixture.ts,wearables-v1.spec.ts}`.

**Web, existing shared files edited (additive hunks, 13):** `post-ad-category-catalogue.ts`, `PostAdSubcategoryChooser.tsx`, `GoodsPostAdEntry.tsx`, `app/account/listings/new/page.tsx`, `app/listings/[slug]/page.tsx`, `app/search/page.tsx`, `discovery/{queries,public-family-query,family-display}.ts`, `types/listing.ts`, `navigation/search-context.ts`, `SearchFilters.tsx`, `PreListingMediaUploader.tsx` (adds optional `mediaBase`; default is the unchanged phone URL, tested).

**Backend, new:** `supabase/forward-migrations/wearables-v1/**` (foundation, activation, rollback, README, SHA256SUMS), `scripts/ci/test-wearables-v1.mjs`, `scripts/ci/test-wearables-tablets-v1.mjs`, `tests/wearables-v1/{native.mjs,run-native.sh}`. **Web, also new/edited this revision:** `tests/unit/wearables-tablets-coexistence.test.ts`, `.env.example`.

## Preservation
This revision was produced in isolated `git archive` snapshots of the three verified heads; no existing checkout was modified. Web edits to existing files are the 13 shared files listed below plus `.env.example`, all additive; the original CSV is byte-identical to the supplied file (sha256 `6f7da5dd8aeae2a0914369b2bfeebe1604bd2f9c5c5eb42a3275fe050d86f6ce`, CRLF, never normalise) and catalogue revision `8dd5783ac9b7e12e` equals the migration seed (`build-catalogue.mjs --check`: 587/607 approved).

## Catalogue audit
607 imported (35 brands, 68 series; 359 smartwatch / 132 sports GPS / 90 band / 26 ring), 587 approved, 14 quarantined, 6 excluded, 4 reclassified (CMF Band, CMF Band Pro, Realme TechLife Band, Realme TechLife Smart Band: smartwatch → fitness_band, name evidence). Revision `8dd5783ac9b7e12e`; CSV sha256 `6f7da5dd8aeae2a0914369b2bfeebe1604bd2f9c5c5eb42a3275fe050d86f6ce`. Release years are unreliable (304 of 607 say 2024, all rings 2024) and are never used. Row-level detail: `CATALOGUE_AUDIT.md`. Payloads: brands 2,302 B (475 B gzip), largest brand+type model list 4,938 B, full catalogue 73,653 B (server-only). The wearable form shares the `/account/listings/new` route chunk with the phone form (182,555 B raw / 52,200 B gzip combined); a wearables-only delta was not measured.

## CI prerequisites and exact changes (ChatGPT; no workflow edited here)
* Backend `backend-ci.yml`: add, beside the Accessories/Tablets runners, `node scripts/ci/test-wearables-v1.mjs --pglite-module=tests/ratings/node_modules/@electric-sql/pglite/dist/index.js --web=<patched Web checkout>` and `node scripts/ci/test-wearables-tablets-v1.mjs --pglite-module=… --web=<patched Web checkout>`; in the native job add `bash tests/wearables-v1/run-native.sh "$GITHUB_WORKSPACE/artifacts/ratings/pg17-source/install/bin" --web=<patched Web checkout>` after the tablets line. These runners read `FairSwap-Web/src/lib/listings/wearables/catalogue.generated.json`, so the job must check out the patched Web branch (or a pinned Web commit) as a sibling.
* Web `ci.yml`: add `tests/unit/wearable*` and `tests/unit/wearables-*` to the selected-Vitest list; add `tests/browser/wearables-v1.config.ts` to the isolated Playwright journeys once a fixture backend exists.
* Keep the standard path: GitHub CI → Test/Staging deploy → automated verification → Production → automated verification. Local PGlite results never substitute for hosted DB security and end-to-end checks. Add no feature-specific workflow.

## Post-deployment verification (automated, after activation on Test, then Production)
1. `wearables_v1_catalogue()` returns `enabled=true` and revision `8dd5783ac9b7e12e`; Web catalogue loader returns non-null.
2. Anonymous and non-owner calls to `wearable_v1_session` / `submit_wearable_v1` are denied; `impl_posting_session_core_v1` is not executable by any client role.
3. Cross-category: phone, tablet and wearable sessions cannot be used through each other's entry points (`wearable_v1_session` vs `tablet_v1_session` vs `posting_v2_session`), and `submit_wearable_v1` / `submit_tablet_v1` refuse the other category's session.
4. A listing with `still_paired`, `unknown` or an Other model stays `pending_review` and cannot be activated by a non-moderator.
5. `search_wearables_v1` returns only active, publicly visible listings with no PIN code; chooser shows Smartwatches & Wearables only when ready.
6. Phone posting, Tablets, Accessories and legacy phone drafts are unaffected (Tablets session create/read and phone `submit_mobile_v2` wrapper still pass).

## Rollback
Application: set `POST_AD_WEARABLES_V1_ENABLED=false`, or Git revert / previous Vercel deployment. Database: reviewed forward fix `rollback/disable_wearables_v1.sql` (disables release and category; retains tables, sessions, contexts, listings). The optional `restore_accessories_session_baseline.sql` is only for after wearable sessions have expired or been cleaned. Never edit an applied migration. A failed Test deployment blocks Production.
