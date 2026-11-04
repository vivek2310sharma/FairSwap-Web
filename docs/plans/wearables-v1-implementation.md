# Wearables V1 implementation plan (as built)

Status: implemented locally, not committed, not deployed, hosted state NOT RUN. This is a dated planning record, not an instruction.

## Scope
Mobiles & Tablets → Smartwatches & Wearables posting and buyer discovery for FairSwap India, reusing the Mobile Phones five-step UX (Photos → Wearable details → Condition → Price → Location and review). Types: `smartwatch`, `fitness_band`, `sports_gps_watch`, `smart_ring`. Everything shown to buyers is labelled seller-reported; FairSwap does not verify the device, serial number, compatibility or account status.

## Architecture
* **Dedicated contract, not a phone copy.** Strict Zod discriminated union per device type (`src/lib/listings/wearables/contract.ts`) mirrored by `app_security.validate_wearable_v1` in the database, which is authoritative.
* **Session isolation without markers.** A binding table is the authority tying an upload session to the wearables category. The shared session engine takes the category selector as a parameter of an internal function with no client grants; two definer entry points hard-code their own selector. A listings trigger blocks cross-category use. No transaction setting is used for authorization.
* **Decoupled gating.** `POST_AD_WEARABLES_V1_ENABLED` (server-side, default off) plus the database release row and active category. The phone/tablet flags are never read. Posting V2 + V2.1.2 + Accessories V1 must be installed, not enabled.
* **Dedicated routes** under `/api/post-ad/wearables/{sessions,sessions/[id]/media,submit,models}`; the shared `/api/post-ad/sessions/**` and `/api/post-ad/submit` are unchanged. Common auth, policy, account and maintenance checks are in `src/lib/listings/posting-base-guard.ts` (same order and messages as the phone guard; parity is tested).
* **Catalogue.** The supplied CSV is immutable. `scripts/wearables/build-catalogue.mjs` produces, from one in-memory set, the server-only JSON (approved rows) and the seed block inlined in the Backend migration (all rows with status), sharing one revision hash. Models are served per brand and type; the full catalogue never reaches the client bundle.
* **Other model.** Server-side matching on normalised keys rejects quarantined, excluded and listed entries; unmatched entries are accepted only into an enforceable review state.
* **Enforceable review.** `listing_wearable_risk_flags_v1` plus a listings trigger that refuses activation of a flagged listing unless the caller is an active moderator.
* **Pairing states** `reset_ready`, `signed_out`, `still_paired`, `unknown` are distinct; `locked` and stolen declarations are rejected. `still_paired` requires an explicit acknowledgement, is flagged for review and is never transfer-ready; `unknown` is flagged for review with a visible caveat.
* **Buyer experience.** Detail page specification block, card facts, and `search_wearables_v1` (type, brand, model, condition, price, location, transfer-ready, connectivity). No ring-size or charger filter in V1: ring sizing is maker-specific free text and charger is only a declared inclusion.

## Out of scope / known limitations
* No seller edit RPC in V1 (declared status cannot drift after submit); correction is before submit, or withdraw and repost.
* Admin does not yet display the risk flags (the Admin repo was not touched); flagged listings stay in `pending_review` for a moderator.
* Hindi/other-locale labels are not shipped; labels are concentrated in `contract.ts` for later localisation.
* Release years in the CSV are stored as `source_year` only and never shown, filtered or validated.

## Files
See `docs/operations/WEARABLES_V1_HANDOFF.md` for the exact manifest, migration checksums, tests, CI changes and rollback.
