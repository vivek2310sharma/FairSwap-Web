# Chat V2 Web inbox and text conversations

Local implementation candidate, 26 October 2026. No hosted release or feature activation.
Backend contract reviewed read-only at PR #58 commit `6320947671a0b0ebb1ea98285177e340c55cf025`.
Requested Web integration base: staging `2472884c519d55df7d8d0e48975421111530c1af`;
observed local HEAD: `93163a7cac11ac7b49f641fc3853d5ce9ebde8cb`. No synchronization
or GitHub mutation was authorized/performed. The ZIP records local originals and
base drift; do not replace the feature branch wholesale with this dirty checkout.

## Plan and resulting architecture

1. Preserve original messaging/account edits and inspect Backend JSON/RLS contracts.
2. Introduce isolated validated Chat V2 data access, server-only flag and components.
3. Add mobile route navigation/desktop rail, cursor paging, stable retry IDs and
   recipient-only eventual safety display while reusing existing mutation actions.
4. Verify automatically; hand scoped source/diff/evidence to ChatGPT for integration.

`FAIRSWAP_CHAT_V2_INBOX_ENABLED` is server-only and enabled only by exact `true`.
It defaults off. Never create a `NEXT_PUBLIC_` variant. Both route entries retain
their complete original path when off; legacy `ChatThread`, shared communication
types and messaging mutation actions are unchanged. No package, database-type,
Backend pin, migration, CI, permission or native-client changes are needed here.

New source lives in `src/lib/chat-v2` and modular `ChatV2*` communication components.
Server actions validate every request and response with Zod and resolve `getUser`
using the existing cookie/session client. RPC authorization/RLS remain authoritative;
no service-role client is used. The response subset is typed locally until the
Backend schema is released; this does not fabricate generated database contracts.
Enabled-path authorization/schema errors are explicit, with retry, never a silent
fallback to legacy queries. Raw upstream details and private message content are
not logged by the new loaders.

## Inbox behavior

Mobile uses full inbox/thread routes and a back link preserving search, tab,
unread and seller-listing context. Desktop uses a 380px rail and selected thread.
`chat_v2_inbox` groups before pagination; Buying remains individual and seller
groups have at least two enquiries. `listing_id` opens buyer-level drilldown.
Counts come from Backend `counts`, never the downloaded rows or groups.
At this contract revision, those counts apply search/listing filters and count
conversations across tabs, independently of the unread-only row filter. They are
not unread totals. That distinction is retained, not recalculated in the browser.

Load More submits the complete timestamp/UUID cursor. Refresh replaces the whole
first window and cursor so moving group representatives cannot duplicate groups.
Pagination merges by stable listing key outside drilldown and conversation key
inside drilldown. Selected-conversation arrivals/read success refresh the first
inbox page; visible-page polling (30 seconds) and focus refresh cover other arrivals
without broad private-message subscriptions. Authenticated-safe media thumbnails
use the existing guarded route with no Storage URL exposure and a failure placeholder.

## Conversation and safety boundaries

`chat_v2_messages` returns chronological pages and a peer cursor. Older pages merge
without duplicate IDs. Comparison preserves PostgreSQL microseconds and the full
UUID tie-breaker. Pending messages keep their original `client_request_id` through
failure/retry; successful acknowledgements are reconciled against canonical RPC or
Realtime rows. No invented timestamp is used for Seen and no delivery receipt is
claimed. Existing send/read policy guards, block/report dialogs and backend listing
permissions remain in force; sold/reserved listings are not closed by this UI.

Only `messages` INSERT events scoped to the selected conversation are subscribed;
cleanup removes the channel. Findings are never subscribed to Realtime. They use
authenticated RLS reads, explicit `recipient_id`, authorized inbound message IDs,
and additional response validation. Sender findings are suppressed defensively in
the render path. Visible threads poll messages/peer state every 15 seconds; older
loaded inbound IDs are rechecked in batches of at most 100 so delayed findings can
appear there too. Polling pauses in hidden documents and refreshes on focus.

The permanent UPI PIN/OTP/advance-payment reminder is independent of findings.
New strings have a complete centralized English/Hindi dictionary. The current Web
shell has no shared locale selector, so English remains the default; locale-aware
components are ready for that future integration. Absolute IST dates include year
and use Asia/Kolkata on both server and browser, avoiding clock/locale hydration drift.
No photo/PDF sending, meetup pin or sold-buyer flow is implemented.

## Automated verification

The ZIP contains exact commands, exit codes and results rather than claims about
hosted state. Focused Vitest tests cover server identity, flag denial, malformed
contracts/security errors, paging/group identity, retry ID reuse, recipient-only
warnings, block/report/policy preservation, read tuples and IST formatting.
Existing legacy conversation-window and composer/hydration tests are retained.

The isolated Playwright config exercises real Web routes at 360px and desktop
against a synthetic loopback HTTP API; no real accounts, database, notifications or
hosted API are used. Build that fixture with the loopback public URL before running:

```powershell
$env:NEXT_PUBLIC_SUPABASE_URL='http://127.0.0.1:35431'
$env:NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY='fixture-publishable-key'
$env:FAIRSWAP_CHAT_V2_INBOX_ENABLED='false'
corepack pnpm build
corepack pnpm exec playwright test --config playwright.chat-v2.config.ts
```

The fixture server enables the server flag only for its local process and clears
privileged credentials from the child environment. Synthetic auth/API responses
are UI contract evidence, not proof of database RLS, real Auth or hosted Realtime.
Existing mutating communication e2e still requires the guarded disposable local
Supabase runner. Do not point it at Test/Prod or weaken its loopback guard.

## Integration, release and rollback

ChatGPT owns `feat/chat-v2-web-inbox`, integration conflicts, commits/PRs and CI.
Review the incremental local-original diff and base-drift report first. Account
redesign PR #230 overlaps both message routes and formatters; its shared types,
legacy thread styles and unrelated account/Post Ad/profile work must survive.
No new dependency or schema update is included. New tests require existing installed
Vitest/Playwright tooling and its Chromium binary.

1. Integrate only this feature into the existing branch and open a focused PR to
   `staging`. Both Vercel environments retain `FAIRSWAP_CHAT_V2_INBOX_ENABLED=false`.
2. Run CI and automated local/authorized Test integration against the exact Backend
   contract. Backend schema and its own `inbox` flag/readiness must precede Web
   activation; warning display additionally depends on recipient RLS and Backend
   safety-worker readiness. Web source integration authorizes none of those writes.
3. Prepare a separate focused `main` PR; do not merge staging wholesale. Deploy
   Production with the Web flag off. Activation requires separate explicit release
   authority and environment-specific Backend readiness.

Rollback disables the Web flag or restores the previous Vercel deployment. No DB
rollback is needed. No manual/exploratory agent testing or hosted deployment occurs.
After Production release, owner availability checks cover legacy messaging with the
flag off and, after authorized activation, mobile/desktop navigation, seller groups,
unread/Seen state and India safety wording. These are post-production availability
checks, not a request for owner staging approval or manual agent testing.

Unresolved integration/release prerequisites: local HEAD differs from the requested
base; account redesign/messaging edits require selective integration, Backend is not
hosted-deployed by this task, live RLS/Realtime/worker behavior needs authorized
automated integration evidence, and fixture results cannot certify hosted delivery.
