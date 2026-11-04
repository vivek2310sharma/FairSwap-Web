> Integration addendum — 3 November 2026: the [pinned-baseline combined supplement](TABLETS_V1_INTEGRATION.md) supersedes this earlier archive’s local-preimage integration instructions. Original feature decisions and dated evidence below remain historical.

# Tablets Post Ad V1 local candidate — 2 November 2026

Web owns the versioned tablet wizard, strict request validation, cookie/session/media integration and buyer projection. Backend owns catalogue, category-bound photo sessions, immutable typed disclosures, RLS and atomic submission. Existing Mobile Phones V2 remains a separate contract. No GitHub operations, hosted SQL or deployments were performed.

## Files and reuse

- `TabletForm.tsx` and `posting/tablet-wizard.ts` reuse the current phone wizard interaction, CSS, searchable combobox, uploader, approximate location picker and buyer preview. Five entry steps plus Review; versioned 24-hour owner-scoped IndexedDB key `${owner}:tablets-v1` preserves the phone recovery key.
- `tablets/contract.ts`, `server.ts`, `public.ts`, dedicated tablet session/submission routes, category capability wiring, buyer details and seller edit display retain approved tablet facts. Generic edits cannot change category or contradict the retained condition. Tablet declarations are immutable after submission; changing these declarations requires a new typed posting in V1.
- Discovery cards receive storage, connectivity and functional disclosures through the existing public projection loader. Existing search category/price/location filters remain; separate tablet storage/connectivity search facets are deferred.
- A narrow existing Accessories filter schema fix replaces an unknown-input preprocess with an explicit empty-string transform. It preserves parsing behavior while fixing native input/URL TypeScript errors.

## Database and trust boundaries

Backend foundation: `supabase/forward-migrations/tablets-v1/supabase/migrations/20261102165946_posting_v2_tablets.sql`.
Separate activation: `supabase/forward-migrations/tablets-v1/activation/supabase/migrations/20261102170611_activate_tablets_v1.sql`.

The foundation defaults disabled. It requires installed Posting V2 plus V2.1.2 recovery; no historical migration is edited. It adds tablet brands/models, release gate, session bindings and typed public contexts. Tablet sessions are bound at allocation and cannot adopt phone sessions, including photo-free phone drafts. The shared media API and cleanup contracts remain. Phone finalization keeps its installed implementation behind a binding-check wrapper; the 57 phone database regressions are run with the tablet migration installed.

RPCs check active account/current policy, owner, category gate, model/variant compatibility, lock eligibility, text/privacy/payment abuse, price/location and owned ready media. Submission is atomic, locked and idempotent. Reference/context/session writes are denied to clients; public context reads enforce public visibility or owner/staff authorization. Public projections contain no upload-session IDs, precise location, IMEI, full serials or passwords. Unresolved Activation Lock, FRP and management locks block publication; drafts remain recoverable. Non-working / parts-only posting is intentionally blocked pending a parts policy. Other models, uncertain variants and functional uncertainty require staff review; no checkbox grants verified status.

## Configuration and release order

New server-only variable: `POST_AD_TABLETS_V1_ENABLED=false` by default. Existing `POST_AD_MOBILES_V2_ENABLED` and installed/enabled phone catalogue remain prerequisites for the shared media infrastructure. No new secrets, dependencies, runtime keys or CI workflows.

ChatGPT delivery owner must reconcile pre-existing local Accessories and Posting V2.1.2 dependencies before applying the tablet patch. Coordinate the Web Backend-materialization pin and any consuming checkout/mirror guards to the approved Backend release commit; no pin or Actions file was changed here. Verify exact environment history and existing release authority; never apply the raw historical migration directory. The tablet release is not authorized by the separate Chat release workflow.

1. Retain existing CI gates; add the recorded tablet verification commands to the applicable existing release checks (Actions edits remain with ChatGPT).
2. Deploy the reviewed additive foundation to FairSwapTest, then the matching Web staging candidate with the flag off.
3. Apply separate tablet activation in the isolated Test release package, enable the Web staging flag, and run authenticated automated posting/media/buyer/lifecycle verification with disposable fixtures and cleanup.
4. After passing CI and automated Test acceptance, selectively release Backend foundation/activation and matching Web changes to Production, enabling its flag only when both sides are ready. Do not merge Test-only staging code wholesale. No owner predeployment testing is requested.
5. Run authorized automated Production smoke checks; owner production responsibility is confirming category availability and expected functionality after deployment.

Rollback: disable the Web flag and Backend tablet release gate; revert/select the previous Web deployment. Keep existing contexts/media and applied schema. Use a reviewed forward fix for DB changes, never edit migration history or delete listing data. Existing phone submissions remain supported.

## Evidence limits

Local tests do not establish hosted acceptance. SQL runs use disposable PGlite with real migration/RPC bodies and fixture auth/storage/visibility helpers; they do not prove full hosted moderation, native PG17 concurrency, RLS integration with every historical migration, or actual storage/network behavior. Browser runs use real components and mocked APIs in isolated temporary Next apps without real environment files. Hosted Test/Production checks and native clients are NOT RUN. English is V1; no Hindi tablet-flow translation is claimed.

Catalogue: six exact reviewed model entries plus guarded Other per brand (11 brands). This is deliberately a curated seed, not an exhaustive catalogue. Sources: [Apple model identification](https://support.apple.com/en-euro/108043), [iPad 9](https://support.apple.com/en-us/111898), [iPad 10](https://support.apple.com/en-us/111840), [Air 5](https://support.apple.com/en-ph/111887), [mini 6](https://support.apple.com/en-ie/111886), [Pro 11 generation 3](https://support.apple.com/es-la/111897), [Samsung Tab A9](https://www.samsung.com/in/tablets/galaxy-tab-a/galaxy-tab-a9-lte-graphite-64gb-sm-x115nzaains/). RLS reference: [Supabase documentation](https://supabase.com/docs/guides/database/postgres/row-level-security). The changelog markdown fetch was unavailable in this environment; no SDK/API migration was introduced.

Exact results and file hashes are supplied in the handoff ZIP manifest and test logs.

## Recorded local verification

PASS: TypeScript; ESLint (zero errors, three existing warnings); 215 Vitest tests across 16 selected suites; 8 tablet Playwright journeys at 320/360/390/768/1024/1440 pixels; 15 existing phone browser regressions; 22 tablet SQL checks; 57 phone/session SQL checks with tablet foundation installed; 58 immutable migration checks; docs link checks; environment-free `pnpm build --webpack`; task-only patch application checks.

The default Turbopack build in the temporary source copy could not resolve its dependency symlink outside that filesystem root; the supported webpack production build passed. A concurrent Accessories test briefly blocked an intermediate build and was left untouched; final working-tree TypeScript and selected Accessories regression checks pass. No hosted/native-PG17 claim follows from these results.
