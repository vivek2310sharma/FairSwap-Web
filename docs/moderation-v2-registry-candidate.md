# FairSwap Moderation V2 — B2e Registry Payload Compiler

**Status:** Candidate-only Web server library. **Not** a trusted sealer, Storage authority, database registrar, or V2 worker.

## Connection across existing slices

1. B2c `prepareV2ImageObjects` produces the full-frame canonical and five fresh content-addressed object keys from a bounded private source.
2. B2d `writeAndVerifyPreparedV2Bundle` requests five create-only writes and downloads all five exact byte payloads. Its result asserts **point-in-time byte equality only**; independent Storage immutability and sealer credential provenance remain **unverified**.
3. B2e `compileV2RegistrationCandidate` validates a supplied DB-shaped listing/media/request context and both objects, then compiles **only** the eight-field JSON records expected by the Backend *experimental* `app_moderation_v2.p3_register_bundle` SQL in draft PR #29.

The output explicitly contains `authority: "NOT_AUTHORIZED_CANDIDATE_ONLY"`, `context_status: "UNTRUSTED_SNAPSHOT"`, and `storage_scope: "POINT_IN_TIME_READBACK_ONLY"`. These are not security credentials or authenticated DB receipts.

## SQL argument mapping (candidate only)

`p_listing`, `p_media`, `p_revision`, `p_asset`, `p_source_sha256` and `p_objects` match the draft C2 protected registry. Each `p_objects` item has **exactly**:

`object_id, variant, bucket, logical_key, sha256, bytes, width, height`

Object order is deterministic `original, canonical, thumb, medium, large`; the generated key must include the exact asset-version UUID and SHA-256. The compiler checks listing/media/generation/revision/source-digest identity, canonical V1 source paths, missing or reordered receipt identities, object reuse, corrupted byte digests and unauthorized namespace substitutions.

## Security boundaries still required

- **Do not call `p3_register_bundle` directly from Web or a browser.** The SQL is Test-only and not present in FairSwapProd. A typed input or readback success from this module is forgeable by any privileged JavaScript caller and cannot establish a sealed image.
- A **separate trusted sealer runtime** must independently fetch the correct original from a DB-owned, listing-locked current request and use an isolated, create-only Storage credential inaccessible to ordinary Web/Admin/worker processes.
- A DB registrar must independently establish sealer authority and current complete source manifest under parent listing locks, verify append-only ledger and Storage provenance, then atomically bind only approved identities. Privileged direct SQL and broken preimage ordering must fail closed.
- Supabase official docs recommend treating the managed Storage schema as read-only. The custom trigger in Backend PR #32 is **NO-GO for Production**; a separately isolated India-region Storage boundary is the preferred architecture until a validated supported alternative exists.
- No resident user bytes or secrets are persisted by this compiler. An India DPDP-compatible retention, erasure and trusted retirement process is still necessary.
- Mobile B4 compatibility, V2 provider acceptance, E2E adversarial scenarios and controlled canary remain separately blocked.

## Tests

`pnpm vitest run tests/security/moderation-v2-registry-candidate.test.ts`

Tests generate actual JPEG/Sharp bytes, pass B2c/B2d, then check exact five-object argument mapping, source path and revision mismatches, forged identities, tampering, missing or reordered receipts, and absence of any registry client/secret in the output.

**This is plumbing, not a Production activation milestone.**
