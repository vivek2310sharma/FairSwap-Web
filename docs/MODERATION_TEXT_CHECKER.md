# Prototype Moderation Text Checker (MOD-01 / MOD-01A)

## 1. Purpose & Scope
This module provides a pure, isolated TypeScript rule evaluator for listing titles and descriptions (`src/lib/moderation/`).
It runs non-AI pattern checks and returns structured review signals.
The current rule-set version is `prototype_v0.1.1` (updated from `prototype_v0.1.0` following contract hardening and negation phrase boundary calibration).

**Important Boundaries**:
- This is NOT a complete listing validator, fraud detector, image moderator, or auto-approval system.
- An outcome of `no_review_flags` means strictly: *"The selected prototype text checks completed and found no review flags."*
- It must NEVER be interpreted as *"This ad is genuine"* or *"This ad is approved for publication."*
- **Current integration (source checked 2026-10-14):** This *pure evaluator* IS imported and called by `supabase/functions/_shared/listing-moderation-worker.ts` during claimed-job moderation. Its signals are subsequently finalized through trusted moderation RPCs. It has no authority to approve, publish or reject a listing by itself.

## 2. Sealed Public Evaluator & Input Contract
- **Sealed Public API**: `evaluateListingText(rawInput: unknown): ModerationEvaluationResult` accepts raw input only. No caller-supplied runners, plugin overrides, or mutable registries are permitted.
- **Trusted Mandatory Execution**: The engine always runs the fixed, immutable set of three mandatory prototype rules in stable sequence.
- **Input Validation**: Inputs are validated at runtime using Zod (`moderationInputSchema`). Constraints are strictly aligned with repository database and form contracts:
  - `title`: string, trimmed length 3 to 150 characters (sourced from database check `chk_listings_title` in `20260914000005_create_listings.sql` and `draftListingSchema` in `src/types/listing.ts`).
  - `description`: string, trimmed length 10 to 5000 characters (sourced from database submission requirement in `20260914000008_create_listing_rpcs.sql: length(trim(description)) >= 10` and `draftListingSchema`).
  - Missing, empty, whitespace-only, or oversized inputs reject cleanly with `invalid_input`.

## 3. Four Distinct Outcomes & Completeness Invariant
1. `no_review_flags`: ALL mandatory prototype rules (`rule_prohibited_item_wording`, `rule_shortened_link`, `rule_payment_before_viewing`) completed with 0 flags.
2. `needs_review`: ALL mandatory prototype rules completed, and at least 1 review flag was produced.
3. `invalid_input`: Supplied title or description failed the input validation contract.
4. `checks_incomplete`: A mandatory rule failed to execute, threw an error, or was omitted. Any partial flags already collected are preserved, but the check NEVER passes.

## 4. Evaluated Prototype Rules

### Rule A: Selected Prohibited-Item Wording (`rule_prohibited_item_wording`)
- **Dictionary**: `firearm`, `firearms`, `handgun`, `handguns`, `hand gun`, `hand guns`, `ammunition`, `heroin`, `cocaine`, `stolen bike`, `stolen bikes`.
- **Matching**: Case-insensitive, whole-word/phrase boundaries (`\b`).
- **False-positive safeguards**: Does not flag "glue gun" or "heroine".
- **Reason**: `"Selected prohibited-item wording found."`

### Rule B: Known Shortened Links (`rule_shortened_link`)
- **Domain List**: `bit.ly`, `www.bit.ly`, `tinyurl.com`, `www.tinyurl.com`.
- **Matching**: Extracts candidate tokens, parses hostname with WHATWG URL parser.
- **False-positive safeguards**:
  - Matches exact hostname only: does NOT flag `bit.ly.example.com`, `example.com/bit.ly`, or `https://bit.ly@example.com`.
  - Excludes email addresses (e.g. `user@bit.ly`).
  - Does NOT flag arbitrary external links (e.g. `https://sony.com`).
- **Reason**: `"Known shortened link found."`

### Rule C: Explicit Payment-Before-Viewing Requests (`rule_payment_before_viewing`)
- **Target pattern**: Positive demands to pay, send, transfer, or deposit money, a token, or booking amount before viewing or inspecting the item/property.
- **Negation support**: Local clause-level negation (e.g. "no advance payment required" or "do not pay the refundable token security deposit amount before viewing" are neutralized). Calibrated to recognize negation up to 5 words before the payment verb.
- **Sentence independence**: A negated statement in one sentence does not exempt a positive demand in another sentence within the same ad (e.g. "No advance payment required. Pay ₹1,000 before viewing the flat." is flagged).
- **Reason**: `"Explicit payment-before-viewing request found."`

## 5. Limitations and server-worker integration boundaries
- **Language Coverage**: Covers English and Indian English phrases. Does NOT cover Hindi, Hinglish, transliterated scripts, obfuscated l33tspeak, or images.
- **No Network Requests**: Does not resolve shortened URLs, check DNS, or call external APIs.
- **Pure checker only:** Listing revision, claim token, timeout/lease and media-state invariants live in the moderation worker and database RPC layers; text evaluation itself does not inspect images, prove identity or track state. See [MOD-03A](MOD_03A_AUTOMATIC_MODERATION.md) and `supabase/functions/_shared/listing-moderation-worker.ts`.
- **Fail-closed integration:** Missing checks, stale claims or changed listing/media state must not create public visibility. Background outcomes may not override a human removal/rejection. Keep the existing worker, moderation and database security regression tests.
