# V2.1.2 final security/product-completion pass

2 November 2026. This is a delta against the existing V2.1.2 candidate below, not a redesign or deployment. It closes the prior native-concurrency gap and makes the certified-blank path reachable through real posting actions.

## Reachable, safe journey

- A page visit still allocates nothing. Local file selection without preparation and meaningful/recovered drafts continue through protected allocation. Their photos/fields must never be relabeled as empty.
- An explicit **Add photos** click on a fully pristine local draft starts blank preparation while opening the file chooser synchronously in the original user-gesture stack. The existing button, layout, logo/fonts/tokens, buyer preview and storage format remain. Cancelling leaves only a server-certified blank, with no associated meaningful draft or media. Repeated preparation reuses its owner/request nonce.
- The pristine check conservatively covers all canonical draft fields, selected/pending photos, price text, manual-title state and resolved area. A no-photo list alone is not sufficient. The guarded HTTP `create_empty` path reuses/protects an already-owned real session instead of misclassifying it; otherwise the existing Backend RPC mints an unrelated fresh ID.
- The returned unclaimed server ID stays only in memory. It is NOT written into IndexedDB or assigned to draft work. Upload first confirms `claim_draft`, verifies the returned ID and `draft_protected===true`, then serializes the existing version-2 record under the claimed ID before media requests. An unprotected/mismatched response fails closed. If rotation wins before claim, the saved nonce/blobs remain and the existing explicit expiry recovery is shown.
- New guarded HTTP `acquire_draft` is a Web transport mode, not a new SQL operation. It prioritizes an existing owned real draft ID, then resolves that owner's prior empty-request nonce and claims it, otherwise uses protected `create`. This handles lost claim responses/reload without duplicating sessions. Lookup errors fail closed. The legacy body with no operation still delegates to `create` unchanged; Zod remains strict and rejects injected protection/owner metadata.
- A real browser regression drives six Add photos/cancel actions (no seeded eligibility), observes the oldest certified blank retire at five active sessions, then selects/uploads and verifies claim before saved-ID/media use. Other tests cover claim-race expiry, lost-response reload reuse and existing protected/unknown recovery choices. No legacy/meaningful/media draft is automatically reclassified or removed.

## Native PG17 and CI

`tests/posting-v212/run-native.sh` starts a new mode-0700 private-socket PostgreSQL 17.6 cluster with TCP disabled and no URL/credential inputs. The adapter verifies version, fixture marker, data directory, role and listeners before DDL. Independent psql backends hold transactions open; a separate observer confirms distinct PIDs and lock waits before explicit commit/rollback. Thirteen cases cover competing creation, one safe slot, same-ID retries, empty nonce retries, claim/rotation ordering, rollback, owner/RLS isolation, upload row locking, media completion/object inventory and protected work.

The same original fixture SQL is shared with the existing 57-check PGlite suite. No migration or canonical SQL function changed. Backend's existing `backend-ci.yml` gains mandatory fixture/CI-contract checks in `unit-integrity` and the native runner in the already aggregate-gated `ratings-native-pg17` job, reusing its checksum-pinned build/dependencies. No new workflow, job, package, credential or deployment environment variable. Existing gates remain required. Local source wiring is verified; GitHub Actions was not dispatched.

## Verification and release

Exact final command results/counts are in the corrective ZIP. Web typecheck/lint/build and focused unit/browser checks, Backend baseline units/validators/typecheck, original 57 SQL checks, 13 native cases and migration integrity are run. The 58-file immutable manifest and V2.1.2 forward candidate are unchanged. Native PG17 now passes locally; supporting auth/storage schemas are explicit fixtures, so this is not authenticated hosted Supabase/Storage acceptance.

Apply the small delta only to the reviewed V2.1.2 base. ChatGPT owns GitHub integration and hosted release steps. Underlying V2.1.2 Backend migration still precedes compatible Web in FairSwapTest; run existing CI and automated authenticated hosted Test acceptance before selective Production and automated postflight. Production remains blocked on that hosted acceptance. No Git command, deployment, manual/exploratory or owner predeployment testing occurred here.

Rollback this delta by scoped revert/previous Web deployment, retaining all server data/protection metadata and migration history. The prior V2.1.2 baseline lacks the real blank-preparation path/native CI coverage but keeps safe explicit recovery. No schema rollback, ID resurrection or protection downgrade is needed. Owner Production availability checks use automated authenticated journey/health/error evidence after an authorized release.

---

## Prior V2.1.2 candidate record (superseded above for native coverage and preparation reachability)

# Post Ad V2.1.2 — upload-session lifecycle correction

2 November 2026. Includes the owner-approved automatic-rotation amendment. Local candidate, not deployed. Owner-confirmed FairSwapTest evidence: one seller has five active sessions, four without photos. No hosted account/session data was queried here.

## Final behavior

- Page visits and local photo selection allocate no remote session. Explicit upload serializes the latest account-bound recovery write, then creates/reuses that UUID. One in-flight promise coalesces duplicate initialization; lost responses retry the same ID. Resume reads a known session without allocating one; entirely local/pending records wait for explicit upload. Continue and forward steps are disabled while the session is unavailable.
- Backend keeps the five-active-session limit. At capacity, a new request atomically retires the oldest SAFELY CERTIFIED blank owned session and inserts its replacement under the existing seller advisory lock and victim row lock. Failed replacement rolls retirement back. All operations remain on `posting_v2_session(uuid,text,uuid)` with its public invoker/private implementation and existing owner/account/policy/RLS checks.
- Safety does not depend on zero uploaded photos, elapsed inactivity or a browser heartbeat. New `draft_protected` defaults true for every legacy/unknown session and every ordinary upload allocation. Only `create_empty` can create a certified blank, under a fresh SERVER-GENERATED session ID distinct from the supplied owner-scoped request nonce. `claim_draft` must complete before associating meaningful local work with that ID; legacy create/read and all media/prepare operations also permanently protect it. A retry cannot downgrade protection. The normal Web upload path already has recoverable selected photos, so it uses protected `create`, never `create_empty`.
- A caller-supplied existing/local draft ID cannot be certified blank. Automatic eligibility also requires open/unexpired state, a server empty-allocation certificate and NO media history, including removed/uploading rows. Photos, active uploads, meaningful/unknown local drafts and finalizing/submitted sessions are preserved. The four historical no-photo sessions cannot be assumed safe: they remain protected until the seller explicitly reviews recovery. This is intentional.
- If all candidates are protected/unknown, HTTP returns `UPLOAD_SESSION_LIMIT` (429) and bounded current-owner recovery metadata. The UI distinguishes certified blanks from photo-free sessions whose local work is protected/unknown. A guarded, explicit, confirmed empty-only release remains available for a session the owner no longer needs. The warning covers other tabs/devices and preserves their saved fields. There is no automatic bulk discard or global draft search.
- Safe allowlisted codes also include `UPLOAD_SESSION_EXPIRED` (410), `UPLOAD_SESSION_PROTECTED` / `UPLOAD_SESSION_BUSY` (409) and `UPLOAD_SESSION_UNAVAILABLE` (503). Raw SQL errors/details/hints never reach clients; legacy capacity/expiry messages are recognized. GET lists owner metadata only; DELETE validates the UUID/origin/policy/account and delegates to atomic release.
- Upload failures retain sanitized blobs/IDs. A coded media expiry disables Continue. Expired drafts retain fields/photos until explicit replacement confirmation. Retry blobs get new media IDs; photos without a local copy must be re-added. Previous server photos are not deleted by this action and keep their original expiry policy. The recovery format/24-hour window, branding, tokens, layout scaffold and buyer preview remain existing behavior.

## Canonical migration and cleanup

Backend candidate: `supabase/forward-migrations/posting-v2/session-recovery/supabase/migrations/20261101234604_posting_v212_session_recovery.sql`. Its filename was CLI-generated in UTC; all original/applied foundation/activation files and the immutable 58-file set remain unchanged. Two additive session metadata columns and an owner/request index support conservative certification; no new table/RLS policy or direct client write grant is added.

Retirement creates an expired tombstone, never deletes a row or object in the allocation RPC, and never resurrects an old ID. A certified blank cannot have upload assets because trusted Storage writes require reserve, which protects the row first. The unchanged service-only cleanup can safely claim/ack the tombstone repeatedly. Replacement and committed listing media remain untouched. See Backend `session-recovery/README.md` for protocol and release details.

## Evidence and release boundary

Final local evidence is recorded in the ZIP: Web typecheck/lint, production webpack build without real environment files, focused unit tests and isolated Playwright checks; Backend disposable PostgreSQL security/RLS/contract tests, typecheck and immutable-manifest verification. No auth, category activation, moderation/finalizer, dependency, new environment variable, CI workflow, Git command or hosted operation. The wizard remains English. Local storage remains best-effort/device-local, not a new synced draft service.

ChatGPT owns independent review and delivery: the Backend forward migration to FairSwapTest first, compatible Web through existing CI → Staging/Test, automated authenticated hosted Test acceptance, then selective Production migration/Web delivery and automated postflight. Backend has no new staging branch. Preserve environment-specific histories and Test-only differences. Production promotion remains BLOCKED on authenticated hosted Test acceptance. No manual/exploratory or owner predeployment testing is requested.

Rollback: previous Web/Vercel deployment or scoped Git revert, retaining server data and the additive protection columns. If the private function needs restoration, use a separately reviewed forward-fix migration; never edit an applied file, rewind a ledger or resurrect retired IDs. V2.1.1 rollback reintroduces eager allocation. Owner Production checks use automated authenticated session/upload/recovery/submission, health and error evidence after authorized release.

NOT RUN: authenticated hosted Test/Production acceptance, native PostgreSQL parallel-connection races, the full disposable Supabase/pgTAP stack, physical-device benchmarks or screen-reader certification. SQL tests execute real migrations/functions/roles in PGlite with explicit auth/storage/status fixtures; concurrent driver requests are serialized by that engine. Browser tests use real components with intercepted synthetic APIs/system fonts. They are not hosted RLS acceptance. Production build retains the actual font setup.

---

## Historical V2.1.1 record

# Post Ad V2.1.1 — stepper feedback hotfix

1 November 2026. This correction supersedes the V2.1 locked-step feedback described below.

- Native `disabled` and an inert handler guard prevent future-step pointer, keyboard and synthetic activation. Locked activation neither changes step nor validates, adds errors, programmatically focuses a field or scrolls.
- Continue parses only the current step's canonical Zod fields and related catalogue/media/cross-field rules. Concise inline errors focus the first invalid field; the full-form yellow summary is removed. Existing styles, layout, logo, Manrope, buyer preview and completion calculations are preserved.
- Review and Submit still run the full canonical schema plus catalogue and media readiness checks. An invalid earlier step receives focus and only that step's inline errors. Server issues are similarly limited to the earliest affected step. Server validation, auth/RLS and session/upload retry boundaries are unchanged.
- Recovery, saved fields/media, session IDs, previous-step editing and submission uncertainty handling remain unchanged. Tests cover native disabled state, repeated pointer/Enter/Space activation, tab order, no locked-step feedback/scroll/geometry changes, local Continue feedback, backward invalidation, recovery and real upload retry/sequential Review.

Only Web source, regression tests and required documentation change. No migration, dependency, environment, CI workflow, Git command or hosted operation. The archive includes exact task-start filesystem diffs, before/after hashes and command logs. Production/source parity is not established by the local snapshot.

After review, ChatGPT owns branch `fix/post-ad-v211-stepper-feedback`, commit `fix(post-ad): prevent locked-step error flooding`, a PR to `staging`, existing CI and staging checks, then selective updates to draft Production PR #305. Production promotion remains blocked on authenticated hosted Test acceptance. This task performs no GitHub or deployment action. No owner predeployment testing is requested. Production post-release checks use automated authenticated journey/health/error evidence. Rollback is scoped Git revert or the previous Vercel deployment; no database rollback.

Final local results: PASS typecheck; PASS lint (zero errors, three pre-existing warnings); PASS 94 focused unit tests across nine files; PASS seven isolated Playwright cases; PASS production webpack build. Detailed results and limits are in the ZIP `_handoff/TEST-EVIDENCE.md`. Existing isolated browser tests use real components with fixture auth/catalogue/APIs and system fonts; the production webpack build preserves the real Next configuration and fonts. They do not establish authenticated hosted Test acceptance, physical-device performance or screen-reader certification. The wizard remains English.

---

## Historical V2.1 record

# Post Ad UX V2.1 corrective patch

1 November 2026. The correction below supersedes the V2 photo-skipping and recovered-step behavior described in the historical implementation record below.

- `.journey` now uses explicit full width, a 1160px maximum, horizontal-only auto margins and top anchoring. Account content permits shrinking without horizontal overflow. Filtered/empty category search shares the default grid and side-panel scaffold.
- Current canonical Zod results plus catalogue membership, conditional warranty, selling-price and photo readiness checks govern progression. Forward navigation validates every preceding step; backward editing remains available. Errors focus the first invalid field, including step-link and summary navigation. Completion indicators reflect current validity; changing earlier details invalidates later access. The validation summary sits below the stepper; the mobile heading reserves equal space for numbered steps and Review.
- Resume retains all data, photo retry blobs/IDs and session UUID, but starts at Photos. Stored step numbers grant no access. Final Review/submission still validates the full schema and media state; existing server authorization, upload/retry and submission code remain authoritative.
- Updated automated regressions remove intentional photo skipping and cover blank jumps, incomplete details/focus, completion invalidation, giveaway/warranty/price/PIN gates, sequential Review, stale recovery, real compression/upload failure/retry, category search `ip`/`iph`/clear/empty, responsive geometry, keyboard controls and reduced motion.

No Git commands or hosted operations were run for V2.1. Baseline is the task-start local filesystem V2 source; latest approved Production parity is NOT VERIFIED. The archive's unified diffs and SHA-256 manifest identify the exact task-start and corrected bytes. Real environment files, dependencies, generated outputs and unrelated changes are excluded.

Delivery remains existing GitHub CI → Staging/Test (FairSwapTest) → automated verification → selective Production (FairSwapProd) → automated post-deployment verification. ChatGPT owns all GitHub/release operations. No migration or environment step. Rollback: scoped Git revert or previous Vercel deployment. Owner Production checks use automated health/journey/error evidence; no owner predeployment testing is requested.

Final local results: PASS typecheck; PASS lint (zero errors, three pre-existing warnings); PASS 92 focused unit tests across nine files; PASS seven Playwright tests; PASS production webpack build in an isolated copy without real environment files. Detailed command results are recorded in the archive `_handoff/TEST-EVIDENCE.md`. Fixture tests use real components with intercepted APIs and system fonts; they do not establish hosted acceptance, device-performance benchmarks, assistive-technology certification or Hindi localization (this wizard remains English). The production webpack build retains Manrope and the existing font setup.

---

## Historical V2 implementation record

# Post Ad UX V2 — local implementation handoff

1 November 2026. Local source implementation, not hosted acceptance. Modern Expressive V1.2 is the visual reference; its mock data and standalone runtime are not imported into production.

## Meaningful changes

- The new-listing page uses existing FairSwap logo, Manrope setup, Lucide icons and scoped semantic styles. Shared theme/font/header source is unchanged. The browser title is “Post an ad | FairSwap.in”.
- AccountChrome renders a compact branded posting header and skip link only on the creation pathname/subpaths. Other account pages retain Header and AccountNav. MobileBottomNav already excluded creation and is unchanged.
- The category selector still consumes POST_AD_CATALOGUE, resolveSub and server-derived capabilities. It adds premium category cards, searchable results, an inline desktop panel and a native mobile sheet with Escape/focus return. No category is enabled by presentation. Unsupported choices, seller-draft-only labels, policy guidance and exact family/path readiness remain authoritative. Planned trust-promotion copy and the “existing posting form” developer notice are removed; current disclaimers and fraud advice remain.
- MobilePhoneForm now presents Photos → Phone details → Condition → Price → Location → Review. The responsive buyer preview is rendered once: sticky on desktop, shown at review on mobile. Editing steps remain mounted so uploader/resolver state survives navigation.
- New drafts have no preselected brand, model, storage, RAM or condition. Single searchable brand/model comboboxes consume the real server catalogue. Brand changes clear model. Storage/RAM remain seller-declared, not verified variants. Auto-title uses brand + model + storage + condition, avoids a repeated brand and supports manual override/reset.
- Photo selection uses a custom accessible surface over the real file input and existing compressor. Local sanitized blobs provide revocable previews before upload. Existing multipart upload/retry and DELETE paths remain; failed deletion does not remove the UI photo. Operations are guarded against duplicate activation. Active uploads are not prematurely failed by a focus refresh; remotely removed photos are not revived.
- Photos can be skipped during editing. Final review and submission require 1–8 distinct ready photos with no unfinished uploads. Giveaway forces zero price/non-negotiable; the Negotiable switch, accessory grid and conditional warranty preserve the canonical submission shape.
- Existing PIN lookup, stale-response cancellation and hidden form fields remain. Optional error descriptions connect wizard validation to PIN/locality controls. Buyer preview uses approximate locality/city only; no residential address input is introduced. IMEI/authenticity verification is not claimed.

## Recovery and lifecycle compatibility

IndexedDB database/keying, account ownership and the 24-hour recovery window are unchanged. Recovery version remains 2. The compatible client schema permits genuinely blank storage/condition and adds optional step (old records default to Photos).

A valid recovered draft is not displayed, overwritten or used to initialize a remote session before Resume or Start fresh. Resume retains the session UUID, manual-title state, fields, current step and sanitized retry blobs/photo IDs. Interrupted uploads become retryable. Start fresh creates a new UUID and replaces local recovery only after that explicit choice; it does not delete a remote listing/session.

Initialization is account-scoped, with an Effect Event reading current dependencies, so updated router/catalogue references do not reset edits. Step/error focus is applied with the rendering commit, not timers that can steal focus from fast typing. Comboboxes support aliases, arrows, Home/End, Enter, Escape, Tab and pointer selection while retaining input focus.

Writes are serialized. The save indicator compares the current values to the successfully saved snapshot. Normal route exit flushes the latest authorized record without waiting for the debounce; pending recovery never flushes. Submission blocks duplicate activation, validates the full canonical schema, preserves the session after rejection/uncertainty and drains pending saves before clearing recovery. A completed submission is not resurrected by an unmount/autosave callback. Abrupt browser/process termination can still lose a last in-flight local write; device storage is best-effort and not account-synced.

## Boundaries unchanged

No API/Server Action handlers, Supabase client/auth behavior, RLS/RPC, moderation, policy/account/maintenance gates, backend contracts, migrations, environment files or dependency versions changed. `mobileSchema`, `mobileTitle`, catalogue loaders, postingGuard and posting-recovery storage/compressor remain existing contracts. The server still validates catalogue membership, media readiness, content risk and authorization independently of the UI.

Existing feature flags/readiness determine whether the new selector and phone journey are available. This change does not activate disabled categories. Flag-off legacy creation and other category forms retain their existing contracts. No new environment variable or migration is required.

## Automated evidence

Commands and final results are also recorded in the ZIP handoff:

- PASS: `corepack pnpm typecheck --incremental false`.
- PASS: filesystem-only documentation link/retired-gate check for 10 selected Markdown files, including this new handoff.
- PASS: `corepack pnpm lint`; zero errors, three pre-existing warnings in the production-family boundary test and unchanged standalone prototype. No warnings were silenced.
- PASS: focused Vitest suites for the wizard, controls, uploader, submission boundary, canonical mobile contract, media processing/recovery, category readiness, page auth/loading, PIN picker and mobile navigation. 146 tests across 12 files pass in the final focused run.
- PASS: `node tools/post-ad-v2/verify.mjs`: five Playwright cases with real route/component source, light/dark × mobile/desktop journeys, plus 50 wizard and 10 category viewport/theme combinations at 360, 390, 768, 1024 and 1440px.
- Browser assertions cover protected recovery/session reuse, actual browser PNG→WebP compression, multipart media IDs/types, upload failure/retry, PIN resolution, manual/auto title, price/switch, the photo review gate, one preview and retained details after submission rejection. All fixture requests stay local/intercepted.
- Custom accessibility-oriented browser assertions cover names/labels, valid ARIA references, unique IDs, sheet Escape/focus return, active-descendant keyboard selection, 16px inputs, 48px primary controls and reduced-motion preference. Eight semantic text/background contrast assertions pass at 4.5:1 or better.
- PASS: optimized `corepack pnpm build --webpack` in an isolated full-source copy without real environment files, using the unchanged production Next configuration and real next/font setup. Google font downloads needed approved network access. Source/test/mirror dependencies were included; no build/type check was bypassed. MetadataBase warnings reflect the deliberately unset public-site configuration in that copy.

NOT RUN: hosted authenticated upload/submission, RLS/database integration, Test/Production acceptance, screen readers, other browser engines, full rendered contrast/visual certification. axe-core and @axe-core/playwright are unavailable; custom assertions are not a full WCAG audit. The fixture browser deliberately uses system-font fallback; the optimized application build includes the existing Manrope/Devanagari font setup. Default Turbopack build was not run; webpack production compilation was used for the isolated symlinked dependency workspace.

Initial checks exposed old UI assertions, a client import of a server-only maintenance module, missing isolated-build dependencies, fixture control selectors/invalid PNG and a real delayed-focus race. These were corrected and the affected checks rerun. React Compiler memoization dependency errors were also resolved without disabling lint rules. No failure was converted into a passing check by weakening schema/readiness/security assertions.

## Browser fixture safety and reproducibility

`tools/post-ad-v2/verify.mjs` creates a disposable source copy under the OS temporary directory, refuses to reuse an occupied port 4318, and starts Next only on loopback. It copies no real environment files. Only that temporary copy replaces auth/catalogue responses, disables the proxy/backend network boundary, uses font fallback and replaces all API routes with a fail-closed catch-all. Playwright supplies explicit local session/media/PIN/submission responses. None of those fixture substitutions is a production source modification.

Run from the repository root with installed dependencies and Chrome/Playwright Chromium. Optional Playwright arguments may follow the script, for example `--grep light/1440`. It uses a separate browser config and is not automatically added to GitHub Actions. ChatGPT can integrate the documented command into existing pipeline verification without weakening gates.

## Source preservation and integration

No Git mutations, fetch/pull, branch operations or hosted/deployment actions were performed. The existing documentation checker inadvertently invoked read-only `git ls-files` once; this violated the no-Git-command constraint and was disclosed. Subsequent documentation checking uses a filesystem-only copy of the checker against the selected active guides and this new handoff; the repository checker itself was not changed. Before editing, primary application files matched their local index blobs, inspected directly without Git commands. This does not establish staged-versus-HEAD status or a synchronized remote base. Saved pre-edit originals and hashes are local-only under `/private/tmp/fairswap-v2-baseline`. The archive diff is against that task-start filesystem snapshot, not an invented Git base. Existing standalone prototype and unrelated source are preserved.

The implementation ZIP contains all modified/new source, tests, tool and documentation with repository-relative paths, plus `_handoff` manifest, patch and verification notes. It is applied to this existing repository; unchanged shared contracts, logo, font setup and dependencies remain repository prerequisites. No environment files or generated build output are packaged.

## Delivery order and rollback

ChatGPT owns GitHub integration. Use the existing pipelines: GitHub CI → Staging/Test → automated verification → Production → automated verification. Keep existing flags/backend readiness and all CI/security gates; do not merge staging wholesale into main. No migration/environment step is planned.

Environment verification should exercise authenticated creation, real media/PIN resolution, recovered drafts, maintenance/account/policy denial and final server submission/moderation on the authorized target. Source/fixture success is not hosted acceptance. No manual/exploratory testing or owner predeployment test is requested. Owner Production availability checks after release should use automated journey/health/error evidence for creation, uploads and submission.

Rollback is git revert of the scoped presentation/recovery change or the previous Vercel deployment. No database rollback is required. Existing version-2 recovery remains readable by old code for fully populated drafts; old code will discard new incomplete blank-condition/storage records because its schema did not permit them. Unsaved draft continuity is therefore a documented rollback limit; no submitted listing contract changes.
