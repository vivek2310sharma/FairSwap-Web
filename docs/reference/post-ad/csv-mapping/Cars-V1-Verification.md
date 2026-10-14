# Cars draft V1 verification — FairSwapTest

> [!NOTE]
> **Historical Post Ad reference (recorded October 2026):** Dated evidence/decision contract, **not current release authorization**. Original branch names, internal step labels (including any 'Phase 1') and outcomes are preserved for audit context. Use [current state](../../../CURRENT_STATE.md), [roadmap](../../../ROADMAP.md) and a fresh issue-specific approval before editing source, migrating, testing against hosted Supabase or deploying.


CARS DRAFT V1 VERIFIED. The actual Post Ad flow created, reloaded and updated four marked synthetic Cars drafts at the same IDs. This milestone is Test-only and draft-only; stop here.

Preview: http://127.0.0.1:4318/account/listings/new?macro=vehicles

## Focused declaration correction — 2026-10-10

CARS DECLARATION FIX READY FOR REVIEW. Subsequent component probes identified an input defect in the original milestone: choosing Known populated petrol/manual/battery_electric or zero range before seller selection/input. The supplied JSON files were used as review evidence; the user's FIX request defined the scope.

Choosing Known now emits an incomplete editing object with no factual value. Fuel, transmission and powertrain reveal Select fuel / Select transmission / Select powertrain placeholders. Known range remains blank until input; electric_only records the range basis, not a numeric answer. Explicit zero remains valid. Selecting a placeholder retains incomplete Known rather than silently changing it to Unknown.

The existing controlled form retains the editing object. The component shows a clear validation message, and validateCarAnswers rejects incomplete declarations without returning persisted data. A small browser-safe declaration helper checks supported options and valid trimmed 1–80 character Other detail. Existing strict Zod schemas and database contracts are unchanged; validation adds clearer errors, not accepted values.

Known battery/range controls require a complete valid powertrain declaration. Unsupported/missing options and incomplete Other detail cannot enable them. Existing numeric answers remain visible and unchanged while disabled; completing the powertrain answer re-enables them. The original confirmed state-change clearing and cancellation behaviour remain intact. No effects or reference-refresh defaults overwrite saved answers.

Evidence: focused component/helper/validator/test/note diff (`artifacts/evidence/cars-declaration-fix/review.patch`), check manifest (`artifacts/evidence/cars-declaration-fix/manifest.json`), browser screenshot (`artifacts/evidence/cars-declaration-fix/browser.jpg`).

- Failing before: real CarAnswerField plus existing validateCarAnswers, 25 component cases, **13 failed / 12 passed**. The initial sandbox test startup failure was not counted as a regression result.
- Passing after: the same 25 component cases plus 14 contract/four server tests passed (43 tests). Four additional placeholder/dependency interaction regressions bring component coverage to **29 passing tests**. The final disjoint 11-file affected run passed **144 tests** total; earlier overlapping runs are not added again.
- Final regression files: car-answer-controls, cars-v1, cars-server, post-ad-form-payload, post-ad-flow, saved-category-form-preservation, saved-category-consumer-contract, post-ad-goods-edit-retention, two-wheeler-retention, two-wheeler-v1, session-and-cookie-boundaries. Command: installed Vitest CLI run with these exact tests/unit file paths; manifest records the full command.
- Full lint, root/preview typechecks, Goods/preview import checks and tracked/focused whitespace checks passed. Existing test-only GoTrue multiple-client warnings are recorded in the passing session test log.
- Browser: the approved owner session was available in the existing Test-backed new form. Verified empty fuel/transmission/powertrain placeholders and messages, explicit petrol/manual choices, Other detail gating, initially blank known range, explicit zero and disabled-value preservation/re-enabling. Browser controls were exercised without Save as Draft, upload or submission. Persistence rejection and saved-value/reference refresh/confirmation/cancellation were checked in isolated real-component/validator tests, not by changing retained fixtures.
- Preservation: 353 of 357 fingerprinted source/test/schema/script/package/config files stayed byte-identical; the four changed files are the focused component, declaration helper, validator messages and component tests. The verification-note update is separate. No migration, SQL/grant/RLS change, reference import, new category, dependency upgrade, fixture/media mutation, publication-gate change, Docker, commit, push or deployment. No retained draft was saved or changed, and the security close-out was not rerun.

The original milestone evidence and counts below describe that earlier run. This correction's patch and results are separate; no taxonomy, price or submission-policy decisions were reopened.

## Source and implementation

The nine original Vehicles → Cars leaves retain their hierarchy, labels, order and exact source field arrays: Hatchback; Sedan; Compact SUV; SUV; MUV & MPV; Luxury Cars; Coupe & Convertible; Electric & Hybrid Cars; Vintage & Classic Cars. Motorcycles/Scooters precede Cars.

The 202-row category CSV and 578-row car CSV are unchanged. Category SHA-256: `9069b753947856084ef297f813328882c23437d63f444dcf167da9fbf3d3bd7e`. Car catalogue SHA-256: `46434587a3eadae2472bc38e02063200d5e31a2da07adf6fe4c0558b081f59c4`.

The catalogue supplies only brand, model, body_type, segment and status. Raw values, source row/order and provenance are preserved. It supplies no manufacturer fuel, transmission, variant, model year, battery/range, or classic certification. The completed source audit was reused.

Source-to-ID mapping (`artifacts/evidence/cars-v1/source-to-id.json`) contains all 578 source rows and real database identities, all nine category IDs and exact field/provenance arrays, snapshot and persisted contract identity. Compatibility policy (`artifacts/evidence/cars-v1/compatibility-policy.json`) explicitly separates source facts from FairSwap policy.

FairSwap mappings distinguish exact body matches, deliberate combined body groups, independent luxury segment grouping, unresolved powertrain/classic classification and incompatibility. Station Wagon/Pickup remain unresolved on ordinary body paths. Electric/Hybrid and Vintage/Classic selection does not certify powertrain or classic status. on_sale/discontinued are eligible subject to compatibility; import_only also derives review required. Unknown future lifecycle values fail with a controlled error. Exact known brand/model pairs cannot bypass catalogue checks using Not listed.

## Field behaviour delivered

- Optional draft answers retain unanswered, unknown and known states; applicable not-applicable states remain distinct. Other is bounded seller text, not a catalogue fact.
- Fuel and transmission are seller declarations. Seating is a positive whole number; known battery capacity is positive and finite.
- Powertrain is an explicitly versioned, non-CSV extension only on Electric & Hybrid Cars. Known battery/electric-only range requires a known seller powertrain declaration; hybrids do not acquire blanket draft battery/range requirements.
- Range records electric-only distance per charge. Known zero differs from unknown/not-applicable. Total-driving range is rejected.
- Shared year/km contradiction validation, existing 36 registration identities, variant 80/color 60 limits, past insurance dates and warranty as_of retention are preserved.
- Common condition, price and negotiable appear once. Price uses exact paise conversion and the existing ₹10 lakh draft ceiling; oversized prices are rejected without clamping.
- Model lookup is database-backed, category/route/brand scoped and bounded to 25 rows per page. The model control waits for Brand and ready lookup. Loading/error retains the selection; incompatible parent changes require confirmation and preserve unrelated answers.
- Persisted category/contract references select the owner RPC on edit. Closed/inactive saved references remain recoverable through the persisted version. Default-OFF/Production paths do not query Cars objects.
- Reuses the existing form, location picker, media operations and owner/account/policy controls. No full car catalogue or audit metadata is sent to the browser. Preview proposals do not enter persistence.

## Applied Test migrations and focused review

Installed Supabase CLI 2.117.0 generated these new filenames:

1. `20261010064518_car_draft_v1.sql`
2. `20261010064519_enable_test_car_draft_categories.sql`

Migration history was checked live: 43 before, 45 after; latest is 20261010064519. Only these two migrations were dry-run and applied, against the verified FairSwapTest reference. No baseline replay, resets, seeds, role/Vault changes or history repair. Complete SQL was inspected and tested in isolation before application. The second migration enables exactly nine Test draft categories after prerequisite checks. Review/publication remains blocked in UI and deployed database guards.

Exact SQL copies, focused patches and manifest (`artifacts/evidence/cars-v1/README.txt`):
- 22-file runtime/test patch relative to the saved reviewed two-wheeler close-out/correction content, rather than an invented Cars-only Git baseline.
- CLI-generated database type diff: 265 additions for new Cars objects, no changes to existing definitions. Generated into a temporary candidate, inspected, then replaced after successful generation.
- Deployed function bodies, grants, triggers and constraints are recorded in deployed-contract.json.
- Mixed original line endings cannot be recovered from normalized older patches. The manifest records original raw and reconstructed normalized hashes separately and validates tracked postimage Git blobs. Reconstruction scratch files are removed after export.

Existing shared validator behaviour is reused; the two-wheeler contract's accepted field-path type was generalized without changing its original V1 JSON. The isolated database prerequisite setup was extracted without changing previous assertions or the corrected rejection helper.

## Real Test journeys and retained fixtures

All four were created through the actual UI, reloaded and saved at the same IDs, with successful draft acknowledgements and database-confirmed final values. All use persisted contract version `7b71b6fd-0b82-4881-8db4-ccaa847bab8e`.

| Retained draft ID | Case | Persisted result |
| --- | --- | --- |
| 9f4c95b6-b9ce-4f57-8f74-ba1d1c514452 | Hatchback / Maruti Suzuki Swift | Catalogue, review false; 2024, zero km, petrol/manual, synthetic variant/color, past insurance; ₹1,234.50 fixed |
| c46c41a5-7869-4b3e-954d-465c33c776ab | Electric & Hybrid / Tata Nexon EV | Unresolved, review true; seller battery-electric, 58.3 kWh, electric-only zero range, warranty zero months/as_of 2026-10-10; free |
| fdfb46df-5bea-43d6-b3f0-53fee24fce31 | Coupe & Convertible / McLaren 570S | Grouped catalogue, import_only, review true; unknown fuel, bounded Other transmission; ₹10 lakh negotiable |
| 71617b66-0ad7-42cc-8b61-f63295cd66a6 | Vintage & Classic / synthetic Not listed | Separate bounded seller brand/model text, null canonical IDs, review true; common condition good, unknown year, known zero km; free |

Titles are marked SYNTHETIC CAR V1 and have an “updated” suffix. No fifth Cars draft was created. Final fixture/preservation evidence (`artifacts/evidence/cars-v1/preservation-and-fixtures.json`) excludes credentials and private location fields.

Direct API checks used the existing approved owner and ordinary non-owner browser sessions, through the application's normal authenticated client. No token/password export or new accounts. The temporary probe route was removed afterward.

| Live check | Result |
| --- | --- |
| Six otherwise valid owner save probes: absent version, incompatible model, contradictory km, forged review flag, total-driving range, exact-known Not listed bypass | HTTP 400 with controlled 22023/P0001; all rejected |
| Owner baseline comparison after owner probes and after non-owner probes | Four listing/context/private/media states unchanged |
| Non-owner private context read | HTTP 200, zero rows |
| Four valid non-owner same-ID saves | HTTP 400 P0001, owned Cars draft required |
| Owner thumb/medium/large access to the real synthetic asset | HTTP 200 each |
| Non-owner thumb/medium/large plus valid cover/reorder/delete operations | HTTP 404 LISTING_NOT_FOUND each |

Final per-request results: owner-api-results.json, non-owner-api-results.json. Baseline comparisons are evidence checks, not extra mutation requests; repeated comparisons are not counted as distinct probes. Payloads used valid IDs and field shapes, so ownership denials are not malformed-input evidence.

Exactly one synthetic photo was uploaded through the existing uploader:
`f1d8d80c-0b3b-4835-bf45-22cb2593abe3`, on the Hatchback fixture. It was deleted through the existing owner operation. Final media rows = 0, storage objects = 0, cover cleared. All three owner variant requests afterward returned HTTP 404 MEDIA_NOT_FOUND, recorded in photo-cleanup-api-results.json. Four unpublished drafts are retained; no draft-delete feature was invented.

## Commands and results

Commands used the installed dependencies. No dependency upgrade.

Exact focused test commands and counts (`artifacts/evidence/cars-v1/check-results.json`) records both disjoint Vitest file lists and final check results.

| Check / command | Final result |
| --- | --- |
| `node scripts/prepare-car-v1.mjs artifacts/post-ad-preview/car-import.sql` | 578 source rows / nine exact paths verified |
| `node scripts/build-car-migration.mjs` | Scoped new schema/RPC/import SQL generated; applied files preserved |
| `node scripts/test-car-database.mjs` | 52 isolated Cars database checks PASS |
| `node scripts/test-two-wheeler-database.mjs` | 67 existing isolated two-wheeler database checks PASS |
| `node scripts/test-database-rejection.mjs` | Four corrected rejection-helper self-tests PASS |
| Installed Vitest, 14 regression files | 191 tests PASS |
| Installed Vitest, six additional files | 62 tests PASS |
| `node node_modules/eslint/bin/eslint.js .` | Full lint PASS |
| `node node_modules/typescript/bin/tsc --noEmit` | Root typecheck PASS after removal of generated probe/review scratch |
| `node node_modules/typescript/bin/tsc --noEmit -p tools/post-ad-preview/tsconfig.json` | Preview typecheck PASS |
| `node tools/post-ad-preview/verify-imports.mjs` | Real Goods 29 modules / isolated preview 18 modules PASS |
| `git -c safe.directory=... diff --check` | PASS; existing LF/CRLF warnings only |
| `node scripts/export-car-review.mjs` | 22 source files, two exact SQL copies, 578 mapped rows/nine source paths |

Vitest's 191-test run covers two-wheeler contract/server/retention, Goods server/actions/page/edit retention/entry, session-and-cookie boundaries, flow/routing/page auth/form payload/selector. The 62-test run covers cars-v1, cars-server, car-answer-controls, saved-category-consumer-contract, saved-category-form-preservation and csv-field-layer. These are disjoint: 253 unique tests in 20 files. Earlier overlapping Cars runs are not added again.

The isolated PGlite harness uses minimal prerequisite tables and stub auth/account/policy functions (active account/policy accepted, staff false). It exercises actual migration functions and constraints but is not a full Supabase baseline rehearsal or hosted Storage/security test. Live ordinary authenticated evidence is listed separately above.

Preservation checks passed for existing categories (excluding new Cars), existing category attributes, all 830 two-wheeler catalogue rows and existing two-wheeler contexts. Ordered before/after fingerprints match. Original two-wheeler function bodies/grants were checked unchanged. Six existing Goods/two-wheeler fixtures retain their IDs, categories, draft status and update timestamps. Real Goods retention and session-recovery regressions pass.

## NOT RUN

Full baseline Supabase rehearsal; live staff/AAL2 checks; live reference closing/inactivation or future-lifecycle mutation; shared-Test review/publication transitions; Production access/activation/build; Docker; reset/replay/history repair; deployment; commit or push. Closed/inactive retention, future statuses and draft/publication guards were checked in isolation and deployed enforcement was inspected.

## Precise remaining rule decisions

These do not block the approved permissive Cars draft milestone:

1. What evidence and reviewer criteria establish Electric/Hybrid powertrain and Vintage/Classic eligibility? The CSV cannot certify either; current selections remain unresolved. No age threshold or model-name inference was invented.
2. What evidence resolves Station Wagon/Pickup and overlapping classification cases? Current source-derived identities survive with explicit unresolved review semantics.
3. What verification is required for import_only market/local availability and Not listed seller identities? Draft review flags are derived automatically; catalogue membership is not local-availability verification.
4. Before future review/publication activation, decide required seller answers, acceptable unknown/not-applicable declarations and review handling of bounded Other values. Draft answers remain optional except structural consistency.
5. Any price ceiling change requires a separate decision; this batch preserves the existing ₹10 lakh draft limit.

No unresolved rule was silently represented as a source fact. No Production activation, publication, commit, push or deployment occurred.
