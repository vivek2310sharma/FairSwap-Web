# FairSwap Homepage 4.5 — Midnight Plum & Champagne
## STAGING-ONLY implementation handoff — 2 November 2026

**STATUS: DESIGN APPROVED, IMPLEMENTATION NOT YET COMPLETE. This document is not a deployed website.**

### Release boundaries — nonnegotiable

- **India first:** fairswap.in, ₹, English at launch, Hindi disabled/coming soon; other existing approved intro greetings remain untouched.
- **Target repository:** FairSwap-Web (Next.js App Router, TypeScript, Tailwind).
- **Verified upstream staging baseline:** `874cbcce65e86f5cb4ab4b1e36a8c986a805702f` (Homepage 4.4 + hero seam fix).
- **GitHub feature branch, already created by ChatGPT:** `feat/web-homepage-4-5-premium-plum`.
- **Destination for this release:** `staging` branch + Vercel staging alias `https://fairswap-web-git-staging-fairswap.vercel.app` **ONLY**.
- **Explicit prohibition:** DO NOT update `main`, do not deploy to Production, do not alias a preview to `fairswap.in` or `www.fairswap.in`, and do not trigger a release workflow that promotes to production. Ignore the ordinary automatic-production rule: the owner has explicitly required *staging only*.
- No hosted Supabase writes, schema migrations, new env vars or dependency changes for a visual redesign.
- Claude Code / Antigravity may implement **locally**. No git branch/commit/push/PR/merge/release commands from a coding agent; ChatGPT owns these through GitHub integration.

### Objective

Build an actual functioning, responsive **Homepage 4.5** in the *Midnight Plum & Champagne* visual direction, not a flattened picture or a mockup substituting for the site. Make FairSwap look premium and creative while retaining the clarity, fraud-awareness and speed of an Indian local classifieds product. Use the enclosed image `homepage-plum-visual-reference.png` only as art direction. It invents listing photos/data/claims/brand variants; don't copy any of those into the application.

### Approved visual palette

| Role | Hex | Usage |
|---|---|---|
| Midnight plum | `#271B38` | Hero/header/footer backgrounds |
| Deep aubergine | `#3B2443` | Gradient layers / tertiary dark cards |
| Champagne | `#F5D6BE` | Hero highlights, homepage primary CTA, headline accent |
| Warm ivory | `#FFF9F5` | Listings and category surface |
| Editorial ink | `#312432` | Text on ivory |
| Rose | `#9E4660` | Section accents and readable links on ivory |
| Lavender mist | `#EDE5F3` | Quiet story/step section |
| Blush surface | `#F6EAEB` | Seller and story backgrounds |
| Light on dark | `#FFF8F1` | Headings on plum |
| Muted on light | `#5F5064` | Listing/support copy on ivory |

Preliminary WCAG contrast pairs checked: `#FFF8F1` on `#271B38` 15.34:1; `#F5D6BE` on `#271B38` 11.73:1; `#312432` on `#FFF9F5` 14.08:1; `#9E4660` on `#FFF9F5` 5.75:1. Verify actual component state colors and icons; do not infer disabled text contrast from these values.

### Art direction and interactive behavior, by page section

**1. Home-specific header** — dark plum/glass-like navigation, subtly outlined champagne search and Post Ad action, tidy logo treatment, clear sticky header. Use the *existing FairSwap logo asset*, not the generated mockup's alternate logo. The source header is shared; pass a homepage appearance variant or scope selectors safely so non-home pages are unchanged. Preserve menu collapse behavior, account/auth buttons, keyboard focus, help links, English/Hindi options, sign out and safe-area layout. No giant header animation or rerouted navigation.

**2. Cinematic hero** — keep exact original headline **“Good things, closer to you.”**; warm ivory + champagne typographic accent. Center the existing real, functional category-search and location selector. **Approved original man-with-laptop on left and woman-with-headphones on right**, as source-approved WebP files; never generate replacement faces/outfits, recolor images, use animal mascots, or alter character proportions. Blend plum-to-aubergine with small CSS warm radial washes and restrained curve/ribbon shapes; no giant raster art or opaque decorative SVG image. Hero's right-side rectangular map seam must stay absent. Mobile hero puts headline/search first, reduced characters later. At 50% browser zoom avoid stranded narrow content. Search entry must stay useful with real category suggestions. No geolocation without explicit interaction.

**3. Visible safety reminders** — three distinctly designed links on or just below the hero: *Meet in a public place*, *Inspect before paying*, *Avoid advance UPI payments*. Keep Indian fraud language precise: to receive money, a seller should not scan a QR, enter a UPI PIN, or approve a collect request. They link to the actual `/safety`. Motion is a small raise/outline on hover/focus; never imply escrow, seller verification, purchase guarantee or fraud-free trading.

**4. Editorial categories** — clean ivory canvas and photo category tiles from actual existing taxonomy. Gentle scale/elevation or a thin champagne tracking light on hover; preserve real category links. Optional smooth in-view heading reveal must not hide content if JS fails. Maintain touch-friendly horizontal row and accessible focus on mobile.

**5. Fresh Finds listings** — warm ivory backdrop, white/off-white listing cards, clear near-black prices, location and seller details, no high-opacity decorative overlays over photos. Keep current approved data and existing gallery behavior (lazy first-hover/keyboard focus; tap next/prev on touch; bounded authorised public photo IDs; no raw originals). Existing favourites and item navigation must remain. A small champagne border/raise may indicate hover, but cards must remain readable and fast. Never fabricate ratings, discounts, stock, prices, photos, listings or cities for visual effect. Preserve placeholders for missing photos.

**6. How It Works** — pale lavender/blush band with four actual steps **Browse → Connect → Inspect → Exchange**, existing approved scene assets, high-quality selected-state animation. Make selected step react on hover/focus/tap with an accessible outline and scene update. Keep “FairSwap does not handle payments” disclaimer. No made-up videos or promises.

**7. Trust & Safety section** — dark aubergine/pale lavender contrast in the existing SafetyBand/InteractiveSafety modules; real safety content and links remain. Differentiate visually from the hero without repeating all reminders.

**8. Seller CTA** — champagne/blush panel with compelling editorial heading **“Have something to pass on?”** and functional **Post Ad** action. Reuse approved walking woman in current repo. No false claims of guaranteed reach/sales, free listing or fees unless verified by product logic.

**9. Signature premium footer** — signature finale in Midnight Plum, elegant oversized “FairSwap.” brand wordmark made from actual HTML text (not an invented new logo), sophisticated link columns, a concise statement **“Good things deserve another chapter.”** / **“Buy locally. Sell simply. Exchange more safely.”** and a modest real Post Ad link. Keep **all existing** working footer destinations: browse, device saves, account favourites, post ad, Help Centre, `/safety`, contact link, support email, WhatsApp, Terms, Refund & Cancellation, Privacy, Acceptable Use, Grievance Redressal, and language selector. Group with good information architecture, but do not delete or invent links. No dummy social accounts, fake app store buttons, newsletter signup without backend or imaginary company/team/careers pages. Mobile footer uses 2-col/1-col readable groups with >=44px touch hit areas, working focus-visible affordances and reduced-motion fallback. A small upscale upward reveal and soft wordmark movement only if on screen, CSS transform/opacity, no scroll jacking.

**10. Page rhythm / scroll** — dark hero → airy ivory category/listings → blush/lavender interactive story → deeper safety band → warm seller CTA → midnight plum footer. Original page should feel like a coherent narrative. Any scroll reveal stays progressive (visible without JS), respects reduced-motion and Save-Data, and avoids CLS/LCP regressions. Use existing `Reveal` primitive if possible; no heavy animation library or client JS for visual-only effects.

### Scope and architecture

Existing reviewed files (check immediate imports and tests rather than searching the entire repository):

- `src/app/page.tsx` — homepage composition and safely scoped premium wrapper
- `src/app/globals.css` — **home-scoped** new tokens/CSS or a dedicated `src/app/home-premium.css` imported only for home, NOT global palette changes for every route
- `src/components/header.tsx` — home-specific visual variant if necessary, retaining current functionality
- `src/components/footer.tsx` — premium homepage variant; default style remains correct on other routes
- `src/components/listings/HomeDiscovery.tsx` — hero/safety/category composition
- `src/components/home/HeroMascots.tsx` — approved mascot placement only
- `src/components/home/HomepageStory.tsx`, `src/components/home/InteractiveSafety.tsx`, `src/components/home/SafetyBand.tsx`, `src/components/home/SellerCta.tsx`, `src/components/home/Reveal.tsx`
- `src/components/listings/RecentListingsSection.tsx`, `src/components/listings/ListingCard.tsx` for appearance-only changes, keep gallery/data authorization untouched.

Review the current `src/app/globals.css` for global semantic vars. **Do not replace** the root tokens `--fs-primary`, `--color-foreground`, etc globally; unrelated auth, saved/search, listing details and safety routes must not be recolored. Do not accidentally remove the `max-[360px]:gap-x-1` homepage spacing correction, intro session policy or the recently fixed map seam.

### Explicitly protected existing features

V19 intro with multiple greetings and exact session/reduced-motion/skip semantics; final hold 1900ms and slide-up exit; approved mascot assets; media authorization FSW-SEC-001; moderation and RLS; anonymous `/saved` flow with 50-ID cap and explicit merge; image gallery contract; safe UPI tips; real listing/category data; accessible interaction and header responsive breakpoints. No backend or domain/URL changes.

### Acceptance and automated verification

- No project dependency, database migration or environment variable changes expected.
- Lint, TypeScript typecheck, focused Vitest, security tests, and production build on local code. Record actual exit code and environmental limitations.
- Focused browser specs verifying user interactions, search, category navigation, actual gallery fallback/controls, focus visibility, footer navigation, safety links and absence of hero map seam.
- Responsive browser matrix: **320, 360, 390, 768, 1024, 1280, 1440, 1920, 2560, 3840** CSS px + equivalent zoom cases; no horizontal scroll, form collision, or mascot distortion.
- Accessibility: WCAG AA contrast, reduced-motion, Save-Data, 44px touch controls where applicable, HTML under no-JS, screen reader labels, interactive focus order.
- Automated comparison tests ensure routes beyond `/` keep existing visual tokens/structure (e.g. `/search`, `/saved`, `/auth/sign-in`), unless their shared footer variant is intentionally unchanged.
- Performance: no new large raster backgrounds; keep LCP critical image sizes and dynamically loaded galleries; avoid expensive blur at scroll, measure payload and Core Web Vitals proxy where possible.
- Deliver **before/after automated screenshots**, exact repo-relative delta patch, source+test ZIP and `HANDOFF.md`. No manual exploratory testing required of owner.

### Deployment and ownership (staging only)

1. Coding agent works entirely in the existing **local FairSwap-Web** workspace, preserving dirty work and taking a pre-task snapshot of touched files. It may use a local worktree only as isolation, not Git delivery.
2. Agent prepares source+test ZIP and concise diff/evidence handoff; **NO GitHub, Vercel, hosted Supabase, or deployment action** from agent.
3. ChatGPT reviews and reconciles against the latest `staging` branch, creates reviewed GitHub blobs/commit on `feat/web-homepage-4-5-premium-plum`, opens PR targeting `staging` only, reviews all required CI.
4. On CI green: ChatGPT merges to `staging`; checks Vercel staging READY + matching Git SHA; tests `/`, `/saved`, `/search` and focused UI/interaction via available automation, error/fatal logs. Share staging URL/screenshots.
5. **STOP. No `main` PR, no production deploy, no `fairswap.in` alias changes.** Production remains on its existing release until user **explicitly** asks.
6. If staging is unsatisfactory or fails a gate: revert staging commit or restore previous known-good staging Vercel deployment. No database rollback expected.

### Autonomous Claude Code instruction

**Model: Sonnet, Plan Mode initially (Opus only if an unexpected security-sensitive architecture problem arises).** Read this document and the original visual reference image, then plan briefly and execute. All routine local coding, tests, debugging and packaging are approved. Do not ask the owner to run commands, approve plan mode exit or perform tests; don't stop after planning. Keep functionality intact and modify exact source files named above plus necessary immediate imports/tests. Preserve dirty-tree changes; do not scan unrelated repos. Do not commit/push/open PR/merge/deploy or edit hosted databases. Return the ZIP, manifest and verification table. Be concise; don't restate the request, show only relevant diffs and results.

**Token advice:** use a fresh Sonnet context for this unrelated premium visual phase; manually `/compact` near 50–60% context with the affected files and release restrictions.