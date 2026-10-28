# FairSwap Homepage 3.2 + Second Life Journey V3 — locked creative direction
**Approved for implementation without additional creative sign-offs by Claude Code.** Owner/ChatGPT direct creative and GitHub; Claude Code Sonnet implements code locally only. **Staging experiment**; main/prod not changed until subsequent promotion.

**Base:** FairSwap-Web staging `5075d102e8afb67eae1a573c59192c55e2e0df16` (2026-10-28). The owner has a complete downloadable creative package with five detailed contracts, reference boards and a standalone Claude prompt (`FairSwap-V3-Creative-Lock-and-Claude-Implementation.zip`). If Claude cannot access these GitHub docs locally, the owner pastes the standalone prompt; Claude does not need GH access.

## Creative thesis
**Great things deserve a second life.** Product first; characters are secondary brand assets. The new hero and intro MUST NOT contain two people facing each other, walking toward each other or handshaking, because that reads like dating/social rather than classifieds. Do not delete the approved character library; simply stop using the pair as the hero/intro. Any later character cameo is a separate, below-the-fold decision.

## Production artwork ownership
Only reuse original FairSwap owned curated assets already in staging:
- `public/brand/FairSwap_Web_Logo_Transparent.png`
- `public/images/categories/furniture.webp` (21,186 bytes)
- `public/images/categories/mobiles-tablets.webp` (17,274 bytes)
- `public/images/categories/bicycles-sports.webp` (39,010 bytes)
- `public/images/categories/electronics-laptops-computers.webp` (21,422 bytes)
- other image paths only when returned by existing allowlisted `getCategoryImagePath` for real active categories.
The four listed WebPs total **98,892 source bytes**. Existing characters/old animation assets in `public/animations/fairswap-intro/` stay untouched. Claude may animate CSS transforms/opacity on existing category photos and use existing Lucide icons, but MUST NOT create/generate/download any new illustrations or use fictional products/prices from AI concept boards. No external artwork.

## V3 animation locked timing
First eligible homepage visit **2,800ms desktop / 2,200ms mobile**:
| Desktop ms | Visual beat |
|---|---|
| 0–220 | FairSwap logo, shared porcelain/dark background |
| 220–850 | Wooden chair hero category photo rises in; smaller phone enters |
| 850–1400 | Chair becomes a labeled **category tile**, bicycle/laptop satellite photos appear |
| 1400–1880 | Generic location pin and `Explore nearby` (no GPS claim, fake map/distance, or geolocation permission) |
| 1880–2350 | Three factual cues: `Inspect the item`, `Meet in public`, `Avoid advance UPI` (NOT a verified/safe-deal guarantee) |
| 2350–2650 | Four photos align in category/product gallery composition |
| 2650–2800 | Seamless dissolve into SSR product-led homepage, no flash/CLS |
Mobile compresses same sequence to 2,200ms, max 2 image photos simultaneously. No WebGL, video, Lottie, GSAP, canvas, sound, timers left running or new dependencies. Transform/opacity, composited motion only.

## Eligibility / accessibility
- Versioned first-device-visit `localStorage` key `fairswap.intro.v3.seen`; different from old V2 per-tab `fs-intro-seen`. Mark seen at playback start and exit. Returning visitors get **zero blocking gate**.
- Reduced motion, Save-Data (if available), JavaScript disabled, storage unavailable: skip intro and show SSR homepage instantly.
- Native accessible dialog while active only; visible 44px Skip, Escape/cancel, keyboard focus management, focus restore, no fake progress. Fail-open gate within **3,500ms** even under network/hydration/image failure. Pre-paint gate and intro backdrop exactly match light/dark homepage; no white flashing.
- Revise V2 unit/e2e expectations to true V3 choreography and timing; preserve and improve keyboard/no-JS/fallback tests, never disable them.

## Homepage 3.2 locked UI
- Header 56–64px: logo, public area, quick actions including Post Ad, messages/favourites/account with auth, condensed secondary navigation; preserve other-page behaviour and mobile 5-tab bar. One visible accessible search per viewport, not two.
- Desktop at 1366px: max width ~1280px, hero height <=350px, ~44% copy/search + 56% product-photo collage, no humans in the hero. Heading `Great things deserve a second life.` Supporting line `Buy and sell pre-loved things nearby. Discover real finds across India.`. Porcelain #F7F8F6, emerald #08704A, forest #0E2B22, semantic dark theme, existing Manrope/Devanagari.
- Mobile 320/360/390px: hero <=300px, only focal photo + one small satellite, early search/categories/listings, no overflow, >=44px touch, reduced motion, Hindi/English wrapping. Tablet 768/1024, desktop 1366/1440/1920.
- Truthful small safety band: `Meet in a public place`, `Inspect before paying`, `Avoid advance UPI payments`.
- Categories: up to 6–8 **actual active** categories from `getPublicCategories` matched to curated photo paths, max ~118px rail, no huge blank pastel tiles or test-only category as featured decorative content. Preserve full directory.
- Real `Fresh Finds Near You`: 4-column desktop, 2-column mobile, real approved public listing media/₹/conditions/location, no fake reviews, distances, prices, identity verification or seller data. Preserve existing validated URL-area SSR filter, localStorage restore precedence, All India clearing, query/category navigation and RLS. Error != empty.
- Full SafetyBand, HowItWorks and footer remain; no new UPI/payment capability claim. This is how FairSwap beats OLX through safer, clearer local discovery, not visual badges.

## Scoped code review
Primary: `src/app/page.tsx`; `src/components/header.tsx`; `src/components/listings/{HomeDiscovery,RecentListingsSection,DiscoveryLocationSelector,ListingCard}.tsx`; `src/components/home/{FairSwapIntro,IntroGate,CategoryBento,FairSwapHeroArtwork,fairswap-art}.ts[x]`; `src/components/home/FairSwapIntro.module.css`; `src/app/globals.css`; `src/lib/{location/discovery,categories/category-images,discovery/queries}.ts`; related existing Vitest and e2e, especially `src/__tests__/home-artwork-intro.test.tsx`, `e2e/fairswap-intro.spec.ts`, `e2e/homepage-performance.spec.ts`, `e2e/home-redesign.spec.ts` and location/header tests. Do not modify chat, ratings, IDV, RLS, database or backend.

**No DB migrations, env vars, RLS, Edge Functions or CI changes.** Typecheck, lint, focused Vitest, build and existing Playwright CI on; no manual/exploratory testing. Validate V3 timing, no-JS, Skip/Escape, reduced motion, storage blocked, mobile/tablet/desktop, and real SSR feed. If input files are dirty/older than staging, preserve all prior work and provide pre-change-snapshot-relative `ALL.patch`, ZIP of modified/new files only, manifest, SHA and actual test results.

**GitHub after Claude:** ChatGPT reconciles patches against staging; commit on this branch with `feat(web): product-first homepage 3.2 and Second Life intro v3`, PR to `staging`, CI, merge, verify staging Vercel. No production/main merge yet; production promotion is separately controlled after staged design is satisfactory. Rollback: GitHub revert / previous Vercel deployment.

**No approval loops:** Claude makes code changes automatically after a brief internal plan; no requests for repeated design approval, commits, PRs or deployments.
