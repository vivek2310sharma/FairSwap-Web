# Homepage 4.4 ZIP integration review — 1 November 2026

**Status: REVIEWED PACKAGE; SOURCE NOT INTEGRATED, NOT DEPLOYED.**

Review of owner-supplied `FairSwap-Homepage-4.4.zip` (SHA-256 `246adcf1c710f22b5b78c985782cfa0972551d6989892be5e17022871d5add22`). ZIP CRC/path safety PASS. 43 entries: 14 modified-file patch targets, new source/test files, HANDOFF.md, 14 Playwright screenshots. No other assets or dependency/DB migration included.

## Verified
- GitHub staging baseline remains `90a24326eea290b9dc4a8094ec9bcbbe3780eb13`; submitted local HEAD `838c372` is **15 commits behind**. Patch is against a dirty pre-task snapshot, NOT clean staging. Never overwrite current staging files with the ZIP's full copies.
- Supabase read-only metadata in FairSwapTest (`wpppxlnbzqynvhpeuavd`) and FairSwapProd (`kriuhwppxgxsyyrbjsau`) confirms RLS enabled on public `listing_media`, `listings`, `user_accounts`. Both public `is_listing_publicly_visible(listing_id uuid)` functions delegate to `app_security.is_listing_publicly_visible` and check active listing, expiry, active seller.
- Read-only Test-data count: **zero** approved active listings with 2+ ready thumbnails; Production currently has **two**. Therefore a true multi-photo staging/Test HTTP/browser check cannot be claimed without an appropriate reversible Test-only fixture.
- Claude-reported local checks: lint/typecheck/build PASS; Playwright desktop Chromium 68/68; 13 new gallery/card tests PASS; full unit run **2264 PASS / 10 FAIL / 138 SKIP**, with one claimed corrected project regression and remaining failures not independently baseline-verified. These are source-authored claims, **not** GitHub CI receipts.
- Existing staging GET `/`, `/saved`, `/search`: authenticated Vercel HTTP 200 before 4.4; does not verify 4.4.

## Corrections / release blockers before merging
1. **Hover-trigger contract.** `CardPhoto.tsx` currently invokes `requestGallery(listingId)` immediately on first IntersectionObserver visibility, rather than at first user hover/focus/intent. This causes anonymous DB reads merely by scrolling listing cards, contrary to the first-hover/lazy network target. Fix as a focused agent change; preserve touch prev/next affordances and keyboard behavior. Provide a regression test proving no gallery fetch until a user action.
2. **Takedown/cache decision.** New `GET /api/listings/gallery` replies `Cache-Control: public, s-maxage=60, stale-while-revalidate=120`; client caches IDs for the entire tab even after a listing is removed. Existing media thumbnail route rechecks visibility on origin, but its public 302 has a 1-hour public cache lifetime, so do not assume immediate takedown invalidation. Prefer `no-store` for the new gallery metadata endpoint until an explicit moderation caching policy is reviewed. Evaluate image-route cache behavior separately with tests; do not loosen media authorization.
3. **Staging test data.** Since FairSwapTest currently has no public multi-photo listing, execute automated gallery-contract tests with a controlled Test-only fixture or a suitable disposable seeded Test database. Never create an ad on Production just to test. Keep live multi-photo behavior labelled unverified until a real read is executed.
4. **CI gates.** Reconcile the 14-file delta against current staging (including the staging intro hold=900ms / fade=300ms vs Claude local hold=1400ms / fade=360ms). Target +1000ms on staging's hold, and preserve 4.3/FSW-SEC-001/guest saves. Run required CI, deployment SHA checks, new Playwright/route-security tests, and the global anonymous-abuse protection review.
5. **Global abuse controls.** Current in-instance budgets on anonymous `/saved` and new gallery route are not distributed rate limits. Existing Vercel firewall config lookup was not found; no global WAF rule has been verified or enabled.

## Files for targeted agent corrections
- `src/components/listings/CardPhoto.tsx`
- `src/lib/listings/gallery-client.ts`
- `src/app/api/listings/gallery/route.ts`
- `src/__tests__/card-photo.test.tsx`
- `tests/security/listing-gallery.test.ts`
- `src/lib/home-intro/selectors.ts` (reconcile final timing on staging)
- Related focused Playwright tests under `e2e/homepage-4-4.spec.ts`.

## Ownership and release path
Agent: code locally, produce corrected delta ZIP; no Git/GitHub/deploy. ChatGPT: integrate reviewed source via GitHub `feat/web-homepage-4-4-premium-motion`, commit `feat(web): refine Homepage 4.4 hero, motion and listing galleries`, PR to `staging`, CI → staging deploy → automated verification → PR to `main` → prod deploy/verification/rollback planning. No extra feature-specific workflow or production DB write. No production promotion before gates.
