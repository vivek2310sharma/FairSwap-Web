> Ratings V1 local candidate (26 October 2026): authenticated review, buyer selection/confirmation, public reputation and typed chat cards use the canonical Backend contract. Both server flags default OFF. No Web migrations or hosted changes. See [release and verification notes](operations/RATINGS_V1_WEB_HANDOFF.md).

# Current FairSwap-Web state and boundaries

> Chat V2 Web local candidate (26 October 2026): mobile inbox/thread navigation, backend pagination, seller enquiry groups and recipient-only safety display are behind server-only `FAIRSWAP_CHAT_V2_INBOX_ENABLED=false`. Legacy messaging remains the default. No database migration or hosted deployment. See [implementation and release handoff](operations/CHAT_V2_WEB_HANDOFF.md).


> Posting V2 / Mobile Phones local candidate (25 October 2026): implemented source remains gated off pending release checks. See the parent workspace's `FairSwap-Backend/supabase/forward-migrations/posting-v2/README.md` for exact files, passing automated release checks, selective patches, migration order and cleanup. No hosted deployment occurred.

> Homepage/location discovery local candidate (25 October 2026): compact live-category discovery, public-area/PIN selection and optional server geocoding; no database migration. GPS requires server configuration. See [implementation and release handoff](operations/HOMEPAGE_LOCATION_DISCOVERY.md). Hosted deployment and acceptance remain pending.

> India taxonomy local candidate (24 October 2026): bilingual discovery and 15 ordinary Goods migration candidates; safety-dependent categories remain unavailable. See [scope and release dependencies](operations/INDIA_TAXONOMY_UPGRADE.md).

> ADS-01 production release preparation (23 October 2026): local main-based port; release and hosted acceptance are pending. See [handoff and verification](ADS-01-PRODUCTION-HANDOFF.md).

**Snapshot:** 14 October 2026. This is an **operational summary**, not a substitute for the live code, GitHub release checks, Supabase Dashboard or fresh legal advice. Update dated evidence when architecture or operational status changes.

## Product and audience

FairSwap.in is an **India-first classifieds marketplace** competing on **trust, fraud reduction and clearer seller/buyer safety** rather than promising that users are protected by escrow. Typical risks include fake advance-payment requests, forged buyer payment links, fake delivery/courier fees and impersonation. The platform does **not** act as buyer/seller checkout, money escrow, item-delivery provider or user-to-user payments intermediary in the current Web implementation.

Optimize customer Web UX for **mobile, low bandwidth and modest Android hardware**. English is the observed base UI. Hindi and regional language expansion are product directions unless a feature's locale implementation is independently verified.

## Deployment topology

| Boundary | `main` / Production | `staging` / Test |
| --- | --- | --- |
| Web | https://fairswap.in | https://fair-swap-git-staging-fairswap.vercel.app |
| Supabase | `FairSwapProd` (`kriuhwppxgxsyyrbjsau`) | `FairSwapTest` (`wpppxlnbzqynvhpeuavd`) |
| Data & credentials | Live, highly restricted | Test data and permitted synthetic fixtures |
| Releases | Only accepted production changes | Integrated development work including Test-only utilities |

As of this snapshot, the branch reconciliation PR [#146](https://github.com/vivek2310sharma/FairSwap-Web/pull/146) merged main's current history into staging without shipping staging-only S1 capture work to Production. **27 staging-only commits** and **zero missing main commits** were verified then; numbers will change with future releases. **Different history or extra staging features are not a defect.**

Do not run automated migrations, `config push`, bulk notification tests, or privileged user/admin mutations against hosted projects without explicit separate approval. Auth email HTML is a hosted Supabase configuration surface; merely merging template files does not update it.

## Implemented and checked

| Area | Grounded state |
| --- | --- |
| Web stack | Next.js 16 / React 19 / TypeScript / Tailwind v4, Supabase-backed App Router, Vercel, GitHub Actions |
| Account login | Email/password sign-in; six-digit sign-in OTP for eligible accounts; email confirmation and password reset |
| OAuth & phone | Current Web sign-in UI has **no Google button** (legacy OAuth callback handling remains in source); phone-number/OTP sign-in is not implemented |
| Staff and DB authorization | Staff AAL2/TOTP; owner/RLS and security-sensitive RPC boundaries; private listing originals |
| Listings and interaction | Listings, moderation, search, favourites, buyer/seller messaging, blocking, reporting and support |
| Moderation dispatch | The same Vault-verified moderation Edge worker source was inspected in Test, Production and `main` on 2026-10-14; server-only verification RPC denied `anon` and ordinary `authenticated` in Test |
| Auth email design | Branded signup confirmation (#126), six-digit OTP (#111) and recovery (#142); recovery real-inbox and password reset accepted in Test and Production 2026-10-14 |
| Post Ad work | Existing Goods flows plus ongoing category and owner-draft development; S1 non-delivering email capture exists in staging source only, and is **not deployed to FairSwapProd** |
| India postal provenance | Read-only 2026-10-14 audit: **both hosted projects** hold **165,620** `data.gov.in`-labelled rows spanning **19,586** PINs; `source_updated_at` is NULL. See [postal runbook](india-postal-data.md) for original September mirror provenance and limits of this evidence. |
| GitHub branch safeguards | As inspected 2026-10-14, both branches report `protected: false`; ruleset/protection details were **not independently accessible** (HTTP 403). PR+CI review is team policy, not proven to be an enforced merge restriction; see [owner matrix](operations/operational-owner-matrix.md). |

A passing CI status and a working Vercel deployment do not establish **wider public-launch certification**. See [operations readiness](operations/public-beta-operations-readiness.md), [grievances](operations/grievance-handling-runbook.md), [backup/restore](operations/backup-restore-runbook.md) and [incident response](operations/incident-response-runbook.md) for recorded decisions and residual risk.

## Development and release policy

1. Issues and accepted specifications define the feature; **no numbered phase may block or automatically authorize a change**.
2. Short-lived branches from `staging` are the integration path. Run relevant tests, RLS negative cases, CI, and hosted Test acceptance.
3. For Production, select reviewed changes only. A focused main-based PR avoids accidentally releasing staging-only features. Reconcile Production-only changes back to staging, preserving Test-specific code.
4. Do not assume that code changes apply database migrations, deploy Supabase Edge functions, update hosted Auth templates or modify provider credentials.
5. Save sanitized rollout evidence. Store credentials, tokens and rollback backups outside source control.

## Outstanding decisions, not asserted as shipped

Prioritization happens per issue, not by `Phase 1` / `Phase 2` / milestone sequence. [Roadmap](ROADMAP.md) separates operational gaps, Product improvements, staged technical work and deliberately deferred features. New-device login emails ([#110](https://github.com/vivek2310sharma/FairSwap-Web/issues/110)) are closed as **not planned for now**; do not re-open them through a generic email-template cleanup. Native mobile builds follow the separate Android Studio / iOS Xcode workflows; this Web repository defines only its Web service contracts.

Historical milestone plans and one-time acceptance reports still exist for traceability but are not current setup instructions. See [docs index](README.md#historical-project-records).


HDR-03 local review (23 October 2026): the isolated staging cleanup centralizes navigation auth and unread badges, preserves server/RLS authorization, and refreshes counts after successful notification reads. This is local implementation evidence, not hosted acceptance. `get_unread_counts()` must enforce the caller identity and return non-negative integer `unread_messages` and `unread_notifications`; without it, notifications use an owner-scoped exact count and chat badges are omitted. No Backend, RLS or hosted changes are included.

HDR-03 review 5627179716 follow-up: direct authenticated identity switches now discard private document/router state; loading auth and unavailable counts stay explicitly unknown. The companion Backend candidate defines individual inbound-message counts and owner-only `unread_count_signals` events for arrivals/read markers. Hosted installation and two-user/two-tab acceptance remain outstanding; source review does not authorize deployment.

HDR-03 Production release preparation (23 October 2026): selected merged staging PR #234 onto main-based release/hdr-03-main-20261023 at bad68d0, without merging staging. Centralized session-aware navigation, owner-scoped unread refresh, unknown chat-count fallback, private-state invalidation on identity change, and newest-100/read-cursor corrections are included. Production category, ListingCard, moderation and SRCH-04 implementations remain unchanged. Backend installation and genuine two-account Test acceptance are separate release gates; no deployment is authorized. See [release evidence and owner acceptance steps](operations/HDR03_PRODUCTION_RELEASE_20261023.md).
# Ratings operations update (28 October 2026)

Local operational source is prepared; hosted configuration and deployment are NOT RUN.
See [Ratings operations](operations/RATINGS_V1_OPERATIONS.md). Ratings flags remain OFF.

