# Production Vehicles and Property — future reviewed-live Web boundary

**Preparation code only.** All new Production flags are absent as of 2026-10-22 and MUST remain absent until the independently reviewed Backend and Admin release passes database and live tests. Production currently remains Goods-only. This file is not a launch authorization.

## Runtime contract

The current `POST_AD_EXPERIMENTAL_PRODUCTION_MODE=draft_only` remains supported for an explicitly reviewed, non-publishing **draft-only** experiment. It does **not** enable submission.

A full customer release requires `POST_AD_EXPERIMENTAL_PRODUCTION_MODE=reviewed_live` **and all of**:

- Existing verified Goods production boundary with `NEXT_PUBLIC_SITE_URL=https://fairswap.in` and project ref `kriuhwppxgxsyyrbjsau`
- `POST_AD_EXPERIMENTAL_PRODUCTION_FOUNDATION_VERIFIED=kriuhwppxgxsyyrbjsau`
- `POST_AD_EXPERIMENTAL_PRODUCTION_PUBLICATION_LOCK_VERIFIED=kriuhwppxgxsyyrbjsau` (verified database controls, not removal of lock)
- `POST_AD_PRODUCTION_FAMILY_SUBMISSION_VERIFIED=kriuhwppxgxsyyrbjsau`
- `POST_AD_PRODUCTION_FAMILY_MODERATION_VERIFIED=kriuhwppxgxsyyrbjsau`
- `POST_AD_PRODUCTION_FAMILY_PUBLIC_READ_VERIFIED=kriuhwppxgxsyyrbjsau`
- Separately approved family flag(s) `POST_AD_TWO_WHEELER_PRODUCTION_DRAFT_ENABLED=true`, `POST_AD_CARS_PRODUCTION_DRAFT_ENABLED=true`, `POST_AD_PROPERTY_PRODUCTION_DRAFT_ENABLED=true`

**Do not set these flags now.** Mode `reviewed_live` is not an environment-only escape hatch. The database remains authoritative for all ownership, RLS, category/version permissions, submission, moderation, private data and public visibility.

## Required Supabase backend RPCs (not yet installed in Production)

The Web candidate has a forward-only typed adapter, not a manually edited generated database type:

- `public.get_seller_production_submission_status(listing_id uuid)` — authenticated-owner-only; returns exactly `{family: 'two-wheelers'|'cars'|'property'|null,enabled:boolean,policy_key:string|null}`. Must fail closed if context/category/version/owner cannot be verified. `enabled` is backend policy, not a user-selected section.
- `public.seller_submit_family_listing(listing_id uuid,expected_revision integer)` — authenticated-owner-only, transaction-safe draft→pending_review with exact revision checking, supported field validation, ready photos and site/locality integrity, without bypassing family RLS. Result `{success:true,result:'submitted'|'already_pending',listing_id,status}` on success; error/SQLSTATE `PT409` on conflict.

The existing Test-only RPC and `POST_AD_SUBMISSION_TEST_ENABLED` retain their original behavior; neither is re-used in production. Ordinary Goods submission remains on the existing Goods RPC. Saved family detection also denies accidental fallback from draft-only categories to the Goods submission endpoint.

## Preconditions before switching flags

1. [Backend PR #44](https://github.com/vivek2310sharma/FairSwap-Backend/pull/44) production baseline passes; separate forward-only submission/publication migration reviewed and installed.
2. Moderation/Admin AAL2, reviewer-source projection, lock-time revision/freshness and denial for direct seller-status writes verified. New family approval happens **only** through reviewed moderation.
3. Publication eligibility, public search/cards/details and rental basis/separate costs verified without exposing owner-private society/PIN/landmark.
4. CI, RLS negative tests, authenticated Test journey and approved production smoke complete; backup recovery and rollback confirmed.
5. Production Vercel project, main SHA, Supabase target and environment reviewed by deployment operator before flags are applied and a staged production deployment is promoted.

**Rollback:** Turn off family flags to prevent new posting/submission, and use the tested database kill switch to stop new submissions. Never delete customer drafts or remove guards/RLS.
