# FairSwap Post Ad redesign - draft Codex prompt

## Execution mode: PLAN ONLY

Act as FairSwap's principal engineer in the existing FairSwap-Web workspace in Antigravity. This request authorizes investigation and a proposed implementation plan only. Do not edit application files, create branches/worktrees, install packages, seed data, run migrations, write to any hosted database, commit, push, or deploy. Return the plan in the conversation/Antigravity review surface without creating repository planning files unless separately authorized. A later explicit BUILD approval is required.

Read AGENTS.md, the applicable .agents/rules/fairswap.md, relevant progress entries, and the relevant product/listing contracts. Inspect the actual checkout and git status; do not assume GitHub main matches the local workspace. Preserve all existing work. Use read-only GitHub/Supabase MCP access only when necessary and verify the selected environment. Never expose credentials or customer records.

## Goal

Design a two-stage Post Ad entry flow:

1. A macro-category selector with Goods, Vehicles, and Property.
2. The existing detailed listing form, restricted to approved categories belonging to the selected macro-category.

Preserve the current database-backed draft, edit, photo-upload, moderation, authentication, policy-acceptance, and seller-maintenance workflows. This is not permission to build a new listing system or import every CSV row.

## Source inputs

Inspect all three attached files, locating them in the workspace rather than assuming this chat's /mnt/data paths exist locally:
- india_categories.csv
- india_car_brands_models.csv
- india_bike_scooter_brands_models.csv

The attachments are proposals, not approved production seeds or a verified current vehicle catalogue. If unavailable, identify the missing inputs; do not fabricate their contents.

Initial review found 202 category leaves across 25 groups: Goods 129/12, Vehicles 39/6, Property 34/7. The vehicle files contain 578 car rows across 52 brands and 830 motorcycle/scooter rows across 58 brands. Recheck these counts and report structural issues.

## Known implementation starting points - verify before planning changes

- src/app/account/listings/new/page.tsx: authenticated Server Component; fetches active categories, category_attributes and cities; renders ListingForm.
- src/components/listings/ListingForm.tsx: shared create/edit Client Component; currently auto-selects the first category; renders dynamic attributes; creates or updates drafts.
- src/app/account/listings/actions.ts: createDraftListingAction, updateListingAction, submitListingAction.
- src/app/account/listings/[id]/edit/page.tsx: loads the owned listing, media and private location data; renders the same form.
- src/types/listing.ts: Category, CategoryAttribute, draftListingSchema, submitListingSchema.
- src/types/database.ts and supabase migrations: inspect generated types and database enforcement rather than editing generated definitions by hand.
- Inspect Post Ad entry links, auth next-return handling, seller/native API contracts, relevant discovery/admin category consumers, and existing tests.

The inspected code uses Next.js 16, React 19, Zod 3 and lucide-react. Match the installed versions and lockfile; do not upgrade dependencies.

## Proposed routing and state contract

Prefer the existing canonical creation route, not a competing /post-ad form hierarchy:
- /account/listings/new: selector.
- /account/listings/new?macro=goods: Goods form.
- /account/listings/new?macro=vehicles: Vehicles form.
- /account/listings/new?macro=property: Property form, only once its prerequisites are explicitly approved and supported.
- /account/listings/{id}/edit: existing draft/edit flow, bypassing the selector.

Compare this with a dedicated selector route and justify the smallest safe option. Conceptually these are two steps, but the macro selection is URL-backed, not stored only in useState or a global store.

Propose a Zod enum for goods | vehicles | property. Parse searchParams at the page boundary using the installed Next.js conventions and pass a validated macroCategory prop to the existing form. Handle missing, invalid, empty, repeated/array parameters and reference-data errors explicitly. Do not silently default unknown values to Goods. Preserve an encoded, safe same-origin return URL through authentication.

Only the macro selection belongs in the query string. It is not a saved draft, does not preserve unsaved form values by itself, and must not trigger a listings insert.

On edit/resume, derive the macro from the persisted category relation, never from an overriding URL parameter. Document dirty-form behavior for browser Back/Forward and Change section. Prevent silent loss; do not invent localStorage drafts or introduce autosave as an incidental refactor.

## UI specification to include in the proposed build

Propose a reusable MacroCategorySelector component, for example src/components/listings/MacroCategorySelector.tsx, using existing FairSwap styles/tokens.

Heading: "What would you like to list?"
Cards:
- Goods: "Phones, electronics, furniture, appliances, fashion and kids' items." Parcel/box icon.
- Vehicles: "Bikes and scooters, cars, bicycles and vehicle accessories." Motorcycle/scooter icon, not a bicycle icon mislabelled as a motorcycle.
- Property: "Homes for sale or rent, PGs and rooms, shops and offices." House/building icon.

Verify icon exports in the installed library; use an accessible small SVG only when necessary. Do not add a dependency just for icons. Use semantic links/buttons, visible focus, descriptive accessible names, decorative icons hidden from assistive technology, mobile stacking and desktop cards. Do not copy DBA branding or assets.

The form should show the chosen section and a safe Change section action. Present an explicit category placeholder rather than silently choosing the first database row. Order Motorcycles and Scooters before Cars through approved sort metadata, not CSV row order.

## Category contract and import boundaries

Current production reference data was observed as six flat categories: Electronics, Furniture, Home Appliances, Bicycles & Sports, Books and Hobbies. Verify current state read-only. No macro/parent hierarchy was present. The test environment also contained a synthetic category, so never assume test-only rows are production taxonomy.

Recommend the smallest additive canonical database mapping, such as a constrained categories.macro_category field, while preserving existing category IDs and listings.category_id. Derive the listing's macro from its category instead of storing two conflicting authorities. Separate the later group/leaf hierarchy design from the selector feature unless a reviewed release explicitly includes it.

Explicitly resolve the combined Bicycles & Sports legacy category: it crosses the proposed Goods/Vehicles boundary. Do not guess mappings, default all unrecognized categories to Goods, bulk relabel old listings, or delete/recreate categories. Define treatment of legacy/inactive categories on existing drafts and public listings.

The 202-row taxonomy mixes dimensions. Cars includes body styles alongside Luxury, Electric/Hybrid and Vintage. Recommend separating category, body style, powertrain and segment before import. Use stable IDs and collision-safe full-path keys; repeated leaf labels under Sale and Rent are not necessarily duplicates.

The key_fields column is a proposal, not a validation schema. Define types, labels, options, units, constraints, dependencies, required-for-draft versus required-for-submit, and schema/version handling. Avoid duplicating canonical price, condition and location fields in category_attributes. Reuse the existing metadata-driven form; do not create a second engine.

## Required blockers to report, not silently fix

- The inspected HTML and Zod price limits cap listings at INR 1,000,000 (10 lakh); both database environments also had a 100,000,000-paise CHECK constraint.
- price_paise is PostgreSQL integer. Raising the CHECK alone is not a complete Property solution. Evaluate bigint paise, a bounded safe JSON/TypeScript representation, and every affected RPC, search filter, admin view and mobile consumer in a separate approved money-contract change.
- Condition and pricing are goods-oriented. Property needs explicit sale/rent intent and price period/basis, such as total sale amount, per month, per bed, per seat or per night. Do not overload price_type (fixed/negotiable/free).
- The current attribute renderer handles select/number/text; confirm boolean handling, date fields and dependent lookups before promising the CSV's richer forms.
- Vehicles and Property require real approved categories; a filter cannot manufacture them. Do not enable a production branch that is empty or cannot pass submission validation. Report the prerequisites for all three cards to be functional.

## Vehicle reference data - separately scoped follow-on

Do not import the 1,408 model rows or implement vehicle-specific forms in the selector PR unless explicitly approved.

Propose normalized brand/model identifiers and validation that a model belongs to its brand and vehicle type. Keep discontinued models available for used listings. Treat Current/on_sale/Upcoming/import_only as unverified source statuses, distinct from catalogue selectability. Define consistent lifecycle values, provenance and last_verified_at.

Support nullable engine capacity, including electric vehicles and missing source values. Identify the incomplete mapping between the motorcycle catalogue's styles and the category CSV. Include a controlled Not listed fallback proposal. Load model options by selected type and brand; do not ship all catalogue data with every form or the selector. Plan versioned caching for mobile/offline use without changing native apps in this task.

## Draft, security and compatibility requirements

Reuse the existing create/update actions and draft-to-edit redirect. Do not create a draft on card selection, duplicate a draft on resume, or make all category fields mandatory for draft saving. Preserve the existing minimum draft requirements and stricter submission checks.

Keep MediaUploader on the existing saved-listing edit path for this scope. Preserve listing ID, media, moderation transitions, policy acceptance, private-location handling and seller-maintenance behavior.

Filter categories authoritatively and verify category existence, active/selectable state and macro membership at the server boundary. Enforce database integrity for direct clients as well as the web; preserve ownership RLS and avoid service-role user writes. Changing category must clear incompatible attribute values without silently erasing unrelated form data. Define explicit behavior for legacy/inactive selections.

Assess backward compatibility with native/API consumers. Do not require a new macro field from existing clients when it can be derived from category_id. No Android/iOS implementation changes are authorized.

## Expected output

Return:
1. Verified current architecture and evidence, separated from assumptions.
2. Recommended URL/state and canonical category contract, with alternatives and tradeoffs.
3. A file-by-file plan covering selector, page, shared form, helpers/types, actions/edit handling, migration/seed proposals and tests. Clearly distinguish proposed new paths from existing paths.
4. Explicit release boundaries: selector/filtering, approved taxonomy migration, vehicle catalogues, Property readiness, and any future photo-flow redesign.
5. Acceptance tests: three intended branches; invalid/repeated macro values; auth return; refresh and Back/Forward; empty/error category loads; dirty-form changes; valid and tampered category membership; legacy drafts; existing draft minimums; save creates once then resumes by ID; photo/moderation regressions; maintenance/policy guards; owner/non-owner RLS; keyboard/mobile behavior; and Property/price boundaries where included.
6. Verification commands from package.json, including pnpm lint, pnpm typecheck, pnpm test:unit and pnpm build, plus relevant E2E/security checks. Never claim tests passed unless executed; tests with external writes require separate authorization and a verified non-production target.
7. Unresolved product decisions and a recommended small first BUILD boundary. Stop after presenting the plan. Do not treat this draft prompt or your own plan as build approval.
