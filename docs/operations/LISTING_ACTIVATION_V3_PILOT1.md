# Listing Activation V3 — Pilot 1: Books and Tables & Chairs

_Status: audit-only handoff; categories remain disabled. Checked 2026-11-22. No functional source changes or hosted mutations in this PR._

## Scope and ownership

- **This workstream:** canonical category routing, per-leaf form/UI validation, media sessions, safe draft recovery, submission, buyer discovery, automated acceptance, one-leaf-at-a-time activation and reversible rollout.
- **External dependencies (track readiness, do not implement here):** seller identity/DigiLocker (Backend PR #141, Web PR #336); moderation provider readiness (Backend PR #145 and existing Azure work).
- Never toggle `identity_verification_required`, `moderation_azure_enabled` or `moderation_google_cloud_enabled` from this task. Keep all other 56 V3 contracts disabled; preserve current specialist posting paths.

## Verified Test/Production baseline

Both Supabase projects are ACTIVE_HEALTHY and contain the same 58 disabled V3 contracts. The public taxonomy contains 63 leaf nodes, with only existing Mobile Phones, Tablets and Wearables posting-enabled. Both pilot contracts have matching Test/Prod IDs, parent links, revision 1, `risk=general`, `posting_flow=generic`, `draft_only=false`, `moderation_mode=five_check`; `enabled=false`, `is_active=false`, `new_listing_enabled=false`, `status=coming_soon`, and `ordinary_goods_available_v3=false`.

| Slug | Stable category UUID | Parent | MD5 of `fields::text` |
| --- | --- | --- | --- |
| `v2-books` | `c0ba9c51-8d6a-5c81-99e1-6be9c60a8fc5` | `v2-books-sports-hobbies` | `7d0334628f4c643675cfb5d3ff22c8ff` |
| `v2-tables-chairs` | `ec6a3d86-1ce8-574e-9a7b-bef64e1ccf41` | `v2-furniture-home` | `621ab7083e58f4b6a5f8d54176b650a4` |

Books requires `book_title`; optional `author`, `edition`, `language`. Tables & Chairs requires `item_type`; optional `material`, `dimensions`, `quantity` (1..100). Shared form uses INR/paise, buyer preview, PIN/locality and protected staged photos. Production inspection confirms RLS on categories/listings/media/registries and enabled V3 listing guards and identity hooks. RLS/config inspection is not a hosted unauthorized-user E2E test.

Production Vercel deployment `dpl_3jVFGxM3KiQJJUseTkvY5V1fZXvq` is READY at Web main `6b1cd0ddd3e911387f726d194facbf55317eb898` (Web PR #338); Backend disabled release PR #146 is installed. Do not merge staging wholesale; it contains separate Test-only IDV work.

## Existing source coverage and missing evidence

- Web main/staging have byte-identical `ordinary-goods/contract.ts`, `OrdinaryGoodsForm.tsx`, the three Goods API routes, `taxonomy-v2.ts`, `tests/security/ordinary-goods-boundary.test.ts` and `tests/unit/ordinary-goods.test.ts`.
- Staging's `tests/browser/ordinary-goods.spec.ts` and `tests/browser/ordinary-goods.config.ts` are absent on main. That Playwright suite uses loopback mocked responses, **not** hosted Supabase/browser acceptance. Reconcile only applicable tests, not IDV code.
- `ordinary-goods/server.ts` and `posting-base-guard.ts` differ between main/staging due to external IDV error/preflight handling; do not overwrite main from staging while porting Goods tests.
- No authorized Test-user, cross-account, real-media, real-moderation, end-to-end publication and buyer-discovery acceptance is yet evidenced for these two categories.

## Acceptance checklist (testable; no early activation)

1. Keep both slugs unpostable with contract OFF. Reject direct canonical deep links, forged UUID/revision, direct RPC/submit, duplicate/wrong-owner media and stale/unverified session state while OFF. Verify existing specialist category journeys are unchanged.
2. Confirm Books and Tables & Chairs required/optional fields, price in INR (including free/negotiable), condition/wear declarations, fraud text rejection, 1–8 photos, EXIF-stripped WebP, draft recovery/offline/retry and immutable submit payload.
3. Add focused unit, security and browser regression tests at 320/360/390px. Cover account isolation, location, buyer preview, lost-response retry and denial after changed media, as applicable. Reuse current test harness; no new feature-specific workflow or secrets.
4. Once external IDV and moderation owners establish provider/identity readiness, execute **automated hosted FairSwapTest** acceptance with approved synthetic accounts/items: successful clean scan; flagged, incomplete or stale scan remains pending/nonpublic; unauthorized publication denied; categories discoverable only when contract enabled.
5. Activate **`v2-books` first**, then `v2-tables-chairs` only after verified first-leaf Test postflight, using the existing `activate-one.operator.sql` and protected release path. Match Web SHA, schema history, identity hooks, provider state and stored receipt. Repeat verified staging-to-production workflow, no manual staging approval.
6. For rollback use `deactivate-one.operator.sql` (preserve listings/media/ledger) and restore previous Web artifact only if required; maintain guards and never bypass external gates.

## Coding handoff

Use **Claude Code Sonnet**, plan mode for the focused multi-file test change, with exact paths:
`tests/browser/ordinary-goods.spec.ts`, `tests/browser/ordinary-goods.config.ts`, `tests/security/ordinary-goods-boundary.test.ts`, `tests/unit/ordinary-goods.test.ts`, and only if an actual gap is proven: `src/lib/listings/ordinary-goods/contract.ts`, `src/components/listings/posting/OrdinaryGoodsForm.tsx`, `src/app/account/listings/new/page.tsx`, or their existing V3 API routes. Read relevant referenced imports on demand, never scan or replace the whole repo. Work from the staging baseline `d5374fda6e9d0ad4370c0fe51542748249c2da4b` in an isolated local worktree; do not modify unrelated IDV changes.

Coding agent writes source/tests and returns exact diffs, test output, hashes and limitations. **No agent GitHub commands, push, branch, PR or merge**. ChatGPT handles GitHub branch `feat/v3-books-tables-acceptance`, commits, PR into `staging`, and later a separate focused `main` release after automated staging acceptance. This documentation-only draft is not category release authorization.
