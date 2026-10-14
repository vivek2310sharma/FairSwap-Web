# FairSwap Post Ad — r2 A0 scope amendment

> [!IMPORTANT]
> **Historical implementation plan / dated scope.** Revision states and old approval/branch references below describe a prior task, not permission to run commands against today's repository. Start with [current state](../CURRENT_STATE.md), [roadmap](../ROADMAP.md), [contributing](../../CONTRIBUTING.md), and an explicitly scoped current issue. Preserve this original evidence; never use obsolete milestone prompts to re-scaffold, overwrite, migrate or deploy.


Revision: **r2 — A0 BUILD AUTHORIZED; remaining integration PROPOSED / NOT AUTHORIZED**\
Date: **2026-10-08 (Europe/Copenhagen)**\
Branch: `codex/post-ad-a0`, based on `c415d689124f405db56cbe8d7daecde7eeef1c29`.

## Revision and authorization record

| Revision | History / authority |
| --- | --- |
| r1 | Local PLAN ONLY audit, retained verbatim below. No implementation authorized by that document. |
| r2 | Human BUILD A0 amendment authorizes only the fixed foundation/isolated tests/safe auth returns listed here. Original full Batch A and all broader proposals remain unapproved. |

This r2 amendment governs current scope; the retained r1 body is historical evidence/proposals, including its original PLAN ONLY authorization. None of its recommendations expands A0 authority.

### Fixed A0 scope

1. New pure `src/lib/listings/macro-category.ts`: installed Zod enum/type goods|vehicles|property, discriminated missing/valid/invalid parser for string|string[]|undefined, strict exact input/no normalization/default, runtime-validated typed canonical URL builder. No React, database, secrets, redirects to arbitrary destinations or persistence.
2. New `src/components/listings/MacroCategorySelector.tsx`: explicit typed availability for every section (no default), required ordered copy, installed Package/House plus original decorative motorcycle SVG, semantic available links with prefetch=false and keyboard focus; unavailable cards explain state without href. Mobile-first grid. No DB/auth/actions. **Not imported into creation page; no public preview/debug route.** Presentation availability is not security enforcement or production readiness.
3. Minimal account auth-return changes to `src/proxy.ts` and new-page auth fallback only. Reuse unchanged sanitizeRedirectPath, nested URLSearchParams encoding and awaited installed Next searchParams convention. Preserve safe pathname/query and repeated macro values. No auth-method/session/cookie/policy/maintenance/reference-query/form-render change; no query logging or injection of form/PIN/token values.
4. Explicit isolated tests: `tests/unit/post-ad-routing.test.ts`, `tests/unit/post-ad-selector.test.tsx`, `tests/unit/post-ad-page-auth.test.tsx`, existing `src/__tests__/proxy-policy-guard.test.ts` and `tests/security/redirect.test.ts`. DB/SDK/actions/network replaced by doubles where applicable. Fixtures are presentation/test data, not category readiness.
5. Lint/typecheck, scoped tests and factual progress evidence. Build only if hosted application-service contact/unapproved env use can be excluded; otherwise NOT RUN. No broad test:unit/test:security/E2E, packages, env/lockfile edits, local DB startup/reset or hosted access.

### Human review decisions incorporated

- Preserve canonical `/account/listings/new`.
- Split original broad A into independently reviewed changes. A0 does not activate selector, macro filtering or category gating.
- Preserve existing bicycle posting. r1's suggested restriction of new mixed-category selection is **not approved** and cannot be an incidental rollout effect. A later contract must explicitly retain this capability or receive a separately reviewed product decision.
- Category mapping/release/selectability/legacy exceptions, wider attribute validation and Admin changes require a reviewed contract before BUILD.
- Dirty browser-history handling is unproven. Verify before integrating section-changing navigation into real form; no history patch/provider work in A0.
- No guarantee of recovering unsaved values after browser/mobile-process termination; durable draft persistence is outside A0.
- Vehicles and Property readiness, catalogue and money/semantics work remain separate.

### Actual A0 verification boundary

Initial isolated run: 96/96 passed. Final run after proxy fallback-path hardening: 98/98 passed across the five named files on 2026-10-08. `corepack pnpm typecheck` and `corepack pnpm lint` both passed (exit 0), including final reruns. `git diff --check` passed. Exact commands/evidence are recorded in the factual A0 progress entry. A0 READY FOR REVIEW; no human acceptance claimed. Build **NOT RUN**: Next automatically loads existing environment files, while `src/app/sitemap.ts` uses createServiceRoleClient and queries categories/listings/accounts during sitemap generation; this scope does not authorize hosted access or provide a verified approved build environment. No environment contents/keys were exposed and no build attempted.

No browser/layout/real-device/Safari/draft-flow/database authorization proof is claimed. Repeated query values and sanitizer behavior are isolated code tests. Selector layout classes/decorative icons/semantic DOM are tested, not visually browser-verified. Current form, all active reference categories including Bicycles & Sports, actions/edit/photos are unchanged. Next batch needs explicit reviewed scope, bicycle-compatible canonical category policy and readiness/security contract plus dirty-history proof before route activation.

## Retained r1 audit and proposals (historical, not A0 authority)

# FairSwap India-first Post Ad redesign — implementation plan

Revision: **r1 PROPOSED**\
Date: **2026-10-08 (Europe/Copenhagen)**\
Status: **PLAN READY FOR REVIEW — BUILD NOT AUTHORIZED**

## Authorization, history and evidence

Only `docs/plans/post-ad-india-plan.md` may change. No application, tests, dependencies, lockfiles, generated types, migrations, seeds, environment files, progress or other documentation changes; no branches/worktrees, commits, pushes, deployments, imports or database writes. The attachment separately authorizes this file despite the reference prompt's default conversation-only output. A later explicit BUILD approval must identify revision and batch.

| Revision | History |
| --- | --- |
| r1 | Initial local audit and proposed implementation. No previous plan exists at this path. |

Local baseline: `main`, HEAD `c415d689124f405db56cbe8d7daecde7eeef1c29` (merge PR #106, auth/media release). Initial status: only `?? docs/reference/`. Preserve these supplied untracked inputs. No remote fetch or assumption that remote main equals this checkout.

Read: AGENTS.md, CLAUDE.md (delegates to AGENTS), `.agents/rules/fairswap.md`, current progress, master spec execution gate and relevant product/listing sections, milestone 1.3 contract, native seller-media API contract, detailed `docs/reference/post-ad/FairSwap-Post-Ad-Codex-PLAN-ONLY.md` and all three CSVs. All named inputs exist. No nested src AGENTS found. Antigravity activation state cannot be proved by reading rule files. Progress includes older auth/Google statements; source and checkout verify current implementation, not historical approval text.

**Verified local** means inspected source/package metadata or parsed CSV. **Proposal** means future change. **Live verification required** means local migrations do not prove deployed schema/data. No hosted access is needed to produce this plan.

## 1. Verified current architecture

| Existing path / symbols | Behavior and implication |
| --- | --- |
| `src/components/header.tsx`; `src/app/search/page.tsx` | Desktop/mobile Post Ad and search empty-state links use `/account/listings/new`. Retain canonical destination. |
| `src/app/account/listings/new/page.tsx`, NewListingPage | Authenticated Server Component with request-scoped createClient/getUser. No searchParams handling. Fetches all active categories sorted by sort_order, all visible attributes, active cities; passes form props. Ignores query errors, converts null to empty arrays. Sign-in fallback drops query. |
| `src/components/listings/ListingForm.tsx`, ListingForm/processForm | Shared create/edit Client Component; automatically chooses first category and city. Category change clears attributesState. Renderer supports select/number/text; declared boolean falls through to text. No dirty guard. Price parses float rupees and rounds *100; HTML max ₹1,000,000. Required attribute presence checked client-side on submit. |
| `src/app/account/listings/actions.ts`, createDraftListingAction/updateListingAction/submitListingAction | Maintenance and current-policy checks, request-scoped client. Zod checks category UUID but no active/macro/selectability lookup. Malformed attribute JSON becomes `{}`. Create inserts and returns listingId; update filters id and relies on RLS without checking affected rows. Submit reads private PIN/location then invokes seller_submit_listing. |
| `src/app/account/listings/[id]/edit/page.tsx`, EditListingPage | Awaits Promise params, checks saved listing ownership, loads media and owner-private PIN/landmark via get_seller_listing_location_private, hydrates PIN lookup. Loads active categories only, so inactive saved category may disappear from options. No canonical macro join. |
| ListingForm / `src/components/listings/MediaUploader.tsx` | Save as Draft inserts then navigates to `/account/listings/{id}/edit`. Saved edit shows photos, updates same ID and can submit for review. Preserve this workflow and media IDs. |
| `src/types/listing.ts` | Category has no macro/parent. Metadata includes text/number/select/boolean, options/validation_rules/is_required; no date/dependent lookup. Draft requires title 3–150 and category UUID; location/description/condition/price optional. Submit requires description >=10, city, condition, price_type, PIN and positive non-free price. Price bound 100,000,000 paise. |
| `supabase/migrations/20260914000004_create_categories_and_locations.sql` | Flat categories with slug/is_active/sort_order. Seeds Electronics, Furniture, Home Appliances, Bicycles & Sports, Books, Hobbies. UUIDs are generated, not fixed literal identities. Inactive category metadata is staff-only under RLS. |
| `supabase/migrations/20260914000005_create_listings.sql` | category FK; city_id NOT NULL despite draft Zod optionality; price_paise integer CHECK <=100,000,000. Trusted insert sets ownership/draft state. Active/reserved/paused material edits => pending_review; rejected material edits => draft. Ownership/account/status RLS plus column grants govern direct writes. |
| `supabase/migrations/20260929000025_india_postal_location_schema.sql`, app_security.impl_seller_submit_listing | Latest local definition supersedes migrations 8/21. Locks row; checks auth/account/policy/owner/state, field minimums, PIN/locality/city mapping, required attribute presence and >=1 ready photo; assigns cover. No complete attribute type/options/bounds or active/release-category enforcement. |
| `supabase/migrations/20261001000031_harden_public_listing_location_privacy.sql`; `20261002000033_seller_media_management.sql` | Latest public-location projections, owner-private reads and seller-media controls. Do not overwrite with older RPC/trigger bodies. |
| `src/proxy.ts` | Account unauthenticated next uses pathname, dropping macro query before page runs. Policy-review paths already preserve pathname+search. Page-only auth fix is insufficient. |
| `src/lib/security/redirect.ts`, sanitizeRedirectPath; auth sign-in/actions/callback | Existing sanitizer retains safe relative query/hash and rejects external/protocol-relative/backslash/control/encoded bypasses. Existing password/OTP/callback next chain can be reused. |
| `src/app/admin/categories/page.tsx`, actions.ts, manageCategoryAction; migration 8 admin_manage_category/impl_manage_category | Admin supports slug/name/active/sort, no macro; adding DB column alone leaves new Admin rows unmapped. |
| `src/types/database.ts`; `src/lib/discovery/queries.ts`, searchPublicListings; SearchFilters.tsx | Generated categories lack macro. Price typed number. UI filter values are rupees multiplied *100; search schema max 100,000,000 UI units, SQL search arguments integer paise. Unit/bound mismatch can overflow SQL even before money expansion. |
| ListingCard.tsx and Admin listing views | Existing key views divide paise by 100 and use en-IN formatting. Audit all money consumers before expansion. |

Six seeded categories are **local migration evidence, not a production/test inventory**. No hosted category rows were queried; synthetic test rows cannot establish taxonomy.

Draft minimum reconciliation: preserve title/category plus existing DB-required valid city. Do not promise title/category-only save without separately reviewing location contract. Missing PIN/submit-only attributes/description/photos remain allowed for draft. Section selection must never insert.

The form's approved-edit notice says Draft, but database behavior is pending_review. Preserve actual moderation and correct affected copy in approved shared-form work; do not weaken lifecycle to match UI.

## 2. Recommended URL, state and interface

Retain `/account/listings/new`; a separate `/post-ad` hierarchy adds duplicated routing/auth/form state without solving readiness.

| URL input | Proposed behavior |
| --- | --- |
| No macro key | Authenticated selector headed “What would you like to list?”; no draft insert, no full form reference fetch. |
| One exact goods/vehicles/property string | Await searchParams Promise; shared Zod enum validates, release gate checks, scoped references load, existing form renders. |
| Empty/whitespace/unknown/wrong-case/repeated value, including equal repeated values | Explicit “Choose a valid section” plus selector; reject arrays, no first-value/default-Goods behavior. No writable form. |
| Valid gated macro | Clear named unavailable explanation, back link; no writable form. Distinguish gate from data outage. |
| Saved edit/resume URL | Existing ID workflow; derive macro from persisted category_id relation. Query macro cannot override it. Legacy/unmapped gets explicit label. |

Installed Next guides read: `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md`, `02-components/link.md`, `04-functions/use-router.md`, `03-file-conventions/proxy.md`. Use awaited `searchParams: Promise<Record<string,string|string[]|undefined>>`, a plain object with arrays for repeated keys; preserve proxy convention, not deprecated middleware.

Auth: build sanitizer-approved pathname+query, encode next with URLSearchParams at proxy and page fallback. Preserve macro through password/OTP sign-in, callback and policy review. Invalid macro returns explicit error state. Never route untrusted next or trust hidden macro as authority. Query contains section only, never private form/PIN values. Expired-session save errors retain input and offer safe auth return, without promising unsaved persistence through auth reload.

Selector copy:

- Goods: “Phones, electronics, furniture, appliances, fashion and kids' items.”
- Vehicles: “Bikes and scooters, cars, bicycles and vehicle accessories.”
- Property: “Homes for sale or rent, PGs and rooms, shops and offices.”

Use original FairSwap emerald/neutral styles and spacing. Package and House exports verified in lucide-react 0.525.0; Bike is a bicycle and no Motorcycle/Motorbike/Scooter declaration found under those names. Use a small original decorative motorcycle/scooter SVG, no dependency. Icons aria-hidden; accessible names include availability. Semantic links for enabled cards; visible explanatory gated cards. Stack at 360px, desktop cards with room; visible focus, practical >=44px targets, no overflow. Form shows selected section/Change section and explicit category placeholder, not first-row auto-selection.

Errors: reference query failures must not become fake empty success. Category/attribute/city errors fail closed with retry/back; genuine empty ready category list blocks saving. Selector excludes cities/attributes/catalogues; form gets only selected-section categories/attributes. Keep existing lazy PIN lookup, not nationwide localities.

### Dirty navigation: first-batch release prerequisite

Track normalized baseline of every input, category/attributes, price and PIN-picker state. Failed save stays dirty; acknowledged save resets baseline before redirect. Explicit Stay/Discard/Save as Draft choices where draft minimums permit; leaving never automatically inserts. Category change confirms incompatible attribute removal, preserving unrelated fields. Disable duplicate in-flight saves; acknowledged create switches to saved ID before further writes. This does not establish durable exactly-once insertion after a lost response; idempotency needs separately approved contract if required.

For controlled links use installed Link.onNavigate/preventDefault with a narrowly activated provider covering header/account nav/Back/Change section. beforeunload only while dirty covers reload/close/full-document departure. **onNavigate does not cover browser history; popstate cannot be cancelled; no documented App Router generic beforePopState exists here.**

First BUILD begins with a history feasibility slice: stable account-level, route-scoped in-memory snapshot/provider survives query/page transition. Retain all form and PIN-picker values until browser Back/Forward departure is confirmed. Stay restores original canonical URL and all values; Discard clears buffer and departs; Save waits for action acknowledgement before leaving via saved ID. No undocumented Next history fields, localStorage, autosave or persistent client drafts. Clear buffer on save/discard/logout. Verify restoration of uncontrolled fields, event reentrancy and history loops on desktop/mobile. If public APIs cannot meet tests, stop BUILD for review of a concrete full-document navigation alternative; do not ship silent loss or claim beforeunload solves same-document history.

## 3. Canonical categories, enforcement and legacy policy

**Proposal:** nullable constrained `categories.macro_category` = goods/vehicles/property; no default. Null means explicit legacy/unmapped, never inferred Goods. Retain listings.category_id and derive macro, no second listings.macro column. Existing sort_order supports authoritative order: Motorcycles 10, Scooters 20, Cars 30, Bicycles 40, Parts/accessories 50, approved commercial categories later. Review ID/key manifest; ignore CSV/alphabetical order. Full group/leaf hierarchy remains separately scoped.

Add `categories.is_selectable` with closed expansion default and explicit approved backfill. Keep is_active for discovery/reference semantics. Add small canonical macro release-state table with constrained macro key/enabled flag, closed default, staff-only audited writes and narrow read grants/RLS. Page/actions/DB consult the same readiness authority; a web-only feature flag is insufficient.

Propose mapping existing electronics/furniture/home-appliances/books/hobbies to Goods after reviewed environment identity inventory. Unknown rows remain unmapped/nonselectable. Add modest approved Fashion, Kids & Baby and Sports & Fitness categories/metadata for intended Goods coverage, not all 129 leaves. Preserve existing category IDs and current hobby/book functionality.

**Explicit legacy recommendation needing approval:** preserve Bicycles & Sports ID/name/attributes/listings/public links/audit. Keep macro null; deny new selection. Owners retain unchanged category on edit with “Legacy mixed category” notice, no title/attribute guesses. Allow legacy submission under exception for that exact reviewed ID with existing validation and direct-client parity. New Bicycles belongs Vehicles; new Sports & Fitness belongs Goods. Owner-initiated reclassification is explicit and triggers current validation/re-review, never bulk migration. Do not place mixed legacy under Goods/Vehicles as though classified.

This preserves old records but temporarily restricts new bicycle posting in Goods-only stage: explicit product approval required. If uninterrupted bicycle posting is required, approve Bicycles and vehicle readiness before release. Other inactive/unknown rows: unchanged owner draft save retains ID/values, no new selection; approved replacement required before submit unless reviewed grandfather exception. Current RLS hides inactive rows: use narrow owner-private category metadata read tied to owned listing, not global inactive visibility/service-role seller reads.

Web create validates macro context plus authoritative category existence/active/selectable/membership/release. A forged hidden value grants nothing. Native direct inserts keep category_id-only contract; DB derives eligibility without requiring new macro payload. Category changes validate target; edit section derives relation.

Add shared DB eligibility/type-validation helper and INSERT/UPDATE guard, preserving ownership/column/state protections. Validate attribute object/types/options/bounds and supplied optional values; required fields only on submit or material edit entering review. Latest seller_submit_listing rechecks readiness/full attributes, retaining PIN/photo/policy/lock checks. Lock or equivalent consistency prevents release/category changes racing check/write. Explicit unchanged legacy/inactive retention exceptions do not allow arbitrary new unmapped writes. System/media/expiry mutations with unchanged category remain compatible. Check affected-row update result instead of reporting zero-row success. Staff category remaps/definition edits require impact review/version handling, not silent reinterpretation of old ads.

## 4. CSV findings and unresolved product choices

All CSVs parsed with Import-Csv; no database import performed.

| Input | Verified counts | Findings |
| --- | --- | --- |
| india_categories.csv | 202 rows / 25 groups: Goods 129/12, Vehicles 39/6, Property 34/7 | Columns category/subcategory/sub_subcategory/key_fields. No duplicate full-path tuples. Seven repeated leaf labels across sale/rent: Apartment or Flat, Builder Floor, Independent House or Villa, Studio Apartment, Office Space, Shops & Showrooms, Warehouse & Godown. |
| india_car_brands_models.csv | 578 rows / 52 brands | brand/model/body_type/segment/status. on_sale 257, discontinued 301, import_only 20. No duplicate brand+model groups detected. |
| india_bike_scooter_brands_models.csv | 830 rows / 58 brands | brand/model/vehicle_type/category/engine_cc/fuel_type/status. Current 548, Discontinued 280, Upcoming 2. No duplicate brand+model groups detected. 176 empty engine_cc: 174 electric and petrol Hero MotoCorp Majestic/Puch. |

Other checked cells nonblank. Tuple checks do not establish aliases/spelling quality/completeness/licensing or market availability. CSV sizes: 20,819 taxonomy, 23,232 car and 52,887 bike bytes; serialized JSON/options can be larger. These are unverified proposals, not approved seeds.

Goods groups: Mobiles & Tablets, Computers & Laptops, TVs Audio & Cameras, Home Appliances, Furniture, Home & Garden, Fashion, Kids & Baby, Books & Education, Sports Fitness & Hobbies, Business & Industrial, Pet Supplies. Preserve current broad supported categories and introduce only reviewed modest additions. Drones/medical equipment/antiques/pet food/business/industrial proposals are not automatically approved. Kids & Baby “Ride-ons & Kids Cycles” overlaps Vehicles “Kids Cycles”: decide one canonical placement and optional cross-discovery, not conflicting category authorities.

Vehicles groups: Cars, Motorcycles, Scooters, Bicycles, Commercial Vehicles, Vehicle Parts & Accessories. CSV Cars comes first; explicitly override with Motorcycles/Scooters before Cars. Cars mixes body style (Hatchback/Sedan/SUV), segment (Luxury), powertrain (Electric/Hybrid) and age/status (Vintage). Normalize dimensions before any leaf import. Keys must be stable, collision-safe full paths; repeating a label across sale/rent is not duplicate identity.

Property groups: Residential for Sale/Rent, PG & Co-living, Land & Plots, Commercial for Sale/Rent, Parking & Garages. Define separately property type (flat/house/room/PG/shop/office), transaction intent (sale/rent/accommodation as approved), period (total/month/night), unit basis (whole/bed/seat). Keep price_type fixed/negotiable/free; never repurpose it for rent/month. Security deposit and maintenance are distinct bounded money amounts. Decide land/commercial/nightly/tenant-preference scope before release; no identity documents or implied RERA verification.

key_fields is pipe-delimited suggestions, not validation. Every approved definition needs stable key, label, type, options, units, bounds/lengths/dependencies, optional-for-draft versus required-for-submit, and version policy. Reuse canonical title/condition/price/location instead of duplicating CSV title/price/negotiable/monthly_rent/city/locality. Boolean false/numeric zero must remain valid where allowed; text “false” is not boolean. Date suggestions expiry_date/insurance_valid_till/available_from require separately approved typed date support. Current validation_rules metadata is not fully enforced. Reuse the existing renderer, adding only justified capabilities, with shared server/DB enforcement. Freeze reviewed first-batch definitions; later changes require version/impact review so existing approved listings are not silently invalidated.

### Vehicle catalogue: separate follow-on

No 1,408-row import or catalogue-specific engine in selector batch. Propose normalized brand/model IDs, model->brand and vehicle-type validation; retain discontinued used models. Separate normalized lifecycle from selectability; retain raw source status, provenance/source version, last_verified_at. Current/on_sale/Upcoming/import_only is not verified current inventory. engine_cc nullable for electric/missing petrol data.

Catalogue bike styles include Naked, Fully Faired, Dual-Sport, Scrambler, Roadster, Neo-Retro, Sports Commuter and Moped; no one-to-one category CSV map. Approve explicit mapping rather than guesses. Propose controlled Not listed with bounded seller text/moderation. Models load by selected vehicle type+brand, versioned cache/invalidation, no entire catalogue in every form. Native offline/cache changes are separate repository work. Bounded reviewed text fields can precede catalogue readiness.

## 5. Money prerequisites, release gates and compatibility

Current limit: ₹10,00,000 = 100,000,000 paise. PostgreSQL integer tops out at 2,147,483,647 paise (₹2,14,74,836.47). ₹1 crore = 1,000,000,000 paise; ₹3 crore = 3,000,000,000 paise exceeds int32. Raising CHECK alone is insufficient. Search rupee/paise-bound mismatch is an additional existing concern.

Separate money proposal: bigint paise storage, explicit maximum and precise JSON/TypeScript representation. Either bound encoded numbers to <=Number.MAX_SAFE_INTEGER (9,007,199,254,740,991 paise) with verified serializer behavior or introduce versioned decimal-string API amounts. Do not assume bigint SQL solves JS/native precision. Parse decimal rupees to exact paise for expanded contract, no float-rounding assumptions. Audit search_public_listings and impl signatures, projections/indexes/sort, SQL constraints, Zod, generated types, SearchFilters, discovery queries, card/detail/Admin/seller displays and native consumers. Preserve INR/en-IN lakh/crore grouping; Property needs period/unit labels. No payment processing.

| Section | Readiness prerequisites | Explicit first release |
| --- | --- | --- |
| Goods | Reviewed existing mappings, Fashion/Kids coverage and Sports replacement; approved legacy treatment, typed validation/DB gates/auth/error/dirty behavior; unchanged cap | Enable reviewed categories only. Not all Goods leaves. |
| Vehicles | Real approved Motorcycles/Scooters ordered before Cars, Bicycles/accessories placement, typed metadata/condition/date requirements and safe maximum-price policy | Visible gated card. Later <=₹10 lakh categories only with explicit product acceptance; expensive Cars/commercial categories individually nonselectable until money readiness. Catalogue is separately optional. |
| Property | Approved type/intent/period/unit, branch-aware condition/pricing checks in UI/Zod/DB/RPC, wider money contract, discovery/Admin/native compatibility, location/privacy regressions | Visible gated card. Cheap rentals cannot launch solely because price fits: semantics/validation must also be ready. |

All three belong to the intended completed experience. A Goods-only stage does not claim full completion. DB release state plus per-category selectability protects direct macro URL, actions, PostgREST and submit RPC. Exact legacy exceptions are not a generic null/gated bypass. Enablement requires approved readiness manifest and tests, not nonempty card rendering.

Native/API/Admin: additive nullable metadata does not require old clients to supply macro; derive from category_id. Old native clients may show gated categories if filtering only is_active, so coordinate clear denials/read contract before release. Native price decoder/posting source was not inspected: compatibility remains integration verification, not a claimed PASS. No other-repo edits. Admin macro/selectability writes retain current role/AAL2/audit enforcement. Media APIs under `src/app/api/listings/[id]/media/` remain compatible: bearer precedence, cookie auth, user-scoped DB operations, eight-photo limit, processing cleanup/ready transitions, cover/reorder, private delivery and sanitized errors. No photo-flow redesign in this scope.

## 6. File-by-file FUTURE changes

These are proposed paths, not changes made by this audit.

| Path | Existing/new | Change and batch |
| --- | --- | --- |
| src/lib/listings/macro-category.ts | New | Enum/parser/canonical links and missing/invalid/valid states. A |
| src/lib/listings/category-reference.ts | New | Server-only scoped references, readiness/error result and narrow owner legacy metadata. A |
| src/components/listings/MacroCategorySelector.tsx | New | Three semantic cards, FairSwap copy/icons/mobile/gated explanations. A |
| src/app/account/listings/new/page.tsx | Existing | Await URL state, auth next, selector/gates/errors/scoped form data. A |
| src/components/listings/ListingForm.tsx | Existing | Validated section, placeholder, safe category change, typed attributes/labels, dirty/saved-ID behavior, accurate lifecycle notice. A |
| src/components/listings/ListingNavigationProvider.tsx | New | In-memory dirty snapshots, controlled links, verified history restoration. A feasibility prerequisite |
| src/app/account/layout.tsx; src/components/header.tsx; src/components/account/AccountNav.tsx | Existing | Narrow provider/guard wiring while listing form dirty; retain Post Ad route. A |
| src/app/account/listings/[id]/edit/page.tsx | Existing | Canonical category relation, legacy/inactive metadata, preserve owner/private PIN/media. A |
| src/app/account/listings/actions.ts | Existing | Category/macro/release and typed attribute checks, safe errors/affected-row acknowledgement; retain maintenance/policy/ownership. A |
| src/lib/listings/category-attributes.ts | New | Shared draft/submit metadata validation, first-batch type subset/version policy. A; dates/dependencies later |
| src/types/listing.ts | Existing | Canonical category/release/context types; preserve draft/money limits in A, branch schemas B/C. |
| src/proxy.ts | Existing | Preserve safe account auth pathname+search without altering session/policy logic. A |
| src/lib/security/redirect.ts and auth sign-in/actions/callback | Existing | Reuse sanitizer/return chain; only change if focused tests demonstrate a gap. A |
| src/app/admin/categories/page.tsx and actions.ts | Existing | Macro/selectability UI, legacy restrictions, audited RPC args/impact controls. A |
| supabase/migrations/<CLI-generated>_post_ad_category_contract.sql | New proposal; timestamp not invented | Mapping/selectability/release schema, approved additions, shared guards/latest submit RPC, narrow owner metadata/grants/RLS/audit. A only after approval |
| src/types/database.ts | Existing generated | Regenerate from verified authorized local schema; never manually edit. A and later schema batches |
| tests/unit/post-ad-routing.test.ts; tests/unit/post-ad-form.test.tsx | New | Parser/page/action/form/errors/history snapshot tests. A |
| tests/security/post-ad-category-contract.test.ts | New | Real local roles/DB tests for release/category/type/legacy tampering. A |
| e2e/post-ad.spec.ts | New | Local-safe auth/draft/history/mobile/keyboard fixtures. A |
| e2e/listings.spec.ts; tests/unit/listing-remediation.test.tsx; tests/unit/seller-write-maintenance.test.tsx; src/__tests__/proxy-policy-guard.test.ts; tests/security/redirect.test.ts | Existing | Adapt direct-form assumption and focused regressions, preserve safeguards/assertions. A |
| supabase/tests/schema_listings.test.sql; tests/security/listings-rls.test.ts; india-location-security.test.ts; seller-media suites | Existing | Applicable category/lifecycle regressions and fail-closed relevant harness, no weakened prior contracts. A |
| src/lib/discovery/queries.ts; SearchFilters.tsx; listing/card/detail/category/search pages; Admin listing views; search RPC migrations | Existing | Review taxonomy compatibility A; actual broad money/period changes C. |
| Vehicle tables/scoped endpoints/cache helpers/reference manifests | New follow-on, paths specified in B2 review | Normalized catalogue only after separate source/import approval. |
| Property/money migrations and versioned API contracts | New follow-on, paths specified in C review | Independent readiness changes; no first-batch implementation. |

No new dependency needed. Reference CSVs remain proposals; no edits/imports to make them appear approved.

## 7. Database delivery, compatibility and rollback

Future BUILD first inventories confirmed disposable local DB, compares migration replay and generated types. Separate read-only hosted release verification requires selected environment approval: actual category IDs/slugs/active/attributes, column type/CHECK, latest function signatures/bodies, grants/RLS and unmapped counts. No credentials/customer records in evidence. Repository migration filenames do not prove deployed state.

Expand first: nullable mapping/closed release/selectability, reviewed identity manifest and modest additions. Do not delete/recreate category or listing IDs. Admin RPC compatibility via reviewed optional trailing arguments/versioned wrapper, avoiding ambiguous PostgREST overloads. New Admin categories default unselectable. Owner-private inactive metadata exposes only owned relationship, not global inactive browsing. Explicit grants/revokes, RLS on exposed reference/release tables, staff AAL2/audit, closed privileged search_path. Preserve discovery/read visibility separately from new-selection eligibility.

Guard ordering must preserve media/system/moderation operations when category unchanged. Required-on-submit rules apply to seller content entering review, not failed-upload cleanup/expiry. Test latest media-trigger interactions before release. Any staff change to used classification/required definitions needs impact/version review.

Rollback: close affected macro/category selection in DB and turn off new entry feature; preserve schema, IDs, old listing relationships and media. Owner legacy edit paths stay available. Prefer forward repair, not column/table drops or bulk relabel/restore. Retain reviewed mapping/definition-version history. Old web rollback still sees DB gates; explicitly test old-client denials. Money widening is separate expand/version/migrate/contract rollout: never downcast after large values exist; keep widened storage/versioned compatibility until records and consumers reconciled. No rollout or rollback runs here.

## 8. Ordered batches and smallest complete first BUILD

**A — Selector + secure Goods draft/resume, visible gated Vehicles/Property.** First obtain approval of r1/A, reviewed Goods/Fashion/Kids/Sports manifest and exact legacy exceptions, confirmed disposable local target and scoped fixture/migration authorization. Begin with dirty browser-history feasibility slice using public Next APIs; failure stops BUILD for concrete review, not weakened acceptance. Then one coherent vertical slice: additive DB category/release/guard contract, regenerated types/Admin support; enum/proxy auth return/selector/scoped queries; shared form/edit validation/navigation; focused unit, real local DB and desktop/mobile E2E. Existing metadata engine with modest additions, unchanged ₹10 lakh limit. Complete only when Goods saves once normally, resumes same ID, uploads photos/submits with original controls, and gated branches cannot be bypassed. Cards alone are insufficient. This is the smallest complete testable first BUILD, not the completed three-branch release.

**B1 — Approved bounded Vehicles.** Motorcycles then Scooters before Cars; approve Bicycles/accessories, attribute types/units/date needs, condition and price coverage. Existing form and saved edit/photo workflow. Under-cap categories may launch only with explicit cap acceptance; expensive Cars/commercial selections remain gated until C1. Test electric/null-engine and tampered type/brand. No full catalogue dependency if reviewed text/Not listed works.

**B2 — Vehicle catalogue follow-on.** Normalized brand/model/type identifiers, reviewed provenance/status/style maps, scoped queries/cache/version, controlled fallback. No 1,408-row import without independent approval. No new form engine or native edits.

**C1 — Money readiness.** Agree bigint/JSON bound or string API, search units/signatures and max, generated types/formatters/Admin/native integration/version rollout/rollback. Separate migration and precision/boundary tests. Does not itself enable Property.

**C2 — Property readiness.** Approve type/intent/period/unit and condition semantics, deposit/maintenance/date rules, discovery/moderation displays, PIN/privacy and native compatibility. Enable reviewed homes sale/rent, PG/rooms, shops/offices only after C1 and readiness evidence. Broader land/nightly/industrial scope separately approved.

**D — Optional later hierarchy/whole-taxonomy import, pre-save photo redesign or native implementation.** Independently authorized; excluded from A–C absent a reviewed genuine dependency.

Each batch stops at review; A approval does not authorize B/C. Common exclusions: payments/lending/escrow/identity documents/new auth, unrelated services, upgrades, CSV bulk seeds, other repositories and deployments.

## 9. Acceptance matrix and verification commands

| Scenario | Required result/evidence |
| --- | --- |
| Selector / three intended branches | Correct three cards; no insert on selection. A Goods works, Vehicles/Property have honest gates. B/C only reviewed ready categories enabled. Direct URL/action/API agrees with readiness. |
| Invalid state | Missing => selector. Empty/whitespace/case/unknown/repeated arrays => explicit error, no implicit Goods or writable form. |
| Auth return | Signed-out macro URLs survive proxy, password/OTP, callback and policy review with encoded safe same-origin next. External/protocol-relative/encoded/backslash/control bypasses rejected. |
| Refresh and dirty history | Clean refresh retains section/no insert. Dirty reload warns. Back/Forward, query change, Change section, header/account navigation preserve all values until explicit choice. Stay restores URL/PIN/uncontrolled fields, failed Save stays dirty, Discard explicit; no history loops/autosave. |
| Empty/error data | Distinguish category/attribute/city failure from empty; retry/back; no silent defaults or enabled save without category. Selector avoids full references. |
| Draft minimums | Title/category/DB-required city save without description/PIN/photos/submit-only attributes. Supplied invalid optional data fails; no CSV all-required expansion. |
| Create/resume | Normal and double-click-in-flight save creates one, edit/refresh/resume keeps ID, next save updates; card selection no draft. No fake acknowledgement/zero-row success. Lost-response retry is not called idempotent without added contract. |
| Tampering | Bad UUID/existence/active/selectable/release/cross-macro and malformed/wrong attributes rejected by actions. Direct clients enforce canonical category-derived gate/type constraints, no service-role workaround. |
| Legacy/inactive | Mixed category stays same ID/name/public history/attributes and explicit legacy label; approved old save/submit allowed, new mixed denied. Inactive unchanged draft remains recoverable; replacements/exception policy enforced. Unknown rows never default Goods. |
| Category change | Confirm incompatible attributes removal, preserve text/price/PIN; submit/re-review enforces types/options/bounds/required fields. false/zero valid where allowed; stale definitions not silently imposed on approved ads. |
| Photos/moderation | Existing saved ID, eight-photo limit, order/cover/private delivery; >=1 ready photo to submit. Failed upload/cleanup does not re-review approved ad; ready material changes do. Rejected->draft and approved material edit->pending_review unchanged; hidden data not public. |
| Maintenance/policy/account | Page pause and disabled form plus action/API denial; current legal acceptance and active account checks retained, correct safe return. Selector grants no rights. |
| Ownership / real roles | Two authenticated users demonstrate cross-owner read/write/location/media/private-category denial. Seller/status immutable, staff AAL2 remains required. Elevated fixture writes not authorization proof. |
| Mobile/keyboard | Desktop 1280x720 and mobile 360x640 Chromium; keyboard links/form/dialog, focus return and linked labels, touch targets/gate explanations/no overflow. No real-device/Safari coverage claim. |
| Payload | Selector no city/attributes/models; form selected-section attributes only/no nationwide localities; catalogue query type+brand scoped. Record actual payload before/after. |
| Money/Property C | A unchanged 100,000,000 paise boundary. C tests ₹10 lakh, int32 limit, ₹1/₹3 crore, approved max/+1, negative/decimals/unsafe integers, exact conversion/search sort. Approved sale/month/bed/seat/night combinations and deposit/maintenance constraints; INR/en-IN period labels and private PIN preserved. |

Installed versions read from node_modules: Next 16.3.5, React/React DOM 19.2.8, Zod 3.24.2, lucide-react 0.525.0, TypeScript 5.9.3, Vitest 3.2.7, Playwright 1.63.0, Supabase SSR 0.12.7, supabase-js 2.116.0, CLI package 2.117.0. package.json pins pnpm 10.12.1; no upgrade. Do not assume requested semver range equals installed version.

Actual scripts: dev=`next dev`, build=`next build`, start=`next start`, lint=`eslint .`, typecheck=`tsc --noEmit`, test:unit=`vitest run`, test:e2e=`playwright test`, test:security=`vitest run tests/security/`, supabase=`supabase`. bootstrap:admin/location:import exist but are not this task's verification commands.

Proposed later commands (new-file targets apply only after implementation):

```powershell
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm exec vitest run tests/unit/post-ad-routing.test.ts tests/unit/post-ad-form.test.tsx tests/unit/listing-remediation.test.tsx tests/unit/seller-write-maintenance.test.tsx tests/security/redirect.test.ts
corepack pnpm build
# Only after authorization and verified local mutation environment:
corepack pnpm test:unit
corepack pnpm test:security
corepack pnpm test:e2e -- e2e/post-ad.spec.ts e2e/listings.spec.ts --project=desktop-chromium --workers=1
corepack pnpm test:e2e -- e2e/post-ad.spec.ts --project=mobile-chromium --workers=1
```

Vitest includes tests/**, so test:unit can run database-mutating/integration suites; it is not purely isolated. Existing listings-rls harness has env URLs/keys and lacks the newer fail-closed local environment guard, returning silently when offline: guard/harden the relevant harness under BUILD approval before release evidence. No broad suites against unknown environment. Existing E2E listings suite uses validateLocalTestEnvironment, tracked fixtures and scoped teardown; preserve these.

Playwright starts production server localhost:3001 after build, reuseExistingServer=false. Build/server must both receive verified local env in memory; `.env.local` must not route tests to hosted systems. tests/helpers/run-local-e2e.js injects local env but forces desktop; it is not mobile proof. Use reviewed mobile-capable runner/env, no environment-file edits or key printing. Fixture writes/cleanup require separate local authorization. Discover installed Supabase CLI test/type-generation options with --help before specifying precise migration/RLS commands; never silently start/reset a DB from this plan.

**Actual audit execution:** read-only git/source/package/CSV commands and plan writing only. CSV counts/status/blank/tuple findings above were executed. Sandbox shell and Node fallback initially failed to initialize; approved shell reads/writes succeeded. No lint, typecheck, unit/security/build/E2E/browser checks executed; all behavioral tests remain **NOT RUN**. No prior progress PASS is attributed to this checkout.

## 10. Assumptions, blockers and human decisions

Before A BUILD approve: canonical additive category/selectability/release design; exact Goods/Fashion/Kids/Sports readiness manifest; Bicycles & Sports legacy/no-new-selection/exact grandfather policy; visible staged Vehicles/Property and temporary new-bicycle restriction (or include ready Bicycles/vehicle work before release); dirty-history feasibility/stop condition; disposable local target and scoped migration/fixture authorization. These are future build decisions, not expansion of this PLAN run.

Before B/C approve vehicle ordering/cap coverage, catalogue source rights/provenance/status/style mapping/fallback, Property type/intent/period/unit/condition and wider category scope, money maximum/JSON representation, native compatibility/versioning and rollback. Native source not inspected; verify contract without modifying other repositories here.

Live verification before release: deployed category inventory/IDs, money checks/types, latest functions/grants/RLS, migration alignment and native decoder/posting contracts. Local files, cards or CSVs do not establish readiness. No missing input prevents plan review. Main implementation blockers are category authority/legacy policy, browser history preservation and Property money/semantics.

**PLAN READY FOR REVIEW. Stop here. This document does not authorize implementation.**

## r3 amendment — 2026-10-08 BUILD A0.1 auth response propagation

**A0.1 READY FOR REVIEW; human acceptance not recorded.** The human BUILD A0.1 attachment separately authorizes this narrow auth response fix and isolated checks. This amendment retains r1/r2 history and A0 decisions; full Batch A, category integration and A1 remain unapproved.

AUTH-01 reproduced before implementation using installed Next 16.3.5 NextRequest/NextResponse with the Supabase SDK mocked. Cookie writes occur during mocked getClaims, with inert values and fetch forbidden. The new test command below initially exited 1 at 22:27:53 Europe/Copenhagen: 17 tests, 12 failed/5 passed (2.18s). Redirect responses omitted refreshed/cleared cookies and cache protection. Pass-through retained the older fallback but omitted SDK cache headers. Actual Next request-override serialization also forwarded the stale Cookie clone after request.cookies changed; this was observed in x-middleware-request-cookie, not inferred from a Server Component mock.

Installed @supabase/ssr 0.12.7 SetAllCookies types and source were inspected. The callback accepts cookies plus cache headers, supplied on the SDK's first write. src/proxy.ts now accumulates mutations and allowlisted Cache-Control/Expires/Pragma across callbacks, then finalizes the selected response with original cookie options, private/no-store protection and authoritative server request ID. Same-name host/domain deletion scopes are serialized independently through NextResponse.cookies; supported Headers.getSetCookie/append preserves each serialized header without raw cookie splitting/joining. Redirect Location/status remain owned by that response, and internal cookie propagation control is removed from redirects. Only Cookie is resynchronized in the downstream header clone after SDK writes; the server-owned correlation ID remains intact. Route/policy decisions, getClaims, safe next handling and repeated macro keys are preserved.

Regression coverage uses real installed Next response serialization: refreshed account pass-through; account/staff policy redirects; authenticated sign-in/sign-up redirects; unauthenticated and thrown-auth clearing redirects; chunk/deletion attributes; repeated writes and same-name scopes; first-callback cache retention; non-mutating cases; authoritative ID; header leakage/control rejection; and refreshed downstream Cookie forwarding. The existing five A0 files retain their original 98 tests. The existing proxy-policy test source is unchanged by A0.1.

| Exact command | Actual result |
| --- | --- |
| `corepack pnpm exec vitest run src/__tests__/proxy-auth-response.test.ts` | Before implementation: exit 1, 12 failed/5 passed, reproducing the defects above. |
| `corepack pnpm exec vitest run tests/unit/post-ad-routing.test.ts tests/unit/post-ad-selector.test.tsx tests/unit/post-ad-page-auth.test.tsx src/__tests__/proxy-policy-guard.test.ts tests/security/redirect.test.ts src/__tests__/proxy-auth-response.test.ts` | After implementation: exit 0, 6 files/115 tests PASS at 22:28:49. Final run after adding header-allowlist and empty-callback cases: exit 0, 6 files/117 tests PASS at 22:29:39, duration 2.73s (19 new + 98 existing). |
| `corepack pnpm lint` | Final code/test check exit 0. |
| `corepack pnpm typecheck` | Final code/test check exit 0. |
| `git diff --check` | Exit 0; platform LF/CRLF warnings only, no whitespace findings. |

A0.1 changes only src/proxy.ts, the new src/__tests__/proxy-auth-response.test.ts, this appended amendment and the factual docs/PROGRESS.md entry. A focused code/test patch compares proxy.ts against the saved A0 working-tree source and includes the new test; it excludes earlier uncommitted A0 edits. Twelve protected A0 source/configuration files were SHA256-equal to the prior A0 review snapshot. Branch remains codex/post-ad-a0 and HEAD c415d689124f405db56cbe8d7daecde7eeef1c29.

Build remains **NOT RUN**: environment files load automatically and sitemap generation can invoke service-role category/listing/account queries; no approved local-only environment was established. Broad unit/security suites, E2E, servers, browser/live-session/Server Component and database verification are **NOT RUN**. Actual Next downstream header serialization is proven by isolated tests; live downstream consumption and real SDK/network refresh are unverified. Frozen logger times in test output are fixtures, not execution timestamps. No real credentials/network calls or database/service access, category changes, selector activation, dependencies/environment edits, stage/commit/push/fetch/deploy or A1 work occurred.

## r4 — A1 India-first category and readiness contract

**r4 PROPOSED — A1 CONTRACT READY FOR REVIEW; BUILD NOT AUTHORIZED.** Date: 2026-10-08, Europe/Copenhagen. This amendment governs the proposed next contract, retaining r1/r2/r3 authorization and evidence. It supersedes r1's temporary new-bicycle restriction and recommends a smaller alternative to its macro-release table. All recommendations below remain unapproved.

### Authority and targeted evidence

The human A1 PLAN ONLY attachment authorizes only this plan update. FairSwap-A0.1-Source-Review.md is supporting source-review evidence, not implementation authorization, wider human acceptance or production readiness. A0/A0.1 remain intact; no repeated auth audit/fix or CSV audit. Branch codex/post-ad-a0, HEAD c415d689124f405db56cbe8d7daecde7eeef1c29; selector inactive.

| Local evidence | Contract implication |
| --- | --- |
| Migration 4, create_categories_and_locations | Unique slug/generated UUID; six seeds below; is_active/sort_order only. Inactive category/attribute metadata staff-only. |
| Migration 5, create_listings | Non-null category FK and DB-required city; integer price cap 100,000,000 paise. Existing triggers initialize drafts, preserve identity/ownership and re-review material edits. Direct clients can write permitted columns under RLS. |
| Migration 25, india_postal_location_schema | Latest local impl_seller_submit_listing locks owned listing and checks active account/current policy, status, fields, PIN/location, required attribute presence and ready photo. No posting eligibility or complete attribute type/options/bounds check. Later migrations searched did not replace this function. |
| Migration 8, Admin category RPC/page/actions | Eight-argument admin_manage_category wrapper; active administrator/content_editor, AAL2 and audit. Update does not change slug; existing callers omit new fields. |
| types/listing.ts; types/database.ts | Category lacks macro/posting fields; price_type is fixed/negotiable/free. Generated types are local intended evidence. |
| new/page.tsx; edit/page.tsx; ListingForm.tsx; actions.ts | Active-only reference queries; first-category default; attribute reset on change. UUID validation without eligibility; malformed JSON becomes {}; update does not confirm affected rows. Inactive saved metadata disappears. |
| lib/discovery/queries.ts, getPublicCategories | Discovery reads active categories; this is not authoritative posting eligibility. |

Migrations establish local intended schema, not deployed inventory, UUIDs or function versions. No production IDs invented. Supabase/Postgres skills applied to planning only; changelog Markdown fetch failed due unsupported content type. Trigger sequencing and actual OLD/NEW comparisons require review alongside existing triggers ([official PostgreSQL trigger documentation](https://www.postgresql.org/docs/current/trigger-definition.html)); deployed DB version remains unverified.

### 1. Smallest authoritative contract

Keep listings.category_id as the sole canonical relationship. Add nullable categories.macro_category constrained to goods/vehicles/property with **no default**. Null is legacy mixed or unmapped, never implicit Goods. Distinguish those states through the approved stable key, not titles/attributes. No writable listing-level macro value.

Recommend one additional field: categories.new_listing_enabled boolean NOT NULL DEFAULT false. It controls new listings and category replacement. is_active retains discovery/reference visibility. New categories default null/closed. Derive each section's availability from its active, mapped, enabled categories, using the same predicate as authoritative writes. No independent macro-readiness table/flag is needed initially; close all section members atomically to close that section. An entry UI toggle can roll back routing but cannot authorize writes. If a separate operational section switch is later needed, review its semantics before adding it.

After enforcement, new assignment requires category existence, active=true, enabled=true and a valid non-null macro. The sole temporary null exception is the reviewed existing bicycles-sports row while enabled. Resolve its actual ID by immutable slug plus reviewed identity/definition assertions; DB helper and Admin checks must enforce this exact exception, never a generic enabled-null bypass. Unknown rows remain closed.

**Recommended existing-retention policy:** unchanged owned category_id remains savable/editable, including legacy, inactive, closed or unmapped rows. Saved relationships remain submittable/re-reviewable under original applicable field/attribute/location/photo/account/policy/maintenance/status controls. Posting closure is not a takedown or submission hold. Category replacement must meet current new-assignment eligibility; changing away then back is a new assignment. Closed-category new INSERT cannot create a retention exemption. Existing drafts created while a category was open remain recoverable after closure.

This explicitly preserves original submission behavior, avoiding a grandfather registry or overlapping retain/submit flags. Later emergency submission holds need a separate reviewed moderation policy. Do not add new gated category rows before enforcement, since today's direct-client path does not gate active or ready categories. Freeze used macro identities and required definitions; later remaps/definition changes require separate impact/version review.

### 2. Rollout stages and manifest

- **S0 current:** original application/DB behavior. Seed rows are not a production inventory.
- **S1 preparation:** additive metadata/backfill of resolved existing rows only; no guard/selector change. Metadata expresses intended S2 policy, not enforced readiness. No new rows/attributes in this smallest build.
- **S2 enforcement:** compatible reference/Admin/API handling and new-assignment guard ship coherently. Ordinary form remains; five Goods categories and the temporary mixed path keep posting capability. Selector activation deferred.
- **S3 replacement and integration:** reviewed Bicycles and Sports & Fitness paths verified before mixed closure. Activate selector only after scoped form/read/action integration and separately proven dirty-navigation behavior. Vehicles may initially offer Bicycles only; disclose that scope, not powered-vehicle readiness.
- **S4 separate expansions:** optional Goods additions, powered vehicles/accessories and Property need independent approvals/readiness evidence.

Table notation: R = retain same category/values on existing owner draft/edit; T = submit/re-review under original applicable controls even after posting closure. Neither bypasses security/lifecycle rules. E = exact unique slug plus reviewed name/definition signature and target inventory, resolve real ID, fail on missing/collision/mismatch; never recreate/rename a row. N = reviewed collision-free new slug and DB-generated ID, created only after guard exists. U = human inventory/mapping review, no inference. Proposed new keys are not approved seed instructions.

| Stable key | Existing / proposed | Macro | NEW eligibility by stage | Existing drafts | Existing edits / submission | Readiness prerequisites | Identity/backfill | Compatibility / rollback |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| electronics | Existing seed | goods | S0/S1 current; S2/S3 enabled if active | R | R/T | Preserve definitions/cap; authoritative eligibility/owner checks | E; goods/true | Same ID/name/attrs/links; close switch without altering ads |
| furniture | Existing seed | goods | Same | R | R/T | Preserve material/options and cap | E; goods/true | Same identity; retained edits survive closure |
| home-appliances | Existing seed | goods | Same | R | R/T | Preserve appliance_type/options | E; goods/true | No leaf import or relabel |
| books | Existing seed | goods | Same | R | R/T | Preserve author/language contract | E; goods/true | Same ID/public links |
| hobbies | Existing seed | goods | Same | R | R/T | Preserve broad hobby_type | E; goods/true | No replacement with CSV leaves |
| bicycles-sports | Existing, explicitly mixed | null: legacy-mixed | S0/S1 current; S2 enabled legacy path; S3 close only AFTER both replacements work | R, no conversion | R/T, existing definitions | Continuous bicycle AND sports posting through handover | E; null/true until handover | Never rename/delete/remap; rollback reopens same row |
| bicycles | Proposed | vehicles | Absent S1; closed after S2; enabled S3 only with evidence | R once created | R/T after legitimate creation | Approved text/select/number attrs, condition, explicit <=₹10 lakh cap | N; vehicles/false then reviewed true | All kids cycles here; close new posting, preserve saved replacements |
| sports-fitness | Proposed | goods | Absent S1; closed after S2; enabled with Bicycles at S3 | R once created | R/T | Reviewed sports fields; do not blindly reuse mixed bicycle schema; same cap | N; goods/false then true | Hobbies stays; both replacements precede mixed closure |
| fashion | Optional proposed | goods | Absent/closed S1–S3; S4 reviewed release | R if later created | R/T | Justified by intended Goods coverage; modest clothing/accessory definitions/moderation | N | Not prerequisite to preserve supported Goods; no CSV expansion |
| kids-baby | Optional proposed | goods | Absent/closed S1–S3; S4 only | R if later created | R/T | Approved baby/toy fields/product exclusions; omit kids cycles | N | Cycles remain Vehicles, no duplicate authority |
| motorcycles | Proposed | vehicles | Closed until separate S4 readiness | R if later created | R/T | Approved attrs/validation, explicit price policy; bounded brand/model text; sort 10 | N | Catalogue separate; no readiness from CSV |
| scooters | Proposed | vehicles | Closed until separate S4 readiness | R if later created | R/T | Same; reviewed electric applicability/units; sort 20 | N | Precedes Cars |
| cars | Proposed | vehicles | Closed until approved attrs/price policy | R if later created | R/T | Explicit under-cap coverage OR separately wider-money contract; sort 30 | N | No money change in A1; don't mix body/powertrain/age leaves |
| vehicle-parts-accessories | Proposed | vehicles | Closed until S4 readiness | R if later created | R/T | Vehicle-specific parts incl. bicycle parts; approved definitions; sort 50 | N | No bulk migration of existing electronic/fashion accessories |
| residential-property | Future reference key | property | Closed; separately approved Property batch | R only after later valid release | Later approved semantics | Sale/rent intent, type, period, basis, condition, money/privacy/consumers | N only later | Key granularity provisional; never overload price_type |
| commercial-property | Future reference key | property | Closed | As above | As above | Shop/office sale/rent and price policy | N later | No automatic land/parking/nightly import |
| pg-rooms | Future reference key | property | Closed | As above | As above | Room/PG type, intent, period and whole/bed basis, money/privacy | N later | No Property form design/build in A1 |
| Any other deployed slug | Inventory-dependent | null: unmapped | S0/S1 unchanged behavior; S2+ closed until reviewed | R | R/T, original applicable contract | Human classification and readiness before NEW enablement | U; retain actual ID/values | Never default Goods; preserve recovery/history |

Vehicles order: Motorcycles 10, Scooters 20, Cars 30, Bicycles 40, Parts/Accessories 50; deterministic slug/ID tie-break, no CSV/alphabetical authority. Sort is not availability. Goods preserves existing relative order; reviewed Sports follows supported categories. Fashion/Kids are justified optional additions, not mandatory launch coverage or all CSV leaves.

### 3. Recommended bicycle handover

S1 keeps mixed macro=null and enabled; S2 keeps guarded legacy posting in the ordinary form. Offer Bicycles & Sports with an explicit legacy-mixed notice, without placing it under a clean Goods/Vehicle macro. Category_id-only clients can continue new mixed posting. No title/attribute guesses, bulk changes or renamed category.

After enforcement exists, prepare closed Bicycles and Sports & Fitness rows and verify both complete posting paths while mixed stays open: create, resume same saved ID, approved optional/required attrs, photos and submission, including direct clients. Deploy UI/reference support for both pre/post-handover states first. Then enable BOTH replacements and close new mixed assignments atomically under explicit activation approval. This transaction has no intermediate posting gap. Only then activate the section selector with honest availability/copy.

Old clients attempting NEW mixed posting after cutover receive stable CATEGORY_NOT_AVAILABLE_FOR_NEW and refreshed options; their saved mixed records retain edit/submission. Coordinate native reference/cache/error behavior before cutover. If either replacement, compatibility or navigation prerequisite fails, keep mixed enabled and ordinary legacy entry working; defer selector activation.

Rollback atomically closes replacements for NEW assignments and reopens the SAME mixed row, then restores ordinary entry. Keep new categories/definitions and Bicycles/Sports saved ads with retention/submission; never delete or reverse-classify them. Verify continuity at each boundary. This explicitly temporary mixed path preserves posting, not a claimed clean classification.

### 4. Consumers and authoritative enforcement

| Operation | Proposed behavior |
| --- | --- |
| Web create | A0 strict macro parser; categories/attrs scoped by selected mapped eligibility; placeholder, no first-category default. Missing macro is selector only after S3. Invalid/repeated macro yields explicit error/no form. Forged macro checked against canonical category. Section choice never inserts. |
| Web category change | Validate target as NEW assignment and web macro context. Confirm removal of incompatible attrs, retain unrelated text/price/location. Unchanged saved category can stay; selecting a closed category afresh cannot. |
| Native/direct category_id-only writes | No macro payload required; DB derives eligibility. Existing UUID-only shape retained. Active-but-closed metadata requires filtering or stable error handling. Strict decoders/cache behavior needs later integration verification; additive SQL alone is not compatibility proof. |
| Existing owner draft/edit | Derive section from stored relation, not query. Load saved category even inactive/unmapped; explicit label, no reclassification/default substitution. Retain attrs. Replacement obeys new-assignment rules. Draft minimums remain title/category and DB-required valid city, not PIN/photos/submit-only attrs. |
| Owner-private metadata | Narrow listing-ID-bound RPC authenticates and checks seller ownership before returning only saved category/definitions. No global inactive inventory read or seller service-role workaround. If SECURITY DEFINER is needed to traverse hidden reference rows, use fixed search_path, minimal projections/grants/revokes, explicit owner check and no listing-write privilege. Owner-private PIN stays separate. |
| Submit/re-review | Keep public seller_submit_listing(UUID) and latest migration-25 controls/lock. Existing saved relationships remain submittable when posting closes; validate original applicable definitions, not blanket new_listing_enabled. Category replacement already guarded. No new insert into closed categories. |
| Admin create/update | Preserve old eight-argument wrapper. Omitted metadata on update preserves fields; legacy create gets null/false. Prefer distinctly named metadata RPC rather than ambiguous overload, explicit field-presence/null semantics, staff roles/AAL2 and old/new audit. Enabling discovery alone never enables posting. Reject enabled-null outside exact mixed exception and unreviewed used identity/definition remaps. |
| Media/moderation/system | Unchanged category does not run new-assignment gate. Reorder/cover/upload failure/cleanup/expiry/renewal/privacy retain existing guards. Active/reserved/paused material edits still enter pending_review; rejected edits still return draft. Posting closure does not bypass moderation or account protections. |

Because direct category_id writes are granted, actions alone cannot enforce eligibility. Recommend a private category eligibility helper plus INSERT and actual category-changing UPDATE guard. Compare OLD/NEW values even if same-ID category is explicitly in SET. No unconditional readiness trigger on every listing UPDATE; closed categories must not block unrelated media/lifecycle work. Test ordering with existing triggers. Keep existing RLS, immutable owner/ID, column grants, policy acceptance, maintenance and private-location controls.

Actions add macro/context checks and friendly errors; DB protects UUID-only clients independently. Cross-macro context is a web assertion, not a second stored authority. A client cannot open a closed category by forging a macro. Metadata activation and assignment require transactional consistency: lock checked category through write using a mode conflicting with metadata UPDATE (FOR SHARE or stronger as appropriate), deterministic lock order and concurrent-close regression. FK key-share alone does not protect non-key readiness metadata. Private helper lookup must see relevant inactive rows without globally widening public RLS; privileged lookup must not bypass listing-owner authorization.

Readiness/read results distinguish discovery visibility, NEW eligibility, saved retention, submission and rollout evidence. Successful zero eligible rows means section unavailable; query failure means error/unknown availability. Attributes/cities failure cannot silently become empty writable form. Discovery retains its active-only contract; owner references are scoped; posting reads use the authoritative predicate.

### 5. Validation and product boundary

Metadata preparation/eligibility do not require a general attribute-engine rewrite. Keep seeded/mixed definitions and original submission presence rules; no retroactive stricter conversion of existing ads. Existing weak checks are not readiness evidence for additions.

Before enabling Bicycles/Sports or other new categories, approve stable keys, supported types, options/units/bounds, optional-draft vs required-submit rules and explicit price policy. Use existing text/select/number subset initially; no dates, dependencies, catalogue or new boolean renderer. Enforce supplied values for these approved new definitions in web/actions AND DB; required values only at submit or seller content entering review. Avoid validation on unchanged seller-content media/system operations. Freeze first-release definitions; later required changes need impact/version policy. This is scoped validation, not automatic interpretation of key_fields/CSV metadata.

Affected action integration must reject malformed/non-object attribute JSON instead of silently {}; confirm affected row before claiming update success; category change must confirm incompatible attr removal. These are bounded S3 prerequisites, not metadata-only A1-P changes. Broader attribute-engine debt, price parsing/search-unit debt and lost-response idempotency remain separate.

Bicycles recommendation: explicitly accept current <=₹10 lakh (100,000,000 paise) coverage with matching UI/action/DB limits; no money expansion. Powered vehicles stay closed until approved attrs/validation and explicit under-cap coverage or separately approved wider money policy. Motorcycles/Scooters precede Cars. Vehicle-specific accessories including bicycle parts belong Vehicles; existing accessory listings are not reclassified. All kids cycles belong Bicycles, not both Kids and Vehicles. Full brand/model catalogue remains separate; reviewed bounded text can precede it.

Property remains independently closed. Intent (sale/rent/accommodation as approved), property type, price period and basis must be separate from fixed/negotiable/free. Rents fitting the cap do not establish readiness. No money-schema expansion or Property form design/build here.

### 6. Ordered implementation and smallest next BUILD

| Step | Proposed change | Before activation / shipping boundary |
| --- | --- | --- |
| 1: S1 reference preparation | Add two columns/constraints; resolve/backfill existing five Goods; mixed null/true; unknown null/false; regenerate types and metadata assertions | Safe before activation; no new categories/attrs, enforcement, route change or readiness claim. Old consumers ignore fields. |
| 2: S2 compatible reads/Admin/API | Posting projection, owner saved-category metadata RPC, compatible audited Admin metadata writes and types | Read support may precede guard; don't enforce before old/new/edit/Admin omission handling is ready. |
| 3: S2 authoritative checks | Private eligibility helper; INSERT/actual-category-change guard; action errors; submission retention; real-role/concurrency tests | Coherent release with compatible reads/Admin. Existing Goods/mixed posting must continue. No selector. |
| 4: S3 replacements/web | After guard, add closed Bicycles/Sports and approved definitions; scoped validators; edit/action/error behavior; existing selector/form wiring | Prepare closed paths while mixed open. Separately bounded dirty-history evidence required before section navigation; A1 does not design a provider. |
| 5: reviewed activation/rollback | Compatible UI deployed, both replacements verified, atomic handover and canonical selector activation; audited snapshot/rollback | Both paths and client compatibility ship together; failures defer cutover. Later expansions separately approved. |

**Smallest next BUILD recommendation: A1-P, Step 1 metadata preparation ONLY.** Add nullable constrained macro_category/no default and new_listing_enabled/default false, backfill exact resolved existing identities, preserve mixed null/true and unknown null/false. No new category rows, attrs, gate or selector. Do not force inactive supported rows active; their intended enabled metadata does not override active status. Fail on unexpected identity/signature rather than generate substitute IDs. Approved fixture inventory must match the actual intended target before backfill.

Proposed affected files in that later separately authorized BUILD:

- One CLI-generated supabase/migrations/*_post_ad_category_metadata.sql (timestamp/name generated only during BUILD).
- src/types/database.ts regenerated from verified local schema, not manually edited.
- New supabase/tests/schema_post_ad_category_metadata.test.sql for defaults/constraints/mapping/identity and unchanged behavior; a narrowly selected harness only if needed by approved verification.
- docs/plans/post-ad-india-plan.md and docs/PROGRESS.md for later factual evidence.

Category UI types/consumers need no change in metadata-only preparation. Later S2/S3 paths: src/types/listing.ts; new src/lib/listings/category-reference.ts; new category-attributes.ts only for approved additions; Admin categories page/actions; account listings actions/new/edit pages; ListingForm.tsx; targeted tests and subsequent migrations. A0 parser/selector/auth source remains intact in A1-P. No navigation-provider file or broad navigation work authorized here.

Genuine next-build gates: explicit approval of r4/A1-P and its two-column/backfill choices; confirmed disposable LOCAL DB target with scoped migration/fixture/type-generation/cleanup authorization; identity/definition mismatches resolved before that target's backfill. Local fixture permission does not authorize hosted migration. Fashion/Kids/powered-vehicle/Property choices, native cutover and dirty-history work do not block A1-P; they block their later releases. This PLAN has no missing-input blocker.

### 7. Acceptance matrix and environment prerequisites

All acceptance checks below are future requirements, **NOT RUN in A1**.

| Case | Required evidence |
| --- | --- |
| Valid/tampered category/macro | Eligible mapped category succeeds; cross-section web context, bad UUID, missing row, closed/inactive/new unknown fail. UUID-only clients derive real category. Invalid/repeated macro never opens a form. |
| S1 preparation | Same identities/attrs/listing relationships and original behavior; null/false defaults; no early enforcement/readiness claims; unknown rows not Goods. |
| New vs retained | INSERT/actual target change reject closed rows after S2; unchanged owner relationship saves/edits/submits under original controls even with explicit same-ID SET. Changing away/back cannot reuse retention. |
| Bicycle continuity | Mixed posts through S0–S2; BOTH replacements pass create/resume/photos/submit before closure. Atomic handover/rollback has no gap. Existing mixed IDs/attrs/links/submission remain, no guesses. |
| Category_id-only clients | Original write/API shape works for eligible category; stable closed-target errors/new options after cutover; caches/strict decoders checked. Saved mixed edit/submit stays. |
| Inactive/unmapped/private metadata | Only owner can read saved hidden category/definitions; other user/anon fail. No inactive inventory/private PIN leak. Values retained without default substitution. |
| Submission/moderation/media | Existing account/policy/PIN/location/photo checks and material transitions preserved; closed retention does not block processing cleanup/reorder/expiry/system/moderation. Unauthorized owner/category/status writes still fail. |
| New approved definitions | Malformed objects/types/options/bounds rejected; optional supplied draft values validated, required only at submit/re-review; allowed false/zero handled correctly; existing mixed definitions not retroactively rewritten. |
| Empty/error/unavailable | True empty eligible set unavailable; query outage error/retry; attr/city outage blocks writable form; no first-category/Goods default or selector insert. |
| Forward/rollback/concurrency | Close/remap race cannot bypass assignment guard; activation audited; close replacements/reopen mixed without deleting/reclassifying ads/attrs/categories. Old UI rollback respects DB gate. |
| Dirty-history boundary | Separately prove Back/Forward/section links/failed-save retention before S3. No broad provider design here; no promise of unsaved recovery after process termination. |

Later approved disposable-local checks: replay additive migrations; regenerate types; pgTAP with real authenticated owner/other-owner and staff AAL2 roles; direct PostgREST INSERT/UPDATE/RPC; owner-private inactive reads; concurrency; moderation/media regressions and scoped fixture cleanup. Elevated setup does not prove user authorization. Discover installed CLI options with --help during approved BUILD before specifying exact migration/type/test commands; no DB startup/reset in this plan.

Before selector release, approved local-only build/server environment must resolve automatic environment loading/service-role sitemap limitation. Then desktop/mobile browser/E2E posting, handover and navigation evidence is needed. A0.1 real server auth/cookie/Server Component verification remains outstanding; no further auth rewrite proposed. Native source/cache/decoder compatibility is uninspected. Later separately authorized hosted read-only inventory must verify deployed IDs/definitions, functions/triggers/RLS/grants and price bounds; local migrations prove none of these live facts. Hosted migration/deployment requires separate explicit authorization.

### 8. Actual A1 execution record

Only targeted repository/plan/rule/review reads, public documentation reads, file-preservation hashing and this plan append. No tests/lint/typecheck/build/E2E/server/DB/live-service checks in A1; prior PASS evidence belongs to A0/A0.1. Missing-path/Windows-wildcard search errors were corrected. The initial oversized append command failed before execution with Windows command-length error; a subsequent patch context lookup failed without modifying any file; bounded append commands succeeded. No application failure is inferred from these tool errors.

Final checks: only this plan may differ from the 355-file pre-append SHA256 inventory; previous plan bytes must remain an exact prefix; git diff --check must exit 0. No branch/staging/commit/push/fetch/install/env change, category/database/selector activation or BUILD. Source review is not wider human acceptance/production readiness. **A1 CONTRACT READY FOR REVIEW — stop after PLAN.**

Final observed integrity results: SHA256 comparison of 355 inventoried files found only docs/plans/post-ad-india-plan.md changed, with no added files; prior plan bytes verified as exact prefix. git diff --check exited 0 (LF/CRLF warnings only). Branch/HEAD unchanged as stated above.

## r5 — BUILD A1-P authorization and metadata preparation evidence

**A1-P PARTIAL — DATABASE/TYPE VERIFICATION BLOCKED.** Human BUILD A1-P attachment explicitly authorizes this bounded build against r4: one CLI-generated metadata migration, one focused schema test, generated database types only from a verified disposable local schema, and appended plan/progress evidence. It does not authorize S2/S3, category expansion, bicycle handover or feature acceptance. r1–r4 remain intact. Branch codex/post-ad-a0 and HEAD c415d689124f405db56cbe8d7daecde7eeef1c29 unchanged. Evidence: 2026-10-08, approximately 23:08–23:18 Europe/Copenhagen.

### Completed authoring and source inspection

Installed CLI 2.117.0 generated supabase/migrations/20261008210921_post_ad_category_metadata.sql. A single DO statement locks reference rows, rejects pre-existing metadata columns and unexpected non-internal category triggers, checks exact six migration-4 slug/field/attribute signatures, then adds nullable text macro_category with no default/named CHECK and non-null boolean new_listing_enabled DEFAULT false. DDL/assertions/backfill are one atomic statement, not independent partially applied steps. Schema and six-row metadata UPDATE are the only changes; no production function/trigger/policy/grant change. Comments distinguish legacy/unmapped NULL, intended metadata, non-enforcement and independent is_active.

Five resolved-by-slug identities are intended goods/true; bicycles-sports remains NULL/true. Other rows get NULL/false defaults. No invented UUIDs or new category rows; no is_active/name/description/icon/sort/definition/listing/media writes. Exact seed signature assertions deliberately stop on changed/missing identities or attributes; no local inventory was available to confirm them. These are authored expected mappings, NOT actual resolved database results.

Repository category history inspected: migration 4 table/attributes/RLS/grants/seeds; migration 8 Admin API and explicit-column INSERT; later category references; generated types; application/reference readers; existing pgTAP and isolated setup. No category update timestamp/audit trigger is defined locally. Admin RPC explicitly updates updated_at, but this migration does not call it. No expected automatic timestamp/audit effect from repository-defined backfill; actual effects remain unverified. Unexpected local category triggers stop migration instead of being disabled. No category-return composite function or positional category INSERT dependency found in inspected repository consumers; explicit-column SQL and named-field web reads remain intact. External/native strict decoding is unverified. No application's production code consumes new metadata.

New supabase/tests/schema_post_ad_category_metadata.test.sql follows transactional pgTAP conventions. It captures the actual single applied statement from matching supabase_migrations history, transiently removes only the two new columns without CASCADE, and replays that statement inside a rolled-back test transaction. It uses inert category/owner/mixed-listing fixtures and an inactive supported row. Assertions cover SQL types/defaults/nullability/CHECK values, five Goods/mixed mappings, unknown defaults, preserved business fields/IDs/active states/attribute rows/nonempty listing relationship/media/audit, functions/triggers/policies/table and existing-column grants, valid/invalid macros, null boolean rejection and pre-existing column failure. Test-local nested subtransactions simulate missing slug, mismatched fields and mismatched attribute definition, verify no partial columns/data, then restore scenario state. Digest comparisons avoid printing existing private/audit records on preservation failure. No tables/schemas are dropped or recreated; fixture/setup/replay is rollback-only. This is schema/replay evidence when run, not seller RLS/browser posting proof. All DB assertions are currently NOT RUN.

### Local target boundary and blocker

supabase/config.toml identifies fairswap-local, API 54321, DB 54322, shadow 54320, PostgreSQL major 15, public schema and disabled pooler. docker context show returned desktop-linux; context inspection returned local named-pipe Docker endpoint. docker ps failed exit 1 because dockerDesktopLinuxEngine pipe does not exist. Listener inspection produced no listed configured endpoints. The local engine/service/container and intended database/disposable status cannot be positively verified; configured loopback ports alone do not establish a genuine non-tunnel local target. No database connection, SQL execution or local migration history query was attempted.

Required next environment: an already-running, operator-provided disposable local FairSwap stack, positively verified Docker/container/loopback binding and intended database (including absence of tunnel/proxy), with current repo baseline through existing migration 33 and only this new migration pending. Verify actual history/schema/constraints/grants/category inventory before applying; do not start/reset/replay unrelated migrations or repair drift under this authorization. If history, identity or definitions differ, report rather than substitute/repair. CLI --local workflows are available and must not fall back to --linked, project-ref or hosted env URLs. Repository local test guard rejects unapproved/non-loopback mutation, but it is not proof that a stack exists.

src/types/database.ts is unchanged byte-for-byte. No generation command was executed; no candidate or invented union created. Once target prerequisites are satisfied, use --local --schema public generation to a temporary candidate, preserve exit status, compare all output and replace only when unrelated changes are explained. Text CHECK does not justify a manually invented union. Unknown unrelated schema/generation drift remains unassessed.

### Actual commands and results

| Command | Actual outcome |
| --- | --- |
| corepack pnpm exec supabase --version | Exit 0; installed 2.117.0. No upgrade performed. |
| corepack pnpm exec supabase migration new --help | Exit 0; filename-generation interface inspected. |
| corepack pnpm exec supabase test db --help | Exit 0; accepts explicit test path and --local. |
| corepack pnpm exec supabase gen types --help | Exit 0; --local, --schema, TypeScript options inspected. |
| corepack pnpm exec supabase migration up --help | Exit 0; --local applies pending migrations; baseline must have exactly one pending file. |
| corepack pnpm exec supabase migration list --help | Exit 0; --local history inspection available. |
| docker context show | Exit 0; desktop-linux. |
| docker context inspect desktop-linux --format '{{.Endpoints.docker.Host}}' | Exit 0; local named pipe, no secrets. |
| docker ps --format '{{.Names}} {{.Image}} {{.Ports}}' | Exit 1; local engine pipe unavailable. |
| corepack pnpm exec supabase migration new post_ad_category_metadata | Exit 0; generated 20261008210921_post_ad_category_metadata.sql. |
| corepack pnpm exec vitest run tests/unit/post-ad-routing.test.ts tests/unit/post-ad-selector.test.tsx tests/unit/post-ad-page-auth.test.tsx src/__tests__/proxy-policy-guard.test.ts tests/security/redirect.test.ts src/__tests__/proxy-auth-response.test.ts | Exit 0; 6 files / 117 tests PASS, start 23:14:38, duration 4.49s. SDK/network isolation re-inspected. Logger timestamps are frozen fixtures. |
| corepack pnpm lint | Exit 0. |
| corepack pnpm typecheck | Exit 0 with unchanged database types; not generated-schema proof. |
| git diff --check | Exit 0; platform LF/CRLF warnings only. |

NOT RUN: migration list --local, migration up --local, focused `corepack pnpm exec supabase test db --local supabase/tests/schema_post_ad_category_metadata.test.sql`, `corepack pnpm exec supabase gen types --local --lang typescript --schema public`, any SQL/schema assertions, actual resolved mapping/active-state comparison or migration effects. Target verification failed before DB connection. Build remains NOT RUN under prior automatic-env/service-role sitemap limitation. No broad DB/unit/security/E2E, server/browser/native/live-session/hosted checks.

Changed this build only: new migration; new schema test; this appended r5; appended factual docs/PROGRESS.md entry. Existing implementation and generated types preserved. No hosted project access, enforcement/guard/submission/Admin/application change, new production categories, selector activation, attributes/money changes, install/env edits, staging/commit/push/fetch/deploy or S2/S3. Stop at partial status; do not infer completed A1-P or wider acceptance from authoring/code checks.

Final A1-P integrity evidence (23:19 Europe/Copenhagen): compared 355 pre-existing tracked/untracked file hashes. Only plan/progress changed, and both original byte prefixes are intact. Exactly two new repo files: the authorized migration and schema test. Database types, all 33 prior migrations and A0/A0.1 implementation/reference files unchanged. Focused SQL/test patch: C:/Users/VivekKumar/AppData/Local/Temp/fairswap-a1p-review-20261008/a1-p-focused-sql-test.patch; git apply --check --reverse exited 0 without applying. git diff --no-index --check -- /dev/null on each new SQL file emitted no whitespace findings; native exit 1 denotes new-file differences. Initial review script mistakenly treated that difference status as failure; corrected interpretation and reverse applicability passed. Ordinary git diff --check exited 0. None of these checks parses/executes SQL or supplies database verification.

## r6 — Authorized new scratch-project verification attempt (2026-10-09)

**A1-P PARTIAL — SCRATCH STARTUP/Baseline verification BLOCKED.** The human's new disposable-project attachment authorizes one uniquely named scratch Supabase project outside this repo; new task-only local containers/networks/volumes; byte-identical replay of the 33 preceding migrations into empty local data; separate application of reviewed A1-P; focused synthetic pgTAP test; baseline/post types with safe comparison; and appended evidence. It supersedes the already-running-only boundary solely for resources created by this task. ALL pre-existing resources remain protected. No retained-project restore/mount/use, hosted access, automatic reset/rebuild retry loop, prior/reviewed migration modification, unrelated application/config/env/dependency changes, S2/S3, Git stage/commit/push/reset/clean/stash/branch change or deployment. A new test fix is permitted only for an observed narrow test defect. Preserve r1–r5 and no wider acceptance.

### Scratch identity and preflight

Scratch project_id: fairswap-a1p-20261009122757-a04ad005. Workdir: C:/Users/VivekKumar/AppData/Local/Temp/fairswap-a1p-20261009122757-a04ad005. Baseline artifacts/logs remain there. CLI 2.117.0; Docker server 29.8.2/Linux; no parent DOCKER_CONTEXT/DOCKER_HOST override. Verified desktop-linux endpoint npipe:////./pipe/dockerDesktopLinuxEngine. Every executing scratch CLI command uses explicit workdir, and service start uses explicit scratch network. Child process removes inherited SUPABASE/PG/DATABASE_URL/NEXT_PUBLIC and proxy/endpoint overrides, pins verified local Docker endpoint and isolated scratch HOME/USERPROFILE/APPDATA/LOCALAPPDATA/DOCKER_CONFIG. No hosted link, credentials, env files, database/storage data or original .temp metadata copied. Scratch-generated CLI state is not copied repository state.

Protected preflight inventory: zero containers; supabase_db_fairswap-local and supabase_storage_fairswap-local volumes; bridge/host/none, fairswap-local-net and supabase_network_fairswap-local networks, with exact IDs/metadata captured in-memory. No disposability inferred from retained names. Unique scratch name/path checked against all resources. Ports 64320/64321/64322 verified free using temporary TCP listeners, then released.

33 repository baseline migrations were inventoried, ordered, hashed and copied byte-identically; first migration 20260914000001_create_accounts_and_profiles.sql through 20261002000033_seller_media_management.sql. A1-P 20261008210921_post_ad_category_metadata.sql was NOT copied into active scratch migrations. baseline-manifest.json records exact filenames/SHA256; final copy check passed. No baseline/history assumption from count alone. Scratch config keeps PostgreSQL major 15 and public schema, disables separate seed-file execution and all optional API/auth/storage/realtime/SMTP/analytics/edge services. No templates/custom-role input was required by this minimal configuration. Historical migrations remained intact, including their reference seeds.

Historical outbound paths inspected: migrations 23/24 schedule outbox retry; actual HTTP requires worker URL AND secret in Vault. No secrets were supplied or copied. To prevent application-service egress during this attempt, a NEW internal bridge network was created with loopback default publication using Docker's documented com.docker.network.bridge.host_binding_ipv4 option ([Docker bridge documentation](https://docs.docker.com/engine/network/drivers/bridge/)). This configuration did not yield a successful CLI database connection; no claim of complete startup compatibility.

### Single startup attempt and observed blocker

Created network fairswap-a1p-20261009122757-a04ad005-isolated, ID 873b929ec65cac9dfc3e7d2cf6109f4dda08f7a0fec0f6e23f66764b7e57327d, internal=true and host_binding_ipv4=127.0.0.1. The installed CLI start command excluded all optional service containers, including postgres-meta. A scratch PostgreSQL container briefly ran and became healthy, ID c0d5feb5f41a325d94318bfdf91ed796e34e5c544e75f9cb83f77dd37eac4456. Actual image public.ecr.aws/supabase/postgres:15.8.1.085, image/repository digest sha256:af083ef64d0408c8f098ee6f5c364a59b26f36fbc0f3a334a62c5c1d57362e9b. PostgreSQL SQL version was NOT queried; image tag is not a SHOW server_version result.

Observed container port display was 5432/tcp with no published host mapping. CLI start exited 1 with LegacyDbConnectError:

`failed to connect to postgres: failed to connect to host=127.0.0.1 user=postgres database=postgres: dial error (connect ECONNREFUSED 127.0.0.1:64322)`

This is a connection/startup failure, not a migration assertion/SQLSTATE failure. No successful baseline connection, applied-history query, reference inventory or repository migration replay was reached/evidenced. The database image's own initialization is not proof of the repository baseline. Failed startup reported Stopping containers and cleaned its task resources. No retry, reset, migration repair, fake schema/history or fallback was performed. Loopback startup/cleanup compatibility needs review before another separately authorized attempt.

### Resource preservation and cleanup limitations

Docker volume events show only task volume supabase_db_fairswap-a1p-20261009122757-a04ad005 mounted by the task container; no retained-volume mount events occurred in the captured window. Both retained volume metadata objects and both FairSwap custom-network metadata objects match preflight exactly. They were not restored or queried. Metadata/event equality is NOT byte-level verification of retained database contents.

Important anomaly: volume and network prune events appear during the failure window; task volume/network were destroyed. No explicit docker prune, --all, --no-backup or cleanup command was issued by this agent, but the lifecycle attempt/event record does not support claiming no cleanup side effects. Default bridge ID changed from 985c23a7cc9d74f31b9fe74a6ebe63109421d8c963f01ba66be6f1b7b9807555 to 77fe566aea863331bba51d63a3873feb6f9ccbf7a0d37c60f1b9aa814bac7062, created at 12:30:42 UTC; subnet/gateway/options match. Attribution of default bridge replacement and every prune event is not established by available evidence. Thus ALL protected-resource identity preservation cannot be claimed. No repair/reconfiguration attempted.

Final state: zero containers, no new task volumes or scratch network; two protected retained volumes and FairSwap custom networks remain. There are no services left for an explicit scoped stop, and no scratch data volume remains to preserve for review. Only scratch directory/config/hash manifests/captured stdout/stderr remain. Capture log content without exposing credentials; no passwords/tokens/keys/full DSNs printed.

### Commands/results and NOT RUN checks

Exact executing CLI lifecycle (installed 2.117.0 binary, isolated child environment):

- `supabase --workdir C:/Users/VivekKumar/AppData/Local/Temp/fairswap-a1p-20261009122757-a04ad005 init`: exit 0, config only.
- `supabase --workdir C:/Users/VivekKumar/AppData/Local/Temp/fairswap-a1p-20261009122757-a04ad005 --network-id fairswap-a1p-20261009122757-a04ad005-isolated start --exclude gotrue,realtime,storage-api,imgproxy,kong,mailpit,postgrest,postgres-meta,studio,edge-runtime,logflare,vector,supavisor`: exit 1, LegacyDbConnectError above. Scratch invoke-cli.ps1 captures stdout/stderr.
- Same workdir/network prefix followed by `--version`: exit 0, 2.117.0.
- `docker network create --driver bridge --internal --opt com.docker.network.bridge.host_binding_ipv4=127.0.0.1 --label com.supabase.cli.project=fairswap-a1p-20261009122757-a04ad005 --label fairswap.task=a1p-verification fairswap-a1p-20261009122757-a04ad005-isolated`: exit 0.
- Context/info/resource inventory and bounded event/image inspection: read-only; successful final commands exit 0. Inspection after failure correctly reported task container no longer present (exit 1). Initial binary-path lookup/official source URL lookups failed before startup; located installed platform executable without install/upgrade. Initial event timestamp formatting failed, corrected invariant timestamps; this was a diagnostic command failure, not a DB failure.

NOT RUN: baseline migration history/schema/reference checks, pre/post preservation SQL, resolved mappings/active states, separate A1-P application, unrelated category defaults, focused TAP (zero executed tests), fixture rollback verification, baseline/post type generation/comparison. No generated candidate; src/types/database.ts unchanged. No observed narrow test defect, so schema test unchanged. Application tests/lint/typecheck were NOT rerun because their specified prerequisite, successful type generation, was not reached; earlier PASS remains attributable to earlier runs. No broad suites/E2E/app server/production build. Existing build environment limitation unchanged. Reviewed A1-P migration and 33 baseline migration files unchanged.

Only factual docs/plans/post-ad-india-plan.md r6 and docs/PROGRESS.md append are changed in the repo by this attempt. Final diff check/preservation hashes recorded below. Hosted projects never selected or contacted. No new production categories, money/attribute changes, listing enforcement, selector activation, commit/push/deploy or S2/S3. Stop at PARTIAL; startup and cleanup behavior require review before another attempt.

Final r6 repository integrity: all 357 pre-existing tracked/untracked files compared; only the two evidence documents changed, with both original byte prefixes intact. No new repo files. Reviewed A1-P migration/schema test/types, all historical migrations, A0/A0.1 and reference inputs byte-identical. git diff --check exit 0 (LF/CRLF warnings only). This check does not resolve Docker resource anomalies or provide SQL verification.

## r7 — Publication/cleanup diagnosis and conditional retry stopped at network creation (2026-10-09)

**A1-P PARTIAL — DOCKER IDLE-VM WAKE CHANGED A PROTECTED NETWORK; SUPABASE START NOT RUN.** Human attachment `9d76be8b-abaf-45ee-9a63-c9864c0c3543/Pasted text.txt` authorizes read-only exact-build publication/cleanup diagnosis followed by at most one corrected fresh disposable attempt only after both safety checks pass. It also explicitly requires stopping if the daemon or a protected resource changes. No general lifecycle retry, daemon setting change/restart, upgrade, retained data access, hosted access, migration rewrite or S2/S3 permission. r1–r6 remain unchanged. Branch codex/post-ad-a0, HEAD c415d689124f405db56cbe8d7daecde7eeef1c29.

### Exact-build findings and remaining uncertainty

Read prior scratch config, invoke-cli.ps1 and start.stdout/start.stderr, r6 resource/event evidence and installed package metadata. Installed supabase 2.117.0 points to official repository apps/cli; source was discovered through the exact v2.117.0 Git tree, not older Go paths. Binary static-string inspection found no usable readable implementation; conclusions below use the matching official release source, not an assertion of a binary/source byte comparison.

A. PostgreSQL publication is constructed in [postgres.service.ts](https://github.com/supabase/cli/blob/v2.117.0/apps/cli/src/command-internal/db-bootstrap/postgres.service.ts#L438): ports contains hostPort=db.port/containerPort=5432. [docker-create-args.ts](https://github.com/supabase/cli/blob/v2.117.0/apps/cli/src/command-internal/db-bootstrap/docker-create-args.ts#L510) emits docker create `-p <hostPort>:5432`, which Docker converts into HostConfig.PortBindings. There is no explicit HostIp in that argument; project-network binding defaults control it.

B. [start.handler.ts](https://github.com/supabase/cli/blob/v2.117.0/apps/cli/src/commands/start/start.handler.ts#L904) resolves --network-id/SUPABASE_NETWORK_ID/generated project network separately from port construction. Neither this resolver nor the create-args path suppresses the publication argument. Thus the theory that --network-id itself removed PortBindings is unsupported by this exact-release source. The previous --internal network is an evidenced configuration mismatch: installed engine commit 8af9fe3a36bab3e039862a2ab1cef1880c9b4d03 [bridge_linux.go](https://github.com/moby/moby/blob/8af9fe3a36bab3e039862a2ab1cef1880c9b4d03/daemon/libnetwork/drivers/bridge/bridge_linux.go#L1459) does not assign a gateway for internal networks; its external-connectivity programming selects NAT bindings by gateway endpoint identity (lines 1579–1618). This is consistent with the previous healthy DB having no effective published mapping. Prior actual HostConfig.PortBindings were not captured before cleanup; therefore the exact prior create request/runtime cause remains an inference, not a retrospectively observed binding. Docker's [bridge publication documentation](https://docs.docker.com/engine/network/drivers/bridge/) independently documents project network binding defaults; it is not proof of the installed CLI.

C. [legacy-hostname.ts](https://github.com/supabase/cli/blob/v2.117.0/apps/cli/src/command-internal/legacy-hostname.ts) returns 127.0.0.1 for the pinned npipe daemon endpoint. [db-setup.ts](https://github.com/supabase/cli/blob/v2.117.0/apps/cli/src/command-internal/db-bootstrap/db-setup.ts#L1196) explicitly connects through that host and configured db.port, independent of internal Docker DNS. Prior db.port=64322 explains the Windows initializer's address. Container health is not evidence of that host-facing connection.

D. The previous all-disabled config was insufficient for this baseline: migration 1 references auth.users; migration 7 uses storage.buckets/objects. PG15 setup runs one-shot Auth/Storage migration jobs only when their config enabled flags are true ([db-setup.ts](https://github.com/supabase/cli/blob/v2.117.0/apps/cli/src/command-internal/db-bootstrap/db-setup.ts#L747)); excluding their long-running service containers does not substitute for those schema jobs. Corrected scratch enables auth/storage solely for initialization while excluding long-running services. Focused pgTAP uses a transient PG_PROVE_IMAGE helper and database pgTAP extension, per legacy-test-db.handler.ts; type generation launches a transient postgres-meta image on the generated normal project network, per gen/types/types.handler.ts lines 449–455, 624–639. No persistent postgres-meta service is required for typegen. These are source-supported requirements, not executed helper health/results.

### Cleanup scope and prior bridge attribution

Exact v2.117.0 [start rollback](https://github.com/supabase/cli/blob/v2.117.0/apps/cli/src/commands/start/start.handler.ts#L1845) passes legacyCliProjectFilterValue(projectId), isFreshVolume and workdir to legacyRollbackStart. For a nonempty unique project ID, [legacy-docker-ids.ts](https://github.com/supabase/cli/blob/v2.117.0/apps/cli/src/command-internal/legacy-docker-ids.ts#L156) returns `com.supabase.cli.project=<projectId>`. [legacy-docker-remove-all.ts](https://github.com/supabase/cli/blob/v2.117.0/apps/cli/src/command-internal/legacy-docker-remove-all.ts) lists all states with `docker ps --filter label=<filterValue> --all`, stops only those resulting IDs, and applies the same exact label=value filter to container/volume/network prune. Fresh-volume failure permits volume prune; its internal --all is API-gated and still label-filtered. An empty project ID would mean label-key-only scope and must never be used. Retained resources have fairswap-local, not either unique task project label. Stop without --no-backup passes deleteVolumes=false. No prune was run to test this logic. Prior prune events alone do not reveal actual request filters; matching source explains the expected project-filtered calls, without claiming forensic proof of each earlier request.

Read-only Docker Desktop backend logs now give concrete prior bridge-change context: at 12:30:39.319829800Z, idle -> busy after 18m52.3718231s idle, reason one /v1.56/networks/create call from Docker-Client/29.8.2 (windows); VM starts, engine stopped -> starting, daemon ready at 12:30:43.042156600Z. This brackets prior bridge creation 12:30:42.914638845Z and supports replacement during Docker Desktop idle-VM wake, rather than attributing default-bridge removal to project-filtered CLI prune. No agent daemon restart/default configuration change was issued. Retained database/storage contents were never mounted or read; metadata equality is not byte verification.

### Corrected configuration and actual stop boundary

Endpoint reconfirmed before engine contact: no DOCKER_CONTEXT/DOCKER_HOST parent overrides; docker context show=desktop-linux; context inspect endpoint=npipe:////./pipe/dockerDesktopLinuxEngine; server 29.8.2/Linux. Protected inventory captured privately: zero containers, two retained volumes and five existing networks with exact identities/metadata; 357 existing repo files hashed.

Created NEW scratch project fairswap-a1p-20261009130541-54840ebe, canonical workdir C:/Users/VivekKumar/AppData/Local/Temp/fairswap-a1p-20261009130541-54840ebe (TEMP emitted its equivalent VIVEKK~1 short path). Prior scratch directory preserved. Copied exactly 33 baseline migrations byte-for-byte, verified hashes, wrote baseline-manifest.json; A1-P excluded. Ports 64420/64421/64422 checked available and listeners released. Config major_version=15, public scope; separate seeds disabled; auth/storage enabled for schema initialization; api/realtime/studio/SMTP/analytics/edge/pooler/pgdelta disabled. No config/env/link/credentials/data from retained or hosted projects copied. Launcher inherited the prior credential/profile isolation, pinned local Docker endpoint, and removed the --network-id override. No app services intended to run. Historical outbox migrations 23/24 require both URL and secret in Vault before HTTP; neither is supplied in this empty project.

Exact executed creation command (exit 0):

`docker network create --driver bridge --opt com.docker.network.bridge.host_binding_ipv4=127.0.0.1 --label com.supabase.cli.project=fairswap-a1p-20261009130541-54840ebe --label com.docker.compose.project=fairswap-a1p-20261009130541-54840ebe --label fairswap.task=a1p-verification supabase_network_fairswap-a1p-20261009130541-54840ebe`

This uses the exact generated project network name. Exact-release legacyEnsureNetwork inspects/reuses an existing name (container-lifecycle.ts lines 281–303); port emission remains unconditional. The network is non-internal, loopback default only, IPv6 disabled. It is project-local, not shared bridge, and no daemon defaults were changed.

Prepared corrected startup command, **NOT EXECUTED**:

`supabase --workdir C:/Users/VivekKumar/AppData/Local/Temp/fairswap-a1p-20261009130541-54840ebe start --exclude gotrue,realtime,storage-api,imgproxy,kong,mailpit,postgrest,postgres-meta,studio,edge-runtime,logflare,vector,supavisor`

Immediately after network creation, protected bridge ID changed from 77fe566aea863331bba51d63a3873feb6f9ccbf7a0d37c60f1b9aa814bac7062 to 99619655b797190e0095e0facb2b5e173ee7db6bc36420270997c4fa4bfb5886, created 13:05:46.806478289Z. Desktop log at 13:05:42.803724100Z reports idle -> busy after 32m40.9079454s, explicitly caused by one networks/create call; VM starts and engine stopped -> starting; daemon ready 13:05:46.899030400Z. Read-only engine responsiveness before creation did not imply the VM was already active. The required stop boundary applies: no Supabase startup, retry, daemon adjustment or additional lifecycle operation followed. Corrected port mapping itself remains unverified.

### Final results, commands and preservation limits

Conditional Supabase startup attempted: NO. Task resource preparation/network creation attempted: YES, then stopped at protected-network change. No new container/database/volume; no actual HostConfig.PortBindings, NetworkSettings.Ports, host TCP DB connection, SQL server identity, 33 applied-history/category verification, A1-P pending/application, preservation SQL, focused TAP (0 tests), rollback verification, baseline/post/current type comparison or generated output. All these checks NOT RUN. Six isolated application tests, lint/typecheck NOT RUN because required successful-generation prerequisite was not reached; build/broad/E2E/server/live/hosted checks NOT RUN. No observed schema-test defect and no test fix. Migration/test/types unchanged.

Read-only final inventory: zero containers; both retained volume metadata objects byte-equal as serialized metadata; host/none and both FairSwap custom-network metadata objects equal; protected default bridge identity changed as above. Final task network ID 52c79bc8f97ba7c0c3f45090b8f2acfd797b508c83cf3170e73a70dbbe2b34ff remains unused, name supabase_network_fairswap-a1p-20261009130541-54840ebe. Network event window contains its create event only. No services exist to stop and no task data volume exists to preserve; no deletion/prune/stop path was invoked. Scratch config/launcher/33 migrations/hash manifest/network-events.json remain outside repository. Metadata comparison cannot prove retained storage contents unchanged.

Exact principal successful read-only commands: `docker context show`; `docker context inspect desktop-linux --format '{{.Endpoints.docker.Host}}'`; `docker version --format '{{.Server.Version}} {{.Server.Os}}'`; `docker ps -a --format '{{.ID}} {{.Names}} {{.State}} {{.Ports}}'`; `docker volume inspect supabase_db_fairswap-local supabase_storage_fairswap-local`; `docker network inspect bridge host none fairswap-local-net supabase_network_fairswap-local <new-task-network>`; bounded `docker events --since 2026-10-09T13:05:00Z --until <invariant UTC> --filter type=network --format '{{json .}}'`. Each final invocation exit 0. Exact-tag Git tree/raw source reads and bounded rg of Desktop backend logs were read-only. Diagnostic failures: unavailable Moby v29.8.2 source tag (404; resolved using installed engine GitCommit), one undiscovered test-handler path (404; resolved through exact tree/entrypoint imports), unsupported Server.ApiVersion formatting (exit 1; version/OS command exit 0), PowerShell literal wildcard rg paths (exit 1; corrected rg -g directory search), and an oversized private inventory response parse (no mutation; bounded retry succeeded). None was a database/startup/test failure. No installed CLI patch/upgrade or hosted access.

Repository changes by r7: only this appended plan evidence and appended docs/PROGRESS.md entry. No migration/schema test/types/application/config/old migration/CSV/reference/env/dependency changes, staging/commit/push/deployment/branch changes or S2/S3. A1-P remains PARTIAL. The next required operation is a reviewed decision about Docker Desktop idle-VM wake changing protected bridge identity before any fresh lifecycle authorization; no daemon repair or further retry is implied.

Final r7 repository integrity: all 357 pre-existing tracked/untracked files compared; only docs/plans/post-ad-india-plan.md and docs/PROGRESS.md changed, with both original byte prefixes intact. No new repository files. Reviewed migration/schema test/types, all 33 historical migrations and A0/A0.1/reference inputs byte-identical. git diff --check exit 0 (LF/CRLF warnings only). This does not establish database verification or retained-volume byte preservation.

## r8 — Prepared scratch resume; mandatory stop on actual wildcard DB publication (2026-10-09)

**A1-P PARTIAL — SINGLE STARTUP EXITED 0, BUT ACTUAL DATABASE PUBLICATION VIOLATED LOOPBACK BOUNDARY.** Human attachment c4121853-20e0-4697-b790-68c685ce2072/Pasted text.txt accepts the evidenced r7 default-bridge replacement for this task and narrowly permits initial logged idle-wake bridge ID/timestamp changes when no workloads were running, configuration remains equivalent and protected project resources match. It authorizes one startup of the existing prepared r7 project, conditional bounded A1-P verification and factual evidence append. It requires stopping task containers if DB publication uses 0.0.0.0/::, and does not authorize repair/retry/shared Docker changes. No wider acceptance or production readiness. Prior r1–r7 retained; branch codex/post-ad-a0, HEAD c415d689124f405db56cbe8d7daecde7eeef1c29 unchanged.

### Preflight and permitted initial wake

Reused fairswap-a1p-20261009130541-54840ebe at C:/Users/VivekKumar/AppData/Local/Temp/fairswap-a1p-20261009130541-54840ebe. Actual normal task network ID still 52c79bc8f97ba7c0c3f45090b8f2acfd797b508c83cf3170e73a70dbbe2b34ff, unused, bridge/non-internal, IPv6 disabled, loopback default option 127.0.0.1 and exact task/compose labels. No task container/volume existed. All 33 manifest/repository/scratch migration hashes matched; no A1-P file present. Ports 64420/64421/64422 free, test listeners released. Config/launcher matched r7: PG15, separate seeds disabled, Auth/Storage initialization enabled; optional long-running services configured/excluded; isolated child credential/profile/proxy environment and local Docker pin; no --network-id override, .env/link/retained data or hosted credentials copied. The normal bridge is not an outbound firewall.

No parent DOCKER_CONTEXT/DOCKER_HOST override. Context desktop-linux; endpoint npipe:////./pipe/dockerDesktopLinuxEngine confirmed before contacting engine; server 29.8.2/Linux. Read-only inventory triggered initial idle wake: Desktop log 13:19:36.060329100Z reports idle -> busy after 13m48.8000036s, reason /v1.56/volumes call from Docker-Client/29.8.2 (windows); starting VM 13:19:36.061400000Z, engine stopped -> starting 13:19:36.062562600Z, daemon ready 13:19:41.835060500Z. No workload was running. Bridge changed from r7 99619655b797190e0095e0facb2b5e173ee7db6bc36420270997c4fa4bfb5886 to 27959d07b60218f76a361dc24e97570fb33ce37a393ffc47b6639e4abf6dd6ed, created 13:19:41.593885853Z. Driver/options/IPAM/internal/IPv6/scope equal; retained volumes, all other protected networks and reusable task network match prior metadata. This qualifies for the human's narrow exception, and became the post-wake operating baseline. No reset/restart/prune/settings change or keepalive issued. No source investigation/general repo audit/category planning repeated.

### Single startup, actual exposure and bounded stop

Installed isolated launcher `invoke-cli.ps1 r8-start-help start --help` exited 0; installed exclusion options inspected against r7 command. Exact sole startup invocation:

`supabase --workdir C:/Users/VivekKumar/AppData/Local/Temp/fairswap-a1p-20261009130541-54840ebe start --exclude gotrue,realtime,storage-api,imgproxy,kong,mailpit,postgrest,postgres-meta,studio,edge-runtime,logflare,vector,supavisor`

Invoked through existing isolated launcher `invoke-cli.ps1 r8-start start --exclude <same list>`; CLI exit 0. Captured stdout/stderr remain external and were not dumped (status may contain keys). Sanitized stderr lists initialization and all 33 baseline migration filenames through 20261002000033_seller_media_management.sql, with no migration failure captured. Logs alone do not substitute for applied-history/statement/category assertions.

During startup, live Docker inspect recorded DB container 2ddaab0798dc97011506a5b7f959dadddbb2250a89c3068a70e4bd8ad9fcc94c, image public.ecr.aws/supabase/postgres:15.8.1.085, named task DB volume mounted at /var/lib/postgresql/data. Actual HostConfig.PortBindings: `5432/tcp=[{HostIp:"",HostPort:"64422"}]`. Actual NetworkSettings.Ports: `5432/tcp=[{HostIp:"0.0.0.0",HostPort:"64422"},{HostIp:"::",HostPort:"64422"}]`. This is an unapproved host interface publication despite the task network loopback-default option. Container HostConfig.NetworkMode equals the verified normal task network name. Effective publication is the decisive observation; network configuration alone did not establish restricted exposure.

Unexpected persistent Auth, Storage and Kong containers were also observed despite the recorded exclusion invocation. Kong effectively published 0.0.0.0/:: port 64421. This is recorded as another runtime/config/exclusion discrepancy, not explained away as a transient initialization job. No confirmed cause for ignored binding defaults/exclusions; no CLI patch, launcher/config adjustment or second attempt authorized/performed.

Immediately obeyed exposure stop. Queried only exact task-label IDs and verified each ID's task label/name before `docker stop <id>`. A read-only process lookup for this scratch start found no running supabase.exe process; no process was killed. Actual CLI had exited 0 before the final wait returned. Exact stopped IDs, each docker stop exit 0:

- Storage 9c417e84b85255286e9f480a5b9059fe19c4211e7a2f9f03e613d8fd090cc37d, image public.ecr.aws/supabase/storage-api:v1.72.1, task Storage volume /mnt.
- Auth f86cf58b3decd5985dbf9f94ccec737e36dde4546ebbb3cc629c8da1dc8e324b, image public.ecr.aws/supabase/gotrue:v2.196.0, no volume mount.
- Kong 6e31a74632168f259bf120bef345dde3e5e71761f2e9968947471e2621b2d9b8, image public.ecr.aws/supabase/kong:2.8.1, no volume mount.
- DB 2ddaab0798dc97011506a5b7f959dadddbb2250a89c3068a70e4bd8ad9fcc94c, image above, task DB volume only.

Used direct verified container stops as the volume-preserving emergency path; no prune/remove/--all/--no-backup, no retained resources stopped. No wildcard replacement binding, daemon setting change, retry, restart or retained/hosted DB fallback.

### Verification actually performed and NOT RUN

Startup attempted YES, exactly once, CLI exit 0. It is not a verified successful task startup because loopback restriction failed. SQL PostgreSQL version/database identity, host TCP probe, independently queried 33 migration-history entries/statement comparison, six category definitions, helper readiness and preservation baseline NOT RUN after the mandatory exposure stop. Image tag is not a SQL server_version result. Actual logs list all 33 migrations, but history results remain unverified. No A1-P file copied/applied, no SQLSTATE/contract failure claimed.

A1-P sole-pending check/application, observed Goods/mixed mappings/defaults/constraints, preservation SQL, focused schema test (0 executed tests), rollback/scenario verification, baseline/post type generation/drift reconciliation NOT RUN. No type candidate; src/types/database.ts unchanged. No observed schema-test defect or test edit. Six isolated application tests, lint/typecheck NOT RUN because successful generation prerequisite was not reached. Build/broad/E2E/app server/live/hosted checks NOT RUN. git diff --check performed on factual docs only; final result recorded below. No fake history/baseline or weakened tests.

### Preservation and final resources

Final four task containers are exited with no effective published ports; none running. Task volumes supabase_db_fairswap-a1p-20261009130541-54840ebe and supabase_storage_fairswap-a1p-20261009130541-54840ebe remain, correctly task-labelled. Normal task network retains exact ID and configuration, no attached containers. Preserved initialized scratch data and all previous scratch evidence; no additional project created. External logs/evidence: r8-start-help.stdout/stderr, r8-start.stdout/stderr, r8-resource-events.json, r8-final-resource-metadata.json and r8-idle-wake-markers.txt. Captured resource window has 100 container/network/volume events; volume mount events reference only the new task DB/Storage volumes and corresponding exact task container IDs, not retained FairSwap volumes.

Both retained volume metadata objects match pre-start and r7; fairswap-local-net, supabase_network_fairswap-local, host/none and reusable task network metadata match. Post-wake default bridge also matches final metadata; no engine interruption observed while task DB ran. Retained contents never mounted/read; metadata/event equality is not byte-level integrity. Initial wake accepted solely under human's amendment; wildcard exposure was not covered by it.

Principal read-only commands exit 0: context show/inspect; docker version --format '{{.Server.Version}} {{.Server.Os}}'; docker ps filtered exact project/all states; narrow container inspect for IDs/state/image/bindings/mounts/network/labels (no env dump); volume/network inspect; bounded events --since 2026-10-09T13:19:00Z --until <invariant UTC> --format '{{json .}}'; bounded existing Desktop log markers. Each direct docker stop exit 0. One private oversized event/metadata response could not be parsed due to output truncation; bounded metadata retry succeeded, no lifecycle retry. No secret/DSN output displayed and no hosted project contacted.

Only factual plan r8 and progress append changed in repository. Reviewed migration/schema test/types, all historical migrations, A0/A0.1 application/auth changes, CSV/reference/config/env/dependencies preserved. No staging/commit/push/fetch/branch/reset/clean/stash/deployment/S2/S3. A1-P remains PARTIAL: next requires bounded diagnosis of actual wildcard publication and exclusion behavior before any new lifecycle authorization. Do not resume this initialized scratch database automatically.

Final r8 integrity: compared all 357 pre-existing tracked/untracked repository files; only plan/progress changed and their original byte prefixes remain intact. No new repo files. Reviewed A1-P migration/schema test/types, 33 historical migrations and A0/A0.1/reference inputs byte-identical. git diff --check exit 0 (LF/CRLF warnings only). Retained-volume data bytes were not inspected or verified.

## r9 — Authorized reusable Post Ad UI and isolated browser preview (2026-10-09)

**POST AD UI PREVIEW READY — UI only, no persistence acceptance.** Human build attachment 17daf0ae-1f34-44b9-bd70-e059f70fab25/Pasted text.txt replaces Docker recovery with this implementation scope: reusable three-section flow, minimal shared presentation, synthetic isolated browser harness, focused tests and loopback server. Prior r1–r8 preserved. Branch codex/post-ad-a0 unchanged. A1-P migration remains authored/unverified; this UI task does not resolve its database/exposure blocker.

Implemented src/components/listings/PostAdFlow.tsx with typed category-state/data/navigation/draft-event props, macro filtering, explicit category placeholder, loading/empty/error feedback, category attributes, confirmed incompatible-attribute clearing and preserved common values. Reuses A0 macro parser/selector; selector adds optional navigation props with identical production defaults. ListingFormFields.tsx extracts only existing Details/Pricing presentation; production ListingForm retains category/location/media/action/validation/maintenance/moderation logic, submitted input names/value formats and original heading/defaults. Create/edit payload tests cover paise conversion, free price, permissive drafts, listing ID/redirect, saved-listing media and submission/maintenance gates. Property has no used-item condition control or condition in summary, and its fields/pricing explicitly await integration.

Separate tools/post-ad-preview/ contains Next app/layout/CSS/config/tsconfig, synthetic fixtures, strict preview URL helper, adapter simulation controls, import-boundary verifier and repeatable browser check. No production route activation or fixture import by production loaders. Persistent sample-data/no-save banner; all draft output is labelled in-memory, no fabricated ID/redirect/upload. Vehicles/Property marked preview-only. Common state stays while navigating; reload/close discards input, disclosed. Next router push/replace and useSearchParams support Back/Forward without history patches/localStorage. Fixed an observed fast-click history race by waiting for URL transition before switching section presentation; rerun browser passed.

Start/repeat: `corepack pnpm preview:post-ad` (runtime graph verifier, then `next dev tools/post-ad-preview --webpack --hostname 127.0.0.1 --port 4317`). Address http://127.0.0.1:4317. Port checked free before start; server left running for user review. Installed Next 16.3.5 CLI/docs inspected; no build/install/upgrade. Browser opened via Codex panel request. Minimal package scripts added; ESLint adds only generated harness .next/next-env ignores after initial lint incorrectly traversed generated output. Preview source remains linted and explicit typechecked; production Next config/auth/proxy/routes/env/dependencies/lockfile unchanged. Next generated harness AGENTS.md/CLAUDE.md retained.

Final checks: explicit eight-file Vitest run (six existing A0/A0.1 paths plus tests/unit/post-ad-flow.test.tsx and post-ad-form-payload.test.tsx), exit 0, 8 files/131 PASS at 15:57 Europe/Copenhagen. `corepack pnpm lint`, `corepack pnpm typecheck`, `corepack pnpm typecheck:post-ad-preview`, `git diff --check` final statuses recorded below. `node tools/post-ad-preview/verify-imports.mjs`: exit 0, ten runtime local modules, no auth/actions/DB/location-service/media/sitemap/production-instrumentation imports. `node tools/post-ad-preview/browser-check.mjs`: exit 0, installed Chromium at 1280x900 and 390x844; all branch filters, placeholder, in-memory summary, confirm/cancel, common values, Back/Forward including cancellation, keyboard first-card focus, no horizontal overflow, repeated query rejection. No page errors and all requests on preview origin. Actual four screenshots and browser-results.json under gitignored artifacts/post-ad-preview/; selector-desktop.png and property-mobile.png visually inspected. Initial browser run found/fixed navigation race; second assertion was narrowed to feature alert rather than Next's route announcer. No mocked browser backend prevention used.

Not run: production build/broad suites/E2E against application/real auth/location/media/live sessions, any database/Supabase/Docker operations, migration/type generation, CSV import, deployment. Production persistence is neither wired nor verified by this preview. Remaining staging integration: verify A1-P/schema/generated types in separately approved DB scope; approve production taxonomy/readiness and Property/vehicle contracts; integrate production category/location/action adapters and enforce availability; staging auth/RLS/media/lifecycle verification. No selector activation, listing enforcement, money/moderation/security changes, commit/push/deployment or S2/S3.

Final r9 checks: Vitest 8 files/131 PASS (exit 0); lint exit 0/no findings; repository typecheck exit 0; explicit preview typecheck exit 0; runtime import graph exit 0; real Chromium browser check exit 0; git diff --check exit 0 (LF/CRLF warnings only). Production wrapper diff is confined to Details/Pricing presentation extraction and its import. Existing route/auth/proxy/actions/money code and migration/test/generated types preserved. Loopback preview remains running for review. Only previously existing selector/form/package/lint configuration and plan/progress changed in this UI build; new feature/shared fields, two tests and isolated harness added.

Final framework isolation correction: first Turbopack startup automatically discovered parent src/instrumentation.ts (logger registration only), despite the component import graph. Stopped only the exact preview Node process; selected installed supported --webpack directory mode and added a dedicated import-free harness instrumentation.ts. Restart printed only the isolated preview marker. Actual compiled middleware/proxy/function manifests have zero entries, app manifest only /page, and instrumentation bundle contains the isolated marker with no ./src/instrumentation.ts reference. Browser rerun exit 0 refreshed all four screenshots; no page errors/external browser requests. Runtime graph now ten modules and excludes production backend/instrumentation imports. No production instrumentation or config modified. The previous static-graph-only claim was insufficient; final entrypoint inspection supplies runtime isolation evidence.


## r10 — Authorized FairSwapTest Goods draft integration (2026-10-09)

**APPLICATION CODE READY FOR REVIEW; REAL GOODS DRAFT VERIFICATION BLOCKED.** Human ec6cd1f4 attachment authorizes only FairSwapTest `wpppxlnbzqynvhpeuavd`, reviewed A1-P metadata after prerequisites, real Goods integration, isolated regressions and at most two seller drafts/one image. The approved r9 visual design and separate preview are retained. No new design/planning round. Existing r1-r9 history retained. Branch `codex/post-ad-a0`, HEAD `c415d689124f405db56cbe8d7daecde7eeef1c29` unchanged.

### Actual Test preflight and migration stop

Supabase get_project verified exact ID/name FairSwapTest, ACTIVE_HEALTHY, ap-south-1, PostgreSQL 17.6.1.166. MCP list_migrations returned all 33 repository baseline versions plus THREE remote-only versions:

- `20261007153735_admin_pending_medium_download`
- `20261007153744_atomic_reviewed_moderation`
- `20261007161425_admin_pending_medium_download_info`

These source files are absent from this checkout. `20261008210921_post_ad_category_metadata` is absent remotely. No migration applied, no history repair/import/replay, no metadata columns added. The history prerequisite fails even though category definitions match. No Docker/local DB or other hosted project accessed.

Two bounded (`statement_timeout=15s`) explicit READ ONLY transactions inspected categories/attributes, category columns/checks/triggers/FKs and listing trigger metadata, not customer listings/private data. Seven categories, 13 attributes, zero metadata columns, no noninternal category/attribute triggers. All six approved slug/name/description/icon/order and attribute definitions match the immutable reviewed migration. Actual identities:

| Slug | Existing Test ID |
| --- | --- |
| electronics | fa5df00f-6de5-41d6-88f4-6660be6aba47 |
| furniture | 9b246bd0-1849-48e6-afeb-4ec69c7ffb1a |
| home-appliances | 78ce15b6-746f-4db5-a452-992067013afe |
| books | 1735ef7d-0db3-473e-ac6a-d704d99d075f |
| hobbies | 4ffd8e61-4129-45dd-89c8-9f138617f73d |
| bicycles-sports | b14656c0-e75b-4b94-a13d-255caade8a29 |

An existing unrelated `fs-test-20261007-m1` category remains untouched; no mapping guessed. Reference-only snapshot hashes: category JSON MD5 `6459ff359c3a222e1220532956e65436`; attributes JSON MD5 `830227ff4dc6372a0c42c2f21a6ceb25`. Existing category name/slug/description CHECKs, UUID PK/unique slug, attribute PK/name uniqueness and category FK, and listings category FK inspected. Listing before-insert/update, status-transition, slug-change and cover-photo trigger definitions inspected without executing their functions. No shared schema test executed. Mapping/default/CHECK preservation after migration, disposable replay and Test type generation/candidate drift review NOT RUN. Existing generated types remain byte-identical; no manual edits.

Installed CLI 2.117.0 migration list/db push --help inspected. Help supports explicit --project-ref, db push --dry-run and --skip-vault; no upgrade/link/push/list connection command executed. MCP apply_migration has no explicit source version argument, so it was not substituted for a source-aligned CLI workflow. Next required operation is to review and align the checkout with the three already-applied Test migration sources, then repeat history/reference prerequisites. Do not repair history or force the metadata migration. Any later push must dry-run as ONLY the reviewed metadata file, skip vault updates, preserve its source version and use supported bounded timeouts.

### Application changes

- `src/lib/listings/test-runtime.ts`: default-OFF, server-side activation helper; exact Test URL, consistent configured URL aliases, non-production runtime, compatible public/private credential roles/project association. Opaque modern keys additionally require operator-verified provenance marker `POST_AD_TEST_CREDENTIALS_VERIFIED=wpppxlnbzqynvhpeuavd`. This marker is a trusted deployment assertion, not independent key verification or an authorization boundary.
- `src/lib/listings/post-ad-server.ts`: server-only flag adapter, active/enabled/Goods loader, scoped attributes, separate empty/error states, server category/context validation. Metadata is parsed independently of generated types while migration/type generation is blocked. No invented database type columns.
- `new/page.tsx`: flag OFF retains original reference queries/form and A0 safe auth return; ON uses real references and the approved selector. Explicit `?entry=legacy` renders original form including bicycle/sports categories.
- `GoodsPostAdEntry.tsx` and live mode of actual `PostAdFlow.tsx`: real router/search state, strict repeated/invalid macro rejection, Goods only, unavailable Vehicles/Property, original ListingForm kept mounted across section navigation, confirmed attribute removal/common-field preservation. Preview mode/import graph remains isolated.
- `ListingForm.tsx`: Goods placeholder and blank fresh city, original Details/Pricing/PIN/location/actions, confirmed category change, no pre-save upload, same returned ID retained for a later acknowledged update, synchronous in-flight guard and disabled saving. Existing draft/submit/maintenance/INR limits and saved-listing media workflow retained. No lost-response idempotency claim.
- `actions.ts`: validate after existing maintenance/policy/authentication guards, before ordinary seller create/update. Saved-category context and owner identity determine Goods edit validation; client context cannot turn a Goods edit into legacy. No service-role seller writes, RLS changes, global direct-client enforcement or submission redesign.
- `edit/page.tsx`: Goods context derives from saved category, not query parameters; scoped Goods references, actual listing/private location/media hydration remain. Inactive Goods/reference failures fail clearly. Legacy edit remains available.

### Activation and runtime limits

No env files changed or application server started. Read-only local Next development environment inspection (using installed @next/env, with logging suppressed) found public/STAGING URLs both Test, selected opaque publishable and opaque secret, and an alternate legacy anon JWT whose decoded ref is absent. No keys/passwords printed. Current credential provenance for all aliases is not established, so the activation helper remains OFF. Do not set the provenance marker simply to bypass verification; verify the whole server-only/media configuration and remove/resolve conflicting aliases through separately approved configuration work first. Human identified an approved dedicated test account in chat; no password requested, no privileged account created, authenticated browser session not inspected/connected because the migration prerequisite blocks the requested journey.

After history/schema/type prerequisites and secure credential verification, server process variables are `POST_AD_GOODS_TEST_ENABLED=true` plus the above provenance marker for opaque keys. URL/client flags cannot activate. Intended application startup (NOT RUN): `corepack pnpm dev --hostname 127.0.0.1 --port 4318`. Intended Goods URL is `http://127.0.0.1:4318/account/listings/new?macro=goods`; it is not a running/verified application address. Existing sample-only preview remains at `http://127.0.0.1:4317`.

No synthetic drafts, photos or fixture IDs created; zero cleanup required. Real authenticated create/reload/update/same-ID/photo and live owner/non-owner RLS checks NOT RUN. Elevated reference queries and mocked permission tests are not real-role proof. No submit/publish/messages, broad tests, production build/access/activation, Git stage/commit/push, installs/upgrades or deployment.

### Executed verification (Europe/Copenhagen)

Final focused Vitest at 16:48:11: exit 0, 14 files/199 PASS. Eight prior A0/A0.1/preview/payload files plus four new Goods server/entry/page/actions files and existing seller-write-maintenance/media-uploader-parity. New tests cover default-OFF/runtime provenance, eligible filtering/scoped attributes, server category/context/owner checks, unchanged auth return, unavailable/repeated input, placeholder/no insert, in-flight duplicate guard, acknowledged same-ID update, actual action dispatch/gates, common input/attributes confirmation/cancellation and explicit legacy entry. All network/auth/action SDK interactions in these tests isolated/mocked.

`node tools/post-ad-preview/browser-check.mjs`: exit 0, preserved desktop/mobile three-branch preview, Back/Forward, keyboard, no overflow/page errors/external requests; four screenshots refreshed. This is preview evidence, not authenticated app evidence. `node tools/post-ad-preview/verify-imports.mjs`: exit 0, ten safe runtime modules. `corepack pnpm lint`, `corepack pnpm typecheck`, `corepack pnpm typecheck:post-ad-preview`: each exit 0. `git diff --check`: exit 0, LF/CRLF warnings only. Initial new UI test run had three test-harness failures (blank numeric value assertion and jsdom dialog support); corrected expectations and installed-browser dialog double; rerun passed. No weakened production assertions/guards.

Protected SHA256 comparisons against r8 inventory: generated database types, reviewed migration/schema test, proxy/A0.1 response test, strict macro helper and pnpm lockfile byte-identical. No A0 auth/proxy changes. Macro selector, shared fields, preview harness/package scripts/config remain from r9. Changes in this batch: five existing application files (new/edit routes, actions, ListingForm, PostAdFlow), three new application modules, four new focused tests and factual plan/progress appends. Production activation remains OFF and original bicycle posting route/form remain available. Whole Post Ad feature NOT complete; Vehicles/Property and production work outside scope.

## r11 — Recovered migration sources and real Test Goods verification (2026-10-09)

**REAL GOODS DRAFT VERIFIED.** This evidence supersedes the r10 migration/credential/runtime blockers; r1-r10 remain historical records. The human's 2148fcc7 continuation authorizes the three pinned source restorations, unchanged reviewed A1-P application, generated types, verified process-only Test configuration and bounded real seller journey. No application correction was needed in this continuation.

Recovered only the three r10 remote-only SQL files from `vivek2310sharma/FairSwap-Web` at commit `395151bfc98616fea70a1e1122ba37e2b8aa40b3`. Raw Git blob IDs verified respectively: `51bb286b5fa3b74231976e16a01e4f769cc24f62`, `86b336f5c01af128efd9b52bf3c264ae2d5f9be3`, `13d395980b582ac085c1c7bf28839580a6c65172`. Their original LF/no-final-newline bytes are preserved. Each Test history statement equals its source plus one LF; old CRLF runbook hashes are not canonical Git blob identities. No historical migration was replayed or marked applied.

Rediscovered only FairSwapTest `wpppxlnbzqynvhpeuavd`, ACTIVE_HEALTHY, ap-south-1, PostgreSQL 17.6.1.166. Installed CLI 2.117.0 exact-project dry-run (`db push --project-ref wpppxlnbzqynvhpeuavd --skip-vault --dry-run`) proposed ONLY `20261008210921_post_ad_category_metadata.sql`, with empty seed/role lists. Matching source/history and category prerequisites passed first. The corresponding non-dry-run applied that single unchanged version; final history has 37 entries. No include-all, history repair, seeds, roles, Vault updates or other project access. Explicit READ ONLY reference pre/postchecks used `statement_timeout=15s`. CLI push help exposed no statement/lock timeout option; no explicit DDL timeout was configured, and no migration text was changed to add one. Application completed in approximately six seconds.

Postchecks verified nullable text `macro_category` default NULL, NOT NULL boolean `new_listing_enabled` default false, and the goods/vehicles/property-or-NULL CHECK. Five reviewed Goods categories are goods/enabled; bicycles-sports remains NULL/enabled; the existing unrelated category is NULL/disabled. Existing category fields/identities (including updated_at), attributes and relevant foreign-key definitions match the pre-migration snapshot after excluding only the two new fields. The reviewed migration and destructive shared schema test remain unmodified; the latter was never run against Test.

Exact-project generated types were reviewed in a temporary candidate and accepted without manual declarations. Diff: both metadata fields in categories Row/Insert/Update; already-applied `moderate_listing_reviewed` with its verified five arguments and Json return; compact formatting of three existing seller-media RPC Args; generator removes the old BOM. No other schema drift accepted. Exact generated output was transferred unchanged.

The installed CLI's exact-project API-key operation was captured in process memory without printing keys. Existing selected public publishable and server/media secret matched enabled keys returned for Test. The conflicting alternate anon alias was cleared only in the development child, along with unused service-role/token aliases; all configured URL aliases in that child point to Test. Only after these checks, the child received `POST_AD_GOODS_TEST_ENABLED=true` and `POST_AD_TEST_CREDENTIALS_VERIFIED=wpppxlnbzqynvhpeuavd`. No environment file changed. Actual Next dev app is running on loopback `http://127.0.0.1:4318`; sample-only preview stays separate on 4317. Production remains OFF by the runtime guard. The native browser connector failed infrastructure initialization, so installed Playwright opened a dedicated visible Chromium profile. The user signed in normally; a user-scoped getUser check verified the approved dedicated seller. No password/OTP requested or privileged account created.

Actual browser Goods entry loaded five eligible real categories and Electronics attributes. Fresh fields were blank. Category/section cancellation preserved entered attributes; confirming a section change cleared category/attributes while preserving common title, price and PIN. Real PIN lookup resolved 302021 to Vaishali Nagar. Exactly ONE clearly marked synthetic draft was saved through the existing seller action, then reloaded and updated through Save Changes under the SAME returned UUID. Ordinary seller queries verified owner, draft status, category/attributes, 123400 paise for INR 1234, private PIN/landmark and exactly one listing with this run's marker. No second INSERT, submit/review/publish or messaging operation.

Exactly ONE synthetic 640x480 PNG was uploaded through the existing uploader to that same draft: POST 201, processing ready, owner media/thumbnail GET 200, thumbnail rendered at 200x200 after reload. The initial persisted cover was NULL; the existing explicit Cover action successfully set it. This is explicit cover-selection evidence, not proof of automatic first-photo cover persistence. Owner access used normal session/public credentials, not elevated credentials. Anonymous media GET 401, thumbnail GET 404 and ordinary anonymous listing select returned zero rows. A second authenticated seller was unavailable; authenticated non-owner checks NOT RUN and anonymous checks are not a substitute.

Cleanup used the existing uploader Delete operation: HTTP 200, exact media row absent and draft cover NULL. The API's storage removal is best-effort; no cleanup warning appeared in the observed server output, but independent storage-object enumeration was not performed. One unpublished draft remains because the existing seller UI/actions provide no draft-delete operation. Exact draft/media identifiers and private location evidence are in the task-local fixture manifest, outside the repository. Browser route checks separately verified legacy Bicycles & Sports remains available, Vehicles/Property are unavailable with no visible form, and repeated macro values show the selector/error without a visible form. No extra fixture was created.

Selected focused Vitest: 14 files, 199 PASS, exit 0. Lint, repository typecheck and explicit preview typecheck: exit 0. Browser helper assertions needed locator/module corrections and a wait for the asynchronous cover action; these were external verification scripts, not application defects or repository test changes. No Docker, broad suites, production build, shared destructive schema test, production access/activation, package changes, commit/push or deployment. Final whitespace and protected-file comparison recorded below. Entire Post Ad feature and authenticated non-owner acceptance remain incomplete; no Vehicles/Property implementation is claimed.

Final integrity comparison checked all 383 pre-existing source/review files: only generated types and these two evidence documents changed in r11. Three new files are exactly the recovered historical SQL sources. Reviewed A1-P SHA256 remains `469A71E156F16B0327F47E899758962117DB52302911F4CDE9525504EF8447E0`; schema test, A0/A0.1 work, application/preview implementation and lockfile are byte-identical to the r11 starting snapshot. Generated repository types match the candidate SHA256 `726566F4A7E29779957C619D6A66D353AFBAA5608B8D455C2C5CCD0011B915C0`. `git diff --check` passed (only existing LF/CRLF warnings). Branch and HEAD unchanged; no staging, commit or push.

## r13 — Saved-category read prepared; bounded session evidence (2026-10-09)

**SAVED-CATEGORY ACCESS PATCH READY FOR REVIEW.** Authoring only, under the c3774add attachment. Installed CLI 2.117.0 generated exactly `20261009163210_seller_listing_category_context.sql`. Repository search and a bounded read-only FairSwapTest function-catalog check found no conflicting public/private names. No migration or database test executed, no migration-history reconciliation, and no runtime or generated-type dependency activated.

The public `get_seller_listing_category_context(p_listing_id uuid)` is STABLE SECURITY INVOKER; its private `app_security.impl_get_seller_listing_category_context` is STABLE SECURITY DEFINER. Both have an empty fixed search_path. The implementation derives auth.uid(), rejects missing identity, and selects only the actual owned listing's category ID. Missing/non-owned/null IDs return the same `42501 / Listing unavailable`; staff membership has no override, including on direct private calls. The established owner-private location RPC and owner listing SELECT allow owner reads regardless of listing/account status; this read preserves that pattern and grants no posting rights. Definer access is needed because existing ordinary RLS hides inactive category rows and their definitions. Result keys are only category (id/name/is_active/macro_category/new_listing_enabled) and attributes (id/category_id/name/label/value_type/is_required/options/validation_rules/sort_order), ordered by sort_order/id. No listing text, private location, profile or media is returned. Empty definitions are a successful `[]`.

Atomic function-only REVOKE removes PUBLIC/anon/authenticated/service_role defaults; EXECUTE is restored only to authenticated on the wrapper and its required private call chain. Existing authenticated USAGE on app_security suffices; no schema/table/default grants or discovery policy changes. The private schema remains unexposed. No dynamic SQL or write statements in either function. PostgreSQL function owners retain their implicit owner privileges.

Authored `supabase/tests/seller_listing_category_context.test.sql` checks owner active/closed/inactive/empty references, ordinary/staff/anonymous/direct-private denial, unknown/null IDs, projection keys, discovery RLS, exact fixture preservation, function ACLs and safe search_path. Its synthetic fixture transaction rolls back; it is **NOT RUN**, reserved for separately approved disposable verification, never shared Test/Production. Isolated test-only consumer contracts validate strict Zod shapes, actual listing-ID-only RPC input, parent/duplicate definitions, empty versus failed/denied/invalid reads, retention versus new Goods assignments, create-context isolation and legacy bicycle delegation. The actual existing form test preserves entered title/description/price/location/attribute values across a validated reference refresh using mocked actions. All 17 isolated tests PASS; this is conditional consumer evidence, not proof that the unapplied RPC exists or DB authorization has executed.

### Minimal later consumer edits — not activated

1. In post-ad-server.ts, promote the reviewed minimal projection/Zod loader only after database application and real-role verification. For update, obtain it with the actual edit action listing ID using the request-scoped authenticated client. Fail closed on denied/invalid/failed context; distinguish a successful empty definitions array. Do not accept saved context from hidden fields. Use narrow Pick reference types in form/reference interfaces instead of inventing database timestamps/filter flags or manually extending generated types.
2. In the edit loader, retain its existing getUser/owner/location/media checks. Replace the saved-category ordinary-table lookup and saved-definition query with the owner context read. Merge those exact references with eligible new Goods references, deduplicating the saved category and its definitions; do not query its inactive definitions again through discovery RLS. Keep the form mounted and its initial persisted attribute values intact. Preserve legacy bicycle/sports loading.
3. At the existing create/update validation boundary, only update retaining the RPC's actual saved category ID can use retention. Every different Goods assignment must be independently loaded and meet active/enabled/Goods eligibility. Create never uses a saved-listing RPC context. Keep current maintenance/policy/authentication checks, ordinary-client writes, write RLS and submission rules. No such source edits made now.

### Bounded old-session loop — reproduced, no auth change

Preserved the affected approved profile before diagnosis. Its claims validation succeeds while authoritative getUser returns `AuthSessionMissingError`, HTTP 400. Six same-origin responses were captured without HAR, token/cookie exports or private queries:

| Request path | HTTP | Destination path |
| --- | --- | --- |
| /account/listings/<fixture>/edit | 307 | /auth/sign-in |
| /auth/sign-in | 307 | /account |
| /account | 307 | /auth/sign-in |
| /auth/sign-in | 307 | /account |
| /account | 307 | /auth/sign-in |
| /auth/sign-in | 307 | /account |

All six responses set zero cookies; cookie values stayed unchanged. No policy-review route occurred; invalid getUser prevents the page from reaching its policy/data work. Source comparison confirms the proxy auth-page redirect trusts getClaims/sub, while the account/edit page requires getUser. That inconsistent decision reproduces the bounce; the underlying reason the Auth session became unavailable is not established. Minimal later correction: require successful getUser before redirecting a claims-bearing sign-in/sign-up request to /account; a known missing/invalid session must be allowed to reach normal sign-in. Preserve current policy guards and finalizeResponse cookie propagation; do not blindly clear sessions or treat transient Auth failure as authenticated. Proposal only; proxy/auth code unchanged.

### Live ordinary second seller — bounded checks completed

Normal sign-in verified a distinct authenticated seller, zero self-readable staff_roles, active account and current policy acceptance. Fixture `00b45362-b02b-40fc-9a67-c6f9eb04863c` was verified through the owner as the authorized unpublished synthetic draft, with zero media. Non-owner direct draft SELECT, owner-private location RPC and listing_media SELECT each returned HTTP 200 with zero rows. Edit navigation returned 404 with no Save Changes button; media snapshot returned 404 LISTING_NOT_FOUND. A valid fixture-title-only direct UPDATE returned HTTP 200 with zero affected/returned rows, not a successful update. Owner before/after hashes of all granted listing columns, private-location RPC data and media rows match exactly. No private values recorded here. Initial helper checks were corrected for existing column-level privacy grants and the API's separate code field before any update probe; these were external verification assumptions, not application defects.

Asset-specific variant/cover/reorder/delete checks are **NOT RUN**: the fixture has no existing photo and this preparation did not upload one or alter a listing. No newly applied RPC live-role result is claimed. Owner/anonymous historical r11 results remain separate. Existing draft remains unchanged; no new draft/photo or cleanup. Production remains OFF. Remaining gates are reviewed disposable DB execution, later authorized migration application/consumer activation and live new-RPC verification, asset-specific security checks, and production build/deployment validation. No Docker, dependencies/env changes, production access, staging, commit, push or deployment.

Final changed-file ESLint, root typecheck and tracked/new-file whitespace checks PASS. SHA256 comparison of all 387 pre-existing source/review files found only these plan/progress appends changed; no missing files. Exactly five new source files: one migration, one authored DB test, one test-only helper and two isolated unit/form tests. All prior SQL, generated types, A0/A0.1 work, Goods/r12 corrections, runtime/preview files and dependencies remain byte-identical. Focused four-file test diff exported outside the repository for review; no staging/commit.

## r14 — Authorized retention/session build evidence (2026-10-09)

**GOODS RETENTION AND SESSION RECOVERY VERIFIED.** cb5beddb authorizes this implementation; r13 remains historical preparation evidence. CLI dry-run proposed only reviewed `20261009163210_seller_listing_category_context.sql`; applied unchanged to exact verified Test, 37→38 history. Deployed bodies/signatures, postgres owner, stable invoker/definer flags, fixed search_path and function ACLs verified. Authenticated private-schema USAGE and all inspected table/column ACLs/discovery/write RLS unchanged. Reviewed generated candidate adds only the RPC declaration versus r11/current-start types. No disposable SQL suite on shared Test, migration replay/repair, Vault/seed/role update or Docker.

Activated the documented consumer delta only within verified Test-enabled edit/update: strict runtime Zod/owner listing-ID RPC, minimal form types, deduplicated saved references/definitions without inactive discovery re-query, authoritative same-ID retention versus new assignment, create-context isolation and legacy bicycle preservation. Default-OFF/production never invokes the new RPC. The auth-page branch now requires successful request-scoped getUser before /account redirect and retains all existing cookie/cache/request-ID finalization. Missing/transient errors render normal auth; no global sign-out or manual clearing. Original affected profile changed from the captured six 307 hops to stable sign-in HTTP 200; normal owner re-sign-in then reached original draft HTTP 200.

Real checks: owner new RPC minimal keys/three existing definitions; ordinary non-staff denied 403/42501, anonymous 401/42501, unknown/non-owner uniform result/no data. Live staff non-owner **NOT RUN** (no approved session), not substituted with simulated/elevated proof. Dedicated Goods reference category `f78a79c4-328b-4584-9281-7d7d90ee5ae1` / attribute `3beebd47-a4b9-4235-8f10-4f5924b58b64` / seller draft `46e682ca-0f83-4331-b89b-8803a6396592` exercised normal create, closed and inactive reload/attribute display/update/reload under the same ID. All stay as explicitly marked leftovers: category inactive/new_listing_enabled=false, one fixture_note text definition, unpublished draft. No safe existing draft-delete operation found. Ordinary category/definition discovery returns zero rows, other-seller context denied, valid Goods action attempting the inactive category creates zero drafts. Pre-existing category/attribute hashes unchanged, with no Electronics/Bicycles/shared reference edits. Full sanitized details and helper corrections are in PROGRESS r14.

One additional synthetic photo `57d33894-4383-4ce3-b2aa-291d97d06f1a` on original authorized draft processed ready. Owner served thumb/medium/large image bytes HTTP 200. Other ordinary seller gets 404 LISTING_NOT_FOUND on actual variants and valid cover/reorder/delete operations; owner listing/private-location/media hashes unchanged across probes. Existing owner UI Delete removed its DB row/cover; original draft retained at zero media and deleted-asset API 404. Existing storage cleanup is best effort; physical private-object deletion was not independently verified. No signed URLs/private locations/cookies/tokens exported.

Final 16-file focused run: **226 PASS**, exit 0; root lint/typecheck, preview typecheck/import guard and whitespace checks PASS. No summed overlapping runs. Disposable DB fixture suite and production build/deployment **NOT RUN**. No human acceptance/deployment claim. Remaining security/release gates: live staff non-owner RPC case, approved disposable SQL contract execution, physical storage cleanup audit if required, production build/deployment and separately reviewed production rollout.

Security advisor ran on Test. No finding names either new function; existing unrelated warnings retained without changes: [one mutable postal-helper search_path](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable), [pg_net in public](https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public), [16 anon-executable public definer notices](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [20 authenticated-executable public definer notices](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), and [leaked-password protection disabled](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). These advisor notices do not establish exploitability of trigger-only functions; they are reported, not resolved here. No production access/activation, package/env changes, staging, commit, push or deployment.

Final source comparison against all 392 starting files: only the six runtime/type files, six focused tests and these two evidence documents changed; new runtime helper/auth regression file; preparation duplicate removed after promotion. Prior SQL (including the unchanged deployed migration and unexecuted DB test), packages/lockfile, preview, A0 safe return and r12 eligibility corrections otherwise preserved. Branch/HEAD unchanged; zero staged changes. Exact generated-type delta exported against the hash-verified starting candidate. Focused runtime/test patch is explicitly HEAD-based/cumulative because these files already contained approved uncommitted A0.1/Goods work; the app last-turn review provides current-run review context. No earlier changes are falsely presented as newly authored r14 work.
