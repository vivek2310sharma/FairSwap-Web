# FairSwap Moderation V2 — B2d Restricted Storage Write and Readback

**Status: candidate library only. No publicly callable API, no connected Supabase credential, no provider worker, no database registration, no Production Storage writes.**

## Purpose

`writeAndVerifyPreparedV2Bundle()` accepts exactly the five `prepared_only` objects from B2c and a **narrow, injected** `RestrictedSealedStorageWriter` capability. The caller must be a future independently authorized sealer service.

The library:

1. Verifies strict object identity, expected bucket, variant extension/MIME, source-to-original hash, unique object IDs, versioned path, dimensions and local SHA-256 for all five objects **before any write**.
2. Calls only `createNew(..., upsert:false)` for the exact keys and bytes, sequentially, using independent buffer copies.
3. Re-downloads all five objects through the injected trusted capability and verifies exact lengths, SHA-256 and byte equality.
4. Returns only `scope: point_in_time_downloaded_bytes_only`; it explicitly says create-only server enforcement, Storage immutability and DB registry authority are **unverified**.

On collision, ambiguous failure, partial write, tampered readback or cancellation, the library **does not delete or replace any Storage object**, and never returns registered/published evidence. Successful object IDs are returned for future trusted reconciliation without exposing internal Storage keys in error shapes.

## Activation blockers remaining

- The real Storage client/capability and credentials must be scoped to trusted sealer only; a TS interface is not an access-control boundary.
- Hosted Storage create-only and immutability must be proved across REST, S3, TUS, copy/move and deletion using a supported mechanism (Backend PR #32 / Web PR #180 remain experimental).
- Backend Draft PR #29 owns typed policy, registry, complete manifest, parent-locked publication and worker. The producer of any DB registration must verify live source identity, sealer build/version and Storage attestation rather than trust client claims.
- Introduce trusted retirement/erasure before any sealed object is actually referenced by a publishable listing.
- Real Web/iOS/Android device tests and India DPDP/privacy review remain necessary.
- No endpoint, worker or V2 setting is changed by this PR. V1 moderation remains operational.

## CI

`pnpm vitest run tests/security/moderation-v2-storage-readback.test.ts`

Tests cover successful five-object create/readback, collisions, partial failures, content tampering, path forgery, retries, missing reads and cancellation. They use an injected in-memory Storage adapter and do not exercise hosted S3, TUS or the production database.
