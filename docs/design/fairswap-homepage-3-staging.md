# FairSwap Homepage 3.0 — staging design + implementation brief

**Status:** design handoff; UI not yet implemented or deployed.
**Repository:** `vivek2310sharma/FairSwap-Web`
**Source baseline at branch creation:** staging `0e9a35d916318884504122d3519855c5096a4506` (2026-10-28 review). Reconcile with newer staging commits before implementation.
**Target first:** staging; **production/main on hold** until owner approves staging.

## Product thesis
FairSwap is an India-first local classifieds marketplace. Win against OLX by making it easier to browse real nearby items and by giving buyers and sellers accurate, actionable safety information. Never confuse a premium brand illustration with proof that a seller or listing is trustworthy.

The approved design mockup in the 28 October project conversation is the **composition reference**, not a pixel-perfect implementation or an asset source. Its sample products, prices, user profile, location and verification labels are illustrative, not real data.

## Canonical brand characters
The approved illustrations of the Indian man in green overshirt/jeans and the Indian woman in blue are proposed recurring FairSwap brand ambassadors. They are distinct peers, not necessarily a romantic couple. Keep **the approved faces, hair, body proportions, clothes, line work and shading exactly consistent** in the intro and hero; no replacement characters drawn from the concept mockup.

**Existing assets and implementation**:
- `src/components/home/fairswap-art.ts` resolves `public/animations/fairswap-intro/` assets: `man-walk-01-*`, `woman-walk-01-*`, `handshake-duo-*`, `laptop-720w.webp`, `headphones-720w.webp`, `man-hero-*`, `woman-hero-*`.
- `FairSwapIntro.tsx`, `FairSwapIntro.module.css` and `IntroGate.tsx` implement the first-visit 5.2s intro, no-flash gate, Skip, Escape, session gating, reduced motion and fail-open. **Preserve these features** and real SSR content behind the animation.
- Use the provided responsive WebPs; original high-resolution art remains intact. Only display the art when its component is visible; never block search/listings for artwork.
- Name ideas such as “Aadi” and “Tara” are **internal proposals only**. Do not put unapproved names in live UI, routes, alt text, filenames or marketing. A later brand bible can establish personality/voice once owner approves and rights/provenance have been documented.
- Treat characters as brand accents: hero, appropriate onboarding/safety/empty states and marketing. Never flood search or listing detail screens with decorative characters.

## Brand design language
- Existing semantic light theme: porcelain `#F7F8F6`, white `#FFFFFF`, emerald `#08704A`, dark forest `#0E2B22`, subtle boundaries. Retain supported dark theme and its contrast.
- Reuse Manrope with Noto Sans Devanagari fallback, restrained radii, meaningful whitespace and accessible focus styles. Avoid a cosmetic “Blinkit clone” by emphasizing real-person discovery, safe local transactions, editorial trust and the FairSwap characters rather than grocery-like deal promotions.
- Phrasing: headline **“Find more. Share more. Trust more.”** as visual brand language; supporting line should talk about current **buying and selling**. Do not expose nonfunctional “Swap”/“Share” CTAs; those are later features.
- Preserve English/Hindi wrapping and legible ₹ pricing. Avoid invented ratings, “verified users”, buyer protection/guarantees, number of users or seller trust badges.

## Homepage layout and behaviour

### Desktop (>=1024)
1. **Sticky compact header**: brand logo left, prominent keyword search and public city/location picker, authenticated account/notification/message/favourites where applicable, primary **Post Ad** action. Preserve current `useHeaderFit` full/medium/compact behaviour and routes.
2. **Premium 2-column hero**: eyebrow “India's local marketplace”, headline and short subtitle on left; approved duo artwork on right. Search remains fully functional and keyboard accessible. Do not make this section excessively tall.
3. **Concise safety micro-strip**, e.g., “Meet in public”, “Inspect before paying”, “Never send advance UPI payments”. Never equate phone OTP login with government-ID verification or guaranteed safety.
4. **Explore Popular Categories**: use currently active category data and the approved optimized category WebPs, with clear HTML labels and “View all categories”. No fabricated category activation.
5. **Fresh Finds Near You**: real approved public listings, nearest selected public area (city/locality), real photos, INR price, title, condition and location if known, favourite action and consistent fallbacks. Default to a usable discovery state when no city selected. Show a visible empty state when a chosen area has no results.
6. **Compact selling prompt** using the canonical characters only if appropriate, then the existing safety guidance, How It Works and footer. No fake marketplace promotions.

### Mobile / tablet
- Separate responsive composition: logo, compact selected city, search and quick categories first; smaller decorative hero pair that doesn't push listings multiple screens down.
- 2-column listing feed where width allows and readable 1-column fallback for extremely narrow screens. Clear spacing for product photos and prices.
- Preserve **5-tab mobile navigation** and >=44px touch controls; work with 320, 360, 390, 768 viewports, safe areas and low/mid-range Android devices. Don't let the hero images compete with first useful content.

## Specific code audit findings (verified on staging at review)
- `src/app/page.tsx` currently renders `HomeDiscovery` -> full `SafetyBand` -> `RecentListingsSection` -> `HowItWorks`. Put listing discovery higher while retaining fraud guidance.
- `src/components/listings/HomeDiscovery.tsx` contains current hero/search/location/category composition.
- `src/components/listings/RecentListingsSection.tsx` currently requests `searchPublicListings({ sort: "newest", page: 1 })`, **without city/locality filtering**, slices seven results and returns `null` on empty. This is the most important product bug to solve: selected **public city/locality** must drive the feed, including an explicitly provided URL location and an existing saved public location. Avoid exposing personal/private location. Use existing validated public URL/query state and Supabase search RPC; do not invent identity-based location tracking.
- `src/components/home/CategoryBento.tsx` has ten image-first category tiles; reuse correct active categories.
- `src/components/listings/ListingCard.tsx` provides actual public media, condition, location, prices and favourites. Use existing data rather than mock cards.
- `src/components/home/FairSwapHeroArtwork.tsx` already handles responsive art/failure.
- `src/components/header.tsx` and `src/app/globals.css` have existing multi-width navigation and light/dark design tokens.
- Current staging also has newer IDV/Ratings/Chat code than the first homepage merge. **Do not overwrite or undo those changes.**

## Expected files to change
`src/app/page.tsx`, `src/components/listings/HomeDiscovery.tsx`, `src/components/listings/RecentListingsSection.tsx`, `src/components/home/CategoryBento.tsx`, `src/components/home/FairSwapHeroArtwork.tsx`, `src/components/home/SafetyBand.tsx`, `src/components/header.tsx`, `src/app/globals.css`; `src/components/home/HowItWorks.tsx` and `src/components/listings/ListingCard.tsx` only if warranted. Add or adjust **existing** homepage, location, intro and responsive Vitest/Playwright tests. Discover actual test filenames rather than guessing. Do not modify `fairswap-art.ts` or the intro files absent proven necessity.

## Technical guardrails and security
Next.js App Router, TypeScript, Tailwind, existing Supabase public listing RPC and Zod schemas. SSR and fallbacks must work; no hydration flicker, horizontal overflow, accidental seller-private location, RLS bypass, service-role exposure or client secrets. Preserve protected user states and auth. Preserve accessibility, keyboard/Skip/Escape and reduced motion. Never add a fake badge, review, listing or user metric. Maintain responsive photo variants for low-bandwidth Indian connections.

**DB migration:** none expected for this pure homepage milestone.
**New environment variables:** none expected.
**Backend/Edge Functions/RLS:** no change; if something genuinely requires them, create a *separate* additive migration + RLS proposal for both staging and production rather than silently expanding the UI PR.
**Separate workstream:** the reported “black money cleaning” fraudulent listing and related moderation/back-end protections are urgent but belong to the separately managed security task. Do not quietly implement fraud classifiers as part of the homepage redesign.

## Automated acceptance gates
- `typecheck`, lint, production build, focused Vitest, current isolated Playwright CI; maintain every existing CI gate.
- Assert selected public city/locality and results agree; saved public location behaviour; clean empty states; no fabricated data.
- No overflow at 320/360/390/768/1024/1366/1440/1920, correct English/Hindi wrapping; 44px targets.
- No regressions to the 5.2s no-flash intro, Skip/Escape, reduced motion, no-JS fail-open or first-paint content.
- Automated accessibility checks for forms, contrast, keyboard traversal and links; images remain optional/decorative where appropriate.

## Delivery (coding vs GitHub responsibilities)
**Coding agent choice: Codex or Antigravity**, not Claude while output is unreliable. Use plan-first for this multi-file UI task, narrow file context, no whole-repo scans. Agent writes code, runs automatic checks, returns file diffs and actual outputs. **Agent must not push, commit, create PRs, merge or deploy.**

**ChatGPT through GitHub:** manage feature branch, inspect file diffs against current staging, commit, open PR targeting `staging`, read CI results, merge, verify Vercel staging deployment. Owner assesses visual quality *after* staging deployment. Only after owner approves the staged design, produce a focused production-target PR against `main`, preserve production-only features, run CI and deploy production.

**Rollback:** revert the focused PR or restore prior Vercel deployment. No down-migration needed for this UI-only milestone.

## Future site-wide phase — after homepage approval
Extend reusable tokens, buttons, inputs, cards and navigation to Search/Explore, listing detail, Post Ad, inbox/chat, My Profile, favourites, Safety and Help Centre. Reuse canonical characters selectively. Separate authenticated, fraud-sensitive and DB-dependent features into auditable staged changes. The entire website rebrand is **not** part of the initial homepage PR.
