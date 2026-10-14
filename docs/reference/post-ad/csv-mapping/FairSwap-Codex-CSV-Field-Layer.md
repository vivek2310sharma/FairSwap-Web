# BUILD: CSV-backed category/field contract and existing preview

> [!NOTE]
> **Historical Post Ad reference (recorded October 2026):** Original agent instruction draft, **not an active instruction to execute**. Original branch names, internal step labels (including any 'Phase 1') and outcomes are preserved for audit context. Use [current state](../../../CURRENT_STATE.md), [roadmap](../../../ROADMAP.md) and a fresh issue-specific approval before editing source, migrating, testing against hosted Supabase or deploying.


Work in FairSwap-Web on the current `codex/post-ad-a0` branch. Preserve all existing Goods, retention, session-recovery, migration, reference and preview work.

This build converts the supplied CSVs into a reusable, source-traceable category/field layer and demonstrates it in the EXISTING preview. It is not another infrastructure or general planning task. Do not modify a database or activate new posting categories.

## Inputs

Read repository rules and relevant existing preview/domain modules. Read the three CSVs under `docs/reference/post-ad/` and the supplied mapping pack. When copying pack inputs, compare existing files first; never replace different inputs silently.

Use original CSVs as factual source. `category-field-mapping.json` and `category-field-matrix.csv` are extracted references; `proposed-field-rules.json`, input/storage hints and workbook recommendations are proposals, not independently approved production data. Preserve every raw label, key, field order, raw model status and source row.

Expected source snapshot:
- 202 category rows: Goods 129, Vehicles 39, Property 34; 25 groups.
- 1,236 category/field memberships; 171 distinct field tokens.
- 578 car rows / 52 brands; 830 two-wheeler rows / 58 brands.
- SHA-256 values are in source-audit.json. Verify them before compilation.

## Implement

1. Add a deterministic CSV compiler using installed tooling and a real CSV parser, not split(','). Generate versioned, source-traceable data outside the production persistence boundary. Fail with exact row/key errors for malformed headers/paths, duplicate exact paths or duplicate fields within a row. Unknown source columns must not be silently ignored. Do not fetch outside vehicle data or install packages just to fill gaps.

2. Preserve `category -> subcategory -> sub_subcategory` from the source. Names are display labels, not database UUIDs. Keep review keys distinct from existing category IDs. Do not silently merge SUV/Luxury/Electric car paths, Kids Cycles paths or generic field definitions. Keep existing category IDs and listing relationships untouched.

3. Scope a field definition to its category path until semantics are proven shareable. `type`, `capacity`, `title`, `size` and `storage_type` must not become one universal enum or alias. Represent unspecified requiredness/bounds/options as unknown, never automatic required=true or a fabricated selectable option list.

4. Reuse the approved selector and existing preview harness. Add group/leaf selection and replace generic sample-attribute placeholders with actual source field memberships. Show source-derived applicability separately from proposed widget/dependency behaviour. Unresolved fields must visibly say what is undecided; do not pretend a guessed text box or select enum is a completed contract. No new preview app or production debug route.

5. Implement a small pure, typed rule evaluator for the preview's explicit overrides, with Zod validation at inputs. Support visible/enabled/required-state distinctions and dependencies, not a general-purpose scripting engine. No eval, executable strings or arbitrary SQL/JavaScript in rule data. Keep rule results reusable outside React. Missing requiredness remains unknown and cannot authorize publishing.

6. For the preview, proposed defaults may demonstrate category membership, vehicle model-until-brand disabling, loading/error/empty lookup states, confirmation before clearing an incompatible model/attribute, and unanswered/yes/no booleans. Clearly label these as proposed rules. Preserve false and zero. Do not treat hidden as deleted, disabled as validated, or an omitted CSV key as permission to remove existing common listing fields.

7. Use vehicle catalogue rows only for covered groups. Motorcycles preview: Motorcycle/Electric Motorcycle source types. Scooters preview: Scooter/Electric Scooter/Moped source types. Cars: the car file. These broad-group mappings are explicit preview proposals, not approved leaf compatibility. Build and display an unresolved crosswalk where style/body/segment/powertrain labels differ. Do not pretend exact leaf membership is verified. Model options must at least match selected source catalogue/type and brand. Goods, bicycles and commercial vehicles have no dedicated model catalogue in these uploads.

8. Keep current/discontinued/upcoming/import_only raw values. Do not translate lifecycle into posting eligibility. Do not infer car fuel type, year or variant from names. Blank engine_cc stays unknown, not zero. The supplied Bajaj Freedom 125 row says CNG; do not apply a Petrol default to every non-electric motorcycle. Catalogue engine/fuel hints are not immutable per-year specifications.

9. Electric two-wheeler leaves show their listed range_km/battery_warranty_left, not an invented battery_capacity_kwh. Property leaves preserve source price/monthly_rent/per-bed/per-seat/per-night distinctions. Do not expand real money/condition/location/submission contracts or introduce legal/verification claims. Keep title/price/condition/location canonical-mapping questions visible.

10. Display Motorcycles, Scooters, Cars, Bicycles, Vehicle Parts & Accessories, Commercial Vehicles in the proposed India-first group order. Preserve original source order in metadata. Filter and paginate lookup payloads: do not place all 1,408 models in every form response.

## Tests and delivery

Test full snapshot counts, deterministic compilation, source provenance, row order, exact field membership for all 202 paths, duplicate handling, unknown-rule behaviour, separate storage_type definitions for laptop/bed contexts, model reset/brand scoping, raw statuses, CNG, blank engines, Property amount-basis distinction, false/zero/unanswered handling and rejection of executable rule data.

Use focused installed test commands. Run lint, root/preview typechecks and the existing preview browser/import checks, adapting only for this approved preview change. Demonstrate smartphones, petrol/electric two-wheelers, a car path with unresolved powertrain mapping and a PG/rental path. Keep unresolved rules visible and confirm no real database/location/auth/media calls enter the preview.

Return an openable CSV-backed preview, source-compiler/rule tests, changed-file summary, exact resolved-versus-unresolved rules and the specific remaining DB integration choices. Do not repeat the whole historical plan. Do not claim the live schema/categories or all field rules are complete.

No Docker, database queries/writes, migration application, new production categories, account/media fixtures, production activation, new dependencies, environment-file changes, commit, push or deployment. Keep real Goods posting unchanged. Stop after this build.
