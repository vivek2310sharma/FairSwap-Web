# Post Ad draft flow closeout and Git handoff

> [!NOTE]
> **Historical Post Ad reference (recorded October 2026):** Dated evidence/decision contract, **not current release authorization**. Original branch names, internal step labels (including any 'Phase 1') and outcomes are preserved for audit context. Use [current state](../../CURRENT_STATE.md), [roadmap](../../ROADMAP.md) and a fresh issue-specific approval before editing source, migrating, testing against hosted Supabase or deploying.


11 October 2026 · POST-AD-CLOSEOUT-01 · **READY FOR SOURCE REVIEW**. This status covers the accepted dirty implementation and proposed handoff boundary. It does not mean a staged candidate is ready to merge, or that public release is approved.

## 1. Baseline and preservation

- Repository: `C:/Users/VivekKumar/OneDrive - Nobly A S/Documents/FairSwap` (FairSwap-Web).
- Branch: `codex/post-ad-a0`; HEAD: `c415d689124f405db56cbe8d7daecde7eeef1c29`.
- Origin fetch/push: `https://github.com/vivek2310sharma/FairSwap-Web.git` (configured URL has an account-name prefix, not a credential).
- Baseline: **190 dirty entries: 23 tracked modifications and 167 untracked files**, including two local cache files. No staged entries. Exact full porcelain status, including every untracked path, is retained in [baseline-status.txt](../../../artifacts/evidence/post-ad-closeout-01/baseline-status.txt).
- Tracked diff at baseline: 23 files, 1,599 insertions / 202 deletions. This excludes untracked implementation and ignored evidence; it is not the whole feature size.
- [Baseline SHA-256 inventory](../../../artifacts/evidence/post-ad-closeout-01/baseline-hashes.json): **807 existing source/test/SQL/script/tool/document/evidence/config files**, excluding this task's new evidence and generated Python cache. Final comparison found **0 changes**. No accepted file was reset, stashed, cleaned, overwritten, staged or moved.
- Existing artifacts are ignored by `/artifacts/`; browser evidence is ignored by `/.playwright-mcp/`. These remain local retained evidence, not implicitly tracked source. Environment secrets, tokens, cookies and raw authenticated requests are excluded from the handoff.

Only this closeout note and new local closeout evidence were created. Source, migrations, existing verification notes, fixtures, configuration, dependencies and index were not changed. No fetch, branch switch/creation, commit, push, merge, live action or deployment occurred.

## 2. Verified completed scope

Accepted owner-facing scope comprises:

- Original source-traceable CSV category/field layer, preserving raw catalogue values, path hierarchy, labels, field order and facts versus proposed behaviour.
- Goods/legacy compatibility and actual Goods draft retention; safe section/category routing, independent family references and shared location loading, maintenance/auth/policy guards, controlled fields and common-input preservation.
- Nine Motorcycle/Scooter paths, nine Cars paths and ten monthly rental/PG paths; model/catalogue provenance and bounded Not listed declarations; no Known-state invented values; valid deliberate zero retained; exact Property area precision.
- Existing create-once/save/reopen/update paths, saved category/version identity, closed-reference retention and session/auth cookie recovery. No autosave or new storage layer.
- Existing media uploader and safe snapshots, pending family seller locks, installed-schema capability checks independent of submission activation, and accepted worker completion semantics.
- Saved-answer validity, approved Test submission minimums, policy-pending evidence/prices, transition availability and snapshot/future-approval warnings kept separate.
- Trusted owner readiness/detail projection: category-defined `storage_gb` retained; private/arbitrary/nested metadata excluded; unsupported definitions remain not_verified; photos retain independent verification state; plain-text title/description and missing optional description preserved.
- Existing Test-only submission/pending owner presentation is preserved as an accepted dependency, with no new activation. Submission is not approval/publication.
- Existing isolated Post Ad preview tooling and the accepted Tailwind watch correction; no new “Preview your ad” feature.

The full migration and file boundary is below. Approval criteria, public family pricing/discovery, Admin workflow and release security are not part of completed draft scope.

## 3. Source and migration inventory

Classes: **A** accepted Post Ad implementation; **B** automated tests; **C** approved existing SQL; **D** runtime stabilisation; **E** evidence/documentation/tooling; **F** unrelated/generated local material; **G** potential moderation overlap. Multiple classes denote shared files.

[Exact machine-readable classification](../../../artifacts/evidence/post-ad-closeout-01/file-classification.json) maps every one of the 190 baseline paths to a proposed commit or explicit hold/exclusion. The appendix reproduces that inventory. File eligibility is based on the current diff and retained acceptance records, not “everything dirty is Post Ad”.

### SQL for owner/Test-family handoff — exact historical bytes, chronological dependency order

- `supabase/migrations/20261008210921_post_ad_category_metadata.sql`
- `supabase/migrations/20261009163210_seller_listing_category_context.sql`
- `supabase/migrations/20261009201151_two_wheeler_draft_v1.sql`
- `supabase/migrations/20261009202059_two_wheeler_catalogue_lookup.sql`
- `supabase/migrations/20261009203141_two_wheeler_unresolved_mapping_correction.sql`
- `supabase/migrations/20261009203412_enable_test_two_wheeler_draft_categories.sql`
- `supabase/migrations/20261009215128_two_wheeler_reference_errors.sql`
- `supabase/migrations/20261010064518_car_draft_v1.sql`
- `supabase/migrations/20261010064519_enable_test_car_draft_categories.sql`
- `supabase/migrations/20261010084523_property_rental_draft_v1.sql`
- `supabase/migrations/20261010084524_enable_test_property_rental_drafts.sql`
- `supabase/migrations/20261010091239_property_scoped_draft_lock.sql`
- `supabase/migrations/20261011092234_test_family_submission_v1.sql`
- `supabase/migrations/20261011095100_enable_test_family_submission_v1.sql`

There are **14 owner/Post Ad migrations**, plus the two schema/source SQL test files listed in P2. Earlier metadata and owner-category RPCs precede Vehicle/Cars/Property contracts. Catalogue lookup and corrected mapping/reference functions follow their family tables. Category-enabling files follow the respective guarded schema; Property scoped lock correction follows its initial save function. Submission lifecycle/worker/owner RPC installation precedes the separate Test submission policy activation.

These files were approved/applied historically in FairSwapTest according to the retained Goods/family/submission records. This task did not query current migration history or apply anything. Including source in Git is not permission to run activation migrations on a different environment. A later operator must reconcile exact deployed history and target provenance; no blanket production migration deployment.

The following existing migration files are **G / excluded from this draft PR**, not deleted or regenerated:

- `supabase/migrations/20261007153735_admin_pending_medium_download.sql`
- `supabase/migrations/20261007153744_atomic_reviewed_moderation.sql`
- `supabase/migrations/20261007161425_admin_pending_medium_download_info.sql`
- `supabase/migrations/20261010214201_staff_listing_review_context.sql`

The first three were historically restored canonical migration sources while resolving Test history alignment; they are not new draft-flow migrations. Their separate source ownership/history must be reconciled with the moderation branch before integration. Existing baseline auth/account/location/media prerequisites remain dependencies; this closeout does not propose replaying them.

### Shared files and hunk boundaries

- `src/types/database.ts`: family tables, category metadata, owner category/submission/save/catalogue RPC types are accepted Post Ad. **Exclude the added `get_staff_listing_review_context` and `moderate_listing_reviewed` declarations from the owner candidate** unless already supplied by the approved integration baseline. Preserve generator formatting/BOM history; do not regenerate types or copy the entire current file over another branch. Selective candidate extraction and candidate typecheck are still required before a commit.
- `src/lib/listings/submission-readiness.ts` and `src/components/listings/TypedReviewPacket.tsx`: owner-needed shared evaluator/DTO. Their reader distinctions and snapshot warnings may overlap staff work; preserve existing shared presentation semantics, but exclude the staff loader, Admin route and staff SQL. These shared modules do not grant moderation authority.
- `src/proxy.ts`: accepted auth return/cookie/session fixes are global middleware changes; coordinate any Antigravity auth/route-retirement edits. Do not discard cookie propagation or blindly overwrite its middleware.
- `src/app/account/listings/actions.ts`, edit/new/dashboard, `ListingForm.tsx`, media guard/upload route and discovery/detail DTOs: retain accepted owner changes. Compare other branches' lifecycle/media/public-display hunks before integrating; no unreviewed merge.
- `docs/PROGRESS.md`: only the appended Post Ad history belongs to this plan. Earlier entries remain untouched; historical partial/blocked results are not rewritten as current passes.
- `package.json`: diff adds preview/typecheck scripts only, with no dependency/lockfile change. `eslint.config.mjs` adds generated-preview exclusions only. `.env.example` documents the submission switch default OFF; no real environment file belongs in Git.
- Historical scripts are inventoried as E/HOLD, not silently treated as runtime source. They include generation/import/export and isolated or hosted probe tools. Some consume captured ignored evidence or overwrite outputs. None ran here; review them independently before any later tooling commit.
- F is exactly `.pnpm-store/v11/index.db` and `scripts/__pycache__/compile-csv-fields.cpython-312.pyc`. Preserve locally; do not commit. No unrelated tracked implementation hunk was established by this scoped audit.

## 4. Final validation — exact results

Installed executables were used directly; no package installation, dependency repair, build, SQL harness or live suite ran.

| Check / exact command or selection | Current result |
| --- | --- |
| `node node_modules/vitest/vitest.mjs run <exact 37 paths in test-selection.json> --maxWorkers=1 --minWorkers=1 --reporter=json --outputFile=artifacts/evidence/post-ad-closeout-01/tests.json` | **614 passed, 0 failed, 37 files; exit 0.** Same actual selection as LIVE-02. |
| `node node_modules/vitest/vitest.mjs run src/__tests__/proxy-policy-guard.test.ts src/__tests__/proxy-auth-response.test.ts src/__tests__/proxy-auth-page-verification.test.ts tests/unit/csv-field-layer.test.ts --maxWorkers=1 --minWorkers=1 --reporter=json --outputFile=artifacts/evidence/post-ad-closeout-01/foundation-tests.json` | **94 passed, 0 failed, 4 files; exit 0.** Separate from the 614 selection. |
| `node --test artifacts/evidence/post-ad-runtime-01/runtime-source.test.mjs` | **1 passed, 0 failed; exit 0.** Actual Tailwind/PostCSS dependency test; no server/browser start. |
| `node node_modules/eslint/bin/eslint.js .` | **PASS, exit 0**, full checkout including existing unchanged staff source. No lint-driven edits. |
| `node node_modules/typescript/bin/tsc --noEmit --incremental false` | **PASS, exit 0**, root. |
| `node node_modules/typescript/bin/tsc --noEmit -p tools/post-ad-preview/tsconfig.json --incremental false` | **PASS, exit 0**, isolated preview. |
| `node tools/post-ad-preview/verify-imports.mjs` | **PASS, exit 0**; Goods 37 modules, preview 18 modules; no proposal overlay in real Goods, no backend/auth/media imports in isolated preview. |
| `git diff --check` | **PASS, exit 0**; informational existing LF/CRLF notices. |
| Baseline hashes / index | **807 files unchanged; no staged delta**. New report formatting also checked. |

Total disjoint application tests: **708 across 41 files**, plus the separate one-test runtime regression. This does not inflate the earlier 614 claim or include live/SQL results. [Exact 37-file selection](../../../artifacts/evidence/post-ad-closeout-01/test-selection.json), [614 results](../../../artifacts/evidence/post-ad-closeout-01/tests.json), [94 results](../../../artifacts/evidence/post-ad-closeout-01/foundation-tests.json) and command logs are retained locally.

The first sandboxed Vitest invocation failed to load configuration because esbuild's parent-directory read was denied; **zero tests executed**. Normal tool approval permitted the same existing isolated test selection outside that filesystem restriction, and it passed. This was a test-startup restriction, not a business-logic defect; no implementation was changed.

These results validate the **current complete dirty checkout**, which contains excluded staff files/types. They do not certify an extracted owner-only candidate or another branch. Repeat the same checks on the eventual reviewed candidate after selective type/source extraction and conflict resolution; never weaken tests to make that cut pass.

## 5. Retained live owner evidence

[POST-AD-LIVE-02](../../../artifacts/evidence/post-ad-live-02/REPORT.md) and [owner verification section 17](Post-Ad-Owner-Flow-Verification.md) remain the authoritative current live draft record. No browser, save, upload, submit or notification was repeated for closeout.

| Family / existing live sample | Verified saved → ordinary-owner read → restored → readiness → owner preview | Media / limit |
| --- | --- | --- |
| Motorcycle `08119b0b-2630-479e-9c14-f098c154749c` | Commuter path/version; explicit year 2024, km 0, Not listed identity and INR 1234.50 retained. | One ready photo survives reopen/refresh; revision 2→5. |
| Cars `6c89bf30-9576-4efa-a836-7a32fff2be7a` | Electric/Hybrid saved contract; explicit battery-electric, 60 kWh, zero electric-only range/km, year 2024 and INR 1234.50. | One ready photo; revision 2→5. |
| Property `61091435-50d8-4cda-8723-e690f366b7bc` | Apartment path/version; area 123.45 sqft; 123450 paise/month/dwelling, deposit 0, maintenance 123 paise/month separately; generic item price NULL. Owner-private society/location restores but is excluded from readiness/preview HTML. | One ready photo; revision 2→5. |
| Goods `2d257a5a-1d3b-4e82-ba30-2bb43e8cbdd5` | Actual Electronics definitions/version NULL; numeric storage_gb 256 / Storage (GB); INR 1234; description remains NULL/blank/missing. | One ready photo; revision 1→1. Missing description remains submission-incomplete. |

All four remain draft in that evidence; all covers NULL. Ready gallery presentation is independent of explicit cover. Supported sample values are hosted verified; hostile metadata/definition mismatch and concurrent failure cases are isolated tests or deferred checks, not live injections.

The four separate historically submitted pending fixtures were **not accessed or mutated** here:
`9af48c20-d04d-4422-bf90-50ba5cb56fad`,
`9b71a65f-b7e1-4f0c-be55-a130b83196df`,
`633077d3-3b26-46fb-9143-36cd01e18bbe`,
`0544ac9b-426d-4784-bfdc-31cd0418f8ab`.
No fresh hosted inventory claim is made.

## 6. Proposed commit/PR handoff — not executed

Proposed source branch: retain `codex/post-ad-a0` as the preserved work branch. If an isolated review candidate is later authorised, suggest `codex/post-ad-draft-review` from an explicitly approved integration baseline. Suggested PR target is a dedicated **`codex/post-ad-review-target`**, provisioned only after its baseline/owner are approved. It is a proposal, not an existing/created branch. No PR against main, staging or the Antigravity moderation branch is assumed authorised. Locally visible remote refs are only origin/main and origin/staging; refs were not refreshed. No claim is made about remote branch freshness.

Use the exact P1–P5 file manifest in the appendix. Proposed order:

| Commit | Suggested subject / scope | Dependencies and review boundary |
| --- | --- | --- |
| P1 | `post-ad: add source-traceable CSV field and macro contracts` | Pure csv-fields modules, source/mapping documents and macro selector/parser/tests. Preserve proposal files as proposals, not live rules. Runtime JSON snapshots are source-derived; no imports/activation run. |
| P2 | `post-ad: record approved Test family draft and submission contracts` | After P1; 14 chronological owner migrations, 2 SQL test sources and **only accepted database-type hunks**. Existing auth/location/media prerequisite history must be aligned. Excludes 4 moderation SQL files and two staff/moderation RPC type additions. Source control recording is not migration application. |
| P3 | `post-ad: integrate owner draft retention readiness and protected media` | After P1/P2; exact remaining owner source/tests, auth/session recovery, existing Test submit/pending locks, safe existing detail and isolated preview tooling/scripts. No staff loader/Admin page or workflow. Shared DTO/reader types reviewed jointly. Feature integration is reviewed together because current shared form/action/runtime files contain multiple accepted family milestones. |
| P4 | `dev: exclude browser evidence from the Tailwind source watch` | `.gitignore` single accepted hunk plus exact existing `artifacts/evidence/post-ad-runtime-01/runtime-source.test.mjs` if separately allowlisted for tracking. No watcher/config framework or cache deletion. |
| P5 | `docs: close out accepted Post Ad drafts and retain release prerequisites` | Exact P5 historical docs in appendix, this new closeout note, and approved sanitized evidence allowlist below. Historical proposed/blocked text keeps its scope; no moderation implementation enters this commit. |

P3's full preview import check traverses real owner entry files; run it after P3, not as a claim that the partial P1/P2 tree already has the entire owner flow. The actual CSV regression imports the preview catalogue route, so `tests/unit/csv-field-layer.test.ts` belongs with P3 preview tooling rather than P1's pure contracts. Final candidate validation runs after all proposed commits. Do not stage whole shared files where the manifest says partial.

### Evidence tracking boundary

Existing `/artifacts/` ignore remains unchanged. Do not force-add that directory, raw snapshots, private fixture inventories, browser storage/session exports, retained screenshots, generated database captures or all probe scripts.

Proposed **exact evidence allowlist** for P5, subject to content/privacy review before any explicit tracking:

- `artifacts/evidence/post-ad-live-02/REPORT.md`
- `artifacts/evidence/post-ad-live-02/live-comparisons.json`
- `artifacts/evidence/post-ad-live-02/final-reopens.json`
- `artifacts/evidence/post-ad-live-02/comparison-assertions.json`
- `artifacts/evidence/post-ad-live-02/runtime-summary.json`
- `artifacts/evidence/post-ad-release-prerequisites-01/REPORT.md`
- `artifacts/evidence/test-submission-v1/VERIFICATION-RESUME.md` (retained stopped checklist; review historical content, not associated raw snapshots)
- `artifacts/evidence/post-ad-closeout-01/baseline-status.txt`
- `artifacts/evidence/post-ad-closeout-01/file-classification.json`
- `artifacts/evidence/post-ad-closeout-01/test-selection.json`

Fresh test JSON/logs/hash inventory remain local review evidence unless individually approved after checking absolute workstation paths and incidental test output. Docs already link ignored historical artifacts; either provide the reviewed evidence separately or explicitly track only approved files. Do not pretend those links will all work in a Git-only checkout. Historical tooling under E/HOLD likewise cannot be advertised as reproducible without its captured ignored prerequisites.

### Possible conflicts / source-review checklist

- [ ] Approve target branch/baseline and coordinate Antigravity's separate ownership; do not merge into it.
- [ ] Reconcile the four excluded moderation migrations with canonical history; do not duplicate/rewrite deployed SQL or infer target rollout from filenames.
- [ ] Extract only accepted database-type hunks; preserve already-existing integration-base RPC types. Root typecheck the extracted candidate.
- [ ] Compare shared auth, listing actions/form/types, media/discovery and owner/staff DTO hunks; preserve Goods/bicycle, session recovery, monetary authority and pending protection.
- [ ] Confirm all P1–P5 paths and hashes; no cache, real environment, generated Next output, private export, staff loader/route or Admin workflow.
- [ ] Review immutable category/version/raw source facts versus proposal policy; source labels/order and saved definitions remain intact.
- [ ] Run the 37+4 selected test files, runtime regression, lint, root/preview types, imports and whitespace on the actual candidate. Current results are not an Antigravity integration result.
- [ ] Review sanitized evidence allowlist and link availability; retain original evidence/checklist unchanged.
- [ ] No activation from a Git handoff: Test submission scope only, family approval/publication/Production restrictions preserved.
- [ ] PR description distinguishes completed draft/sample evidence, historical Test submissions and unresolved release prerequisites.

No staging, candidate extraction, branch creation, commit or PR was performed. Mixed-file separation and target approval are prerequisites for a later commit/PR task, not hidden actions completed here.

## 7. Separate backlog / limitations / release restrictions

User-supplied GitHub issue mapping is recorded below; issue bodies/statuses were not fetched or changed. These are separate tasks, not this PR's implementation scope:

| Item | Issue | Retained status / boundary |
| --- | --- | --- |
| R1 public amount/offer policy | [#116](https://github.com/vivek2310sharma/FairSwap-Web/issues/116) | Product decision required; no new public Vehicle/rental ceiling approved. |
| R5 safe public family pricing/display | [#117](https://github.com/vivek2310sharma/FairSwap-Web/issues/117) | Owner preview pass is not approved anonymous card/search/detail readback. |
| S1 direct authenticated database authorization | [#118](https://github.com/vivek2310sharma/FairSwap-Web/issues/118) | **DEFERRED — REQUIRED BEFORE PUBLIC RELEASE, NOT VERIFIED.** |
| S2 pending/non-owner mutation denial | [#119](https://github.com/vivek2310sharma/FairSwap-Web/issues/119) | **DEFERRED — REQUIRED BEFORE PUBLIC RELEASE, NOT VERIFIED.** |
| S3 actual cover/reorder change denial | [#120](https://github.com/vivek2310sharma/FairSwap-Web/issues/120) | **DEFERRED — REQUIRED BEFORE PUBLIC RELEASE, NOT VERIFIED.** Single-photo no-ops do not close it. |
| S4 stale/duplicate/idempotence | [#121](https://github.com/vivek2310sharma/FairSwap-Web/issues/121) | **DEFERRED — REQUIRED BEFORE PUBLIC RELEASE, NOT VERIFIED.** Do not replay retained submissions/notifications. |
| S5 actual concurrent contention | [#122](https://github.com/vivek2310sharma/FairSwap-Web/issues/122) | **DEFERRED — REQUIRED BEFORE PUBLIC RELEASE, NOT VERIFIED.** Single-connection/sequential tests are insufficient. |

The [release prerequisite register](Post-Ad-Release-Prerequisites-Review.md) remains REVIEW COMPLETE, not approval. R2 classification evidence, R3 approval criteria/automation boundaries, R4 full reviewed identity and R6 future lifecycle are still unresolved/restricted. No issue IDs were supplied for them and none were invented. Moderation/Admin belongs to the separate Antigravity branch: no implementation, approval/rejection, reviewed-decision integration, staff permission changes or automatic coordination message is included here.

Live coverage is one path per family, not all 9/9/10 hosted categories. Multi-read owner readiness does not establish an atomic snapshot; a consistent staff read does not establish future approval freshness. Goods revision 1→1 after photo and family 2→5 remain accurately recorded, not reclassified as defects without proof. Property financial authority/private society and location, existing Goods submission, four pending fixtures and all publication gates are preserved.

**Explicit restrictions:** no new-family approval/publication or Production activation is approved; no SQL application, database/role/reference/category/price change, fixture/save/upload/submit/notification, security replay/concurrency attempt, Docker/dependency upgrade, commit/push/merge/deployment occurred. Public release remains blocked by the separate policies and deferred checks.

## 8. Exact baseline file classification / commit manifest

P1–P5 are proposed commits, not staged content. **P2 partial** is a shared-file hunk boundary. **EXCLUDE** belongs to separate moderation ownership. **HOLD** stays outside this draft PR pending a separate tooling decision. Each path below is exact and repository-relative; the companion raw status preserves original Git output.

| Git status | Exact file | Class | Proposed commit | Review boundary |
| --- | --- | --- | --- | --- |
| ` M` | `.env.example` | A | P3 | Whole file unless noted |
| ` M` | `.gitignore` | D | P4 | Only /.playwright-mcp/ exclusion |
| ` M` | `docs/PROGRESS.md` | E | P5 | Post Ad appended history; preserve prior entries, review append only |
| ` M` | `eslint.config.mjs` | A | P3 | Whole file unless noted |
| ` M` | `package.json` | A | P3 | Whole file unless noted |
| ` M` | `src/__tests__/proxy-policy-guard.test.ts` | B | P3 | Whole file unless noted |
| ` M` | `src/app/account/listings/[id]/edit/page.tsx` | A | P3 | Whole file unless noted |
| ` M` | `src/app/account/listings/actions.ts` | A | P3 | Shared auth/media/discovery/action surface; retain existing behavior, coordinate other branch hunks |
| ` M` | `src/app/account/listings/new/page.tsx` | A | P3 | Whole file unless noted |
| ` M` | `src/app/account/listings/page.tsx` | A | P3 | Whole file unless noted |
| ` M` | `src/app/admin/listings/[id]/page.tsx` | G | EXCLUDE | Moderation/staff source owned separately; preserve unchanged |
| ` M` | `src/app/api/listings/[id]/media/route.ts` | A | P3 | Shared auth/media/discovery/action surface; retain existing behavior, coordinate other branch hunks |
| ` M` | `src/app/listings/[slug]/page.tsx` | A | P3 | Whole file unless noted |
| ` M` | `src/components/listings/ListingForm.tsx` | A | P3 | Whole file unless noted |
| ` M` | `src/components/listings/PincodeLocationPicker.tsx` | A | P3 | Whole file unless noted |
| ` M` | `src/lib/discovery/queries.ts` | A | P3 | Shared auth/media/discovery/action surface; retain existing behavior, coordinate other branch hunks |
| ` M` | `src/lib/media/api-contract.ts` | A | P3 | Shared auth/media/discovery/action surface; retain existing behavior, coordinate other branch hunks |
| ` M` | `src/proxy.ts` | A | P3 | Shared auth/media/discovery/action surface; retain existing behavior, coordinate other branch hunks |
| ` M` | `src/types/database.ts` | A,C,G | P2 partial | Only family/category/owner RPC/types; exclude get_staff_listing_review_context and moderate_listing_reviewed additions; review generator formatting |
| ` M` | `src/types/listing.ts` | A | P3 | Whole file unless noted |
| ` M` | `tests/security/public-location-privacy-app.test.ts` | B | P3 | Whole file unless noted |
| ` M` | `tests/security/redirect.test.ts` | B | P3 | Whole file unless noted |
| ` M` | `tests/security/seller-media-api.test.ts` | B | P3 | Whole file unless noted |
| `??` | `.pnpm-store/v11/index.db` | F | HOLD | Local generated cache; no accepted source change |
| `??` | `docs/plans/post-ad-india-plan.md` | E | P5 | Source trace/history; do not turn historical proposals into approvals |
| `??` | `docs/reference/post-ad/FairSwap-Post-Ad-Codex-PLAN-ONLY.md` | E | P5 | Source trace/history; do not turn historical proposals into approvals |
| `??` | `docs/reference/post-ad/Post-Ad-Journey-Acceptance.md` | E | P5 | Source trace/history; do not turn historical proposals into approvals |
| `??` | `docs/reference/post-ad/Post-Ad-Owner-Flow-Verification.md` | E | P5 | Source trace/history; do not turn historical proposals into approvals |
| `??` | `docs/reference/post-ad/Post-Ad-Readiness-Verification.md` | E | P5 | Source trace/history; do not turn historical proposals into approvals |
| `??` | `docs/reference/post-ad/Post-Ad-Release-Prerequisites-Review.md` | E | P5 | Source trace/history; do not turn historical proposals into approvals |
| `??` | `docs/reference/post-ad/Post-Ad-Submission-Review-Contract.md` | E | P5 | Source trace/history; do not turn historical proposals into approvals |
| `??` | `docs/reference/post-ad/csv-mapping/Cars-V1-Verification.md` | E | P5 | Source trace/history; do not turn historical proposals into approvals |
| `??` | `docs/reference/post-ad/csv-mapping/FairSwap-CSV-Field-Matrix.xlsx` | E | P1 | Source trace/history; do not turn historical proposals into approvals |
| `??` | `docs/reference/post-ad/csv-mapping/FairSwap-Codex-CSV-Field-Layer.md` | E | P1 | Source trace/history; do not turn historical proposals into approvals |
| `??` | `docs/reference/post-ad/csv-mapping/Two-Wheeler-V1-Verification.md` | E | P5 | Source trace/history; do not turn historical proposals into approvals |
| `??` | `docs/reference/post-ad/csv-mapping/category-field-mapping.json` | E | P1 | Source trace/history; do not turn historical proposals into approvals |
| `??` | `docs/reference/post-ad/csv-mapping/category-field-matrix.csv` | E | P1 | Source trace/history; do not turn historical proposals into approvals |
| `??` | `docs/reference/post-ad/csv-mapping/proposed-field-rules.json` | E | P1 | Retained proposed rules, never runtime authority |
| `??` | `docs/reference/post-ad/csv-mapping/remaining-decisions.json` | E | P1 | Retained proposed rules, never runtime authority |
| `??` | `docs/reference/post-ad/csv-mapping/source-audit.json` | E | P1 | Source trace/history; do not turn historical proposals into approvals |
| `??` | `docs/reference/post-ad/india_bike_scooter_brands_models.csv` | E | P1 | Source trace/history; do not turn historical proposals into approvals |
| `??` | `docs/reference/post-ad/india_car_brands_models.csv` | E | P1 | Source trace/history; do not turn historical proposals into approvals |
| `??` | `docs/reference/post-ad/india_categories.csv` | E | P1 | Source trace/history; do not turn historical proposals into approvals |
| `??` | `scripts/__pycache__/compile-csv-fields.cpython-312.pyc` | F | HOLD | Local generated cache; no accepted source change |
| `??` | `scripts/build-car-migration.mjs` | E | HOLD | Historical generation/harness/export tooling; no runtime dependency; review separately, do not execute |
| `??` | `scripts/build-property-migration.mjs` | E | HOLD | Historical generation/harness/export tooling; no runtime dependency; review separately, do not execute |
| `??` | `scripts/build-test-submission-integration.mjs` | E | HOLD | Historical generation/harness/export tooling; no runtime dependency; review separately, do not execute |
| `??` | `scripts/build-two-wheeler-proposal.mjs` | E | HOLD | Historical generation/harness/export tooling; no runtime dependency; review separately, do not execute |
| `??` | `scripts/car-functions.sql` | E | HOLD | Historical generation/harness/export tooling; no runtime dependency; review separately, do not execute |
| `??` | `scripts/compile-csv-fields.py` | E | HOLD | Historical generation/harness/export tooling; no runtime dependency; review separately, do not execute |
| `??` | `scripts/database-rejection.mjs` | E | HOLD | Historical generation/harness/export tooling; no runtime dependency; review separately, do not execute |
| `??` | `scripts/export-car-review.mjs` | E | HOLD | Historical generation/harness/export tooling; no runtime dependency; review separately, do not execute |
| `??` | `scripts/export-two-wheeler-review.mjs` | E | HOLD | Historical generation/harness/export tooling; no runtime dependency; review separately, do not execute |
| `??` | `scripts/extract-csv-mapping.py` | E | HOLD | Historical generation/harness/export tooling; no runtime dependency; review separately, do not execute |
| `??` | `scripts/package-property-evidence.mjs` | E | HOLD | Historical generation/harness/export tooling; no runtime dependency; review separately, do not execute |
| `??` | `scripts/prepare-car-v1.mjs` | E | HOLD | Historical generation/harness/export tooling; no runtime dependency; review separately, do not execute |
| `??` | `scripts/prepare-property-v1.mjs` | E | HOLD | Historical generation/harness/export tooling; no runtime dependency; review separately, do not execute |
| `??` | `scripts/prepare-two-wheeler-v1.mjs` | E | HOLD | Historical generation/harness/export tooling; no runtime dependency; review separately, do not execute |
| `??` | `scripts/property-functions.sql` | E | HOLD | Historical generation/harness/export tooling; no runtime dependency; review separately, do not execute |
| `??` | `scripts/review-two-wheeler-source.mjs` | E | HOLD | Historical generation/harness/export tooling; no runtime dependency; review separately, do not execute |
| `??` | `scripts/test-car-database.mjs` | E | HOLD | Historical generation/harness/export tooling; no runtime dependency; review separately, do not execute |
| `??` | `scripts/test-csv-compiler.py` | E | HOLD | Historical generation/harness/export tooling; no runtime dependency; review separately, do not execute |
| `??` | `scripts/test-database-rejection.mjs` | E | HOLD | Historical generation/harness/export tooling; no runtime dependency; review separately, do not execute |
| `??` | `scripts/test-family-submission.mjs` | E | HOLD | Historical generation/harness/export tooling; no runtime dependency; review separately, do not execute |
| `??` | `scripts/test-property-area-precision.mjs` | E | HOLD | Historical generation/harness/export tooling; no runtime dependency; review separately, do not execute |
| `??` | `scripts/test-property-coexistence.mjs` | E | HOLD | Historical generation/harness/export tooling; no runtime dependency; review separately, do not execute |
| `??` | `scripts/test-property-database.mjs` | E | HOLD | Historical generation/harness/export tooling; no runtime dependency; review separately, do not execute |
| `??` | `scripts/test-property-private-grants.mjs` | E | HOLD | Historical generation/harness/export tooling; no runtime dependency; review separately, do not execute |
| `??` | `scripts/test-staff-review-anonymous.mjs` | G | EXCLUDE | Moderation/staff source owned separately; preserve unchanged |
| `??` | `scripts/test-staff-review-context.mjs` | G | EXCLUDE | Moderation/staff source owned separately; preserve unchanged |
| `??` | `scripts/test-two-wheeler-database.mjs` | E | HOLD | Historical generation/harness/export tooling; no runtime dependency; review separately, do not execute |
| `??` | `scripts/vehicle-test-db.mjs` | E | HOLD | Historical generation/harness/export tooling; no runtime dependency; review separately, do not execute |
| `??` | `src/__tests__/proxy-auth-page-verification.test.ts` | B | P3 | Whole file unless noted |
| `??` | `src/__tests__/proxy-auth-response.test.ts` | B | P3 | Whole file unless noted |
| `??` | `src/app/api/post-ad/cars/route.ts` | A | P3 | Whole file unless noted |
| `??` | `src/app/api/post-ad/two-wheelers/route.ts` | A | P3 | Whole file unless noted |
| `??` | `src/components/listings/CarAnswerField.tsx` | A | P3 | Whole file unless noted |
| `??` | `src/components/listings/GoodsPostAdEntry.tsx` | A | P3 | Whole file unless noted |
| `??` | `src/components/listings/ListingFormFields.tsx` | A | P3 | Whole file unless noted |
| `??` | `src/components/listings/MacroCategorySelector.tsx` | A | P1 | Pure source-derived reference/selector; proposals stay separate |
| `??` | `src/components/listings/PendingOwnerListing.tsx` | A | P3 | Whole file unless noted |
| `??` | `src/components/listings/PostAdFlow.tsx` | A | P3 | Whole file unless noted |
| `??` | `src/components/listings/PropertyFields.tsx` | A | P3 | Whole file unless noted |
| `??` | `src/components/listings/SubmissionReadinessPanel.tsx` | A | P3 | Whole file unless noted |
| `??` | `src/components/listings/TwoWheelerFields.tsx` | A | P3 | Whole file unless noted |
| `??` | `src/components/listings/TypedReviewPacket.tsx` | A,G | P3 | Owner-needed shared evaluator/DTO; retain reader support, exclude staff loader/route/workflow; coordinate Antigravity |
| `??` | `src/lib/listings/cars/answer-options.ts` | A | P3 | Whole file unless noted |
| `??` | `src/lib/listings/cars/contract.ts` | A | P3 | Whole file unless noted |
| `??` | `src/lib/listings/cars/v1.json` | A | P3 | Whole file unless noted |
| `??` | `src/lib/listings/csv-fields/README.md` | A | P1 | Pure source-derived reference/selector; proposals stay separate |
| `??` | `src/lib/listings/csv-fields/catalogue.ts` | A | P1 | Pure source-derived reference/selector; proposals stay separate |
| `??` | `src/lib/listings/csv-fields/contract.ts` | A | P1 | Pure source-derived reference/selector; proposals stay separate |
| `??` | `src/lib/listings/csv-fields/generated/catalogues.v1.json` | A | P1 | Pure source-derived reference/selector; proposals stay separate |
| `??` | `src/lib/listings/csv-fields/generated/categories.v1.json` | A | P1 | Pure source-derived reference/selector; proposals stay separate |
| `??` | `src/lib/listings/csv-fields/proposals/two-wheelers.v1.json` | A | P1 | Pure source-derived reference/selector; proposals stay separate |
| `??` | `src/lib/listings/csv-fields/rules.ts` | A | P1 | Pure source-derived reference/selector; proposals stay separate |
| `??` | `src/lib/listings/csv-fields/two-wheeler-proposal.ts` | A | P1 | Pure source-derived reference/selector; proposals stay separate |
| `??` | `src/lib/listings/macro-category.ts` | A | P1 | Pure source-derived reference/selector; proposals stay separate |
| `??` | `src/lib/listings/post-ad-locations.ts` | A | P3 | Whole file unless noted |
| `??` | `src/lib/listings/post-ad-server.ts` | A | P3 | Whole file unless noted |
| `??` | `src/lib/listings/property/contract.ts` | A | P3 | Whole file unless noted |
| `??` | `src/lib/listings/property/editing.ts` | A | P3 | Whole file unless noted |
| `??` | `src/lib/listings/property/server.ts` | A | P3 | Whole file unless noted |
| `??` | `src/lib/listings/property/v1.json` | A | P3 | Whole file unless noted |
| `??` | `src/lib/listings/readiness-server.ts` | A | P3 | Whole file unless noted |
| `??` | `src/lib/listings/saved-category-context.ts` | A | P3 | Whole file unless noted |
| `??` | `src/lib/listings/saved-submission-family.ts` | A | P3 | Whole file unless noted |
| `??` | `src/lib/listings/staff-review-server.ts` | G | EXCLUDE | Moderation/staff source owned separately; preserve unchanged |
| `??` | `src/lib/listings/submission-readiness.ts` | A,G | P3 | Owner-needed shared evaluator/DTO; retain reader support, exclude staff loader/route/workflow; coordinate Antigravity |
| `??` | `src/lib/listings/submission-server.ts` | A | P3 | Whole file unless noted |
| `??` | `src/lib/listings/test-runtime.ts` | A | P3 | Whole file unless noted |
| `??` | `src/lib/listings/two-wheeler/contract.ts` | A | P3 | Whole file unless noted |
| `??` | `src/lib/listings/two-wheeler/server.ts` | A | P3 | Whole file unless noted |
| `??` | `src/lib/listings/two-wheeler/states.v1.json` | A | P3 | Whole file unless noted |
| `??` | `src/lib/listings/two-wheeler/v1.json` | A | P3 | Whole file unless noted |
| `??` | `supabase/migrations/20261007153735_admin_pending_medium_download.sql` | G | EXCLUDE | Moderation/staff source owned separately; preserve unchanged |
| `??` | `supabase/migrations/20261007153744_atomic_reviewed_moderation.sql` | G | EXCLUDE | Moderation/staff source owned separately; preserve unchanged |
| `??` | `supabase/migrations/20261007161425_admin_pending_medium_download_info.sql` | G | EXCLUDE | Moderation/staff source owned separately; preserve unchanged |
| `??` | `supabase/migrations/20261008210921_post_ad_category_metadata.sql` | C | P2 | Existing historical SQL; include exact bytes, never execute/rewrite |
| `??` | `supabase/migrations/20261009163210_seller_listing_category_context.sql` | C | P2 | Existing historical SQL; include exact bytes, never execute/rewrite |
| `??` | `supabase/migrations/20261009201151_two_wheeler_draft_v1.sql` | C | P2 | Existing historical SQL; include exact bytes, never execute/rewrite |
| `??` | `supabase/migrations/20261009202059_two_wheeler_catalogue_lookup.sql` | C | P2 | Existing historical SQL; include exact bytes, never execute/rewrite |
| `??` | `supabase/migrations/20261009203141_two_wheeler_unresolved_mapping_correction.sql` | C | P2 | Existing historical SQL; include exact bytes, never execute/rewrite |
| `??` | `supabase/migrations/20261009203412_enable_test_two_wheeler_draft_categories.sql` | C | P2 | Existing historical SQL; include exact bytes, never execute/rewrite |
| `??` | `supabase/migrations/20261009215128_two_wheeler_reference_errors.sql` | C | P2 | Existing historical SQL; include exact bytes, never execute/rewrite |
| `??` | `supabase/migrations/20261010064518_car_draft_v1.sql` | C | P2 | Existing historical SQL; include exact bytes, never execute/rewrite |
| `??` | `supabase/migrations/20261010064519_enable_test_car_draft_categories.sql` | C | P2 | Existing historical SQL; include exact bytes, never execute/rewrite |
| `??` | `supabase/migrations/20261010084523_property_rental_draft_v1.sql` | C | P2 | Existing historical SQL; include exact bytes, never execute/rewrite |
| `??` | `supabase/migrations/20261010084524_enable_test_property_rental_drafts.sql` | C | P2 | Existing historical SQL; include exact bytes, never execute/rewrite |
| `??` | `supabase/migrations/20261010091239_property_scoped_draft_lock.sql` | C | P2 | Existing historical SQL; include exact bytes, never execute/rewrite |
| `??` | `supabase/migrations/20261010214201_staff_listing_review_context.sql` | G | EXCLUDE | Moderation/staff source owned separately; preserve unchanged |
| `??` | `supabase/migrations/20261011092234_test_family_submission_v1.sql` | C | P2 | Existing historical SQL; include exact bytes, never execute/rewrite |
| `??` | `supabase/migrations/20261011095100_enable_test_family_submission_v1.sql` | C | P2 | Existing historical SQL; include exact bytes, never execute/rewrite |
| `??` | `supabase/tests/schema_post_ad_category_metadata.test.sql` | C | P2 | Existing historical SQL; include exact bytes, never execute/rewrite |
| `??` | `supabase/tests/seller_listing_category_context.test.sql` | C | P2 | Existing historical SQL; include exact bytes, never execute/rewrite |
| `??` | `tests/unit/car-answer-controls.test.tsx` | B | P3 | Whole file unless noted |
| `??` | `tests/unit/cars-server.test.ts` | B | P3 | Whole file unless noted |
| `??` | `tests/unit/cars-v1.test.ts` | B | P3 | Whole file unless noted |
| `??` | `tests/unit/csv-field-layer.test.ts` | B | P3 | Actual test imports preview catalogue route; include with P3 preview tooling, not pure P1 |
| `??` | `tests/unit/media-family-capability.test.ts` | B | P3 | Whole file unless noted |
| `??` | `tests/unit/owner-listing-display.test.tsx` | B | P3 | Whole file unless noted |
| `??` | `tests/unit/pending-owner-listing.test.tsx` | B | P3 | Whole file unless noted |
| `??` | `tests/unit/post-ad-flow.test.tsx` | B | P3 | Whole file unless noted |
| `??` | `tests/unit/post-ad-form-payload.test.tsx` | B | P3 | Whole file unless noted |
| `??` | `tests/unit/post-ad-goods-actions.test.ts` | B | P3 | Whole file unless noted |
| `??` | `tests/unit/post-ad-goods-edit-retention.test.tsx` | B | P3 | Whole file unless noted |
| `??` | `tests/unit/post-ad-goods-entry.test.tsx` | B | P3 | Whole file unless noted |
| `??` | `tests/unit/post-ad-goods-page.test.tsx` | B | P3 | Whole file unless noted |
| `??` | `tests/unit/post-ad-goods-server.test.ts` | B | P3 | Whole file unless noted |
| `??` | `tests/unit/post-ad-journey-dashboard.test.tsx` | B | P3 | Whole file unless noted |
| `??` | `tests/unit/post-ad-journey-fields.test.tsx` | B | P3 | Whole file unless noted |
| `??` | `tests/unit/post-ad-locations.test.ts` | B | P3 | Whole file unless noted |
| `??` | `tests/unit/post-ad-page-auth.test.tsx` | B | P3 | Whole file unless noted |
| `??` | `tests/unit/post-ad-routing.test.ts` | B | P1 | Whole file unless noted |
| `??` | `tests/unit/post-ad-selector.test.tsx` | B | P1 | Whole file unless noted |
| `??` | `tests/unit/property-area-precision.test.tsx` | B | P3 | Whole file unless noted |
| `??` | `tests/unit/property-controls.test.tsx` | B | P3 | Whole file unless noted |
| `??` | `tests/unit/property-publication-gate.test.ts` | B | P3 | Whole file unless noted |
| `??` | `tests/unit/property-server.test.ts` | B | P3 | Whole file unless noted |
| `??` | `tests/unit/property-v1.test.ts` | B | P3 | Whole file unless noted |
| `??` | `tests/unit/readiness-components.test.tsx` | B | P3 | Whole file unless noted |
| `??` | `tests/unit/readiness-fixtures.ts` | B | P3 | Whole file unless noted |
| `??` | `tests/unit/readiness-projection-fix.test.tsx` | B | P3 | Whole file unless noted |
| `??` | `tests/unit/readiness-server.test.ts` | B | P3 | Whole file unless noted |
| `??` | `tests/unit/saved-category-consumer-contract.test.ts` | B | P3 | Whole file unless noted |
| `??` | `tests/unit/saved-category-form-preservation.test.tsx` | B | P3 | Whole file unless noted |
| `??` | `tests/unit/staff-review-page.test.tsx` | G | EXCLUDE | Moderation/staff source owned separately; preserve unchanged |
| `??` | `tests/unit/staff-review-server.test.tsx` | G | EXCLUDE | Moderation/staff source owned separately; preserve unchanged |
| `??` | `tests/unit/submission-action-boundary.test.ts` | B | P3 | Whole file unless noted |
| `??` | `tests/unit/submission-readiness.test.ts` | B | P3 | Whole file unless noted |
| `??` | `tests/unit/two-wheeler-retention.test.tsx` | B | P3 | Whole file unless noted |
| `??` | `tests/unit/two-wheeler-server.test.ts` | B | P3 | Whole file unless noted |
| `??` | `tests/unit/two-wheeler-v1.test.ts` | B | P3 | Whole file unless noted |
| `??` | `tools/post-ad-preview/.gitignore` | A | P3 | Existing isolated preview tooling; no new preview feature; excludes generated .next |
| `??` | `tools/post-ad-preview/AGENTS.md` | A | P3 | Existing isolated preview tooling; no new preview feature; excludes generated .next |
| `??` | `tools/post-ad-preview/CLAUDE.md` | A | P3 | Existing isolated preview tooling; no new preview feature; excludes generated .next |
| `??` | `tools/post-ad-preview/app/CsvFields.tsx` | A | P3 | Existing isolated preview tooling; no new preview feature; excludes generated .next |
| `??` | `tools/post-ad-preview/app/Preview.tsx` | A | P3 | Existing isolated preview tooling; no new preview feature; excludes generated .next |
| `??` | `tools/post-ad-preview/app/api/catalogue/route.ts` | A | P3 | Existing isolated preview tooling; no new preview feature; excludes generated .next |
| `??` | `tools/post-ad-preview/app/layout.tsx` | A | P3 | Existing isolated preview tooling; no new preview feature; excludes generated .next |
| `??` | `tools/post-ad-preview/app/page.tsx` | A | P3 | Existing isolated preview tooling; no new preview feature; excludes generated .next |
| `??` | `tools/post-ad-preview/app/preview.css` | A | P3 | Existing isolated preview tooling; no new preview feature; excludes generated .next |
| `??` | `tools/post-ad-preview/browser-check.mjs` | A | P3 | Existing isolated preview tooling; no new preview feature; excludes generated .next |
| `??` | `tools/post-ad-preview/fixtures.ts` | A | P3 | Existing isolated preview tooling; no new preview feature; excludes generated .next |
| `??` | `tools/post-ad-preview/instrumentation.ts` | A | P3 | Existing isolated preview tooling; no new preview feature; excludes generated .next |
| `??` | `tools/post-ad-preview/navigation.ts` | A | P3 | Existing isolated preview tooling; no new preview feature; excludes generated .next |
| `??` | `tools/post-ad-preview/next.config.mjs` | A | P3 | Existing isolated preview tooling; no new preview feature; excludes generated .next |
| `??` | `tools/post-ad-preview/postcss.config.mjs` | A | P3 | Existing isolated preview tooling; no new preview feature; excludes generated .next |
| `??` | `tools/post-ad-preview/tsconfig.json` | A | P3 | Existing isolated preview tooling; no new preview feature; excludes generated .next |
| `??` | `tools/post-ad-preview/verify-imports.mjs` | A | P3 | Existing isolated preview tooling; no new preview feature; excludes generated .next |

Additional new authorised report: `docs/reference/post-ad/Post-Ad-Draft-Flow-Closeout.md` → E / P5. New ignored closeout results/logs are local evidence, not additional implementation changes.

**Final status: READY FOR SOURCE REVIEW.** Review the proposed scope and shared-file boundary before authorising a concrete candidate/commit task. This closeout neither authorises an integration target nor certifies public release. Stop here.
