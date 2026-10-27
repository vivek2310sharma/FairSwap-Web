# Ratings V1 Web candidate — 26 October 2026

Local implementation only. Both feature flags remain OFF. No GitHub mutation,
deployment, hosted migration or hosted test mutation was performed.

## Source and integration boundary

Observed starting HEAD: `93163a7cac11ac7b49f641fc3853d5ce9ebde8cb`.
Requested staging target: `2472884c519d55df7d8d0e48975421111530c1af`.
Requested production main: `5a7176a74d3fb83baf6e2123552185a2436eb5ce`.
These supplied targets were not fetched or synchronized. The starting checkout had
substantial tracked, staged and untracked concurrent work. Originals of every
modified existing file are saved in the sibling `ratings-v1-web-handoff/originals/`.
The ZIP contains a scoped diff against those originals, source, inventory and hashes.
It must not be treated as a replacement for either target branch.

Read-only canonical references:
[Backend PR 59](https://github.com/vivek2310sharma/FairSwap-Backend/pull/59),
[consumer contract](https://github.com/vivek2310sharma/FairSwap-Backend/blob/feat/ratings-v1-backend/docs/contracts/ratings-v1.md),
[DTO reference](https://github.com/vivek2310sharma/FairSwap-Backend/blob/feat/ratings-v1-backend/src/lib/ratings/contract.ts)
(observed DTO blob `c641e0bd38516a520669725038f5f0996979b782`).
Backend GREEN CI is user-reported; it was not independently rerun here.

## Implementation

The domain RPC adapter uses the authenticated cookie client for private requests,
strict Zod DTOs and exact parameter names. Generated database types, SQL, Backend
mirrors, CI and message transport are unchanged by this candidate. Backend remains
authoritative for eligibility, privacy, immutable writes, reports and reputation.
Writes additionally preserve current-policy, active-account and maintenance gates.
Missing RPCs, invalid DTOs and disabled Backend features fail closed without a
legacy-write fallback when Ratings is enabled. Transient transaction errors retry
the complete idempotent RPC at most twice.

Mark sold opens a dedicated buyer-selection route; selection sends a conversation
ID, with Not now and None alternatives. Backend rejects arbitrary/foreign
conversations and historical sold listings without an eligible trade. Feature OFF
retains the existing listing transition path. Outstanding selection can resume from
To rate. Buyer confirmation is a separate POST action before the optional wizard;
abandoning the wizard does not undo confirmation. Sellers receive no buyer-confirm
control. Disputes require an explicit second action and backend eligibility.

Private To rate, Received and Given use 20-row timestamp/UUID cursors. Given supports
own sealed reviews and typed Not rated history. Received/public paths reject sealed
reviews. Pagination, unavailable/empty/expired/loading states, bilingual text, native
radio controls, 44px targets, plain-text rendering and Unicode codepoint validation
are included. Reviews have three required four-face dimensions, role-specific tags,
preview and an immutable-submission warning. Replies are permanent and reports use
existing backend support cases. Refresh discards stale paginated private content.

Public profiles and listing summaries display NULL as No ratings yet and retain a
legitimate numeric 0.0. Public summaries use backend aggregates and never recompute
the three-review threshold. Existing profile visibility remains under RLS. No
contact details are added. English/Hindi Ratings routes use `lang=en|hi`; listing
summaries and trade cards also accept that parameter. This does not translate the
pre-existing surrounding marketplace or Chat V2 UI.

Trade cards are fetched through `ratings_trade_for_conversation` and the separate
typed `ratings_events` projection in legacy and Chat V2 routes. Ordinary message
content is never parsed into official events. Event and message cursors stay separate.
Notifications recognize only the exact internal `/account/ratings` link, reusing
the backend's existing notification enum. Ratings do not provide payment links,
escrow, verified delivery, guaranteed identities, phone OTP or account-pair limits.

## Verification

The sibling ZIP's `checks.md` records commands and final actual results. Focused
Vitest checks include schema/contract cases, mocked authenticated RPC boundaries,
DOM interactions and affected account/chat/listing regressions. No browser, manual,
exploratory or hosted mutation tests were run. Hosted integration is NOT RUN because
the required Ratings migrations are not installed. Local mocked tests do not prove
hosted RLS, publication jobs, reminder delivery or staff case handling.

## Staging and production preparation

- Web database migrations: **NONE**. Backend has **six pending** forward migrations
  per the canonical contract; this candidate neither copies nor applies them.
- Server environment variables in both staging/FairSwapTest and production/FairSwapProd:
  `FAIRSWAP_RATINGS_V1_ENABLED=false` and
  `FAIRSWAP_RATINGS_PUBLIC_SCORE_ENABLED=false`. Do not create public-prefixed variants.
- Backend private settings remain independently controlled: `enabled`, `public_reads`,
  `jobs_enabled`, `staff_enabled`. They are not Web environment variables.
- Deployment order: separately authorized Backend staging migrations; compatible
  Web/Admin/HelpCenter staging; separately authorized Backend production migrations;
  compatible production consumers. ChatGPT owns focused integration and releases.
- Staging and main intentionally diverge. Port only the scoped Ratings changes onto
  each intended base, resolve concurrent-feature dependencies and rerun automated
  checks. Never merge staging wholesale into main or copy the dirty checkout.
- Activation prerequisites: canonical six-migration ledgers verified per environment;
  compatible RPC/DTO consumers installed; staff moderation/report/dispute safety
  controls and privacy/export chain installed; inactive scheduler/jobs configured;
  Backend authorization, publication, reminders, retention and load gates satisfied;
  project identity and rollback receipts recorded. Both Web flags stay OFF until
  these prerequisites are met. Private write/read/job/staff settings require their
  own authorized activation. Do not infer availability from the Web flags.

Rollback: set both Web flags false and redeploy the last compatible Web release;
use separately authorized Backend disable controls without reversing immutable SQL.

Production owner checklist after authorized deployment: record the focused release
SHA and production project identity; verify both Web flags initially OFF; retain
environment-specific Backend migration/ACL/privacy-chain and rollback receipts;
collect automated read-only availability checks and monitor publication/reminder
backlogs, errors and support-case handling after separately authorized activation.
No owner manual testing is requested before deployment.

## Remaining release blockers

The actual checkout differs from the requested staging base and contains other
unmerged consumers. Focused integration and automated requalification on the real
target bases are required. Backend migrations, compatible Admin/HelpCenter releases,
safety-control installation, feature activation and hosted acceptance remain outside
this local Web task. Existing My trades history has no complete-history RPC in this
contract and remains its separate unavailable feature; Ratings action/history routes
do not manufacture a completed-trades feed.
