# FairSwap — Neighbourhood Discovery Flow V4
**FINAL APPROVED CREATIVE LOCK · 28 October 2026 · Staging only**

**Supersedes all earlier “Second Life Journey” V3 art direction, headlines, timing and Claude prompts.** The owner asked for a more distinctive, cinematic locality-map sequence rather than product stills or a people/handshake scene. This branch was created from staging `5075d102e8afb67eae1a573c59192c55e2e0df16`. No web code is changed by this document.

**Canonical source bundle:** `FairSwap-Neighbourhood-V4-Creative-Lock.zip` supplied by ChatGPT in the FairSwap project conversation, containing the full strict specification `docs/design/01-CREATIVE-LOCK.md` through `05-CLAUDE-PASTE-PROMPT.md`, three original production-ready SVGs under `public/animations/fairswap-neighbourhood-v4/`, plus rendered previews. **Use that exact bundle for local Claude Code work; the assistant-generated vector assets are owned by the project and MUST NOT be recreated by the agent.** There are no missing external image dependencies: marketplace category photos are already in `public/images/categories/`.

## Brand positioning and homepage copy

- H1: **Good things, closer to you.**
- Supporting: **Discover useful finds from people around you. Buy, sell and explore locally.**
- Primary categories: actual active public categories, concise curated image rail, link to full directory.
- SSR feed heading: **Fresh Finds Near You**, controlled by the existing validated public-area URL state; unselected area shows Across India.
- Three factual safety micro-cues: **Meet in a public place** · **Inspect before paying** · **Avoid advance UPI payments**.
- **NO** “Great things deserve a second life”, “old goods” or “pre-loved” headline, people meeting, waving, flirtation or handshake. Existing FairSwap characters stay in the repo for possible later secondary use, but NOT active hero or intro.
- NO fake item listings, seller profiles, testimonials, prices, location pins as real merchants, distance claims, purchase guarantees, identity verified badges or unsupported payment flows. The abstract map is purely fictional brand art, **not a real GIS map**.

## Original art lock

Three provided SVG files:
1. `neighbourhood-map-desktop.svg` — 1440×820 dark forest cartography with invented paths, buildings, parks, soft rings;
2. `neighbourhood-map-mobile.svg` — 390×700 composition;
3. `pin-aura.svg` — restrained radial signal ring.

They are to be copied unchanged from the supplied ZIP into `public/animations/fairswap-neighbourhood-v4/`.

Category tokens use **existing** owned FairSwap photography only:
`/images/categories/furniture.webp`,
`/images/categories/mobiles-tablets.webp`,
`/images/categories/bicycles-sports.webp`,
`/images/categories/electronics-laptops-computers.webp`,
`/images/categories/home-appliances.webp`,
`/images/categories/electronics-cameras-photography.webp`.
Official unchanged wordmark `/brand/FairSwap_Web_Logo_Transparent.png` must resolve at the convergence hub; do not mathematically distort items into a fake FairSwap symbol.

## Exact cinematic storyboard

Desktop **3,300ms**; mobile **2,600ms**. No blocking repeated animation for returning users.

| Phase | Desktop ms | Mobile ms | Scene |
|---|---|---|---|
| A | 0–450 | 0–340 | Abstract neighbourhood map illuminates; central low-key pulse |
| B | 450–1180 | 340–840 | Distinct product-photo category markers appear; 6 desktop, 4 mobile |
| C | 1180–2130 | 840–1630 | Tokens curve inward along elegant route arcs with gentle parallax |
| D | 2130–2580 | 1630–1990 | Markers contract behind central official FairSwap logo in contrast pill |
| E | 2580–3100 | 1990–2420 | Map geometry dissolves/folds into real homepage alignment and category shortcuts |
| F | 3100–3300 | 2420–2600 | SSR homepage fully uncovered; dialog closed; focus restored, zero flash |

Desktop marker origin percentages (x,y): Furniture 23,28; Mobiles 68,23; Bicycles 19,69; Laptops 75,71; Appliances 44,16; Cameras 84,45. Mobile x,y: Furniture 24,22; Mobiles 72,24; Bicycles 24,65; Laptops 74,69. The convergence point is 50%,48%; none of these coordinates are geolocation data.

A premium smooth continuous transition is mandatory: NOT a series of independent fades, generic slideshow, emoji scatter, looping particles, flashy explosions, faux-neon cyberpunk or a video overlay. Motion can use composited CSS transforms/opacity on HTML category-photo tiles over the provided SVG with restrained ring/route tracer. No WebGL, canvas, audio, video, GSAP, Lottie or new runtime dependencies.

## Behaviour and eligibility

Use new versioned localStorage key **`fairswap.intro.neighbourhood.v1.seen`**. Attempt the intro only on the first eligible visit **per browser/device**, mark seen at start; older V2 session-key is irrelevant. Bypass intro entirely for `prefers-reduced-motion`, supported Save-Data, no JavaScript and blocked storage. A visible Skip (44px) and Escape cancel are required, with dialog focus containment and restore. The SSR homepage must exist behind animation. Pre-hydration gate and overlay background must match; no uncovered first-paint frame; maximum fallback **4,000ms** including missing assets or hydration failure. Returning users have **no blocking gate**.

## Homepage responsive lock

At desktop 1366px: compact 56–64px header with existing auth/messages/favourites/Post Ad; one clear active search; hero **280–340px**, roughly 42% copy/search and 58% product-image collage; faint cartographic texture on hero, no human figures. Safety microbar ~60px; 6–8 optimized photo category shortcuts at ~90–118px; real dynamic listings quickly visible, 4 columns desktop and 2 mobile. Mobile <=390px: hero <=260px (allow 300 for font wrapping), 1 focal image + small satellite, unchanged five-tab nav. Tablet, dark mode, English/Hindi wrapping, accessibility and low-bandwidth must all work. Full existing SafetyBand, HowItWorks and Footer remain. **Preserve V3 location-filter fix and real SSR feed**.

## Implementation ownership and delivery

- **Claude Code Sonnet**: read `docs/design/05-CLAUDE-PASTE-PROMPT.md` from the delivered ZIP (or paste the self-contained prompt), make a short plan and implement automatically; **DO NOT ASK for more design approval.** Claude does **not** need GitHub access. Do not invent imagery or change the creative lock.
- Scoped files: `src/app/page.tsx`, `src/components/header.tsx`, `src/components/listings/{HomeDiscovery,RecentListingsSection,DiscoveryLocationSelector}.tsx`, `src/components/home/{FairSwapIntro,IntroGate,CategoryBento,FairSwapHeroArtwork,fairswap-art}.ts[x]`, `src/components/home/FairSwapIntro.module.css`, `src/app/globals.css`, added small typed intro/collage components, existing focused Vitest and Playwright tests. Do not edit other backend/auth/IDV/Ratings/Chat files.
- **DB migrations:** none. **Env vars:** none. **Hosted Supabase/RLS changes:** none. **CI changes:** none.
- Exact automated tests: lint, typecheck, Vitest, build, Playwright intro/homepage/location/performance/responsive, preserving all CI gates. No manual/exploratory testing by coding agent.
- Dirty local workspace may be at `838c372` (older than staging) with prior intro files; never overwrite remote source. Snapshot dirty pre-state, hand back a full changed-files ZIP, per-file diff and `ALL.patch`, `MANIFEST.md` and actual PASS/FAIL/BLOCKED logs. Do not run Git branch/commit/push/PR/merge/deploy.
- **ChatGPT owns GitHub**: feature branch `feat/web-homepage-3-2-neighbourhood-v4`, commit `feat(web): map-led neighbourhood intro and product-first homepage`, PR targeting `staging`, CI inspection, staging merge/deploy verification. **Production main held during staging-first creative experiment**; after owner approves, focused main PR and production CI/deployment.
- **Rollback:** git revert focused merge or restore prior Vercel deployment; no DB rollback.

This document makes the previous V3 branch and files historical references ONLY. **No other creative direction is authorized.**
