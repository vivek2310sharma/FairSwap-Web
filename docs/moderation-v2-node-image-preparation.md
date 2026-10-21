# FairSwap Moderation V2 — B2c Real Node Image Preparation

**Stage: code candidate only; no Storage writes and no Production activation.**

## Scope

The internal server-only module `src/lib/media/moderation-v2-node-preparation.ts` processes already-authorized private source **bytes** using the existing Web Node/Sharp runtime. It produces the five proposed `seal_v1` variants and their content-addressed keys:

| Variant | Bucket | Input | Dimensions |
| --- | --- | --- | --- |
| original | listing-originals | exact original bytes (private) | as uploaded |
| canonical | listing-originals | oriented, metadata-stripped full frame | unchanged after orientation |
| thumb | listing-derivatives | the exact canonical bytes | 200 × 200 cover |
| medium | listing-derivatives | the exact canonical bytes | max 800px, no enlargement |
| large | listing-derivatives | the exact canonical bytes | max 1400px, no enlargement |

Reject unsupported/multipage/animated formats, oversized bytes, invalid dimensions, malformed identities, and mismatched SHA-256. A `Buffer` copy preserves source byte identity against caller mutation before asynchronous processing. EXIF/GPS/ICC are stripped from **canonical and derivatives**, not the private original.

The `processorProfile` includes installed Sharp, libvips and WebP codec versions plus **provisional** pinned quality/effort settings (canonical 82, derivatives 80, WebP effort 4). This is an implementation candidate, not automatically the approved evaluator profile.

## Important boundaries

1. The result deliberately uses `status: "prepared_only"`. It does not indicate a verified create-only Storage write, registered immutable bundle, or authority to moderate/publish.
2. No API route is introduced. No seller/client can directly call this as a privileged service. Caller identifiers and `sourceSha256` must come from the **DB-owned** manifest; the future sealer must fetch input through an approved private Storage origin, never an arbitrary user URL.
3. There is no hosted upload, cleanup, metadata registration, policy approval, OpenAI call, secret, image-serving route or live worker change in this PR.
4. The Node Web runtime provides feasibility evidence for Sharp; real deployment requires explicit trusted runtime placement, resource/timeout/concurrency limits, independent sealer credentials, immutable Storage enforcement and byte-by-byte readback verification.
5. Existing Backend draft [PR #29](https://github.com/vivek2310sharma/FairSwap-Backend/pull/29) owns the typed sealer contract. Integration must adopt that reviewed interface and avoid promoting parallel, incompatible recipe semantics.
6. Backend [PR #32](https://github.com/vivek2310sharma/FairSwap-Backend/pull/32) remains an experimental Storage trigger candidate. Web [PR #180](https://github.com/vivek2310sharma/FairSwap-Web/pull/180) proved guarded writes only in disposable local Storage.
7. Trusted retirement for India DPDP deletion requests must be designed before any sealed object becomes permanent.

## Tests

`pnpm vitest run tests/security/moderation-v2-node-preparation.test.ts`

Web CI explicitly runs this test with actual Sharp against JPEG, PNG, WebP, EXIF orientation, digest mismatch, malformed IDs, bounds, and deterministic derivative lineage. This is **not** a mobile-device acceptance test. V1 upload/serving code remains unchanged.

**Release gate:** Do not enable `moderation_v2_enabled` or deploy an Edge V2 worker based solely on this module.
