# Post Ad combined journey acceptance

POST AD DRAFT JOURNEY ACCEPTED — remaining Test draft acceptance checks completed on 10 October 2026. Native confirmations are operator-confirmed; owner reads and catalogue hydration are automated browser observations. This is not readiness for public posting.

Checked 10 October 2026 on existing branch `codex/post-ad-a0`. Application: http://127.0.0.1:4318/account/listings/new. Existing approved ordinary owner session only; FairSwapTest project `wpppxlnbzqynvhpeuavd`. The existing Test launcher and runtime gate were inspected; configured public/staging project aliases matched, gated forms rendered, and no credentials were printed. See [runtime targeting](../../../artifacts/evidence/post-ad-journey/runtime-target.json).

## Observed defects and bounded corrections

| Finding reproduced | Correction | Evidence |
| --- | --- | --- |
| Live card descriptions included unavailable Goods examples, bicycles/accessories and sale/commercial Property. | Integrated selector copy describes current eligible Goods examples, available vehicle/monthly rental families and Test draft status. Sample preview copy remains separate. | Live selector and actual entry regression. |
| Updating vehicle model context could report a clean section while a specification remained entered. | Aggregate attributes, model context, rental declarations and society state before reporting the section dirty signal. | Actual shared entry test: colour survives route changes; Change section still confirms; cancel preserves it. |
| Known year/kilometres inserted factual zero before seller input. | Reveal blank numeric control and field-specific message; explicit entered zero kilometres remains valid. | Live before year=0; actual fields plus authoritative validator before/after tests. |
| Model search exposed technical route/lifecycle wording; Not listed text could be cleared without confirmation. | Readable route/lifecycle labels, consistent Brand/Model, explicit review requirement and confirmation covering seller text. Raw catalogue codes and eligibility remain unchanged. | Actual controlled component cancellation/confirmation tests and live new-form inspection. |
| Returning from Not listed to the same mapped route could remain stuck loading without a changed lookup dependency. | Retain the current lookup state when the query parameters are unchanged; changed parameters retain the existing refresh path. | Regression failed while Catalogue Brand stayed disabled; passes after correction. |
| Property location copy spoke about an item, buyer and pickup; shared rent labels did not identify occupant-share precisely. | Rental/viewing and owner-private society wording; rent labels reflect dwelling, advertised room, bed or occupant-share. Deposit/maintenance remain separate. | Actual location component, financial controls and real PG/Flatmates forms. |
| Owner dashboard showed eight vehicle Submit for Review buttons despite draft-only gates. | Omit buttons for the existing approved two-wheeler/Cars contract slugs. Preserve Goods and legacy category buttons. | Actual dashboard regression failed before; final live dashboard has 12 Draft labels/12 edit links/zero review buttons. Backend gates unchanged. |

Other presentation changes: readable Property detail labels, vehicle value labels, PIN code and Colour terminology, honest saving/publication notice, and form validation errors exposed as alerts. Layout, colours, hierarchy, source field order, raw catalogue values and approved semantics remain intact.

## Scenarios exercised in the real application

These were browser reads and unsaved input/navigation only. No real Save, upload, delete, Submit, publication or moderation action was clicked.

| Scenario | Outcome |
| --- | --- |
| Header Post Ad and canonical creation route | Header points to /account/listings/new. Selector appears in Goods / Vehicles / Property order. Header navigation to canonical route verified. |
| Goods Electronics | Real Goods options: Electronics, Furniture, Home Appliances, Books, Hobbies. Electronics fields and existing item pricing/location appear; no fixture overlay or Property controls. |
| Vehicle categories | Nine Motorcycle/Scooter options precede nine Cars options. No bicycle/accessory branches are enabled by preview data. |
| Property categories | Ten integrated residential monthly rental/PG/co-living paths. No sale, commercial or nightly paths exposed. |
| Invalid and repeated macro | Both show Invalid or repeated section value. In the retained DOM a blank form exists under a hidden ancestor; the inspected invalid-route save control is invisible and disabled. Actual entry regressions cover both values without a writable default. DOM element counts alone do not mean a branch is writable. |
| Goods → Vehicles; section cancel/confirm | Cancel retains entered values; confirm clears category answers. Common title, description, PIN/location and item pricing survive the designed in-form navigation. No listing creation action is triggered by selection. |
| Motorcycle → Hatchback; category cancel/confirm | Cancel retains seller Brand/Model text and year; confirm clears incompatible model/answer context, with common description/location retained. Title preservation checked visually because browser DOM tools redact title inputs. |
| Hatchback declarations | Known fuel/transmission start on their placeholders; explicit petrol/manual selections work. |
| Electric & Hybrid declarations | Known powertrain alone does not enable Known range. Explicit battery-electric permits blank Known range and deliberate zero. Other without detail disables range without deleting the entered zero; bounded detail restores the control/value. |
| Apartment → Boys PG → Flatmates | Apartment area 123.45, private synthetic society, rent 12345.67 and deposit zero entered unsaved. Category cancel retained them; confirm removed incompatible declarations/private society. PG rent 1234.50 has per-bed/month basis. Flatmates begins with explicit basis placeholder and disabled Known amount until occupant-share selected; rent 3456.78 label identifies one occupant’s share/month. Existing PG deposit control remains according to contract. |
| Back/Forward and selector return | Dirty Property Back triggers its specific clearing confirmation; cancellation restores Property URL/declarations. Confirmed selector round-trip and Back/Forward preserve intended common inputs and clear category state. No history patch or localStorage draft layer added. |
| Keyboard/focus | Custom confirmation Escape cancellation, Tab from cancel to confirm and Enter confirmation exercised. Focus ring visible on mobile controls. |
| Responsive usability | Approximately 1280px and 390px browser viewports; measured document width at or below viewport in exercised views (e.g. 1265≤1280 and 375≤390). Wrapped labels, declarations and messages usable. No seller-facing developer simulation controls; normal Next development tooling remains visible on localhost. |

During the initial combined-journey task, automated native window.confirm acceptance/cancellation for vehicle Brand/search and rental-basis changes was **NOT COMPLETED**: a Brand change timed out and the automation API exposed no active native dialog. Values remained intact. The close-out below completes live acceptance through the operator, separately from actual component tests. A later read-tab navigation encountered a browser network suspension; reopening the documented Cars route in a fresh tab in the same approved owner session succeeded. No browser security/network settings or authentication were changed.

Reference loading/error/empty and unavailable/default-OFF cases were exercised in isolated actual entry/loader tests, without changing shared Test categories. Goods empty/error cannot suppress ready Property or Vehicles. Property/Vehicle errors never fall back to Goods; shared location failures remain identified.

## Read-only saved draft checks

IDs resolved from existing verification evidence; successful editor reads used the same approved owner session, and the owner dashboard showed all its 12 entries as Draft. No owner identifiers, private society text, credentials or photo URLs exported. See [compact draft reads](../../../artifacts/evidence/post-ad-journey/draft-reads.json).

| Family and documented ID | New read-only result |
| --- | --- |
| Goods 00b45362-b02b-40fc-9a67-c6f9eb04863c | Initial vehicle-owner session returned 404, without establishing deletion or a permission defect. Close-out PASS: the operator supplied its approved owner in separate Edge; Electronics, saved Brand/Model, good condition, fixed item price ₹1,234, Photographs (0/8) and normal Submit for Review control read without mutation. |
| Two-wheeler 438dac54-669f-4ceb-9e64-7684df20c9b9 | Commuter editor opened; known year 2024 and known kilometres 0 hydrated. Close-out PASS: actual catalogue reached ready; enabled model control selected persisted ID c830937e-7f79-48b5-86da-9d063622cb53, Freedom 125 · Motorcycle / Commuter / CNG / Current, Brand Bajaj. No reselection or save. |
| Cars 9f4c95b6-b9ce-4f57-8f74-ba1d1c514452 | Vehicle/Hatchback editor; Swift catalogue context, year 2024, kilometres 0, explicit petrol/manual preserved. No review button. |
| Cars c46c41a5-7869-4b3e-954d-465c33c776ab | Electric/Hybrid editor; year/km Unknown distinct from known battery-electric, 58.3 kWh and range 0. Nexon EV model context displayed; its unresolved/review classification is established by the historical fixture evidence. |
| Property 2a1ce5e3-8c92-46c7-bc9c-908f55357591 | Rental editor; rent 12345.67/month/dwelling, deposit 23456.78 and separate maintenance 345.67 with dwelling basis preserved. Private society populated (presence only recorded). No generic item condition/price controls. |

Successful saved editors display Photographs (0/8). Source binding and actual retention tests verify MediaUploader receives the saved listing ID; no asset operation was exercised. Empty photo sections do not establish new asset-specific security evidence. Dashboard rental summaries inspected distinguish month, bed/month, advertised room/month and occupant-share/month from vehicle item prices/Free. Goods summary/submission preservation is covered by the isolated real-dashboard test and the close-out saved Goods owner read.

## Isolated payload and retention verification

Actual GoodsPostAdEntry and ListingForm with mocked actions prove Property society, financial declarations and version do not enter eventual Goods/Vehicle payloads; cleared category attributes serialize as {}. Common title/description/PIN survive. Rent never becomes item price; preserved item price never pre-fills rent. Existing exact monetary conversion and authoritative validation are unchanged.

Actual field/validator tests cover incomplete Known declarations, supported powertrain and Other detail dependencies, explicit zero, confirmations, same-route lookup readiness, saved answers, reference refresh, version/same-ID retention and media binding. Property area precision correction remains exercised through its actual validator/form tests. No duplicate mathematical implementation or database harness replay was used.

## Commands and results from the initial combined-journey task

Before implementation:

- `node node_modules/vitest/vitest.mjs run tests/unit/post-ad-goods-entry.test.tsx tests/unit/post-ad-journey-fields.test.tsx --maxWorkers=1 --minWorkers=1`: **6 failed / 25 passed**, 31 tests. [Before output](../../../artifacts/evidence/post-ad-journey/before-tests.txt).
- `node node_modules/vitest/vitest.mjs run tests/unit/post-ad-journey-dashboard.test.tsx --maxWorkers=1 --minWorkers=1`: **1 failed / 1 passed**, 2 tests. [Dashboard before](../../../artifacts/evidence/post-ad-journey/dashboard-before.txt).
- Intermediate expanded 15-file run: **1 failed / 174 passed**, exposing the unchanged-query loading defect. The final log replaces that intermediate output; the failing assertion was Catalogue Brand toBeEnabled after confirming Not listed → mapped.

Final affected suite, **15 files / 175 tests PASS**, no React act warnings:

```text
node node_modules/vitest/vitest.mjs run tests/unit/post-ad-goods-entry.test.tsx tests/unit/post-ad-journey-fields.test.tsx tests/unit/post-ad-journey-dashboard.test.tsx tests/unit/post-ad-flow.test.tsx tests/unit/post-ad-selector.test.tsx tests/unit/post-ad-form-payload.test.tsx tests/unit/property-controls.test.tsx tests/unit/property-server.test.ts tests/unit/property-area-precision.test.tsx tests/unit/car-answer-controls.test.tsx tests/unit/two-wheeler-retention.test.tsx tests/unit/post-ad-goods-edit-retention.test.tsx tests/unit/saved-category-form-preservation.test.tsx tests/unit/post-ad-locations.test.ts src/__tests__/pincode-picker.test.tsx --maxWorkers=1 --minWorkers=1
```

Final Goods description follow-up: `node node_modules/vitest/vitest.mjs run tests/unit/post-ad-goods-entry.test.tsx tests/unit/post-ad-selector.test.tsx --maxWorkers=1 --minWorkers=1` — **35 tests PASS**, [output](../../../artifacts/evidence/post-ad-journey/final-copy-tests.txt).

[Final test output](../../../artifacts/evidence/post-ad-journey/final-tests.txt). Tests use isolated action/reference mocks, not live writes.

| Command | Final result |
| --- | --- |
| node node_modules/eslint/bin/eslint.js . | PASS, zero warnings/errors after removing an unused test import. |
| node node_modules/typescript/bin/tsc --noEmit | PASS. |
| node node_modules/typescript/bin/tsc --noEmit -p tools/post-ad-preview/tsconfig.json | PASS; this is a typecheck only, not sample-preview browser acceptance. |
| node tools/post-ad-preview/verify-imports.mjs | PASS: 35 real Goods modules; 18 preview modules, existing boundaries intact. |
| git -c safe.directory='C:/Users/VivekKumar/OneDrive - Nobly A S/Documents/FairSwap' -c core.safecrlf=false diff --check | PASS; additionally zero added lines with trailing whitespace in the focused dirty-baseline diff. |

React checklist applied: existing component/server boundaries retained, no new fetch framework or dependencies, derived dirty boolean, existing lookup cancellation/retention, labels/alerts and confirmations checked. No unsolicited redesign/refactor.

**NOT RUN:** production build; database/SQL harness replay; saves/create/update; uploads/deletions; non-owner security/photo probes; submission/publication/moderation; physical-device/native-app testing; production activation/deployment. Responsive browser checks are not physical-device tests.

## Historical evidence — not re-executed here

- [Goods retention/session/media evidence in repository progress](../../PROGRESS.md), including original synthetic Goods fixture and inactive-category retention. Current isolated retention tests passed; historical external writes and non-owner probes are not new executions.
- [Two-wheeler verification](csv-mapping/Two-Wheeler-V1-Verification.md) and [Cars verification](csv-mapping/Cars-V1-Verification.md): original draft persistence, versioned catalogue and authenticated security results.
- [Property V1 report](../../../artifacts/evidence/property-v1/report.json): original owner RPC/persistence/private storage and financial authority; [Property entry/precision correction](../../../artifacts/evidence/property-entry-precision-fix/verification.md): previous isolated SQL comparison with its stub limitations.

## Remaining work

**A — current draft-journey blockers / acceptance gaps.** None remaining for this bounded close-out. Saved Goods owner read, all six operator native-confirmation checks and final two-wheeler catalogue hydration are complete. Automated native-dialog checks remain NOT RUN and are not represented as automated passes. Existing saved-version/error behavior remains covered in isolated regressions.

**B — deliberately deferred coverage.** Only the integrated real Goods references, nine two-wheeler paths, nine Cars paths and ten monthly rental/PG paths are exercised. This does not integrate all 202 CSV paths. Other vehicle families, sale/commercial/nightly Property and other CSV category/field coverage remain deferred. Source labels/order/catalogue data were not audited again or changed. Monthly intent, answer states, limits and private society handling remain approved implementation decisions, not claims derived from the CSV.

**C — production/publication prerequisites.** Vehicles/Property remain Test drafts only with existing server/database publication gates. A separately authorized submission/moderation/publication and Production-readiness milestone remains necessary; this report does not decide taxonomy, price ceilings or submission policy and does not authorize gate activation.

The requested close-out is complete. No new fixture, feature expansion or publication work is included.

## Focused diff, screenshots and preservation

[Focused source/test diff](../../../artifacts/evidence/post-ad-journey/focused.diff) compares this task against immediate pre-task file backups, preserving earlier uncommitted milestones. Eight runtime files, two existing test files and two new test files changed; the acceptance report is separate.

Six useful captures: [selector](../../../artifacts/evidence/post-ad-journey/selector-mobile.jpg), [Goods desktop](../../../artifacts/evidence/post-ad-journey/goods-desktop.jpg), [Motorcycle mobile](../../../artifacts/evidence/post-ad-journey/motorcycle-mobile.jpg), [Cars mobile](../../../artifacts/evidence/post-ad-journey/cars-mobile.jpg), [PG mobile](../../../artifacts/evidence/post-ad-journey/property-pg-mobile.jpg), [Flatmates mobile](../../../artifacts/evidence/post-ad-journey/property-flatmates-mobile.jpg). Screenshots are viewport captures of real 4318 forms with synthetic unsaved inputs. The final selector tab remains available; temporary viewport override reset.

[Preservation checks](../../../artifacts/evidence/post-ad-journey/preservation-checks.json): all 48 migration files and count unchanged; .env.local hash unchanged. No SQL, RLS, RPC, contract amount/requiredness, catalogue eligibility, reference import/category activation, retained draft/photo mutation, pricing policy or public gates changed. Goods submission behavior and prior retention/session-recovery logic preserved. No Docker, upgrade, commit, push or deployment.


## Remaining-checks close-out — 10 October 2026

POST AD DRAFT JOURNEY ACCEPTED for the implemented FairSwapTest draft scope. No remaining close-out access requirement or hydration defect. Existing deferred coverage and publication prerequisites above remain deferred.

The user-authored close-out request governed this work. Downloaded source-review.json was treated as source evidence only: its slug-only predicate reproduction did not establish a live submission bypass. The completed source audit, historical security exercises and full journey suite were not repeated.

### Dashboard correction and before/after evidence

Only runtime file src/app/account/listings/page.tsx changed. Its existing authenticated seller-filtered listing query remains limited to 100 displayed rows and now includes category_id for exact context binding. Recognized ordinary Goods/legacy relations retain their existing review control. Existing Vehicles/Property families show their draft-only availability message. A null, empty, name-only or empty-slug relation cannot establish Goods eligibility: unresolved drafts show an explicit unavailable message and no review control; lookup errors show a distinct retry message.

The existing gated Property batch also reads category_id and ignores failed/mismatched context data. Motorcycle and Cars fallbacks each make at most one gated batch read, restricted to unresolved displayed owner drafts. Returned listing/category bindings must match. Default-OFF skips gated tables; a Cars-only gate never queries disabled Motorcycle/Property tables. Failed or thrown reads do not establish a family or eligibility. No per-row RPC or elevated client was added. Existing server/database submission and publication gates were unchanged.

[Focused source/test diff](../../../artifacts/evidence/post-ad-close-out/focused.diff) compares the dashboard and its actual-component regression file against immediate pre-close-out backups, preserving all previous dirty branch work. The report is updated separately.

Before runtime correction, the expanded actual-dashboard suite reproduced **12 failures / 2 passes (14 tests)**. [Before log](../../../artifacts/evidence/post-ad-close-out/dashboard-before.txt). The same 14 cases passed after the correction, [first after log](../../../artifacts/evidence/post-ad-close-out/dashboard-after.txt). Three additional checks cover the category_id projection, thrown reads and independent Cars-only gate. Final dashboard result: **17 tests PASS**. Null/empty scenarios are isolated mocks; shared Test categories were not changed.

### Completed owner/browser and operator checks

[Compact browser record](../../../artifacts/evidence/post-ad-close-out/browser-checks.json) records actual reads at http://127.0.0.1:4318, FairSwapTest wpppxlnbzqynvhpeuavd.

| Check | Method and outcome |
| --- | --- |
| Saved Goods 00b45362-b02b-40fc-9a67-c6f9eb04863c | Automated read of the operator's approved owner Edge session: PASS. Electronics; Synthetic Test Brand; R11 headphones; good condition; fixed price ₹1,234. This is item pricing, with no rental financial controls. Normal Submit for Review control present and not clicked. |
| Goods photo section | Browser shows Photographs (0/8). Source inspection of actual ListingForm verifies MediaUploader receives initialListing.id (line 457); existing retention regressions pass. No upload/download/delete or new asset security assertion. |
| Two-wheeler 438dac54-669f-4ceb-9e64-7684df20c9b9 | Automated saved-editor read under the existing approved owner: PASS. Initial Retained Model/loading observation resolved to real catalogue ready before the final observation; model enabled, ID c830937e-7f79-48b5-86da-9d063622cb53, Freedom 125 · Motorcycle / Commuter / CNG / Current; Brand Bajaj. ID agrees with the persisted fixture context recorded in Two-Wheeler-V1-Verification.md. No mock lookup, reselection or save. |
| Brand change with selected Model | Operator-confirmed native Cancel PASS / Continue PASS. Cancel retains values; Continue clears only named information and retains unrelated details. |
| Model-search route with Not listed Brand/Model text | Operator-confirmed native Cancel PASS / Continue PASS, same retention/clearing criteria. |
| Flatmates rental-basis change with entered amount | Operator-confirmed native Cancel PASS / Continue PASS, same retention/clearing criteria. |

The operator explicitly answered “Yes, all six checks passed” to the question stating all three Cancel/Continue cases and the retention criteria, on unsaved forms with no save/upload. **Automated native confirmations: NOT RUN** because the existing browser API has no pre-registration handler and the previous attempt timed out; it was not retried or replaced with injected window.confirm. Actual-component confirmation tests use isolated mocks and are separately reported below. The successful operator pass is not an automated observation.

### Focused commands and final results

Before and first-after dashboard command:

~~~text
node node_modules/vitest/vitest.mjs run tests/unit/post-ad-journey-dashboard.test.tsx --maxWorkers=1 --minWorkers=1
~~~

Final affected regressions, **4 files / 47 tests PASS** (dashboard 17, real journey field controls 6, two-wheeler retention 19, saved Goods edit retention 5):

~~~text
node node_modules/vitest/vitest.mjs run tests/unit/post-ad-journey-dashboard.test.tsx tests/unit/post-ad-journey-fields.test.tsx tests/unit/two-wheeler-retention.test.tsx tests/unit/post-ad-goods-edit-retention.test.tsx --maxWorkers=1 --minWorkers=1
~~~

[Final output](../../../artifacts/evidence/post-ad-close-out/final-tests.txt). Isolated Supabase/action/reference mocks; no live writes. These tests exercise the actual dashboard/controls/edit boundary, not duplicate classification helpers.

| Command | Result |
| --- | --- |
| node node_modules/eslint/bin/eslint.js . | PASS, no errors/warnings. |
| node node_modules/typescript/bin/tsc --noEmit | PASS. |
| node node_modules/typescript/bin/tsc --noEmit -p tools/post-ad-preview/tsconfig.json | PASS; no sample-preview acceptance claimed. |
| node tools/post-ad-preview/verify-imports.mjs | PASS: 35 real Goods modules / 18 preview modules. |
| git -c safe.directory='C:/Users/VivekKumar/OneDrive - Nobly A S/Documents/FairSwap' -c core.safecrlf=false diff --check | PASS; focused diff has zero added trailing-whitespace lines. |

[Preservation checks](../../../artifacts/evidence/post-ad-close-out/preservation-checks.json): all 48 migration hashes/count and .env.local hash unchanged against the prior acceptance baseline. SQL, database/RLS/RPC contracts, private society permissions, financial authority, pricing policy, reference imports/category state and publication gates unchanged. Saved fixtures/photos were read only; no create/save/upload/submit/publication or ownership/role change. Goods, two-wheeler, Cars and Property retention/session-recovery implementation remains intact. No Docker, dependency upgrade, commit, push or deployment.

NOT RUN in this close-out: full historical suite/audit, production build, SQL harness/security exercise, photo operations, submission/moderation/publication, new fixtures, category activation or deployment. Stop after this bounded close-out.
