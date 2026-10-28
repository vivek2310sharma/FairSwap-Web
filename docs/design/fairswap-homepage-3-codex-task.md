# Codex task — implement FairSwap Homepage 3.0 (staging only)

**Coding agent: Codex, with multi-file planning first.** Repository: `vivek2310sharma/FairSwap-Web`. Start from `design/fairswap-homepage-3-staging` whose first commit is documentation-only and was based on staging SHA `0e9a35d916318884504122d3519855c5096a4506`. Refresh/reconcile any changes from latest `staging` before writing source. The full, approved design specification is `docs/design/fairswap-homepage-3-staging.md`. Read it first; do not crawl the entire repository.

## Objective / done means
Make the **actual homepage** match the approved FairSwap 3.0 concept while keeping all dynamic marketplace behaviour: clean emerald/porcelain desktop composition, compact mobile experience, the **approved existing man/woman art** (do not replace/AI-regenerate), actual active categories, actual approved listing media/₹ prices, location-aware feed and visible but factual safety cues. No fake demo data, unsupported badges, unimplemented Swap/Share features or claims that money is protected. Compete with OLX on trustworthy local discovery.

## Exact files / contracts

Read these existing files before editing:
- `src/app/page.tsx` — SSR homepage composition, initial URL search params and category fetch.
- `src/components/listings/HomeDiscovery.tsx` — client hero, keyword search, selected public area, category shortcuts and current `router.push(discoveryHref(...))`.
- `src/components/listings/RecentListingsSection.tsx` — server component currently fetching all-India newest items, then slicing seven, and returning null on empty.
- `src/components/listings/DiscoveryLocationSelector.tsx` — `localStorage` saved public area, confirmed location callback and `onRestore`. **Do not store GPS coordinates.**
- `src/lib/location/discovery.ts` — validated `PublicArea`, `publicAreaSchema`, `locationPreferenceSchema`, `discoveryHref` (this helper always builds `/search`, NOT `/`).
- `src/components/listings/ListingCard.tsx` — real public listing data, prices/photos/condition/favourites.
- `src/lib/discovery/queries.ts` — `searchPublicListings({ city, locality, ...})` accepts existing search filters; uses `search_public_listings` RPC.
- `src/components/home/CategoryBento.tsx` — real currently active categories + mapped category images.
- `src/components/home/FairSwapHeroArtwork.tsx` and `src/components/home/fairswap-art.ts` — canonical responsive WebP character pair.
- `src/components/home/SafetyBand.tsx`, `src/components/home/HowItWorks.tsx`, `src/components/header.tsx`, `src/app/globals.css`.
- `src/components/home/FairSwapIntro.tsx`, `src/components/home/FairSwapIntro.module.css`, `src/components/home/IntroGate.tsx` — read for compatibility, avoid changes.
- Tests: `src/__tests__/page.test.tsx`, `src/__tests__/recent-listings.test.tsx`, `src/__tests__/category-images.test.ts`, `src/__tests__/header.test.tsx`, `src/__tests__/home-artwork-intro.test.tsx`, `e2e/fairswap-intro.spec.ts`, `e2e/homepage-performance.spec.ts`, and existing search/location tests that touch these components.
- CI: `.github/workflows/ci.yml`; `package.json` has `pnpm@10.12.1`, Next 16.3.5, TS/React 19/Tailwind 4. Existing CI depends on private backend SHA; do not alter CI or backend checkout.

### Mandatory location-feed correction
The SSR feed cannot observe `HomeDiscovery`'s private client-only selected-area state. Implement a **single canonical public-area state source** shared by the hero and feed. Preferred implementation: use the homepage URL's validated `city`/`locality` query params as SSR state; selecting an area updates the homepage URL without leaving for `/search`, enabling a filtered server-rendered feed. Submitting keywords should still navigate to `/search` with the correct validated area. For a previously saved public area (restored asynchronously from localStorage), synchronize to the canonical homepage state with an idempotent client navigation/refresh; avoid hydration loops, false SSR mismatch or accidental updates overriding an explicit URL-selected area. Any other implementation must demonstrate equivalent behaviour, URL correctness and safe server/client boundaries.

Keep `All India` as the unfiltered fallback, and a clear `no local listings` message for valid selected areas with zero results; distinguish a failed RPC from a genuine empty set. Never show invented listing cards or private seller address data. Preserve the current filter schema and search result access controls.

### Visual design
Compact, two-column desktop hero: headline **Find more. Share more. Trust more.**, short subtitle for current buy/sell services, our **existing** `man-hero-*` and `woman-hero-*` WebPs on right. Intentional independent mobile layout with search and products reachable promptly, small art. Existing emerald and porcelain light/dark tokens. Clear safety micro-strip (meet publicly / inspect item / avoid advance UPI), actual category shortcuts, feed above the full safety section, appropriate Post Ad CTA. Use real metadata and data only. Do not call phone-OTP users “verified sellers.” Avoid manufactured listing thumbnails, fake prices or unsupported trust controls.

### Intro preservation
The intro currently runs 5.2s with pre-hydration gate, session skip, Escape, reduced motion, 7s fail-open and handshake/logo timing. Maintain all features. Do not simplify the intro to a static banner or replace canonical art.

## Mandatory automated checks
```
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm vitest run src/__tests__/page.test.tsx src/__tests__/recent-listings.test.tsx src/__tests__/category-images.test.ts src/__tests__/home-artwork-intro.test.tsx src/__tests__/header.test.tsx
pnpm build
```
Run existing E2E via the actual repo's Playwright config and cover intro, saved-location, fresh local listings/empty state, 320/360/390/768/1024/1366/1440/1920 responsive widths, keyboard/reduced-motion. Don't remove or weaken CI checks. Update `page.test.tsx` from old `Exchange. Share. Discover.` headline; update `recent-listings.test.tsx` from its old expectation that zero results must return null.

## Handoff, ownership and environments
- **Codex writes code only**, reports exact modified files, diffs, automated command results and any unresolved issues, with no manual/exploratory testing. Do not run Git push/commit, open PR, merge or deploy. Worktree is optional local isolation, not a delivery path. Return patch or changed files to ChatGPT for GitHub handling.
- **ChatGPT** inspects diffs, stages an audited commit on `feat/web-homepage-3` (or the agreed feature branch), PR into `staging`; review required CI then merge and verify Vercel staging deployment. Main/prod strictly awaits owner's visual approval of this design.
- **Files changed:** homepage and relevant shared UI files above + existing tests. **DB migrations:** none expected. **Env vars:** none expected. **Backend/Edge/RLS:** no changes in this UI phase. If a migration or env var becomes necessary, stop and report separate staging+prod plan rather than silently doing it.
- **Production follow-up after approval:** focused `main` PR, pass CI, Vercel production rollout; verify live first-paint, mobile, authentic listing cards, search, location, safety and accessibility. **Rollback:** git revert focused PR or restore previous Vercel deployment.

Respond concisely, do not restate the task, show diffs only and concise gate results. No deployment claims unless verified.
