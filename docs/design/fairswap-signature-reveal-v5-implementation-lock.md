# FairSwap Signature Reveal V5 — approved implementation lock

**Status:** Approved creative / implementation requested on 28 October 2026. This document is the authoritative replacement for the active V4 **loading animation only**. It does **not** authorize any homepage redesign, header re-layout, search relocation, category/feed changes, or sitewide motion.

**Target:** staging first. Current staging source baseline when this branch was created: `defc26f454e0719d8326c3d1eb3d8ac2835eb6ed`. Source branch: `feat/web-signature-reveal-v5-staging`. Reconcile against latest staging rather than overwrite with files from an outdated local checkout.

## Source of truth: the actual approved working demo

A complete offline interactive reference file is provided separately in the FairSwap project conversation:

`FairSwap-Signature-Reveal-Final-Polish.html`

Its motion (not its demo homepage) is approved. **Reference it for timing and easing, but DO NOT copy its surrounding HTML/CSS/JS application layout, mock product data or search bar position**. The final prototype had an illustrated mock homepage; the *real* `src/app/page.tsx`, `HomeDiscovery`, public-area navigation and all marketplace logic must remain unchanged.

The first-visit intro in staging is currently `NeighbourhoodMapIntro` and `IntroGate`, with old V4 tests. Replace only that opening experience with the new `SignatureReveal`; preserve old images and assets in public to avoid unnecessary deletions.

## The only approved animation

- Total **2,200ms** desktop and mobile, no startup autoplay video or splash separate from the actual website.
- Background: restrained deep-forest gradient `radial-gradient(ellipse 55% 45% at 50% 54%, #18291e 0%, #111b16 69%, #0d1411 100%)`. Avoid glow, particles, maps, markers, 3D, people or product imagery.
- Center: **official FairSwap wordmark image**, e.g. `/brand/FairSwap_Web_Logo_Transparent.png`, never an approximate text recreation. Respect exact asset aspect ratio, leave legible contrast for blue/green parts. The real header target is the current official logo under the `FairSwap home` accessible link.
- Beneath wordmark, two 52px × 2px elegant horizontal rules (one pale/off-white, one muted green). These swap x positions in opposite directions using `cubic-bezier(.22,.72,.23,1)` beginning ~600ms, lasting ~670ms. Both overshoot final positions by **2–3 CSS px** near ~72% of the exchange, then settle (no bounce).
- Hold the completed swap for **130ms** (approx 1270–1400ms). This is the signature beat. No extra text, counter, slogan or generic spinner.
- At approx **1420ms**, a gently curved forest curtain exits *upwards* for about **760ms** using `cubic-bezier(.72,.04,.18,1)`. Its edge should feel soft/weighted, not a rectangular wipe, and the real homepage is underneath from the first server render.
- At approx **1430ms**, the centered **same logo asset** makes a continuous motion handoff to the existing header logo via transform/scale (FLIP or equivalent). Measure positions when the actual header image is loaded and laid out. Crossfade the source into the real header img at the end so there is **never a doubled logo**. If positioning is not reliable (no loaded image, altered geometry), skip handoff and reveal the actual header logo without a flash or stalled curtain. Do not move the existing header or change its search/navigation.
- Clear animation/layout state by 2200ms. No delayed arbitrary animations or visual leftovers. Prefer compositor-friendly CSS transforms and opacity, avoiding scroll-jacking, loops, sound or third-party motion frameworks.
- Final page should be the **current SSR FairSwap homepage**, with all existing search, location, categories, listings, nav, auth and controls preserved pixel-for-pixel outside the overlay.

## First-paint, accessibility, resilience

- Use a new versioned, privacy-minimal per-device localStorage flag `fairswap.signature.reveal.v1.seen`; do not confuse the V4 seen key with the V5 key. Mark seen when playback starts. Returning visitors have no gate and no intro.
- If storage is unavailable, Save-Data is supported/enabled, `prefers-reduced-motion: reduce` is requested, or JavaScript is off, the real homepage must be immediately usable (no blocking intro).
- Keep a pre-hydration gating approach only for eligible first visits and match the initial frame's background *exactly* to prevent a white flash or uncovered first frame. Add a hard fail-open bound **<= 3,300ms** even if hydration stalls or the header logo fails to load. The fail-open must not depend on React hydration completing.
- Accessible native `<dialog>` with label `FairSwap introduction`, focus-contained Skip (minimum 44×44px), Escape cancel, focus restore and cleanup of `requestAnimationFrame`, timers, Web Animations and temporary clones when completed/unmounted or route changes.
- Avoid global styles that override the actual homepage. No permanent scroll lock, no layout shift caused by the handoff.
- No new images, fonts, npm dependencies, tracking, storage of personal data, Supabase schema or environment variables. No JS framework for motion required beyond existing React/CSS/DOM.

## Scoped code paths for the coding agent

Read first:
- `src/app/page.tsx` — change only which intro component is mounted, not composition.
- `src/components/home/IntroGate.tsx` — adapt V4 first-visit gate and seen key for the new intro.
- `src/components/home/NeighbourhoodMapIntro.tsx`, `src/components/home/NeighbourhoodMapIntro.module.css`, `src/components/home/neighbourhood-intro.ts` — review existing failure, modal, gate and cleanup mechanics; retire the *mount* but preserve old code/art unless a proven dependency requires changing it.
- `src/components/header.tsx` — read current logo; allow adding a stable `data-` attribute/ref to identify the real destination without changing visible header structure/styles or its accessibility label.
- `src/app/globals.css` — V4 first-paint backdrop must match V5; no other global style change.
- `src/__tests__/neighbourhood-intro.test.tsx`, `e2e/fairswap-intro.spec.ts`, `e2e/homepage-performance.spec.ts`, `src/__tests__/page.test.tsx`, `src/__tests__/header.test.tsx` and named intro/SSR specs found by filename.
Create:
- `src/components/home/SignatureReveal.tsx`
- `src/components/home/SignatureReveal.module.css`
- optional tiny pure `src/components/home/signature-reveal.ts` for constants, keyframes, eligibility utilities; corresponding new focused Vitest tests.

**Do not edit:** `HomeDiscovery.tsx`, `RecentListingsSection.tsx`, `CategoryBento.tsx`, `ProductCollage.tsx`, listing/search/locality components, Auth/Chat/Ratings/IDV, DB migrations, Edge Functions, environment config or CI gates. If a dependency forces broader edits, document why and confine them to correctness, not design.

## Automated acceptance

1. Local intro plays **once per browser device** at 2.2s; skip/escape/focus restore; no replay on refresh, new same-origin tab or route revisit.
2. No-JS, blocked storage, Save-Data, reduced motion: homepage immediately visible and interactive; no gate.
3. Pre-hydration slow/missing JS/failing logo: fail open <=3300ms with no white uncovered frame.
4. Deterministic keyframe checks: two rules cross, overshoot <=3px, settle, 130ms pause, curtain exit/FLIP timing. No fake duplicated header.
5. Desktop 1024/1366/1440/1920, tablet 768, mobile 320/360/390: official logo stays in bounds, no overflow, no navbar clipping, no loss of search or SSR feed. Test dark/light mode.
6. Typecheck, lint, focused Vitest, `pnpm build`, targeted Playwright intro and home regression; **do not skip/delete failing tests merely to get green checks**. Report PASS/FAIL/BLOCKED honestly.

## Ownership / deployment

Coding agent: **Claude Code Sonnet** in Antigravity's local `FairSwap-Web-Staging` workspace. Use plan mode internally for this multi-file feature, then implement with **no repetitive questions or creative approval loops**. Claude writes source code and runs automated tests only: **no branches, commits, GitHub API, push, PR, merge, deployment or manual testing**. Preserve dirty working tree and exact local baseline; deliver repo-relative ZIP + `ALL.patch` against a pre-change snapshot, `MANIFEST.md`, test results; do not pack unrelated pre-existing work.

ChatGPT owns GitHub: branch `feat/web-signature-reveal-v5-staging`, commit message `feat(web): replace V4 intro with premium Signature Reveal V5`, PR targeting `staging`, required CI, then staging release/deployment verification. Hold production/main until visual acceptance of staged signature animation (previous explicit staging-first direction); then focused PR into `main` + required CI + production deployment. No DB migrations / env vars for either environment. Rollback: git revert or prior Vercel deployment.

Token advice: Claude Sonnet, new focused session for intro-only V5, don't change CLAUDE.md/MCP settings, /compact around 50-60% with focus on intro diffs and failing automated specs.
