# Motorcycle/Scooter draft V1 — Test verification, 2026-10-09

> [!NOTE]
> **Historical Post Ad reference (recorded October 2026):** Dated evidence/decision contract, **not current release authorization**. Original branch names, internal step labels (including any 'Phase 1') and outcomes are preserved for audit context. Use [current state](../../../CURRENT_STATE.md), [roadmap](../../../ROADMAP.md) and a fresh issue-specific approval before editing source, migrating, testing against hosted Supabase or deploying.


**Correction notice, 2026-10-10:** the historical PGlite rejection assertions were unreliable. See “Three source findings corrected” below for corrected rejection evidence, saved-reference loading, the applied corrective migration and current results. Separately recorded live API/photo evidence remains intact.

The approved V1 draft implementation is connected to the existing seller form in FairSwapTest `wpppxlnbzqynvhpeuavd`. Four ordinary owner-created drafts were saved, reloaded and updated under their acknowledged IDs. Submission/publication remain disabled in the UI and database. The isolated sample preview remains separate.

Application: http://127.0.0.1:4318/account/listings/new?macro=vehicles

## Applied changes

Installed CLI generated these filenames. Each migration was inspected, executed against the isolated database and proposed alone by the source-aligned Test dry-run before application. The push excluded Vault, seeds and role changes. Migration history increased from 38 to 42. Historical applied files were not rewritten.

1. `20261009201151_two_wheeler_draft_v1.sql`: additive source snapshots, versions, categories, stable brands/models, catalogue rows, registration references and one-to-one listing context; explicit grants/RLS; atomic invoker save RPC and scoped consistency/status guards. Initially unavailable categories.
2. `20261009202059_two_wheeler_catalogue_lookup.sql`: authenticated, validated, bounded lookup RPC with maximum 25 models and separately returned retained selection.
3. `20261009203141_two_wheeler_unresolved_mapping_correction.sql`: additive data correction before activation/fixtures, removing five null-leaf entries from the explicit navigation mappings. Exactly 14 mappings remain; the five unresolved styles remain separately recorded.
4. `20261009203412_enable_test_two_wheeler_draft_categories.sql`: enables precisely nine linked Test paths after installed validation checks. No review/publication activation.

Commands used the installed `node node_modules/supabase/dist/supabase.js migration new ...` and `db push --project-ref wpppxlnbzqynvhpeuavd --dry-run --skip-vault`, then the matching `--skip-vault --yes` push. There was no baseline replay/history repair.

Database types were generated from Test to temporary candidates and reviewed before replacing `src/types/database.ts`. The vehicle delta adds eight tables and the save/lookup RPC declarations. Final schema generation matches the installed types; the final replacement only removed an extra blank EOF line. No handwritten generated declarations.

## Storage and source identity

`listings.category_id` remains canonical. Seller answers have one authority: `listings.category_attributes`. Common price/negotiability remain common listing columns. `listing_vehicle_contexts` stores category/version binding, mode, stable brand/model IDs or bounded fallback text and the server-derived classification-review flag; it does not duplicate answers or prices.

All 830 supplied two-wheeler rows remain in `vehicle_catalogue_rows`, linked to the snapshot and stable `vehicle_models` UUIDs. Brand/model labels and raw type/style/fuel/status remain source data. Source row order, review keys and row provenance remain trace information, not listing identities. Source-to-ID projection is obtained by joining `vehicle_catalogue_rows.model_id` to `vehicle_models.id`, then `vehicle_models.brand_id` to `vehicle_brands.id`; raw JSON and source-order columns remain on the catalogue row. No car catalogue import.

Version UUID: `0506a02a-b66a-4abe-b168-db58eb87c43d`, key `two-wheeler-draft-v1`. Saved references retain their version and can reopen after closure. Reference loads prefer the saved binding for its category instead of duplicating that category under a newer definition.

| Source path after Vehicles | Canonical category UUID |
|---|---|
| Motorcycles / Commuter Bikes | 94969a67-4d44-4e2a-81e3-0ece8d6de153 |
| Motorcycles / Sports & Superbikes | 2ae9347c-361d-4bb6-b3f2-2a19a2791ba8 |
| Motorcycles / Cruiser Bikes | e7ac435a-a20b-42fc-90a7-10c2195a77fb |
| Motorcycles / Adventure & Touring Bikes | c283ef64-95fe-49a3-9442-06e1d49c5546 |
| Motorcycles / Classic & Retro Bikes | 9c86c2a5-18fd-4066-a168-8296ae60c6b1 |
| Motorcycles / Electric Motorcycles | d95b6a8c-297c-427c-a904-76078dc7eadf |
| Scooters / Petrol Scooters | f4e656c1-4dd3-4149-b803-40984227d2ba |
| Scooters / Electric Scooters | 4eb20c2f-6e3c-4d9e-93f4-fc11c29a5fe3 |
| Scooters / Maxi Scooters & Mopeds | 9f03a23a-663d-4586-9ef6-2654fbef4073 |

36 registration state/UT references use persisted UUIDs and documented semantic keys, separate from listing location. The official name reference is [India national portal](https://www.india.gov.in/calendar); these semantic keys are FairSwap implementation identifiers, not official postal codes. No nationwide PIN import.

## Implemented policy versus source facts

The approved small `two-wheeler/v1.json` records exact path field order and the 14 FairSwap navigation mappings. Earlier proposal and raw snapshots are preserved. Naked, Sports Commuter, Scrambler, Roadster and Dual-Sport remain unresolved. Known unresolved selection preserves its model UUID and forces review. Known incompatible/Upcoming models cannot escape through exact matched fallback text. Current/Discontinued eligibility remains separate from compatibility; Upcoming is excluded from ordinary new selection. Arbitrary fallback text is a seller declaration, not verified catalogue data.

Optional draft fields validate supplied values. Year and kilometres distinguish unanswered/known/unknown; zero is known. UTC server year controls 1900–current-year validation. Finite numeric values and whole-number requirements are enforced. Insurance accepts valid past calendar dates. Registration has unanswered/provided/unknown/not-applicable states with valid reference and contradiction checks. Warranty months store the server as-of date on change and preserve it on unrelated saves.

Implementation limits, not CSV facts: fallback brand/model text 100/150 characters; JavaScript-safe numeric representation; exact rupees with at most two decimal places, common Test price maximum 100000000 paise. No silent clamp/truncation. Variant/colour limits are the approved 80/60 characters. No Motorcycle fuel or electric-bike battery-capacity input, and no catalogue hint overwrites seller specifications.

The separate pure submission evaluator requires model information plus year/km value or explicit unknown. This does not enable review/publish. Cars/Property and the eventual Admin review flow remain gated.

## Ordinary seller fixtures

All four were created through the normal Test seller action, then reloaded and updated under the same ID. All remain `draft`, bound to the version above. No additional real seller fixture was created.

| Scenario | Listing UUID | Verified retained result |
|---|---|---|
| Bajaj Freedom 125, mapped CNG | 438dac54-669f-4ceb-9e64-7684df20c9b9 | Model c830937e-7f79-48b5-86da-9d063622cb53; year 2024; km 0; cc 125; owner ordinal 1; Rajasthan UUID; same-ID variant update; past insurance 2020-02-29 persisted and reloaded; exact price 123450 paise |
| Ampere Magnus EX, electric | c695c2a9-2c64-4a6a-9bbe-130ffd97532d | Model 841054ef-d96e-4d01-a30f-37077959dba2; year/km unknown; range 0; registration not-applicable; warranty 0 months as of 2026-10-09 unchanged by title update; Free 0 |
| Bajaj Pulsar NS200, raw Naked | a0b1cc4c-5715-4e66-ab03-a0b86761d54c | Model 1adde44e-0cdd-4cee-bae6-217b9b0f3b19; declared Sports & Superbikes; unresolved mode; server review true; unknown answers retained; same-ID title update |
| Explicit Not listed | 04ebc480-846f-48c7-9d3b-6324f4763f81 | Separate SYNTHETIC V1 Brand / SYNTHETIC V1 Model; canonical model null; same-ID title/km-zero update; no canonical catalogue insertion |

The ordinary non-owner account signed in separately in Edge. Each of the four edit pages visibly returns Page not found and exposes no editing form. Isolated authenticated SQL additionally verifies zero visible vehicle-context rows and denied same-ID save for a non-owner. Direct authenticated shared-Test context/API mutation probes were **NOT RUN**; live edit-page denial must not be misrepresented as those probes.

One synthetic PNG was uploaded through the existing owner uploader, ready media UUID `f8bd7963-6670-432a-b14a-a730bcdce1f5` on the CNG fixture. Owner thumbnail loaded (200px), derivative route redirected 302. The non-owner thumbnail request returned 404 in the application log; Edge displayed its blocked-response page. Existing owner Delete removed the image. Independent read-only verification found zero matching media rows and zero storage objects under that exact asset prefix; reload shows Photographs (0/8). Low-level physical deletion beyond the storage object inventory was not independently verified. No other media was deleted.

No existing safe draft-delete operation was available, so the four unpublished drafts are retained. Desktop and 390×844 mobile checks ran against the real application; mobile document width did not overflow. Screenshots are in `artifacts/post-ad-preview`: `tw-v1-cng-desktop.jpg`, `tw-v1-electric-mobile.jpg`, `tw-v1-unresolved-desktop.jpg`, `tw-v1-owner-photo.jpg` (captured before its approved deletion).

## Focused checks

Final combined installed Vitest run at 22:57 Europe/Copenhagen: **19 files, 295 tests PASS**, not a sum of repeated runs. It includes vehicle rules/server boundary checks, source/compiler lookup tests, Goods actions/pages/entry/retention/form, saved-category consumers and auth/session/policy/redirect/selector/flow/routing regressions.

Command: `node node_modules/vitest/vitest.mjs run` followed by the 19 explicit affected test files. Initial final-run failures for legacy mocked rows without slug were corrected; the reported count is the subsequent complete passing run.

`node scripts/test-two-wheeler-database.mjs`: **47 isolated PGlite checks PASS**, importing/executing all four actual migrations. Includes all nine successful category saves and excluded-field rejections, compatibility/lifecycle/fallback, forged review/version, invalid supplied values, atomicity, same-ID updates, closure retention, status denial and authenticated non-owner RLS. This uses an isolated prerequisite stub, not a replay or destructive shared-Test suite.

Bundled Python `scripts/test-csv-compiler.py`: **5 tests PASS**. `node node_modules/eslint/bin/eslint.js .`, root `tsc --noEmit`, preview `tsc --noEmit -p tools/post-ad-preview/tsconfig.json`, preview import guard and `git diff --check`: **PASS**. Import guard reports real Goods 25 modules and isolated preview 18 modules. Final generated-type candidate review: schema-identical.

NOT RUN: production build, Docker/full disposable migration-history suite, Production/browser activation, live staff checks, direct authenticated shared-Test non-owner context writes and photo cover/reorder/delete denial probes, live reference closure. The corresponding narrow ownership/closure rules have isolated coverage; these unrun live checks are not claimed as PASS.

## Preservation and remaining release decisions

Immutable categories snapshot SHA256 `9e29b7a87526d1a0fae22572e7400f4b1d46ca0a4dd9bec2d9995591e394ea43`; catalogue snapshot `dfab66421498bb02ef44352274a0f56c5bdb208f655b333f99d4b7e93ce5e1bf`, both match before/after. Original two-wheeler CSV provenance SHA256 `c7b8159e500dd104c62fe76fabfb0d55b290533e3ea738f4aa6ef8ff0d09ab15` remains pinned.

Existing non-vehicle category record MD5 `6c41ee67c1572976c604b1d373e45d1b` and category-attribute record MD5 `0da38866fdf20341e427976e89e0a8ea` match before/after. Existing real Goods drafts `00b45362-b02b-40fc-9a67-c6f9eb04863c` and retained inactive-category draft `46e682ca-0f83-4331-b89b-8803a6396592` remain draft under their existing categories. Historical Bicycles & Sports relationship was not reclassified. All eight new tables have RLS enabled. New runtime reads are gated before schema queries; the legacy form excludes scoped tw- categories even when vehicle integration is OFF. Existing session recovery work remains intact.

No additional V1 draft rule decision is pending. Remaining release decisions are the five unresolved styles' reviewed navigation destinations, approved handling of Upcoming rows, and the future Admin process for unresolved/fallback review before enabling submission/publication. Technical text/numeric limits are documented implementation choices. Complete the explicitly unrun live API security probes before claiming those verification cases or a wider release. No Production access, commit, push or deployment occurred.

## Security close-out — 2026-10-09

This section records the subsequent scoped close-out and supersedes the earlier **NOT RUN** statements only for the direct authenticated context/RPC and asset checks completed below. Earlier run counts and the earlier deleted photo remain historical evidence, not additional close-out results. Target: FairSwapTest `wpppxlnbzqynvhpeuavd` only. No shared-Test migrations, permissions, roles, reference changes or category activation were performed. No new drafts or accounts were created. No product runtime rules were changed in this close-out.

### Source and deployed-contract review

Inspected the complete four applied migration sources named below, the actual vehicle save/update branches in `src/app/account/listings/actions.ts`, new/edit consumers, `TwoWheelerFields.tsx`, shared form/flow integration, `two-wheeler/contract.ts`, `server.ts`, V1/state references, catalogue lookup route, Test gate, generated database types and vehicle regression tests. Read-only deployed inspection covered actual RPC signatures/function bodies, context policies/grants, listing owner-column privileges and both deferred triggers. `scripts/review-two-wheeler-source.mjs` confirms seven deployed function bodies match source, all three complete import arrays preserve the 830 source rows, and both complete path arrays preserve the nine approved paths; the 14 mappings remain policy separate from raw catalogue facts. This is import/deployed parity verification, not a repeated CSV audit.

Ownership is enforced by the invoker save RPC's owned-draft row lock and the context RLS `USING`/`WITH CHECK` rules. Listing and context changes occur in one transaction. Context identity cannot be reassigned; category/version and model/brand foreign keys, guard functions and deferred listing/context constraints reject inconsistent combinations. Guard functions use a fixed empty search path and do not grant seller execution. The server derives eligibility/review from the saved catalogue version, lifecycle and compatibility; submitted override fields are rejected. Exact known model matches cannot escape incompatible/Upcoming checks through fallback text. Arbitrary fallback remains an unverified declaration. The scoped listing guard returns early for Goods and legacy bicycles. Runtime default-OFF paths return before vehicle schema reads; scoped categories are excluded from the legacy form. Both UI/action and database guards block submission/publication. These findings do not imply live publication testing.

### Ordinary authenticated direct API results

Separate owner and ordinary non-owner sessions used the normal public-key/session browser client and actual deployed signatures. Identity was reconfirmed with `getUser`; both accounts are active, have current policy acceptance and have zero staff roles. All four supplied fixture IDs were reconfirmed as owned, unpublished drafts with the intended mapped CNG, electric, unresolved and Not listed contexts/version. No service-role client, forged JWT or SQL role simulation supplied live seller evidence. Private-location results were hashed in owner browser memory and never printed/exported.

| Non-owner request | Fixtures | HTTP / code | Returned/affected evidence |
|---|---|---|---|
| Direct vehicle-context SELECT | Each of the four supplied IDs | 200 / no error | Zero rows for each; RLS filtering, not an HTTP authorization error |
| Actual same-ID save RPC, otherwise valid payload | Each of the four supplied IDs | 400 / P0001, `Owned vehicle draft required` | No listing UUID returned; owner state unchanged |
| Valid bounded direct context PATCH | Each of the four supplied IDs | 200 / no error | `[]`, zero returned/affected rows; owner state unchanged |
| Owner-binding PATCH on CNG listing | CNG | 403 / 42501, permission denied for table listings | No rows; deployed seller_id UPDATE column grant is absent; owner state unchanged |
| Eligible alternate same-brand/same-path model-binding PATCH | CNG | 200 / no error | `[]`, zero returned/affected rows; owner state unchanged |

The context operation is exposed with authenticated UPDATE privilege, so its zero-row result is RLS evidence. Owner-binding rejection is the deployed column-permission boundary, not a malformed owner payload. Model/version/category binding rejection is additionally covered by the owner contract-invalid probes below and the direct-write isolated checks; no unsafe extra fixture was introduced to attempt context reassignment across sellers.

| Owner contract-invalid same-ID update (one condition varied) | HTTP / code / actual message |
|---|---|
| Freedom 125 model retained, category changed to Sports & Superbikes | 400 / P0001 / `Known model type, powertrain or mapping incompatible` |
| Well-formed absent contract-version UUID | 500 / P0002 / `query returned no rows` |
| Caller-supplied classification_review_required=false on unresolved fixture | 400 / P0001 / `Unexpected/forged resolution field` |
| Caller-supplied selection_enabled=true on CNG fixture | 400 / P0001 / `Unexpected/forged resolution field` |
| Kilometres marked unknown with value 0 | 400 / P0001 / `Unknown/unanswered cannot contain a value` |
| Registration marked unknown with a valid supplied state UUID | 400 / P0001 / `Registration declaration contradicts state/UT` |

The absent-version case is a rejected reference lookup with an actual server 500, not an ownership denial or a polished validation response. It accepted no update; response handling remains a review observation, with no repair made in this close-out. An initial incompatible-category attempt changed the applicable field set and failed earlier field validation; it was not counted as pairing evidence. The corrected pairing probe changes only the category within the same applicable field set.

Before and after **each mutation probe**, the owner's normal client read all four listings using granted public columns, their full vehicle contexts/media and the owner private-location RPC. A stable SHA256 covers that combined state, including timestamps. No mutation probe unexpectedly succeeded. Every before/after pair matched, including all four fixtures rather than only the target. Baseline and final post-cleanup fingerprint:

`803b5a6342ed3155a07c2071fc64c46de6ed3039606b10147384a80034c2a3aa`

With this run's processed photo present, the before/after media-probe fingerprint was:

`ce6097ed0be65c64d1dc825ae85c2d6dbe4cd74ae7c9a085b3fbb830162145c2`

The verifier initially used an ungranted listing `*` projection; it was corrected to the allowed projection before mutation evidence. Its initial classifier paused on the explicit 403 owner-column denial; owner preservation was checked and the classifier corrected to recognize that denial. A browser-control timeout interrupted evidence collection, not an accepted API operation; pending results were read and owner comparisons completed before continuing. These verifier issues are not security findings or extra passing test counts. A local server restart cleared legacy key aliases only in child-process memory because Next reloaded an inherited alias and the verified-Test gate correctly stayed OFF; no environment file, remote configuration or permissions were changed.

### Actual asset denial and cleanup

Exactly one new synthetic image was uploaded through the existing owner workflow to CNG, processed media UUID `1eeede78-70f8-421d-a732-5d350d0542a9`. Owner thumbnail loaded at natural width 200. This is separate from the earlier deleted asset documented above.

| Ordinary non-owner request using that real ready asset | HTTP / application code |
|---|---|
| GET private thumbnail, medium and large variants (each) | 404 / LISTING_NOT_FOUND |
| PUT cover with valid mediaId | 404 / LISTING_NOT_FOUND |
| POST reorder with valid mediaIds array | 404 / LISTING_NOT_FOUND |
| DELETE actual media ID | 404 / LISTING_NOT_FOUND |

Variant requests used `Accept: application/json` so denial was captured directly without displaying a private signed redirect URL. All mutation bodies used supported valid shapes and the existing asset. Owner state matched before/after every denied media mutation; the ready asset remained available to its owner. Owner Delete removed only this run's image. Cleanup evidence is separate: read-only inventory found **zero matching media rows**, **zero storage objects under the exact listing/asset prefix**, and null cover; owner's normal deleted-asset API returned **404 MEDIA_NOT_FOUND**. Final owner fingerprint equals the pre-upload baseline above. No claim is made about lower-level physical deletion beyond the storage-object inventory. All four drafts remain unpublished and unchanged; existing Goods/retention/session recovery work remains intact.

### Close-out focused checks and limits

`node scripts/test-two-wheeler-database.mjs`: **54 isolated PGlite checks PASS** in the final close-out run, superseding the previous 47-check run count for this script. Added checks cover immutable direct context identity, context/category mismatch, deferred cross-vehicle category inconsistency, rollback of an unbound insert, and successful isolated Goods/bicycle create/update outside vehicle restrictions. All four actual migration sources execute only in the fresh isolated database.

PGlite prerequisites are explicitly stubbed: anon/authenticated/service_role roles, `auth.uid()` driven by a synthetic request setting, account-status helper returning active, policy helper returning true, minimal category/listing tables and enums, reduced common validations/price constraint, default seller assignment, simplified listing-owner RLS and direct grants. This cannot prove actual cookies/JWT refresh/PostgREST projection and grants, real account-policy/maintenance/staff behaviour, the complete existing trigger/moderation baseline, private-location integration or media/storage pipelines. Normal-session live probes above prove their stated narrow boundaries; they do not replace a complete baseline suite.

Source/deployed parity check: **PASS** (seven bodies, three 830-row arrays, two nine-path arrays). Changed-script ESLint, root and isolated-preview TypeScript, preview import guard, patch parsing/hash verification and tracked whitespace checks: **PASS**. The earlier 295-test Vitest and five-test compiler runs were not repeated or added to the close-out count. The temporary authenticated browser verifier is removed from the application after verification and excluded from the review source export.

After verifier removal, the first root type check found only its stale generated `.next/dev/types/app/account/tw-close-out/page.ts` import. That exact generated verifier file was removed; the subsequent root check passed. Final export verification matched all 29 manifest source hashes and all four byte-identical SQL copies, and Git parsed all 25 patch entries. The owner CNG edit page was reopened with `Photographs (0/8)` visible; the saved cleanup screenshot is `artifacts/post-ad-preview/tw-close-out-owner-cleanup.jpg`, outside the source-review export.

Still explicitly **NOT RUN**: shared-Test status/review/publication transitions (prohibited by this request), live reference closure, live staff/AAL2 checks, complete disposable baseline integration, production build or deployment. No additional V1 product-rule decision is needed. Future broader release still needs reviewed navigation for the five unresolved styles, Upcoming handling and an Admin review process before enabling submission/publication; no such activation is authorized here.

### External review source

`artifacts/evidence/two-wheeler-v1-close-out/` contains the four exact SQL copies, `vehicle-runtime-tests.patch`, manifest, scope README and sanitized deployed function/policy/trigger projections. The patch includes **25** declared vehicle runtime/test and necessary shared integration files, including untracked source without staging. Base is HEAD `c415d689124f405db56cbe8d7daecde7eeef1c29` on `codex/post-ad-a0`. Shared-file changes are cumulative from that HEAD and include earlier Goods integration; the export does not pretend there is a vehicle-only committed baseline. Previously reviewed source snapshots remain repository dependencies; this is a focused review patch, not a standalone full application export. No full repository, ZIP, separately duplicated catalogue snapshots, credentials, signed URLs or private browser/session artifacts are included.

| Exact applied source copy | SHA256 |
|---|---|
| 20261009201151_two_wheeler_draft_v1.sql | 0b83b4c32f00ef5133198545ec9d1b8c94458f24a2cd957407935a308023d97d |
| 20261009202059_two_wheeler_catalogue_lookup.sql | 2afca3f02c7535328ee6ee286d2a1f4b3df9ef51a1923b9e6a4c8f556b1a8c55 |
| 20261009203141_two_wheeler_unresolved_mapping_correction.sql | 2f5cb60bd98a982410eb4f71bec0f991e1d91bf1ee1949749b6fe0c3059f7b3b |
| 20261009203412_enable_test_two_wheeler_draft_categories.sql | e90ec9809909d069e5fbda047db149184e6dfba005382d3b02fff8e7bd4109bd |

These files are for review only; they were not replayed on shared Test. No Production access, Docker, commit, push or deployment occurred.

## Three source findings corrected — 2026-10-10 Europe/Copenhagen

The earlier PGlite rejection assertions were **unreliable**: the old helper caught its own `Expected rejection` exception and counted a resolved operation as PASS. The earlier 47/54 script counts cannot establish those rejection cases. This does not invalidate separately checked positive cases, unit tests or the ordinary authenticated live API/photo evidence recorded above. The corrected runs below replace the isolated rejection evidence; historical live responses remain recorded as observed, including the pre-correction missing-version 500.

### Rejection-helper evidence and corrected database checks

Before changing the helper, an isolated successful `select 1` reproduced `{incorrectlyPassed:true,passed:1}`. `scripts/database-rejection.mjs` now uses asynchronous `assert.rejects` with a predicate that checks SQLSTATE and a narrow message; it never catches its own missing-rejection assertion. The passing counter increments only after that assertion succeeds. `scripts/test-database-rejection.mjs` passes **four self-tests**: resolved inert SQL fails without incrementing; an actual expected database error passes; a wrong SQLSTATE fails; an unrelated message with the expected SQLSTATE fails. No string is passed as the error matcher.

The original isolated database script, with only the helper corrected and its existing error SQLSTATEs made explicit, passed **54 checks** before the corrective migration. The final extended script passed **67 checks** with the new migration, actual category visibility policy and actual owner saved-category RPC. Counts are separate runs, not additive. No genuine database rejection defect was exposed by correcting the old helper. One newly added test initially expected a foreign-key error for category removal; inspection showed the existing vehicle listing guard rejects that operation earlier with its specific P0001 message. The test now asserts that unchanged boundary, while a separate existing-version/missing-category-binding test asserts the new 22023 context-guard boundary. No successful operation is accepted as rejection evidence.

The extended isolated setup installs the actual `categories_select_policy`: active categories are visible, with the existing three staff-helper alternatives. Its staff helper is explicitly stubbed to false for ordinary sellers. All inactive category rows and the embedded join are then hidden, while the actual owner-only `get_seller_listing_category_context` RPC returns the saved inactive category. The non-owner RPC is rejected with 42501. Other baseline stubs remain: synthetic `auth.uid()` setting/roles, active-account/current-policy helpers, reduced listing/category/attribute prerequisite tables and common checks, simplified listing RLS/grants/default seller. This remains a focused PGlite setup; it does not prove real staff/AAL2, maintenance, JWT/cookie refresh, the complete moderation/trigger baseline or storage integration.

### Saved vehicle reference loading

The vehicle edit path passes the actual persisted listing ID and listing category into `loadVehicleReferences`. The loader validates the context identity/category/version and consumed resolution, reads the saved category through the existing owner-only saved-category RPC, and validates the matching contract and version projections with Zod. Saved-category loading no longer depends on the nullable ordinary embedded category. Minimal reference types omit unavailable slug/timestamp fields rather than fabricating database rows.

Ordinary discovery supplies only eligible new-assignment alternatives for the current version. The owner-authorized saved category is deduplicated by category ID, retains its exact persisted version/field order, and remains available when inactive, closed to posting or bound to an older closed version. New selection never receives this exception. Missing, denied, malformed or mismatched saved projections fail clearly. Returned or thrown vehicle-context query failures stop editing; a known vehicle draft with missing context does not fall into the legacy editor. Default-OFF returns before vehicle schema reads/RPCs. Goods, saved-category RPC implementation, legacy bicycle flow and session recovery source are preserved.

Final affected Vitest run: **eight files / 130 tests PASS** at 00:03 Europe/Copenhagen. The 19 new retention/edit tests cover active, closed-to-new and inactive-null-embedded references; closed saved versions alongside a newer discoverable version; deduplication; owner denial/malformed response; persisted identity/category/version mismatches; failed/missing context; default-OFF; actual field rendering and same-ID/version/answer preservation after a reference refresh. The remaining seven affected suites cover vehicle rules/server boundaries, Goods edit/actions/reference loading, saved-category consumers and ordinary form payloads. Earlier 30/128 development runs are not added to this count. Rendering/save refresh evidence is mocked; no successful live save or new fixture was needed.

### Exact corrective migration and deployed verification

Installed CLI 2.117.0 generated `20261009215128_two_wheeler_reference_errors.sql`. The original four applied migrations are byte-unchanged. The new transaction uses `CREATE OR REPLACE` for only `app_security.vehicle_context_guard()` and `public.lookup_two_wheeler_catalogue(...)`. Expected absent version or category/version lookups now explicitly test `FOUND` and raise SQLSTATE **22023** with safe messages. Ownership/lifecycle/eligibility checks, atomicity, signatures, grants, volatility and empty search paths are unchanged. Other strict internal lookups remain strict; there is no broad exception handler.

Before shared Test application: exact project inspection confirmed **FairSwapTest / wpppxlnbzqynvhpeuavd** and history through `20261009203412`. Source-aligned `db push --project-ref wpppxlnbzqynvhpeuavd --dry-run --skip-vault` listed **only** the new correction, with `seeds:[]` and `roles:[]`. The migration and its tests ran successfully in the corrected isolated harness first. The authorized CLI application with the same explicit target and `--skip-vault` applied only that file. History now records `20261009215128 / two_wheeler_reference_errors` immediately after the prior activation migration. No seeds, roles, Vault updates or history repair occurred.

Both deployed corrected function bodies match the exact migration source. Before/after inspection confirms unchanged signatures, ACLs, security mode, volatility and search_path. Guard ACL remains postgres-only; catalogue lookup remains executable by authenticated and postgres only. Generated types were not edited and remain byte-identical to the previous close-out export.

Migration SHA256: `2d186ef8a24935e8d5a27f90e8a424d426a428a992d62991b60d518329c84a2a`.

### Narrow live evidence and delivery

The approved ordinary owner session reloaded the CNG edit page successfully with actual vehicle fields, no alerts and `Photographs (0/8)`. One actual same-ID save RPC used that fixture's valid persisted values/resolution and changed only the version to the well-formed absent UUID. It returned **HTTP 400 / 22023 / `Vehicle contract version unavailable`**, no listing UUID. Owner reads before and after covered all four approved listings, contexts, media and private-location RPC results; private data stayed in browser memory. All four remain owned drafts and the exact before/after state hash matches:

`052f781e2e9116f19004f232b718753f67e41b572113d14d2c0e38a5ef36ff57`

This verifier's serialization layout differs from the previous close-out hash; only its own before/after pair is compared. The safe result screenshot is `artifacts/post-ad-preview/tw-reference-correction-live.jpg`. No credentials, cookies, private locations or signed URLs are printed/exported. No photos or drafts were created, and the prior non-owner photo exercise was not repeated. The temporary development verifier route and its exact stale generated type file were removed; the retained owner edit page is left open.

Changed-file ESLint, root/preview TypeScript, preview import guard and whitespace checks **PASS**. The review patch parses successfully and all eight manifest source hashes match; its SQL copy is byte-identical. Both original source snapshots retain their pinned hashes. `artifacts/evidence/two-wheeler-v1-corrections/` contains the exact new migration, a focused **seven-file** runtime/test patch, manifest/README and sanitized deployed projections. The tracked edit-page delta is cumulative from HEAD `c415d689124f405db56cbe8d7daecde7eeef1c29`; necessary untracked corrected source is included without staging. Earlier reviewed dependencies remain in the repository. The previous review export is retained; no full repository, ZIP, catalogue snapshots or private browser/session artifacts are added to the new export.

Still **NOT RUN**: live inactive-category/reference closure (no dedicated authorized fixture), staff/AAL2 checks, review/publication/status transitions, full disposable baseline suite, production build/deployment. Normal eligible create/update and closure retention are isolated; retained field rendering/refreshed same-ID saving and failure paths are mocked; owner reload and controlled missing-version rejection/preservation are live. Prior separately recorded non-owner denials remain evidence of that earlier run. Production and submission/publication stay OFF. No Docker, taxonomy/catalogue import, dependency changes, Production access, commit, push or deployment occurred. No V1 policy decision is pending for these corrections.
