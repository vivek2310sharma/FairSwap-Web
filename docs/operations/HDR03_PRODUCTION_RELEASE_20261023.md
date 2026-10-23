# HDR-03 Production release preparation — 23 October 2026

Status: PREPARED FOR INDEPENDENT REVIEW; no release approval or deployment.
Branch: `release/hdr-03-main-20261023`; base: `bad68d0078a6613cd0d75cddeed3e81f7521eed3`.
Source: merged staging PR #234, squash `843fcf1` (including verified Round 3 fixes).
Only that PR's diff was ported; staging was not merged.

## Scope and security

Central AuthProvider, neutral hydration, guest/authenticated desktop/mobile navigation,
unknown unread-count fallback, owner-scoped notification reads and signal refresh,
full document navigation on account change/sign-out, bounded latest-100 conversation
window and deduplicated monotonic read-marker action. The marker advances through
the latest displayed message even when it is the viewer's own reply. Server policy
guards, RPC authorization and database RLS remain authoritative.

Three port conflicts were resolved: retain Production's existing homepage CI check,
combine header regressions, and preserve public same-tab Help Centre links plus
authenticated Support Tickets navigation. Guest private ticket links are omitted.

Production category flags/flows, ListingCard, moderation mirrors, public discovery,
search and SRCH-04 source are unchanged from the base. No dependency, backend pin,
environment, migration or deployment configuration was changed. The existing
Production 320px single-column search expectation is preserved.

## Local verification

PASS: `corepack pnpm lint` (one inherited unused-variable warning in
`tests/unit/production-family-submission-boundary.test.ts:86`).
PASS: `corepack pnpm typecheck`.
PASS: `corepack pnpm build`; metadataBase and missing local sitemap-enrichment
service messages persist. No hosted environment credentials were configured.
PASS: 20 focused Vitest files, 173 tests: AuthProvider, header, mobile navigation,
notifications, account/policy, homepage/404, search/localities, ListingCard/recent
listings, ChatThread, conversation window and actual-action/provider integration.
PASS: 7 additional preserved Production/category/moderation Vitest files, 96 tests.
PASS: `corepack pnpm playwright test --config=playwright.srch-01.config.ts --workers=2`,
48 cases across desktop/mobile Chromium, including 320/360/390 layouts, identity
switching, unknown chat counts and search-grid uniqueness. Interrupted-prefetch
stream errors are logged while all assertions pass.
PASS: whitespace checks. Exact suite paths are in the changed CI step plus
`src/__tests__/{search-filters-and-chips,locality-page,listing-card,recent-listings}.test.*`
and `tests/unit/{production-category-gates,production-family-submission-boundary,
saved-category-consumer-contract,saved-category-form-preservation}.test.*`,
`src/__tests__/{moderation-target-guard,moderation-text-checker,moderation-status-badge}.test.*`.

The full unit/DB/security suite was not run. Local focused mocks are not hosted
acceptance. Local docs:check has the inherited missing materialized Backend SQL
link in MOD_03A_AUTOMATIC_MODERATION.md; no unrelated documentation was rewritten.
GitHub CI/PR administration is reserved for ChatGPT.

## Backend and release dependencies

Backend #48 defines no-argument `get_unread_counts()`, returning safe nonnegative
integer `unread_messages` (individual inbound messages after the caller's
`(created_at,id)` marker) and `unread_notifications`. Identity derives from
`auth.uid()`; no client user-ID argument. Owner-only `unread_count_signals`
INSERT/UPDATE invalidates counts. Notification INSERT/UPDATE uses the existing
owner-filtered subscription. Count refreshes coalesce; no polling is introduced.

The Production-only package is in Backend `releases/production/hdr-03`, on
`release/hdr-03-prod-20261023`. Production has 57 versions at preparation time and
does not yet have the aggregate. Before installation chat counts stay unknown;
notification-only exact count remains available. Missing signal-table subscription
behavior before installation still needs acceptance (or Backend-first rollout).
No hosted migrations were run. Backup/restore proof, exact-history clone rehearsal,
owner Test acceptance and independent CI/security review remain release blockers.

Rollback Web to its previously approved version through the owner's release
process; retain backend data/read cursors. Do not merge staging or undo unrelated
Production releases. Backend forward-fix/containment is separately reviewed.

## Owner-run FairSwapTest acceptance

Owner elected on 23 October to perform this separately. Status: NOT RUN by Codex.
Do not use fairswap.in or FairSwapProd. Use the owner-verified Test deployment of
the reviewed code with FairSwapTest project `wpppxlnbzqynvhpeuavd`.
Do not deploy a release branch as part of these steps.

1. Use genuine, confirmed, dedicated Test accounts A and B, with current policy
   accepted. Use two independent browser profiles (or normal and private windows),
   one tab per account, so their cookies do not overwrite each other. Two tabs in
   the same profile share Auth and cannot stay independently signed in as A/B.
   Confirm Network requests target FairSwapTest and keep all tokens/passwords
   private. Record only PASS/FAIL, relative count deltas, times and sanitized
   status codes; do not export HAR/cookies/session bodies.
2. Before creating anything, identify a dedicated synthetic Test listing and a
   supported normal application cleanup path. Existing chat UI has no message or
   conversation delete control. If complete cleanup is required and no authorized
   application deletion path exists, STOP and record CLEANUP BLOCKED; agree the
   disposable fixture lifecycle with the owner first. Never use SQL/admin APIs
   to bypass this restriction or send bulk/real user notifications.
3. Sign A/B in and let hydration settle. Verify each browser's existing Network
   `rpc/get_unread_counts` response has its own two nonnegative integer counts.
   Inventory each account's baseline counts without recording private content.
   Guest navigation must not flash during hydration; token refresh must not reload.
4. B opens only the synthetic listing's legitimate chat flow and sends one unique,
   innocuous test message to A. Keep A outside the conversation. In A, expect an
   owner-scoped Realtime INSERT/UPDATE and aggregate refetch, then +1 unread chat
   message. B's own outgoing message must not add to B's unread count. Network
   signal payloads must have only opaque id, own user_id and revision; do not save
   the identities. No unrelated rows/message bodies may arrive.
5. Open the thread as A: latest messages display chronologically; the read action
   succeeds and A's aggregate returns to baseline. Send an A reply, leave/reopen
   the thread, then repeat B incoming followed by A outgoing before reopening:
   the read marker must advance through the outgoing tail. A failed read action
   shows a generic retry; only a successful retry clears the unread state.
   Read receipt evidence here is the successful authenticated read action and own
   read-state/aggregate response, not a newly implemented sender-facing 'Seen' UI.
6. For latest-100 acceptance, use a pre-approved disposable synthetic conversation
   already containing 101+ messages, or create at most the approved number through
   normal send flow. Verify newest 100 displayed and the latest tail is marked.
   Identical timestamps are covered deterministically by local regression tests;
   do not forge timestamps or insert hosted rows to reproduce them.
7. If this flow produces an in-app notification, open A's bell/list and mark only
   the synthetic notification read. Verify its count changes after success and
   owner-filtered UPDATE/refetch is delivered. If messaging produces no notification,
   use an approved normal Test app action that does; do not manufacture rows or use
   a real user's listing. Record NOT RUN if no safe notification flow is available.
8. To prove same-owner read/notification invalidation across tabs, temporarily sign
   both independent profiles into A, or add an A tab. Read the synthetic item in
   one while the other stays on a different page; the second must refresh without
   manual reload. Restore B afterward. To test owner isolation, replay only the
   dedicated fixture's normal authenticated SELECT with the other account's owner
   filter using private local tooling: expect no foreign signal/notification rows.
   The aggregate itself accepts no identity argument. Do not probe other users.
9. In A's tab, toggle DevTools Network Offline, have B send one approved message,
   then restore Online. After Realtime resubscribes, counts must recover via an
   aggregate refetch with no polling or duplicate badge increments.
10. Sign out A; private counts/previews/document state must disappear. Back must
    not restore private state and protected pages must require sign-in. In a
    same-profile pair of A tabs, sign out and sign in as B: old A private DOM must
    be discarded in both tabs via full navigation. Test a direct authenticated
    identity-switch flow only if available through normal Auth; initial hydration
    and same-user token refresh must not cause unnecessary reloads.
11. Clean up only the agreed synthetic fixtures through supported app controls;
    mark synthetic notifications read, remove the test listing if supported, and
    sign out/close sessions. Listing removal does not prove messages were deleted.
    Record any retained fixture as a cleanup blocker; no privileged deletion.
    Give ChatGPT sanitized outcomes and remaining gates before a release decision.

Optional fallback verification belongs in local isolated tests: simulate missing
RPC and failed requests there. Never remove hosted RPCs/publications or change
Production settings to test failure handling.

## Exact changed files

- `.github/workflows/ci.yml`
- `README.md`
- `docs/CURRENT_STATE.md`
- `docs/ROADMAP.md`
- `docs/WORKFLOW.md`
- `docs/operations/HDR03_PRODUCTION_RELEASE_20261023.md`
- `e2e-isolated/mobile-search-grid.spec.ts`
- `src/__tests__/auth-provider.test.tsx`
- `src/__tests__/header.test.tsx`
- `src/__tests__/mobile-bottom-nav.test.tsx`
- `src/__tests__/not-found.test.tsx`
- `src/__tests__/notification-bell.test.tsx`
- `src/__tests__/notification-list-auth.test.tsx`
- `src/__tests__/page.test.tsx`
- `src/app/account/messages/[id]/page.tsx`
- `src/app/layout.tsx`
- `src/components/communication/ChatThread.tsx`
- `src/components/communication/NotificationBell.tsx`
- `src/components/communication/NotificationList.tsx`
- `src/components/header.tsx`
- `src/components/navigation/MobileBottomNav.tsx`
- `src/components/providers/AuthProvider.tsx`
- `src/lib/navigation/session-change.ts`
- `tests/unit/chat-read-unread-integration.test.tsx`
- `tests/unit/chat-thread-hydration-and-composer.test.tsx`
- `tests/unit/conversation-page-window.test.tsx`
