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
