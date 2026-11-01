# FairSwap Homepage 4.4 — Premium Motion & Discovery Implementation Brief

**Status:** IMPLEMENTATION PENDING. This document is a reviewed delivery brief, **not** an assertion that the UX changes or tests are complete.

**Product:** FairSwap India (`fairswap.in`), English launch with Hindi planned; mobile-first classifieds with emphasis on trust and fraud resistance vs OLX India.

**Source baseline:** `staging` commit `90a24326eea290b9dc4a8094ec9bcbbe3780eb13` (Homepage 4.3, PR #296). **Feature branch:** `feat/web-homepage-4-4-premium-motion`. Preserve all later approved staging security patches if base has advanced.

**Repository ownership:** Coding agent writes code in its local isolated worktree and returns reviewed diffs/ZIP. **ChatGPT alone** handles GitHub commits, PR, merge and CI/deployment actions. The agent must not execute GitHub pushes, PRs, merges, deployments or hosted Supabase writes.

## Objective and design language

Turn the functional Homepage 4.3 into a distinctive premium Indian marketplace without copying a portfolio website or sacrificing marketplace conversion. Reference for motion principles only: https://dennissnellenberg.com/ — typographic hierarchy, hover reactions, section-by-section movement, cohesive transitions. Preserve FairSwap's approved visual identity and mascot characters. No GSAP/Lenis/scroll-jacking dependency unless a measured, narrowly documented necessity exists. Prefer CSS transforms, opacity and minimal IntersectionObserver; respect low-bandwidth Indian mobile networks, reduced motion, keyboard accessibility and Save-Data.

**Brand mood:** deep FairSwap green, warm cream, occasional blue/turquoise section accents, tactile but restrained motion, legible cards and prices, visible safety guidance. Never suggest FairSwap guarantees seller verification, insured purchases, escrow or payments.

## Implementation tasks and acceptance criteria

### H44-01 — Hero layout, wasted whitespace, zoom support, mascot scale
Current desktop `HomeDiscovery.tsx` uses 42/58 columns and `HeroMascots.tsx` puts both mascots inside the right side. Replace with a balanced composition on desktop: **man | headline+search | woman**. On narrow mobile, headline and search remain first with characters compact/secondary. On medium viewports avoid awkward overlaps. Get rid of excessive empty whitespace and false decorative space at 50% browser zoom. Make content scale with available CSS viewport dimensions; do **not** detect browser zoom via `devicePixelRatio`.

Use only original approved WebP character images under `public/animations/fairswap-intro/`, with consistent faces, outfits and proportions. Balance **visible** artwork footprints (opaque content bounding boxes may differ), not just CSS `height`; do not distort aspect ratio. The woman must be prominent at 90% zoom. Preserve source logo and navigation. Maintain form/search categories, server area resolution, and explicit opt-in location access.

Test zoom-equivalent CSS viewports at 320/360/390/768/1024/1280/1440/1920/2560+; browser zoom 50/75/90/100/125/150/200% where runner supports it. No horizontal overflow, clipped heading, offscreen mascot, navigation collisions or hidden search button. Keyboard and touch target sizes remain usable.

### H44-02 — Language selector
Simplify visible choices to English and हिन्दी only, including header/footer. English is the **only currently enabled full-site locale**: mark हिन्दी as 'coming soon' or equivalent disabled until all page, auth, validation, policy, safety and support text is reviewed in Hindi. Do not pretend the website is translated by toggling a label. The selector is separate from the protected V19 **multilingual introduction greetings**, which remain intact. Remove the unused other displayed language options without disrupting future i18n infrastructure.

### H44-03 — Hover/listing photo galleries, securely
`ListingCard.tsx` currently shows `cover_photo` only; `PublicListingCard` lacks an approved image array. Add a **bounded batch public-gallery lookup** for current publicly visible, approved results, returning allowlisted media IDs only; only media whose processing status is `ready` and that belong to the selected public listing IDs, in established order. Exclude originals and private storage paths. Preserve FSW-SEC-001 security, RLS, visibility, moderation, thumbnail API authorization and guest-favourite behavior. Review existing `search_public_listings` RPC before deciding whether a backward-compatible DB change is essential. Prefer no migration if the already-authorized app path supports a safe bounded lookup; **never** loosen table/RLS access to solve a card UX issue.

Card cover remains first and SSR-visible. On desktops with fine pointers: start a gentle 1-by-1 gallery on hover (e.g. 1.5-2.2 sec/image), stop/reset on hover out and visibility loss, and disable timer when reduced-motion or Save-Data; show small slide-count dots. On touch devices: one image by default plus explicit next control or swipe if reliable, not inaccessible hover dependency. Only generate additional image network requests on demand; avoid unbounded N+1 reads. A listing with zero/one usable images must behave exactly like current single-image cards. Preserve entire-card navigation, favourite hitbox, condition badge, price, image alt and keyboard use. No user-uploaded content leaks when listing is moderated/unpublished.

### H44-04 — Better four-stage How It Works
`HomepageStory.tsx` currently cycles isolated laptop, headphones, walking and handshake cutouts. Make a coherent four-step illustrated narrative using the **approved** man and woman, item exchange and actual site UX. User can select via hover/focus/click, with touch-friendly toggles. Use responsive art framing, tasteful spring-like image entrance without expensive animation. Do not invent new faces or change character outfits. If new assets are genuinely required, supply asset source, optimized transparent WebP/AVIF as appropriate and license provenance; no external copyrighted scene reuse. Four steps stay Browse → Connect → Inspect → Exchange. No escrow/payment guarantees.

### H44-05 — Remove visible replay UI
Remove `ReplayIntroLink` import/render from `src/app/page.tsx` and adjust tests. Retain programmatic replay/session mechanism only if useful for automated regression and developer debugging; do not expose the visible bottom 'Replay introduction' control to shoppers. Preserve Skip, tab-session policy, intro reduced motion, intro gated first frame and no-JS homepage behavior.

### H44-06 — Upgrade safety reminders
Replace the flat `SAFETY_REMINDERS` border stripe in `HomeDiscovery.tsx` with three legible, colorful small cards or premium pill treatments: public meetup, inspect before payment, avoid advance UPI/QR payment links. Make each tip actionable; optional link to `/safety`. Non-intrusive accessible hover/focus animation. Ensure safety copy is correct for Indian UPI fraud (to receive money, user should not scan QR code, enter UPI PIN, or approve collect requests). Reuse detailed `SafetyBand` and `InteractiveSafety` without clutter or making untrue guarantees.

### H44-07 — Meaningful motion per section
Introduce a tiny reusable reveal primitive for hero accent, category tiles, fresh listings and story/safety/seller CTA. Alternate subtle cream/mint/cool-blue section backdrops; add visual rhythm via staggered headings, underline/rule reveals, tiny hover elevation, lightweight cursor accent *only on fine pointer*. Avoid forced smooth scrolling, sticky scroll hijack, motion that blocks first search result or obscures content, and all default-hidden content if JS fails. CSS enhancement must be progressive; no big animation framework by default.

Measure performance on a midrange low-end Android emulation with cold network; avoid a material LCP/CLS/INP regression. Pause offscreen effects. Use `prefers-reduced-motion` and Save-Data gates and `pointer: coarse` fallbacks.

### H44-08 — Intro ends with an upward reveal
`src/lib/home-intro/selectors.ts` currently has `TIMING.hold=900` milliseconds, `TIMING.fade=300`. Increase final **wordmark + tagline hold by ~1000ms** (target `hold=1900`) then slide the intro overlay **up** to reveal the SSR homepage, rather than fade abruptly. Keep the final FairSwap + tagline legible and present long enough. A subtle homepage entrance can be synchronized without delaying interactive use. Update `PremiumIndiaIntro.tsx`, `PremiumIndiaIntro.module.css`, `selectors.ts`, and all relevant timeouts/failsafes; `FAILSAFE_MS=9000` and CSS fallback 9.5s may otherwise clip the deliberate longer ending. Guarantee fail-open even on hydration errors and keep initial gate's pre-paint intent. For reduced motion: immediate/simple transition, not a screen-length slide. Preserve session, skip, ESC, focus return and deterministic tests.

## Source files to review (targeted, not full-repo scan)

- `src/app/page.tsx`
- `src/components/listings/HomeDiscovery.tsx`
- `src/components/home/HeroMascots.tsx`
- `src/components/home/HomepageStory.tsx`
- `src/components/home/SafetyBand.tsx`, `src/components/home/InteractiveSafety.tsx`
- `src/components/home/SellerCta.tsx`
- `src/components/LanguageSelector.tsx`, `src/lib/i18n/locales.ts`
- `src/components/listings/ListingCard.tsx`, `src/components/listings/RecentListingsSection.tsx`
- `src/lib/discovery/queries.ts`, `src/types/listing.ts`
- `src/components/home/PremiumIndiaIntro.tsx`, `src/components/home/PremiumIndiaIntro.module.css`
- `src/lib/home-intro/selectors.ts`, `src/components/home/IntroGate.tsx`
- `src/components/home/ReplayIntroLink.tsx` (retain as inert utility or delete only if references resolved)
- `src/app/globals.css`

Review their immediate imports, relevant `/search` and `/saved` card consumers and linked tests before changing shared contracts. If adding reusable component files, name them in the diff manifest. Avoid editing unrelated post-ad or admin code.

## Automated acceptance

Use existing scripts from `package.json`: `npm run lint`, `npm run typecheck`, `npm run test:unit`, `npm run test:security`, `npm run build`, focused Playwright. Review actual failures, distinguish baseline/environment from regressions. Update at least:
- `src/__tests__/home-interactions.test.tsx`
- `src/__tests__/listing-card.test.tsx`
- `src/__tests__/premium-india-intro.test.tsx`
- `src/__tests__/home-intro-selectors.test.ts`
- `src/__tests__/replay-intro-link.test.tsx` (if changed/deleted)
- `e2e/home-redesign.spec.ts`, `e2e/homepage-performance.spec.ts`, `e2e/fairswap-intro.spec.ts`
- Security tests for public-media allowance, not-ready images, unpublished listings and cross-listing references.

Provide actual per-test command/exit codes and responsive screenshots **generated by test automation**, not manual exploratory testing. Do not claim unavailable axe, assistive tech or cross-browser coverage as PASS.

## Existing release gates and known current evidence

- On 2026-11-01, GitHub confirmed all five CI checks successful for staging merge commit `90a24326`.
- Vercel deployment `dpl_5f7mV9ZMXejXANQmvyLLG46mMfX4` confirmed READY and matching this SHA.
- Authenticated Vercel GETs of `/`, `/saved`, `/search` returned **HTTP 200** from the staging deployment. **These are smoke checks, not interactive Playwright checks**.
- `/saved` anonymous POST is protected only by **per-instance** rate budget (12 calls / client minute, 120 IDs / client minute, 2500 IDs / instance minute, max 50/request). **Global/distributed limiting remains unresolved**. Vercel firewall configuration lookup returned 404 'Config not found'; do not interpret this as evidence of a global rate rule. Review project capability/plan and compatible protections before production.
- No production promotion, database changes, new secrets, or dependencies authorized by this document.

## Release process: ChatGPT only

1. Coding agent works locally against staging-compatible files; supplies source+test ZIP, exact relative paths, diff/patch and tests.
2. ChatGPT reviews changes/security, integrates via GitHub to `feat/web-homepage-4-4-premium-motion`.
3. Target change commit (ChatGPT): `feat(web): refine Homepage 4.4 hero, motion and listing galleries`; target staging PR from feature branch.
4. Require standard CI green, Test/staging Vercel READY, SHA match and **automated** homepage/saved/search + new gallery/intro functional verification. Review /saved distributed-abuse risk separately.
5. Standard production PR `staging → main`; merge only after required checks, automatic production Vercel deploy, then verify `fairswap.in`/SHA/routes and logs. **No extra approval round**; owner performs final functional verification in production.
6. If failed, investigate logs before retry. Roll back application-only changes by GitHub revert or previous known-good Vercel production deployment. No DB rollback expected if no migration.

## Single coding-agent prompt

**Model: Claude Code Sonnet** (Opus only if authorization/RLS redesign becomes necessary). **Use Plan mode** for multi-file changes.

Implement the eight H44 work packages and acceptance criteria in this document. Work from the exact files/tests named above and preserve existing V19 intro, FSW-SEC-001, guest saved, public visibility and moderation. Keep all code local; no GitHub commits, pushes, branches, PRs, merges or Vercel/Supabase hosted deployment. Avoid broad repository scans; batch related edits. Deliver the exact changed/new file manifest, source+tests ZIP at repository-relative paths, automated test commands and outcomes, and any verified limitations. Respond concisely, no restating the task, show diffs only.

**Token advice:** start a fresh Claude Code Sonnet session for Homepage 4.4; manually /compact with a file-specific focus note at 50–60% context rather than waiting for automatic compaction.
