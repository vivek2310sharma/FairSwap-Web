# FairSwap.in - complete phased roadmap

This describes the destination and sequencing, not an instruction to execute everything. The first action is PLAN ONLY for Milestone 1.1. Each milestone has a reviewed plan, authorized build, real verification, and separate human acceptance.

## Product boundary

Classifieds only: sellers advertise, buyers discover/contact them, both arrange item payment/exchange independently. One customer account supports both roles. Public, customer and staff interfaces share a coherent Next.js/Supabase application. No marketplace checkout, payouts or shipping in any phase below without a future explicit product change.

## Phase 1 - build a complete, controlled-pilot classifieds platform

| Milestone | Actual outcome | Key acceptance evidence | External prerequisites |
| --- | --- | --- | --- |
| 1.1 Foundation | Original responsive local scaffold, conceptual architecture/design, tooling and tests | Preserved project files; real lint/types/unit/build/startup; Chromium desktop/mobile viewport tests | Compatible Node/pnpm, reviewed package/browser downloads; NOT Supabase/Docker |
| 1.2 Accounts/security | Local Supabase, confirmed Auth, profile privacy, roles/status, staff MFA | Real local email/session flows, migrations, RLS/direct-API tests, privilege denial | Approved local Supabase CLI/Docker setup; no production service needed |
| 1.3 Listings/moderation | Typed categories/locations, drafts/photos, submission, staff approval, lifecycle | Real uploads/validation; storage/owner controls; transition/re-review/expiry tests | Working local backend and approved image-processing dependencies |
| 1.4 Discovery | Real browse/search/listing/seller pages and favourites | Combined filters, stable pagination, private-content/cache denial, mobile UI | Approved listings; no extra search provider required |
| 1.5 Communication/safety | Persistent chat, notifications, blocks/reports, support/appeals, privacy processing | Two real sessions; RLS/Realtime denial; staff evidence and privacy tests | Local Realtime; optional activity email only if configured |
| 1.6 Pilot readiness | Regressions, hardening, recovery, operational and release preparation | End-to-end proof, recovery evidence, launch blockers/go-no-go report | Separately approved staging/production/provider setup where needed |

### 1.1 internal batches

Plan/environment checks -> preserve-and-scaffold -> focused architecture/design -> original responsive local page -> actual tooling/tests -> final evidence/review. No account/database code is allowed just because it is planned conceptually.

### 1.2 internal batches

Local runtime/schema -> Auth/profile -> trusted permissions -> staff MFA/access -> privacy-request intake -> security/integration/regression tests.

### 1.3 internal batches

Categories/locations -> listing draft/submit -> safe photo pipeline -> staff review/state rules -> relevant cleanup -> seller/moderator/storage tests.

### 1.4 internal batches

Search/indexes -> public pages -> favourites -> metadata/cache visibility -> responsive/discovery tests.

### 1.5 internal batches

Persistent messages -> live notifications -> blocks/quotas -> reports/support/case evidence -> privacy completion -> two-session/failure/security tests.

### 1.6 internal batches

Feature audit -> full regression/security -> failure/recovery -> browser/accessibility/performance -> operations/legal/provider checklist -> go/no-go recommendation.

The precise commands and files are proposed when each milestone is planned against actual code. For a large milestone, ask for smaller reviewed batches, not a one-shot forest of unfinished modules. All six task contracts are in `docs/milestones/`; do not load every one into every conversation.

## Phase 2 - engagement and optional platform-service revenue (not authorized)

Use real Phase 1 pilot feedback to prioritize saved searches and matching alerts, price-drop notices, structured non-binding offers, seller statistics, permitted message attachments, better search and fraud triage.

After a reviewed business decision, test one simple paid product such as promoted advertisements or additional listing allowances. Billing would be for FairSwap's OWN service. It does not introduce buyer payment for goods, seller settlement, delivery or buyer protection. Plan payment-provider eligibility, activation/expiry/refund/idempotency and transparent promotion labels before coding.

Success measures: relevant searches, genuine contacts, seller response, repeat use, safety/support workload, and sustainable service revenue where enabled. Label off-platform sales as seller-reported, not verified transaction volume. Do not build Phase 2 tables/screens in Phase 1.

## Phase 3 - wider growth (not authorized)

Expand cities and languages only with adequate listing supply and moderation/support capacity. Consider professional seller profiles, bulk listings, seller teams and subscriptions after validating demand. Add regional/transliterated search, optional recommendations and measured infrastructure improvements.

Native apps and a separate search cluster are optional responses to evidence, not requirements to call the website complete. Do not change to microservices simply because the roadmap says 'scale'. Define browser support, privacy and operational capacity as expansion proceeds.

## Release gates

1. PLAN approved is permission to implement that scope, not proof of completion.
2. Required tests passed means READY FOR REVIEW, not human acceptance.
3. HUMAN ACCEPTED is recorded from the real user, not a generated artifact.
4. Next planning/build needs a new explicit request.
5. Public launch needs separate technical, business/legal and operational sign-off plus deployment authorization.

Security, accessibility, testing and recoverability develop throughout Phase 1. Milestone 1.6 verifies and strengthens them; it is not the first time they are implemented.
