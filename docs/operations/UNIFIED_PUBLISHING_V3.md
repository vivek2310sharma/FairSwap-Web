# Unified Publishing V3 foundation — 19 November 2026

**The requested full V3 implementation is unfinished.** This local foundation
batch changes the canonical creation page, slug/icon boundary and shared wizard
controls. Only the existing Mobile Phones, Tablets and Wearables contracts can
enter a wizard. Sixty other canonical leaves remain unavailable; no new backend
posting contract, migration or activation is included.

The chooser is `/account/listings/new`. Selecting one verified category continues
at `?category=<canonical-leaf-slug>` without a second prompt. Old `posting`,
`macro`, `entry`, mixed, repeated and invalid query variants redirect to the
chooser. The flag-off raw creation form and “Existing posting options” escape
hatch are removed. Legitimate listing edits, IndexedDB recovery and existing
session/submit/media APIs remain unchanged.

The 78-slug inventory includes only keys and parent relationships. Database RPCs
still own UUIDs, names and availability. Unknown slugs, inventory changes and
unexpected parents fail closed. The icon registry is exhaustively typed and tests
compare actual SVG geometry to reject reused glyphs and known-slug fallbacks.
Release bindings are small owner-client queries; only the selected wizard loads
its full catalogue and location data. Its catalogue UUID is checked again before
rendering. Wearables remain independent of the Phone/Tablet flags.

Shared `PostingWizard` controls preserve the existing CSS, five editable steps,
final review, free plan and keyboard semantics. Each specialist retains its own
form state, canonical validators, media ownership/frozen sessions, local recovery,
buyer preview, submit endpoint and retry behavior. No new dependency is added.

## Contract and release dependencies

The paired Backend patch includes the exhaustive 63-row contract CSV, exact
per-environment vehicle/rental subtype bindings, read-only preflight and the
remaining additive schema requirements. Its review documents why generic Goods,
accessory splits, vehicle/bicycle/EV, property sale/commercial/plot, child safety,
pet supplies/rehoming and Other cannot be enabled by flipping flags.
Dog/cat rehoming still requires legal clearance. Services and Jobs stay disabled.

Read-only hosted inspection observed 115 Test and 98 Production ledger entries,
matching 15/63 taxonomy configuration, different specialist UUIDs and intentional
lifecycle/security differences. This is schema evidence, not hosted acceptance
of these local files. No database or release operation was performed.

No migration or environment-variable change is needed for this foundation.
Existing specialist feature flags remain authoritative. Future schema preparation
must stay disabled until compatible Web is deployed and automated family/security
checks pass. ChatGPT owns Test-before-Production integration and release; do not
promote all staging changes to main. In affected posting files staging currently
adds its DigiLocker pre-check; preserve the target environment's identity behavior
when preparing a focused Production patch.

Rollback restores the prior same-environment Web artifact. No identities, saved
drafts, media, guards or ledger entries need removal. A full rollout remains
blocked by unfinished category adapters/contracts and the legal/safety gates;
this foundation must not be advertised as enabling all 63 categories.

Local automated checks and limitations are delivered separately with the patch;
hosted CI, database mutation rehearsals for new contracts, and postdeployment
acceptance are not claimed. No manual or owner predeployment testing is required.

## Batch 2 update, 19 November 2026

The canonical chooser can now open 35 Ordinary Goods leaf contracts when the
taxonomy and private release registry agree on the selected UUID. The selected
contract provides fields and safety declarations for the existing five-step
wizard. The buyer preview, INR pricing, six-digit PIN, account-bound device
draft, private photo session and frozen submission all use the selected
identity. Previous contracts and icons retain their existing routes and
rendering. The Goods wizard uses the existing storage processor and moderation
queue through its own scoped session and submit APIs.

The Backend migration installs each Goods leaf disabled. Apply compatible
Backend on Test before Web. Each leaf needs separate activation after automated
review, then independently verified Production rollout. Test has the required
identity hooks. Production was observed without them and activation is gated
until the hooks are installed and verified. No new environment variables are
needed. The 25 remaining leaves stay under the foundation plan.

## Batch 3

The shared five-step adapter supports bounded category choices for the two
Accessory leaves and the Kids and Pet Supplies leaves. The Backend installs
all ten Batch 3 definitions disabled. Baby Gear & Car Seats and Other Items
cannot open a server session. Pet Food & Accessories is limited to non-food
supplies until a sealed-food expiry contract is verified. Existing accessory
listings still use their original category and edit contract.

## Batch 4 partial implementation

Pedal Bicycles, Car Accessories & Spare Parts and Bike Accessories & Spare
Parts use the shared five-step route when the Backend permits their exact
canonical bindings. The new definitions restrict parts to selected non-safety-
critical accessories and bicycles to unpowered pedal cycles. Registered
vehicle transfers, assisted cycles and property remain outside this adapter.

## Batch 4B property intake

The same wizard offers distinct property details, authority, sale and monthly
terms for six canonical leaves after per-leaf activation. It limits location
selection to PIN and locality and asks sellers to exclude private addresses,
people and documents from copy and photos. Existing specialist drafts are
unchanged. Property intake remains disabled and cannot publish.

## Batch 4C

Commercial Vehicles and Electric Cycles & Low-Speed EVs have recoverable
draft-only wizards after compatible schema and per-leaf activation. Keep
documents and personal identifiers out of draft photos and copy. The
property preview renders Indian grouping and exactly two INR decimals,
including rent, deposit and monthly charges.

Cars and Motorcycles can use the same recoverable draft-only wizard once
activated with the exact compatible hatchback or commuter-motorcycle
reference. The draft form has no registration-number or document upload
field. Existing specialist editing flows are unchanged.
