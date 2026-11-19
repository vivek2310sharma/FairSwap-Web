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
