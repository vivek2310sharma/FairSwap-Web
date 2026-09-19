# FairSwap.in - complete phased roadmap

This describes the destination and sequencing, not an instruction to execute everything at once. Each milestone has a reviewed plan, authorized build, real verification, and separate human acceptance.

## Product boundary

Classifieds only: sellers advertise, buyers discover/contact them, both arrange item payment/exchange independently. One customer account supports both roles. Public, customer and staff interfaces share a coherent Next.js/Supabase application. No marketplace checkout, escrow, payouts, or shipping in any phase below without a future explicit product change.

## Phase 1 — complete, controlled-pilot classifieds platform (COMPLETED & VERIFIED)

> **Status**: **COMPLETED & VERIFIED** (2026-09-14)<br>
> **Verified Baseline Commit**: `79026f28e893f340a7da06e16e00d2f2836013cb` (historical `Phase1` implementation baseline; the branch was retired on 2026-09-18)<br>
> **Classification**: Controlled-Pilot Candidate (`v0.1.6-pilot.1`)

All Milestones 1.1 through 1.6 are implemented, hardened, and verified locally:

| Milestone | Scope & Deliverables | Verification Status | Baseline Evidence |
|---|---|---|---|
| **1.1 Foundation** | Original responsive local scaffold, Tailwind v4 design system, accessible landmark layouts, system font stack | **PASS** | Strict types, ESLint flat config, unit tests, Playwright desktop/mobile smoke |
| **1.2 Accounts & Security** | Supabase Auth, profiles, Direct-API RLS policies, two-layer RPC security, staff MFA (TOTP AAL2) | **PASS** | 22 pgTAP assertions, 24 security/RLS tests, 18 auth/MFA browser journeys |
| **Logging Baseline** | Structured JSON logging, recursive PII redactor, request correlation, Next.js 16 instrumentation | **PASS** | 24 observability tests, zero-dependency engine, client-error ingestion |
| **1.3 Listings & Moderation** | Category/location hierarchy, listing lifecycle, Sharp WebP derivatives, staff moderation queue | **PASS** | 50 pgTAP assertions, 38 security tests, 34 Playwright journeys, 24 routes |
| **1.4 Discovery** | GIN index full-text search, public search RPC, canonical views, slug history, favourites | **PASS** | 105 unit/discovery tests, 38 security tests, 40 Playwright journeys |
| **1.5 Communication & Safety** | Realtime direct messaging, user blocking, report intake/resolution, support tickets, GDPR/DPDP deletion | **PASS** | Two-session Realtime E2E, FK-safe account deletion, reporter privacy |
| **1.6 Pilot Readiness** | Staff user management, user suspension cascade, disaster recovery backup/restore, accessibility, Go/No-Go report | **PASS** | 173 unit tests, 85 security tests, 84 Playwright journeys, Turbopack build, DR restore test |

---

## Transition Bridge — Hosted Phase 1 Baseline (FairSwapTest & Vercel Staging) — ACCEPTED

> **Status**: **ACCEPTED & ESTABLISHED** (2026-09-18)<br>
> **Target Tag**: `hosted-phase1-baseline-2026-09-18`<br>
> **Baseline Commit**: `14e0e6a190b819b62e40dd46d86e081980323bd2` on branch `Phase1`<br>
> **Target Environment**: `FairSwapTest` (remote Supabase cloud) + Vercel Preview staging

This transition bridge has been successfully established and accepted as a verified staging reference baseline:

1. **FairSwapTest Supabase Cloud Setup**:
   - Remote `FairSwapTest` Supabase project (`wpppxlnbzqynvhpeuavd`) provisioned and verified.
   - Complete Phase 1 migration set (`20260914000001` through `20260916000019`) applied and operational.
   - Storage buckets `listing-originals` and `listing-derivatives` are private and server-mediated; direct anon/authenticated Storage access is not granted.
   - Remote staff administrator bootstrap executed and verified.

2. **Vercel Staging Deployment**:
   - `Phase1` branch deployed cleanly to Vercel Preview with production build optimizations (`next build` with Turbopack).
   - Serverless and client environment variables securely connected to the identical `FairSwapTest` project.

3. **Hosted Verification Scope Passed**:
   - **Auth & Session**: Sign-up, confirmation email flow, login persistence, and authenticated customer session handling.
   - **Staff MFA**: TOTP AAL2 enrollment and step-up enforcement on staff moderation endpoints.
   - **Listing Lifecycle**: Listing submission, private storage upload (`listing-originals`), and Sharp WebP derivative generation (`thumb`, `medium`, `large` in private `listing-derivatives`; both listing media buckets are private and server-mediated).
   - **Moderation**: Self-moderation prevention and independent moderator approval.
   - **Public Discoverability**: Approved listing became publicly visible, the public detail page rendered, and the cover image and both uploaded photos rendered while signed out.
   - **Conversation Initiation**: Buyer-seller thread creation linked to active listings.
   - **Realtime Messaging**: Two-way message exchange via Supabase Realtime channel subscriptions.
   - **Hydration Stability**: Message timestamp rendering made deterministic in Indian Standard Time (`Asia/Kolkata`), eliminating SSR/hydration discrepancies (Minified React error #418).
   - **Chat Accessibility**: Full accessible naming (`aria-label`) on icon-only messaging action buttons (`Send message`, `Report User`, `Block User`, `Report Message`).

> [!IMPORTANT]
> **Historical boundary notice**: This acceptance established the hosted staging reference only. The controlled production pilot was separately established later on 2026-09-18. The former `Phase1` branch is now retired. Production SMTP and `fairswap.in` DNS/TLS were subsequently completed; public launch still requires the remaining legal/compliance and operational sign-offs. Phase 2 remains NOT STARTED and NOT AUTHORIZED.

---

## Controlled Production Pilot Baseline — ESTABLISHED

> **Status**: **ESTABLISHED & VERIFIED** (2026-09-18)<br>
> **Production Tag**: `prod-pilot-baseline-2026-09-18`<br>
> **Baseline Commit**: `a81b0a5e3c77172e9f691462cac0cecb21a86723`<br>
> **Production**: `main` → Vercel Production → `https://fairswap.in` → `FairSwapProd` (`kriuhwppxgxsyyrbjsau`)<br>
> **Staging**: `staging` → `https://fair-swap-git-staging-fairswap.vercel.app` → `FairSwapTest` (`wpppxlnbzqynvhpeuavd`)

The controlled production pilot baseline is technically operational. Verification covered:

- **Production database and storage**: Migrations 1–21 aligned on `FairSwapProd` and `FairSwapTest`; `listing-originals` and `listing-derivatives` verified private.
- **Production auth and email**: Normal signup, email confirmation, sign-in, and password recovery passed; custom SMTP is configured through Resend with verified `auth.fairswap.in`. Google sign-in is live in production for existing FairSwap accounts with matching verified email (PR #61). Phone OTP authentication is **not implemented** (Issue #12 closed as Not Planned, PR #60 closed without merge).
- **Public Beta legal & grievance**: Terms of Service (`/terms`), Privacy Policy (`/privacy`), Acceptable Use (`/acceptable-use`), Security Disclosure (`/security`), mandatory 18+ age declaration, pilot policy re-acceptance (`/auth/reaccept-policies`), and the statutory Grievance Redressal mechanism (`/grievance`, Grievance Officer Vivek Kumar) with conditional Rule 3A / GAC appeal guidance are live in production (PR #56).
- **Monitoring & operations**: UptimeRobot HTTP/keyword monitoring and Cloudflare Universal SSL certificate alerts are active. Production transactional-email failure monitoring is active and verified end-to-end via signed Resend webhooks (`POST /api/monitoring/resend`) delivering sanitized alerts to Slack (PR #54, Issue #41). On 2026-09-19, the Platform Owner explicitly accepted the residual risks of operating as a single operator (no backup owner), running on Supabase Free without managed backups or PITR, and omitting additional automated alerting channels under Issue #41.
- **Staff administration**: First administrator bootstrap completed; `/admin` enforced TOTP AAL2 and successful enrollment/step-up was verified.
- **Listings and moderation**: A normal seller created a listing, uploaded two photos, submitted it for review, and an independent administrator approved it.
- **Public discovery and media**: The approved listing and both photos rendered while signed out with a clean browser console.
- **Messaging**: A separate buyer initiated a conversation; the seller received it and a seller reply appeared buyer-side in Realtime without refresh or duplicate messages, with a clean console.
- **Production domain**: `fairswap.in` and `www.fairswap.in` are routed to Vercel with HTTPS/TLS established.
- **Stable staging isolation**: The `staging` branch has a stable tester-accessible Vercel URL, uses FairSwapTest Auth callbacks, and a fresh staging signup was confirmed in `FairSwapTest` rather than `FairSwapProd`.

The branch model after the pilot baseline is intentionally simple:

- `main` is production.
- `staging` is the shared tester environment and uses FairSwapTest.
- Short-lived `feature/*` branches use Vercel Preview and FairSwapTest, then merge into `staging` for shared acceptance before promotion to `main`.
- There is no long-lived Phase 2 branch. Phase 2 remains **NOT STARTED / NOT AUTHORIZED**.

> [!IMPORTANT]
> **Public-launch boundary**: Controlled-pilot operation is active with infrastructure, legal policies, grievance mechanism, and email monitoring deployed. Wider public launch remains gated by deferred legal applicability review under Issue #38, outbound grievance delivery verification under Issue #37, and commercial/local registration evaluations.

---

## Phase 2 — Engagement and optional platform-service revenue (PLANNED)

> **Status**: NOT YET STARTED — Next permitted transition: Phase 2 planning/kickoff only after explicit human authorization. Phase 2 remains NOT STARTED and NOT AUTHORIZED.

Use real Phase 1 controlled pilot feedback to prioritize engagement and marketplace utility:
- Saved searches and matching item alerts.
- Price-drop notifications for favorited items.
- Structured, non-binding buyer-to-seller offers within chat.
- Seller dashboard statistics (views, saves, inquiries).
- Permitted message attachments and enhanced anti-fraud triage.
- Optional self-service monetization for FairSwap's OWN service (e.g. promoted listings or additional listing quotas). Billing applies strictly to FairSwap platform features; it does NOT introduce buyer checkout, escrow, or payment collection for items.

Do not begin Phase 2 implementation or database migrations until authorized.

---

## Phase 3 — Wider regional growth (FUTURE DIRECTION)

> **Status**: CONCEPTUAL — Subject to pilot validation and operational capacity.

Expand marketplace scale based on evidence from pilot operations:
- City expansion beyond the Jaipur pilot across verified regional hubs with local moderation capacity.
- Regional language localization and transliterated search support.
- Professional seller profiles, bulk inventory tools, and verified business badges.
- Scaled background job infrastructure and performance optimizations driven by real production metrics.
- Mobile application evaluation based on actual user demand.

---

## Operational Readiness Tiers & Launch Gates

To maintain strict operational clarity, the platform distinguishes five separate readiness states:

1. **Phase 1 Implementation Completion**: **ACHIEVED** — All functional code, RLS policies, tests, and runbooks are implemented and verified locally against Docker/Supabase containers.
2. **Hosted / Staging Readiness**: **ACHIEVED & ACCEPTED** (2026-09-18) — The historical hosted baseline was verified on FairSwapTest + Vercel Preview and preserved by `hosted-phase1-baseline-2026-09-18` at commit `14e0e6a`.
3. **Controlled Production Pilot**: **ACHIEVED & TECHNICALLY OPERATIONAL** (2026-09-18) — Production runs from `main` at `fairswap.in` against FairSwapProd; production smoke checks passed and the baseline is preserved by `prod-pilot-baseline-2026-09-18` at commit `a81b0a5`.
4. **Phase 2 Development**: **NOT STARTED AND NOT AUTHORIZED** — Phase 2 planning or implementation begins only after explicit human authorization.
5. **Public Production Launch Readiness**: **GATED** — Production SMTP, custom-domain TLS, statutory Grievance Officer details (`/grievance`), legal policies (`/terms`, `/privacy`, `/acceptable-use`, `/safety`), production transactional email monitoring, and Google sign-in (existing accounts) are complete. Operational risks (single operator, Supabase Free backup gap, omitted alert channels) were explicitly accepted under #41 on 2026-09-19. Issues #37 and #38 were closed as Not Planned on GitHub; remaining business/compliance gates deferred for wider launch include:
   - Final legal review of intermediary / E-Commerce Rules applicability recorded in closed Issue #38
   - Outbound grievance email delivery verification recorded in closed Issue #37
   - Local establishment registration evaluations (e.g., SAN / Rajasthan Shops Act)
