# Step 7 — Navigation implementation (PR #175)

## Scope

Improve Web navigation without changing Supabase schema, RLS, Auth, payment, media routes or mobile-app API contracts.

- Homepage quick search uses Next.js Form to navigate to `/search?q=...`.
- Header section links point to homepage anchors from any route, on desktop and mobile.
- Search results pass the **validated, canonical** query/filter/sort/page context to a listing card. The card stays linked to its actual slug, whether or not context can be attached.
- Listing details resolve the Back to Search destination exclusively through `getBackToSearchHref`. No arbitrary return URL or untrusted redirect is accepted.
- Context uses a recognized-key allowlist, existing Zod search schema, duplicate rejection, a 2,000-character bound, and a fixed `/search` fallback.
- Filter inputs remount when the canonical URL filter context changes, including browser Back/Forward, without introducing render-phase state updates.
- Search has a lightweight loading UI aligned with current FairSwap branding.

## Scope exclusion and release evidence

- No Step 7 E2E test, seeder, WebSocket polyfill, new test dependency, or new test-specific CI step.
- Pre-existing mainline CI workflows and security checks are preserved.
- The only existing assertion updated is the header anchor destination expected by the existing header component check. No new tests are added and no tests are executed for this task.
- **Automated behavior verification: NOT RUN at the owner's direction.** Builds and preview statuses must be reported only for the exact pushed revision if available.
- This PR is not approval to merge, deploy, alter hosted configuration or modify production data.

Rollback: revert the scoped navigation merge commit if not released; after release, use an owner-approved focused rollback.
