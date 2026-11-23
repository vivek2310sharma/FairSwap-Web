# Canonical family chooser correction — 23 November 2026

Corrected candidate against exact GitHub main baselines:
Web `bb2849a4fc1a96d269151981cf6975811878a04a`; Backend
`5b2260420b32aeba1a42109215416c53b5fd1585`.
Only affected files were reconciled. Existing checkout HEADs, unrelated Goods
fixtures/journeys, and unrelated Backend changes are preserved.

The Web page retains main's GoodsPostAdEntry architecture, legacy specialist URLs,
Goods loading and fallback behavior. The five new canonical links resolve to
existing specialist IDs (9 Cars, 9 motorcycles/scooters, and 5/4/1 rental types).
Canonical IDs never become form write IDs. All 43 reviewed Goods routes and
unsupported-category restrictions remain unchanged. The small entry/chooser
component edits were explicitly approved for this correction.

The forward migration changes chooser metadata only. Production uses the existing
Production policies/RPC/lifecycle; Test uses its existing Test policies,
`public.seller_submit_listing(uuid,integer)` and reviewed Test lifecycle.
Neither a partial nor an ambiguous Production installation can fall back to Test.
No authorization implementation, category activation, RLS policy or release flag
is copied or created. Postflight requires **five positively ready choices** in the
expected environment; five disabled choices cannot pass by agreeing with each other.

Backend release registration retains main's newer provider-neutral activation,
Google moderation, account-security email, IDV required-gate/ACR candidates and
batch constraints. The new candidate retains checksum/ledger pinning, a verified
same-commit Test receipt before Production, and no automatic promotion.

PASS against exact-main snapshots with corrected files overlaid and existing dependencies:

- 327 Web unit/security tests across 13 relevant suites, including 50 India-taxonomy migration/security cases and existing Goods entry/retention tests.
- Web typecheck and targeted ESLint.
- 9 isolated browser journeys: five family mappings, two failure cases, existing phone posting and category search.
- Backend `verify:migrations`: all 58 immutable migrations match their manifest.
- Backend disposable PGlite: simulated Production metadata checks plus the **real existing Test** foundations, submit RPC, review extension, lifecycle, RLS and guards. Test has no Production policy table or Production submit RPC; all five choices and positive postflight pass. Disabled policies, missing safeguards, ambiguous installations and unauthorized callers fail; category flags, authorization objects and 43 Goods nodes stay unchanged.
- Backend reusable-release suite: 188 passed; 6 existing native-PostgreSQL cases skipped because binaries are unavailable. The positive Test lifecycle regression is included in that existing CI suite.

Fixture Auth/account/staff lookups are substitutes; local execution does not
certify hosted authorization or a complete hosted posting/review journey.

Hosted limits: earlier read-only Production inspection reconciled the installed
family implementation with historical commit `de4121b4c88b8e579ccde475e8c7e515112223a4`.
For this correction, FairSwapTest project metadata was readable, but both read-only
SQL requests returned connector internal errors. Its Production-object absence is
user-supplied and reproduced in the disposable regression, not independently
reverified hosted. Hosted readiness/acceptance of the new migration and native
PostgreSQL execution are NOT RUN. No hosted writes, migration apply, GitHub write
or deployment occurred.

Delivery remains ChatGPT-owned: exact Backend candidate
`20261123123000_canonical_family_chooser_v1.sql` in Test, matching staging Web and
automated acceptance, then the separate receipt-gated Production Backend/Web
release. Reuse the existing verified family environment gates; add no variables.
If Test's existing review prerequisites are missing, fail release instead of
installing Production authorization or bypassing guards. Roll back Web links by
reverting the patch; restore prior catalogue metadata with a Backend forward fix.
Preserve drafts/contracts. Owner Production checks follow delivery, using automated
catalogue, family submit/review, Goods and private-media checks; no manual testing
or owner predeployment testing is required.

---

# Unified Publishing V3 Production port

The Production chooser keeps its existing Mobile Phones, Tablets, Wearables,
Mobile Accessories and legacy family routes. The V3 adapters from staging
PR #334 add a canonical category link only when the public taxonomy and
the seller-scoped V3 registry agree on the same leaf UUID. The form reloads
and checks the definition before it loads locations or renders. Repeated,
mixed and unsupported V3 category queries return to the chooser.

The V3 session, private media and submit routes use the existing cookie
session, origin, seller-write maintenance, policy and account checks. The
Backend verifies category availability and ownership. Media moves only
after an owned session freezes the validated payload. The V3 port adds
no verification route or DigiLocker configuration to Production.

## Release

Apply the Backend disabled batch and require automatic postflight to report
58 disabled contracts and identity enforcement off. Then deploy the focused
Web patch. The RPCs return no available V3 definitions in that state. The
Web release requires no new environment variables.

Existing category URLs, saved listings, edit routes and posting APIs continue
using their Production contracts. V3 property and regulated vehicles remain
closed, along with every other new V3 contract. A separate decision and release
are required for category activation.

Rollback by redeploying the previous Web Production artifact. Keep the
Backend batch installed and disabled. Follow the Backend V3 runbook if
database postflight fails. Keep the migration ledger intact.
