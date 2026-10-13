# S1 — Direct authorization: read-only inventory and execution plan

**Date:** 13 October 2026. **Status:** PHASE 1 READ-ONLY REVIEW; HOSTED S1 **NOT VERIFIED**.
**Authority:** [Issue #118](https://github.com/vivek2310sharma/FairSwap-Web/issues/118),
`Post-Ad-Release-Prerequisites-Review.md` S1–S5, and the retained Test-submission verification checklist.
This document does **not** approve FairSwapTest writes or any new-family publication.

## Target and unchanged baseline

- Target for *future* hosted authorization only: **FairSwapTest** `wpppxlnbzqynvhpeuavd`, PostgreSQL 17.
  **Never FairSwapProd** `kriuhwppxgxsyyrbjsau`.
- Read-only independent live snapshot: 58 migrations, including Issue #133 guard once; 8 auth users,
  8 accounts, 55 listings, 22 media, and 10 pending-review listings. Five Goods, 18 Vehicle and
  10 Property enabled draft categories.
- `app_security.test_submission_policies`: `two-wheelers`, `cars`, `property` each
  `enabled=true, maintenance=false` **for Test submission only**.
- `moderation_automation_enabled=false`; email retry cron active.
  No hosted write, denial attempt, authenticated session, or credential transfer performed in this review.

## Effective live database boundary (not a behavioral result)

Postgres direct table-level `has_table_privilege(authenticated,...)` for `public.listings`
returns false because the application uses **column-level** SELECT/INSERT/UPDATE grants;
do not mistake that result for "seller cannot access listings".
The observed grants and policies must be evaluated together.

| Interface | Live effective grants/policies | Proof still needed |
| --- | --- | --- |
| `public.listings` | 11 INSERT columns, 25 SELECT columns, 11 UPDATE columns for `authenticated`. RLS owner/active-account/current-policy; INSERT now checks enabled category. Ordinary pending UPDATE not in owner-allowed statuses. | Real owner/non-owner requests with valid draft, valid foreign ID and pending target |
| `public.listing_vehicle_contexts`, `listing_car_contexts`, `listing_property_contexts` | Authenticated SELECT/INSERT on allowlisted columns, **no direct UPDATE**; owner draft status checks, deferred context-completeness and pending-child triggers. | Owner valid insert versus non-owner/pending contexts; validate deny cause rather than bad payload |
| `public.listing_media` | Authenticated INSERT only on original filename/content type/size/listing ID; no direct table UPDATE/DELETE; parent-owner RLS and `zz_test_submission_child` guard. Private paths and media completion are not seller-writable. | Genuine owner pending mutation denial and private Storage enforcement (S2/S3, separately gated) |
| `public.seller_submit_listing(uuid,integer)` | Authenticated EXECUTE, anon/service-role direct EXECUTE false; wrapper invoker, private implementation definer and actor/status/revision checks. | Valid owner submit success, valid non-owner `42501` ownership denial, PT409 stale request, retry/idempotency |
| `public.get_seller_submission_status(uuid)`, `get_seller_listing_category_context(uuid)` | Authenticated EXECUTE only; private implementation checks actual owner. | Ordinary owner result versus non-owner/unauthed denial without private leak |
| `public.seller_submit_listing(uuid)` **legacy Goods overload** | EXECUTE currently granted to anon/authenticated/service roles. Its private implementation checks `auth.uid()` and owner/active policy; **exposure is not a proven bypass**. | Explicit unauthenticated denial and cross-family compatibility through the actual request path |
| `public.record_media_processing_result(uuid,jsonb,jsonb,text,text)` | service_role EXECUTE only, anon/authenticated false. | Approved worker-only lifecycle verification (S2), never with seller service-role substitution |

All new-family submission triggers remain installed; ordinary draft and pending paths are
different. A single-argument legacy RPC may be callable at the API boundary even when
its internal authentication guard denies use. Do not infer effective denial from EXECUTE
flags alone.

## Isolated CI suite — separate from hosted S1

PR #136 activates the pre-existing `tests/security/sql/post-ad-current-base-compatibility.sql`
through `tests/security/post-ad-compatibility-disposable-db.test.ts` on a **positively
identified local Supabase** runner. The runner requires GitHub Actions + CI, loopback
`127.0.0.1:54322`, an exact local database URL shape, unique
`test_validation_meta.run_identity`, absence of inherited Supabase/PG connection
credentials, expected PG15 major and **172 executed assertions, zero skipped/failed**.
The SQL creates synthetic users/categories/listings and ends with `ROLLBACK`.
Existing CI still runs the ordinary local DB/RLS suite, isolated PG17 rehearsal and
Goods RLS guard checks. Do not count CI's simulated JWT role switches as real hosted
owner/non-owner authentication, network API, notifications, MFA or Storage testing.

## Future hosted S1 actor × operation matrix (separate written approval)

| Scenario | Ordinary actor and valid disposable target | Expected authoritative boundary | Required evidence |
| --- | --- | --- | --- |
| S1-A | Signed-in owner; disposable complete two-wheeler draft | Save context, read saved context and submission status; valid expected-revision submit -> pending | Exact RPC result, DB revision/status/context/media, one transition/outbox result |
| S1-B | Signed-in owner; independent complete Cars draft | Same as S1-A, with required car answers and contract version | Exact RPC result and post-state |
| S1-C | Signed-in owner; complete Property rental draft | Known positive monthly rent, valid basis, nullable item price; valid submit -> pending | Exact rent/deposit/maintenance context and post-state; no manufactured Goods price |
| S1-D | Different ordinary signed-in user; valid S1-A/B/C listing ID | Non-owner direct read/status/context/update/submit/media denied or invisible **for ownership reasons** | Backend SQLSTATE/API status and message, owner rows unchanged; not a schema/eligibility failure |
| S1-E | No authenticated user; same valid target | Only documented public visibility; draft/pending private and auth-only RPCs inaccessible | Real anon REST result and no disclosure |
| S1-F | Signed-in owner; valid stale expected revision | `PT409`, with no state/outbox changes | Exact revision before/after and response |
| S1-G | Signed-in owner; direct media parent/child paths | Draft allowed via approved server path; pending rejected and private Storage not exposed | Backend result, path/ACL proof, source/processed bytes/metadata unchanged |

**Fixtures must be genuinely submit-ready:** active Test-only category, current
contract/version and matching family context; owner account current policy acceptance;
allowed city + six-digit PIN; title and minimum description, valid vehicle or rental
fields; at least one owned ready photo; known expected revision. Otherwise a failure
cannot be attributed to RLS ownership.

### Hosted execution guard (NOT YET AUTHORIZED)

1. Obtain **new written approval** for project ref, synthetic owner/non-owner test
   accounts, exact disposable listing/media/context IDs, requested operations,
   notification sink/recipients, and allowed cleanup/retention. Confirm no user
   account, personal listing, prior four retained submitted fixtures, or shared media
   is in scope. Capture immutable baseline hashes/counts and all applicable ACLs.
2. Use real ordinary user sessions and the approved published RPC/Data API/Storage
   routes, not the Supabase service key or administrator acting as the seller.
   Separate owner/non-owner/anon clients. Capture actual SQLSTATE/API status and
   response; label unrelated schema/version/policy failures **INCONCLUSIVE**.
3. Use a sink that cannot email actual users. The existing email retry cron remains
   active. Do not begin submissions without an approved routing isolation method.
   Ensure transaction/cleanup strategy preserves unrelated listings, status/history,
   queues, notification attempts, media and category metadata.
4. Restore/cleanup only disposable fixtures under approved procedures; compare
   protected pre/post snapshots (counts + hashes), policies, grants and cron. Do
   not touch Production, enable staff/moderation, publish, or merge unrelated work.
5. Treat S2–S5 (pending edits, cover/reorder, retry/idempotence, true concurrency)
   and Product R1–R6 as **separate** public-release blockers. S1 remains
   **NOT VERIFIED** until real independently authenticated hosted evidence passes.

### Stop rules

Stop on any project/identity mismatch, absent safe sink, retained-fixture selection,
baseline drift, unexpected notification attempt, unknown status/transaction outcome,
role escalation, or failed cleanup. Do not automatically retry an ambiguous
submission or convert a generic failure into a "non-owner denied" PASS.
