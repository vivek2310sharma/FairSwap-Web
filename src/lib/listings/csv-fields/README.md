# CSV field layer v1

> [!NOTE]
> **Current source boundary (2026-10-14):** This CSV field layer and its two-wheeler overlay are source-derived **preview/proposal** contracts. Separate FairSwapTest owner-draft work does **not** approve production category activation, required fields, database UUIDs or catalogue mappings. Review the [Post Ad evidence index](../../../../docs/reference/post-ad/README.md) and [current state](../../../../docs/CURRENT_STATE.md) before reuse.

This is a compiled reference contract used by the existing isolated Post Ad preview. It has no production category activation, database IDs, persistence, posting eligibility, or publish authority. The real Goods entry, saved values, draft retention and session recovery use their existing contracts.

`scripts/compile-csv-fields.py` uses Python's strict CSV reader and verifies all three original byte hashes against the supplied workbook's Sources sheet before compilation. Run with the bundled Python runtime; no package installation is needed. `scripts/extract-csv-mapping.py` recovers the missing mapping references from the supplied workbook with workbook hash/sheet/header-row provenance and refuses to overwrite different references. Extraction is a one-time recovery, not a repeated source audit.

The generated snapshots preserve original headers, raw values, row order and CSV line references. Category hierarchy and review keys come from the original CSV and workbook mapping, with every ordered field membership checked against the workbook matrix. A field definition identity is the full review path plus field key. Requiredness stays unknown; bounds and selectable options stay unset. Proposal columns remain nested under `proposal`. `mappingReferences` pins the exact workbook and extracted reference bytes used during compilation.

The client imports category metadata only. The isolated `/api/catalogue` route imports the vehicle snapshot; Zod validates requests and catalogue rows. Responses contain at most 25 matching model rows, a selected scoped row, source brands and unresolved crosswalk dimensions. No full vehicle catalogue enters the client graph. `verify-imports.mjs` explicitly guards that boundary and rejects auth/actions/DB/location/media imports.

`rules.ts` is a pure typed evaluator with strict Zod inputs: answered/equals predicates, visible/enabled/required states, explicit proposal widgets, and confirmed incompatible model transitions. It never executes rule strings. Unknown requiredness and presentation state cannot authorize publishing. Hidden/disabled values are not deleted. False, zero and unanswered are distinct.

Implemented preview proposals: exact selected-path applicability; explicit two-wheeler leaf filtering plus a separate broad-group review view; model disabled until brand and explicit ready lookup; bounded search/pagination; unstarted/loading/error/empty distinction with value retention; confirmation before changing category/group/section or incompatible brand/model; unanswered/yes/no booleans from explicitly marked workbook hints; a `storage_gb` numeric demonstration without bounds; separate display order for vehicle groups. The Motorcycle/Scooter overlay supplies advisory widgets described below. Other slices remain unresolved. Catalogue selection stores a review row reference only; the raw source row is displayed separately, with no assumption that the reference is a production identifier.

The hardening uses catalogue-specific strict car/two-wheeler Zod schemas before filtering: required columns and nonblank brand/model identities, correct original source file, integer row/order and exact file:row review reference. Strings are validated without trimming or transformation. Blank two-wheeler `engine_cc` remains the original empty string. A malformed row raises controlled Zod validation handled by the preview API, rather than a string-method exception.

Lookup dependence is explicit in `rule.lookupDependent`. Only dependent fields require `lookup: ready`; an omitted or unstarted lookup disables Model. Brand does not inherit that dependency. Its source brand list is loaded independently of Model enablement and survives temporary model lookup failures. Existing values are neither deleted nor validated by presentation state.

## Motorcycle/Scooter source proposal v1 — not approved for publication

`proposals/two-wheelers.v1.json` is the single machine-readable overlay: nine source paths and 101 path-scoped field memberships, with immutable snapshot hashes, exact source references/order, proposed input/units/bounds/options, draft/submission requirements, visibility/enablement, dependency handling and unresolved persistence candidates. `scripts/build-two-wheeler-proposal.mjs` deterministically authors only this proposal; it does not rewrite the source snapshots. `two-wheeler-proposal.ts` validates the overlay and evaluates compatibility/advisory bounds outside React. The real Goods graph does not import it.

All category attributes remain optional in the proposed draft slice; existing common draft minimums are unchanged. Proposed submission-required fields are Brand, Model, manufacture Year, kilometres driven and registration State. These requirements are displayed as proposals and are not enforced by production validation or the preview evaluator; source requiredness remains unknown. No publishing authority exists.

| Source field | Proposed control / unit | Proposed bounds or unresolved rule | Proposed submission |
| --- | --- | --- | --- |
| brand, model | Source selects; Model uses review row reference | Explicit proposed leaf matches only; Not listed and production identifiers unresolved | Required |
| variant, color | Seller text | Variant ≤80, color ≤60 characters; no catalogue-derived enum | Optional |
| year | Integer manufacture year | 1900–current calendar year; approve manufacture versus registration semantics | Required |
| engine_cc | Seller-confirmed number, cc | >0 when answered; blank unknown; no verified universal ceiling | Optional |
| km_driven | Whole odometer km | ≥0; anomaly threshold unresolved, zero retained | Required |
| owner_number | Integer current owner ordinal | ≥1; upper limit and prior-owner interpretation unresolved | Optional |
| registration_state | Unresolved approved-state select | State/UT enum and ID crosswalk absent; distinct from listing location | Required |
| insurance_valid_till | ISO calendar date | Valid dates including expired dates; no legal/current-insurance requirement | Optional |
| price, negotiable | Candidate links to existing common pricing | Keep existing limits/precision; no duplicate editable attributes; Free/unanswered mapping unresolved | Existing common contract |
| range_km | Seller estimate, km per full charge | ≥0; rated versus observed meaning and upper bound unresolved | Optional |
| battery_warranty_left | Remaining whole months at seller entry | ≥0; 0 means none reported; expiry-date alternative, as-of storage and ceiling unresolved | Optional |

These are path-scoped recommendations only, not generic shared definitions, manufacturer specifications or legal requirements. Numeric/date/length feedback is advisory and does not block the existing draft preview. Seller-entered attributes are retained when Brand/Model changes; clearing an incompatible Model requires confirmation. Path/group/section clearing also requires confirmation. No automatic catalogue specification overwrites occur.

Explicit proposed mappings use the supplied `vehicle_type` plus `category` style, with a raw fuel predicate where the taxonomy names powertrain:

- Motorcycle / Commuter → Commuter Bikes (includes the source CNG Freedom 125 row; no Petrol default).
- Motorcycle / Sports, Fully Faired, Superbike → Sports & Superbikes.
- Motorcycle / Cruiser → Cruiser Bikes.
- Motorcycle / Adventure, Touring → Adventure & Touring Bikes.
- Motorcycle / Retro, Neo-Retro → Classic & Retro Bikes.
- Electric Motorcycle / Electric Motorcycle / Electric → Electric Motorcycles.
- Scooter / Scooter / Petrol → Petrol Scooters.
- Electric Scooter / Electric Scooter / Electric → Electric Scooters.
- Scooter / Maxi Scooter and Moped / Moped → Maxi Scooters & Mopeds.

All 14 exact type/style mappings remain proposed, covering 685 of 830 uploaded two-wheeler rows. Naked (96), Sports Commuter (18), Scrambler (20), Roadster (7) and Dual-Sport (4) remain unresolved: 145 rows total. Their body/use/style overlap does not prove one taxonomy leaf. Every row remains in the immutable catalogue and can be reviewed through the paginated broad-group view with its exact source, raw status and explicit compatibility reason. That view disables incompatible/unresolved model options. Coverage accounts separately for other leaves and the other broad group; approved compatibility is always zero. Model-name similarity and lifecycle status are never compatibility or posting eligibility evidence.

Product choices needing approval before DB integration:

1. Approve/revise the 14 explicit mappings and allocate the five ambiguous styles; choose Not listed/free-text handling for unmatched Brand/Model and missing per-year/variant coverage.
2. Approve the five proposed submission-required fields, their manufacture-year/owner-ordinal meanings and year/text limits; decide a registration-state enum/ID crosswalk and anomaly policy. Existing Goods and legacy rules stay unchanged until a separate integration decision.
3. Choose seller-estimated versus rated electric range, remaining warranty months versus expiry date, and as-of date semantics. Decide separately whether to extend Motorcycle fields with fuel or electric-bike battery capacity; neither extension is present here.
4. Approve one common price/negotiability authority, vehicle money limits and Free/unanswered behavior without a second category amount/flag.
5. Choose approved category/version UUID mappings, brand/model identifiers, scoped attribute storage and server-side validation; define legacy retention and whether seller attributes require reconfirmation after a parent change. Review row IDs cannot become production IDs implicitly.
6. Decide lifecycle eligibility/freshness independently from catalogue compatibility. Car powertrain, Property amount/unit mappings and duplicate Kids Cycles placement remain outside this implementation.

Remaining rule decisions (workbook D01–D15):

| Decisions | Exact contract still needed |
| --- | --- |
| D01, D07 | Path-specific types, enums, bounds, lengths, requiredness for draft versus submit; equivalence before sharing `type`, `capacity`, `size`, `storage_type` or other definitions. |
| D02–D04 | Approved car body/segment/powertrain/age crosswalk and two-wheeler style/type-to-leaf compatibility. Broad-group lookup is only a proposal; even an Electric leaf does not prove catalogue leaf membership. Cars supply no fuel/year/variant data. |
| D05, D06, D12 | Whether fuel becomes an ordinary Motorcycle input (Freedom 125 is CNG); whether to propose a new electric-bike battery capacity field; seller override/per-year specification policy. Blank engine stays unknown. |
| D08, D13 | Whether book/game `title` means product title or ad headline; canonical `condition`, price and location mappings; category-aware submit requirements where CSV keys omit common fields. |
| D09 | Canonical home and cross-discovery for Goods Ride-ons & Kids Cycles versus Vehicles Kids Cycles. Both paths remain separate. |
| D10 | Sale price, monthly rent, per-bed, per-seat and per-night money/basis mappings; precision/limits, deposits, maintenance versus maintenance_monthly, and explicit area units. No amount reinterpretation. |
| D11, D14 | Lifecycle versus selection/eligibility and verification freshness; Upcoming/import_only handling; Not listed/free-text policy and catalogue coverage for Goods, bicycles, parts and commercial vehicles. No status-to-eligibility translation exists. |
| D15 | Reviewed category/version/release mapping to existing database UUIDs and historical listing relationships. Source taxonomy is not launch authorization. |

Remaining database/API integration choices: map review paths to approved existing/new category UUIDs without reassigning legacy listings; choose versioned scoped field definition/value storage and model reference keys; establish one persistence authority for canonical common concepts; approve server-side path/version/brand/type/model validation and draft/submit requiredness; enforce ownership and release policy; define confirmed stale-value transitions and legacy retention across metadata updates. No schema or migration changes were made for this layer.

Focused hardening verification: five compiler tests; one 10-file unit run with 115 tests (25 CSV/rule/catalogue/proposal tests plus 90 Goods/preservation regressions); root/preview typechecks; root lint; preview and real Goods import graphs; the existing browser harness extended for unstarted lookup, conventional/electric motorcycles and scooters, CNG, ambiguous-row review, unrelated-input retention and electric-leaf exclusion. Browser evidence is in `artifacts/post-ad-preview/browser-results.json` with nine desktop/mobile screenshots. Repeated runs are not added together.
