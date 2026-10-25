# Homepage and location discovery — local candidate, 25 October 2026

Web-only portable release isolated against `93163a7cac11ac7b49f641fc3853d5ce9ebde8cb` in a detached local worktree. Concurrent account/profile, taxonomy, moderation, policy and independent copy changes are excluded, including mixed hunks in shared files. The original dirty checkout is preserved. No branch, commit, fetch, PR, Actions change or hosted write was performed.

## Implementation and files

- `src/app/page.tsx`: compact discovery → live categories → recent approved inventory → one safety reminder → three exchange steps. Existing header/account controls and footer are reused unchanged.
- `src/components/listings/HomeDiscovery.tsx`: live active taxonomy supplied by `getPublicCategories`, outline icons, responsive 3/4/6/7-column grid, first eight entries on mobile with expansion. Category slugs/IDs are never invented. Active seeds appear only when their separate taxonomy rollout permits them.
- `DiscoveryLocationSelector.tsx`, `SearchLocation.tsx`: shared, native keyboard-accessible disclosure, explicit choice buttons, debounced/cancellable name/PIN lookup, explicit-consent GPS, error fallbacks and coarse preference. Search URLs take precedence, including `/search` with no area. Homepage explicit location parameters override saved preference. Saved IDs are revalidated through public references; expired, malformed or unavailable preferences fall back to All India without automatic navigation.
- `src/lib/location/{discovery,public-areas,reverse-geocode}.ts` and `src/app/api/location/{areas,reverse}/route.ts`: bounded reference-table lookup, existing `lookup_pincode`, strict input/provider response validation and server-only reverse geocoding. No listing table, private seller PIN, landmark, radius or precise location history is involved. Both APIs use no-store responses. Coordinates travel only in a same-origin JSON POST to FairSwap and a transient server request to Google; they are never returned to the browser or saved by this code. Google receives them to perform the requested lookup. Configure hosting/APM to exclude request bodies and upstream geocoding URL query parameters from capture.
- `src/app/search/page.tsx`: explicit scope selector; locality → district → All India links retain keyword/category/condition/price/sort and reset pagination. Invalid/duplicate filters fail closed. An RPC error is shown as unavailable rather than zero inventory; `queries.ts` and `types/listing.ts` carry the optional error marker. Keyword trimming uses the shared Zod contract.
- `RecentListingsSection.tsx`, `RecentListingsSkeleton.tsx`: approved wording, compact spacing/mobile grid, reduced-motion skeleton. Existing optimized listing media remain in use.
- Tests: homepage and recent inventory regressions plus `home-location-discovery`, `location-discovery-api`, and `search-location-scope` under `tests/unit`.

Name matches retain their actual administrative meaning: districts are explicitly labelled as districts; locality context includes district/state. No guessed metropolitan mapping. PIN/GPS candidates require a click to confirm; choosing a district deliberately searches that whole district. The UI never claims exact-PIN or distance-ranked results. A name or incomplete PIN alone never navigates.

## Privacy and provider configuration

Only public district/locality UUIDs and a 30-day expiry are stored under `fairswap.public-area.v1` in localStorage. No login, PIN, coordinates, address or location history is stored. All India removes the preference. The selector gives a just-in-time explanation before the user invokes browser permission, names Google as the recipient and offers manual entry at all times. This implementation does not certify legal compliance or third-party retention practices.

New server-only environment variable in **both** environments: `GOOGLE_GEOCODING_API_KEY`. Do not use a `NEXT_PUBLIC_` name. Separate environment keys/projects are recommended. Enable Geocoding API v4 with billing and restrict each key to that API, configure quota/billing controls and abuse protection for POST `/api/location/reverse` through the existing hosting controls. The adapter uses Google v4 `results.addressComponents`, country `IN`, valid Indian postal references, or exact district + state matches. Provider docs: <https://developers.google.com/maps/documentation/geocoding/reverse-geocoding>.

**Configuration blocker:** credentials, billing/API enablement, key restrictions, provider privacy/terms review, telemetry redaction and hosted quotas have not been configured or verified here. GPS deliberately returns an actionable 503/manual fallback when the key is absent. Manual name/PIN discovery has no new credential requirement. No claim is made that hosted GPS is operational.

## Staging and production delivery

No Backend migration, RLS/grant change, generated database type regeneration or Backend pin/Actions change is required. Existing public `cities`, `localities`, `lookup_pincode` and privacy-preserving `search_public_listings` contracts are reused. Backend was inspected read-only. The separate India taxonomy seed/activation dependency remains governed by its existing runbook; this feature does not activate anything.

1. ChatGPT verifies the full base SHA and original blob SHAs in `manifest.json`, applies `feature.patch`, then copies `new_files/` into the repository root. Do not apply the dirty checkout wholesale. Initial Web PR targets `staging`; proposed branch `feat/homepage-location-discovery`, commit `feat(web): redesign homepage with location-aware discovery`. Reconcile only this feature with staging differences.
2. Configure the server credential and provider controls for Web staging / FairSwapTest (`wpppxlnbzqynvhpeuavd`), deploy through existing Web pipelines, retain lint/typecheck/build and relevant automated regression checks. No schema apply is needed.
3. Configure the independent Production credential/controls, promote only the approved feature subset in a main-based release to `main` / FairSwapProd (`kriuhwppxgxsyyrbjsau`). Never merge all staging/Test-only code into Production. No manual owner testing gate is introduced.
4. Owner postdeployment inspection: normal 320–390px use and keyboard navigation, real active categories, approved listing media/prices, account/messages/favourites/Post Ad controls, URL Back/Forward and filter retention, PIN ambiguity/district wording, permission/provider errors, area clearing and cold-start widening; inspect privacy/availability/cost telemetry without collecting GPS. These are production checks, not a request to test before deployment.

Rollback: revert only the feature or restore the previous same-environment Vercel deployment; remove the geocoder key to disable GPS. No database rollback or taxonomy deactivation is part of this feature.

## Isolated release verification — 25 October 2026

PASS: the feature-only candidate at `93163a7cac11ac7b49f641fc3853d5ce9ebde8cb` passes `corepack pnpm typecheck`, `corepack pnpm lint` and `corepack pnpm build`, plus 158/158 focused tests across ten files. Lint retains one baseline unused-variable warning in `tests/unit/production-family-submission-boundary.test.ts:86`. The build used loopback URLs, no real env files or hosted credentials; it completed with metadataBase warnings and the expected failed dynamic sitemap enrichment without a local database.

The portable patch applies cleanly to a second detached base worktree. `manifest.json` enumerates all 24 feature paths, original/result blob SHAs, source SHA-256 hashes and individual tracked diff-hunk headers. `feature.patch` contains 12 modified tracked files only; `new_files/` supplies the 12 new files. No dependency, cache, environment file, SQL migration or GitHub Actions change is bundled.

The original dirty-tree account/profile type failure is excluded from this candidate. GPS credentials/provider configuration and hosted acceptance remain outstanding. No manual/exploratory testing was performed. Release metadata in the ZIP records final replay, archive and preservation checks; only that isolated evidence supersedes the earlier dirty-tree handoff results.
