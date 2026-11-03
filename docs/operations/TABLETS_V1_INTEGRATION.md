# Tablets V1 integration supplement — 3 November 2026

This candidate is reconstructed from exact GitHub source archives, not the dirty local preimages in the original tablet ZIP. It preserves the completed tablet feature while including its missing dependency closure. No commit, branch, push, PR, GitHub Actions change, hosted query, migration application or deployment was performed.

## Exact source bases and scope

- Web staging: `bc08e2987fbef22f9e08841f4ef4a247756c79b9`.
- Backend main: `1d4059ad11026154923ee8b5874d64b98584b351`.
- Source archives were read with GitHub's authenticated read-only API; existing Git refs and dirty working repositories were not changed.
- Posting V2.1.2 is already present at both pinned bases. Its phone form, mobile wizard, mobile contract/server/recovery/session sources and approved phone submission HTTP route are retained byte-for-byte. They are reused prerequisites, not missing exports.
- Missing Web exports include `src/lib/listings/prepare-posting-media.ts`, Accessories form/domain/public/search/API modules, shared preview/uploader extensions, buyer/card/search/category integration, browser fixtures and the related tests. The supplementary manifest enumerates every source file and base/final Git blob ID.
- Backend adds Accessories foundation/activation/taxonomy/tests, the tablet artifacts, and combined/wrapper/native regression runners. Historical SQL and the existing Posting V2.1.2 recovery migration remain unchanged.
- Staging's CardPhoto gallery, device favourites contract and discovery schema-compatibility code are retained. ListingCard receives only accessory-condition/fact hunks; discovery queries receive only the accessory search branch. Unrelated local homepage/auth/favourites changes and local policy/Actions edits are excluded.

The tablet form, wizard, contract, routes and public modules match the original tablet archive byte-for-byte. The tablet foundation is superseded only for the integration correction below; it has not been applied by this task. Do not replace an already-applied migration; if any target has applied the earlier tablet candidate, stop and prepare an authorized forward-only correction instead.

## Phone SQL compatibility correction

The earlier tablet candidate renamed `app_security.impl_submit_mobile_v2(jsonb)`. The integration candidate instead copies the installed definition into a private delegate using `pg_get_functiondef`, preserves that delegate's owner/body/configuration, and replaces the implementation in place. The implementation OID, argument names, public wrapper definition and public dependency identity remain stable. The copied delegate has no PUBLIC/anon/authenticated/service-role EXECUTE grant; the protected implementation retains the established authenticated entry point.

The tablet wrapper checks the actor and tablet binding before delegation. The preserved Accessories implementation still rejects an accessory submission masquerading as a phone retry. Both source drift and unsafe release order fail closed:

1. Accessories foundation requires the known original phone implementation before replacing it with its compatible accessory-retry guard. It refuses to overwrite an installed tablet wrapper or any divergent phone body.
2. Tablet foundation permits the reviewed original implementation or the reviewed Accessories implementation, plus the unchanged approved public wrapper; unexpected definitions or an existing delegate abort the entire transaction.
3. A read-only receipt query is included at Backend `supabase/forward-migrations/tablets-v1/phone-preflight.sql`. Before a hosted release, the authorized operator captures owner/ACL/config/body evidence, compares it with the expected hashes in the supplement, and resolves any mismatch. The implementation does not assume that repository source proves the current hosted body.

Local tests prove stable OID/public definition/delegate body/owner/grants; rejection through a cached prepared public call and the direct implementation; transactional rollback on implementation/public-wrapper drift; rejection of reverse foundation order; and real PG17 concurrent phone submission/lost-response retries after both foundations. Supporting auth, visibility and storage tables in these tests are synthetic fixtures, not a hosted Supabase rehearsal.

## Verification

On the exact combined source: Web and Backend TypeScript PASS; Web ESLint PASS with one pre-existing warning; 218 feature/regression Vitest tests, 6 media-helper tests and 120 staging gallery/favourites regression tests PASS; 19 phone/Accessories plus 8 tablet Playwright tests PASS; PGlite suites PASS (57 phone/session, 29 Accessories, 22 tablets, 5 wrapper/drift checks); native PostgreSQL 17.6 PASS (13 unchanged baseline checks, 14 combined concurrency/submission checks). Production `corepack pnpm build --webpack` PASS in the environment-free candidate. The production source/font configuration was not weakened. The webpack option is used because the temporary source copy links an existing dependency directory outside Turbopack's root.

No new dependency or package/lockfile/config changes are required. Browser checks use real components and intercepted APIs in isolated temporary apps; no synthetic ads or notifications were sent to hosted systems. Hosted CI, actual Test/Production function-body receipts and authenticated deployed lifecycle checks remain NOT RUN.

## Integration and release owner instructions

The combined patches supersede the original tablet patches. Start from the exact base SHA for each repository and apply its combined patch once, or perform a reviewed three-way merge using the included base blobs and index hashes. Do not apply both the original tablet patch and the combined replacement patch, and do not copy entire local snapshots over unrelated GitHub source. Verify manifest hashes and run all recorded commands before committing. ChatGPT owns all commits, PRs, CI wiring and release operations.

Retain all existing CI gates. Add the supplement's verification commands to the existing applicable reusable gates, including explicit combined SQL flags and the native runner. No workflow is changed or run by this task. The current Web materialization pin remains `b3d7eae6cb3eaeaf4fc2f4c2a4d288b69aa62367`; coordinate approved Backend commit/checkout pins and mirror guards through ChatGPT. Do not relabel a checksum or advance a pin to an uncommitted local tree.

Environment change: `POST_AD_TABLETS_V1_ENABLED=false` initially; existing `POST_AD_MOBILES_V2_ENABLED` remains the shared HTTP/media flag. No new secret. Database release gates independently control Accessories/tablets availability.

Release order: verify each environment's actual ledger and phone-body receipts; reconcile already-installed Posting V2/V2.1.2 without reapplying history; Accessories foundation **before** tablet foundation; matching Web staging with tablet flag OFF; reviewed separate Accessories/tablet activation and flag enablement; authenticated automated FairSwapTest posting/media/retry/recovery/buyer/moderation verification; only then selective Production release and automated postdeployment verification. Existing scoped release authority must be used; the Chat release exception does not authorize this feature. Never merge staging wholesale into Production or apply the raw historical migration directory. No owner predeployment testing is requested. Owner production checks follow deployment.

Rollback: disable tablet server flag and category gate; disable Accessories gate if rolling back that feature; select the previous Web deployment. Preserve existing listings, contexts, sessions/media and applied schema. Any database recovery is a reviewed forward fix. Foundation order and preserved phone delegates must be considered in every later release.

Catalogue remains a pilot: six exact tablet model seeds plus guarded Other across eleven brands. Native-client parity and separate tablet storage/connectivity search facets are not added. Tablet typed declarations remain immutable after submission; legacy common edits cannot alter category or contradict the stored condition.
