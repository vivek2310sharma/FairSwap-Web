# Tablets V2 operations

This addendum builds on [Tablets V1](TABLETS_POST_AD_V1.md). The tablet release gate, catalogue RPC revision, submission RPC, category binding and owner-scoped draft key retain their V1 identifiers.

## Posting and buyer context

Brand filters the model picker. The last brand is Other Brand, which uses its existing Other model. Every named brand has a final Other model, including during a search with no named matches. Typed identity requires 2–100 characters. Storage, RAM and connectivity stay independent of brand and model.

V2 submits `other_brand` as an empty string for known brands and as a typed name for Other Brand. The exact V1 payload can still omit it. Optional custom fields use these encodings.

| Field | Base value with Other selected | Custom value |
| --- | --- | --- |
| `storage_other` | `storage: "Not sure"` | Positive capacity with 1–4 digits in GB or 1–2 digits in TB |
| `ram_other` | `ram: ""` | Positive capacity with 1–3 digits in GB |
| `connectivity_other` | `connectivity: "unknown"` | 2–60 characters of single-line text |

Web and SQL enforce the same catalogue relationship and guard seller-entered content. SQL keeps the existing brand and model IDs, saves typed names in the listing context and uses the existing staff-review gate for fallback identity and custom specs. The strict buyer decoder accepts old and new contexts. Buyer specifications are labelled seller-declared.

## Release and recovery

- Run existing CI and the focused tests in the Backend Tablets V2 release directory and the tablet browser harness. ChatGPT owns branch, CI, and deployment work.
- Reconcile both target migration ledgers independently. Apply `20261104215253_tablets_v2_india_catalogue.sql` from a ledger-matched release bundle to FairSwapTest before deploying Web staging. Preserve `POST_AD_TABLETS_V1_ENABLED` and the existing SQL activation state. Run automated authenticated Test posting, recovery, staff visibility, media and buyer checks.
- Apply the same reviewed migration to FairSwapProd before the V2 Web production deployment. Follow with automated smoke checks and owner production verification of the deployed seller and buyer surfaces.
- The previous Web deployment can restore posting on the compatible V1 payload. Its strict buyer decoder will omit facts for V2 contexts that contain custom specification keys. For a rollback that retains those facts, redeploy the V1 posting UI with the V2 buyer decoder and its custom-field validators. Preserve all recorded context and media and use a separately reviewed forward migration for database corrections.
