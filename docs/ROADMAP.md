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

## Transition Bridge — Hosted Phase 1 Baseline (FairSwapTest & Vercel Staging)

> **Mandatory Next Step**: Before any Phase 2 feature work or code changes begin, the verified Phase 1 application baseline must be deployed and validated in a hosted staging environment.

This bridge establishes a known-good, deployed reference baseline using the dedicated **FairSwapTest** Supabase project and **Vercel staging**:

1. **FairSwapTest Supabase Cloud Setup**:
   - Provision and prepare the remote `FairSwapTest` Supabase cloud project.
   - Apply and validate the complete Phase 1 migration set (`20260913000001` through `20260914000016`).
   - Configure required cloud environment variables and secrets.
   - Verify cloud database schemas, functions, RLS policies, and Auth configuration.
   - Validate cloud private and public Supabase Storage buckets and permissions.
   - Execute initial staff administrator bootstrap on the cloud database.

2. **Vercel Staging Deployment**:
   - Deploy the verified Phase 1 codebase (`Phase1` branch baseline) to Vercel staging.
   - Connect Vercel staging environment variables securely to the `FairSwapTest` Supabase project.
   - Utilize the default Vercel-generated deployment URL (`*.vercel.app`) initially if no custom staging domain is configured.

3. **Hosted Verification & Stabilization**:
   - Execute end-to-end smoke tests against the live hosted staging deployment.
   - Verify authenticated auth flows (sign-up, confirmation email delivery, sign-in, MFA).
   - Verify listing creation, image upload, Sharp WebP derivative generation in cloud storage.
   - Verify Realtime message streaming and moderation actions against the hosted stack.
   - Diagnose and resolve any cloud-specific network, header, cookie, or cold-start blockers.
   - Tag and establish the confirmed, known-good **Hosted Phase 1 Baseline**.

---

## Phase 2 — Engagement and optional platform-service revenue (PLANNED)

> **Status**: NOT YET STARTED — Planned to follow the successful establishment of the Hosted Phase 1 Baseline.

Use real Phase 1 controlled pilot feedback to prioritize engagement and marketplace utility:
- Saved searches and matching item alerts.
- Price-drop notifications for favorited items.
- Structured, non-binding buyer-to-seller offers within chat.
- Seller dashboard statistics (views, saves, inquiries).
- Permitted message attachments and enhanced anti-fraud triage.
- Optional self-service monetization for FairSwap's OWN service (e.g. promoted listings or additional listing quotas). Billing applies strictly to FairSwap platform features; it does NOT introduce buyer checkout, escrow, or payment collection for items.

Do not begin Phase 2 implementation or database migrations until the hosted Phase 1 baseline is accepted.

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
2. **Hosted / Staging Readiness**: **NEXT GATE** — Full Phase 1 stack deployed and verified on FairSwapTest Supabase + Vercel staging.
3. **Phase 2 Development**: **DEFERRED** — Feature work commences only after staging baseline is confirmed.
4. **Public Production Launch Readiness**: **GATED** — Public launch requires external legal and infrastructure sign-offs:
   - Authenticated production SMTP provider (DKIM/SPF)
   - Production domain (`fairswap.in`) with automated SSL/TLS
   - Statutory Grievance Officer appointment published in compliance with Indian IT Rules
   - Legal counsel review of user-facing agreements
