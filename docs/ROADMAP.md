# FairSwap.in - complete phased roadmap

This describes the destination and sequencing, not an instruction to execute everything at once. Each milestone has a reviewed plan, authorized build, real verification, and separate human acceptance.

## Product boundary

Classifieds only: sellers advertise, buyers discover/contact them, both arrange item payment/exchange independently. One customer account supports both roles. Public, customer and staff interfaces share a coherent Next.js/Supabase application. No marketplace checkout, escrow, payouts, or shipping in any phase below without a future explicit product change.

## Phase 1 — complete, controlled-pilot classifieds platform (COMPLETED & VERIFIED)

> **Status**: **COMPLETED & VERIFIED** (2026-09-14)<br>
> **Verified Baseline Commit**: `79026f28e893f340a7da06e16e00d2f2836013cb` on branch `Phase1`<br>
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
> **Boundary Notice**: Acceptance of the Hosted Phase 1 Baseline confirms hosted staging readiness / pre-pilot readiness. Starting a controlled pilot still requires separate human authorization. It does **NOT** constitute public production launch approval. Public launch requires separate external sign-offs: authenticated production SMTP (SPF/DKIM), production domain (`fairswap.in`) DNS/TLS, statutory Grievance Officer appointment under Indian IT Rules, and legal review of agreements. Phase 2 remains NOT STARTED and NOT AUTHORIZED; Next permitted transition: Phase 2 planning/kickoff only after explicit human authorization; `main` branch remains untouched.

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

To maintain strict operational clarity, the platform distinguishes four separate readiness states:

1. **Phase 1 Implementation Completion**: **ACHIEVED** — All functional code, RLS policies, tests, and runbooks are implemented and verified locally against Docker/Supabase containers.
2. **Hosted / Staging Readiness**: **ACHIEVED & ACCEPTED** (2026-09-18) — Full Phase 1 stack deployed and verified on FairSwapTest Supabase + Vercel Preview (`hosted-phase1-baseline-2026-09-18`, commit `14e0e6a`). Hosted staging readiness / pre-pilot readiness confirmed; starting a controlled pilot requires separate human authorization.
3. **Phase 2 Development**: **NOT STARTED AND NOT AUTHORIZED** — Next permitted transition: Phase 2 planning/kickoff only after explicit human authorization.
4. **Public Production Launch Readiness**: **GATED** — Public launch requires external legal and infrastructure sign-offs:
   - Authenticated production SMTP provider (DKIM/SPF)
   - Production domain (`fairswap.in`) with automated SSL/TLS
   - Statutory Grievance Officer appointment published in compliance with Indian IT Rules
   - Legal counsel review of user-facing agreements
