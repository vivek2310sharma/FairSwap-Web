# Claude Code handoff — FairSwap 3.0 homepage (staging implementation)

**Mode:** Claude Code **Sonnet** (default for multi-file features), **Plan Mode first**.
**Repo:** `vivek2310sharma/FairSwap-Web`
**Delivery branch owned by ChatGPT:** `design/fairswap-homepage-3-staging`
**Review baseline at specification creation:** staging `0e9a35d916318884504122d3519855c5096a4506`.
**GitHub actions:** ChatGPT only. Claude may inspect local Git state read-only but MUST NOT create branches, commit, push, open PRs, merge, run GitHub Actions, or deploy.
**Source:** Read `docs/design/fairswap-homepage-3-staging.md` and the paths below. Treat the older `fairswap-homepage-3-codex-task.md` as superseded only in choice of coding agent; its data-flow/acceptance contracts remain applicable.

## Task
Implement the user-approved FairSwap 3.0 **homepage** concept as functional Next.js code, not a standalone mockup. Scope staging first. Keep existing premium Indian man/woman character identities, original hero WebP variants, 5.2-second no-flash handshake intro, category photos, active categories, live listings, public-area search, favourites, auth/navigation, Hindi/English, light/dark and safe browsing. Make it look polished, distinctive and professional; not a grocery/Blinkit clone. No fabricated reviews, counts, badges, sellers, price tags or fake listings.

## Read exact files before changing
1. `src/app/page.tsx`
2. `src/components/listings/HomeDiscovery.tsx`
3. `src/components/listings/RecentListingsSection.tsx`
4. `src/components/listings/DiscoveryLocationSelector.tsx`
5. `src/lib/location/discovery.ts`
6. `src/lib/discovery/queries.ts`
7. `src/components/listings/ListingCard.tsx`
8. `src/components/home/CategoryBento.tsx`
9. `src/components/home/FairSwapHeroArtwork.tsx`
10. `src/components/home/fairswap-art.ts`
11. `src/components/home/SafetyBand.tsx`
12. `src/components/home/HowItWorks.tsx`
13. `src/components/header.tsx`
14. `src/app/globals.css`
15. For compatibility, read (avoid edits unless proven necessary): `src/components/home/FairSwapIntro.tsx`, `src/components/home/FairSwapIntro.module.css`, `src/components/home/IntroGate.tsx`.
16. Target tests: `src/__tests__/page.test.tsx`, `src/__tests__/recent-listings.test.tsx`, `src/__tests__/category-images.test.ts`, `src/__tests__/home-artwork-intro.test.tsx`, `src/__tests__/header.test.tsx`, `e2e/fairswap-intro.spec.ts`, `e2e/homepage-performance.spec.ts`; find existing responsive/location specs by filename only. Do not scan the whole repo.

## Required experience
- Desktop: clean sticky header; a compact two-column hero, headline `Find more. Share more. Trust more.`, real search and public-area picker, **approved existing character pair**; concise safety micro-strip; active category shortcuts; `Fresh Finds Near You` showing actual approved public listings early; tasteful sell call-to-action; full safety band, how it works, footer.
- Mobile/tablet: intentional composition with prominent search and city, compact art, quick category browsing, early real listing grid, five-tab nav preserved, 44px+ targets, no overflow or clipped English/Hindi at 320/360/390/768.
- Dark mode, keyboard, accessible contrast, reduced motion, low-bandwidth responsive media, SSR and missing-art/no-data graceful states.
- Never create fake “verified seller” or guaranteed safety UI. Keep UPI/OTP/QR scam warnings correct.
- No new illustrations. Use existing `public/animations/fairswap-intro/` and `fairswap-art.ts`; preserve the precise approved faces, clothing and animation.
- Crucial data-flow fix: `RecentListingsSection` currently queries all-India newest despite selected area in client-only HomeDiscovery. Design a validated canonical public-area state (prefer URL city/locality for SSR) shared by hero and feed. Area changes update homepage route safely and preserve search navigation to `/search`; saved public area restore synchronizes without redirect loops or overriding explicit URL area. Empty local results shown clearly, RPC failures distinguished from genuine emptiness, no disclosure of private location.
- Update stale tests expecting old heading and null empty state rather than weakening checks.
- Never change unrelated ratings/IDV/chat/auth/database/CI code on newer staging.

## Constraints / release
- Tech: Next.js App Router/React/TypeScript/Tailwind, Supabase public RPC + Zod, no RLS bypass.
- **Files changed:** limited to the UI and tests listed above; describe every additional dependency.
- **DB migrations:** none for this UI phase. **Env vars:** none. **Edge functions/config:** none. If truly necessary, report a separate backward-compatible staged migration/RLS plan for staging and prod, do not silently implement.
- **Deploy order:** ChatGPT will reconcile against newest staging, commit audited changes, open PR into `staging`, inspect CI, merge and verify Vercel staging. **Production is held until owner's staging design approval** (explicit staging-first instruction). After approval ChatGPT will create a focused `main` production PR and deploy after automated CI, preserving prod-only features.
- **Production check by owner:** hero and 5.2s intro, mobile/tablet/desktop, Hindi/English, live category/listing images, selected-city feed, accessibility, safety warnings, search/post ad.
- **Rollback:** revert PR or restore previous Vercel deployment; no DB rollback this phase.

## Automated gates
`pnpm install --frozen-lockfile`
`pnpm typecheck`
`pnpm lint`
`pnpm vitest run src/__tests__/page.test.tsx src/__tests__/recent-listings.test.tsx src/__tests__/category-images.test.ts src/__tests__/home-artwork-intro.test.tsx src/__tests__/header.test.tsx`
`pnpm build`
Run relevant repo-defined Playwright configs for intro, responsive layout and homepage interactions. Preserve all existing CI gates. No manual/exploratory testing.

## Output
After Plan Mode, implement the complete task. Return only the exact edited/new repo-relative file paths, focused diffs, automated checks (passes/failures), and a ZIP/patch at repo-relative paths for ChatGPT GitHub integration. Do not ask the owner to test before staging deployment; ChatGPT will manage the stage release. **No Git operations or deployment by Claude.** Respond concisely; don't restate the assignment.

**Token advice:** Start a new Claude Code Sonnet session or `/clear` if prior work involved unrelated features/repos; this is a cohesive multi-file homepage task. Run `/compact` around 50–60% context if needed, focused on modified files and unresolved failures. Do not edit CLAUDE.md/MCP configuration mid-session.
