# India Post Ad taxonomy — local candidate, 24 October 2026

The picker now has bilingual main and subcategory names, Indian search aliases, exactly five Fashion choices, Kids & Baby, distinct Flatmates, commercial godown/warehouse labels, kitchenware, expanded appliances, low-speed EV discovery and a final unavailable Other card. The UPI warning remains. Category query preselection is deferred; continuation still opens the existing form without a selected exact category.

Only exact server-loaded eligible Goods keys produce available links. Backend's forward candidate `supabase/forward-migrations/india-taxonomy/20261024213147_india_goods_taxonomy.sql` supplies 15 new ordinary Goods identities and authoritative answer/availability checks. Existing broad categories, IDs and saved edits remain intact. Attribute validation rules carrying `contract: india_goods_v1` opt into Web's Zod validation for optional draft `item_type` and `brand` strings (maximum 100 characters); database submission/publication requires a nonblank item type.

Car seats, Other, exempt EVs and commercial Property posting remain unavailable. Car-seat notices cover recalls, crash damage and missing parts; Other requires mandatory staff review and reclassification. No unsupported RC exemption or moderation capability is claimed. Existing registered EV and Property capabilities/gates are unchanged. Property forms and the Property chooser warn about fake landlords and advance/security deposits before verification.

Backend's companion `supabase/forward-migrations/india-taxonomy/README.md` contains the authoritative migration scope, EV research, future inactive Business & Industrial taxonomy, safety dependencies and release/rollback procedure. Admin's existing generic category/attribute review requires no application change for ordinary Goods; fallback activation requires a separate authorized reclassification contract and UI.

Environment variables: **None added** for staging or production. Deployment order: staging database → staging applications → production database → production applications, using isolated approved database release workspaces and focused application releases. GitHub, CI/Actions changes, hosted SQL and deployment remain ChatGPT-controlled. Existing hosted release-authority restrictions remain unresolved; local implementation is not production acceptance.

Run taxonomy unit/selector/server tests and the sibling-migration in-memory test alongside existing form, payload, saved-edit and release-boundary regressions. The SQL fixture checks validation and additive behavior only; full Supabase/RLS/worker rehearsal remains NOT RUN here. To cover these new tests in CI, ChatGPT must add a scoped test step and materialize the reviewed Backend candidate; no workflow was edited by this task.

After production deployment, inspect category availability, bilingual keyword results, retained saved drafts, unchanged family gates, unavailable safety-dependent categories, fraud warnings and validation/publication telemetry. Do not ask the owner to test before deployment.

Rollback: disable the new Goods assignments, moderate affected public/pending listings into an existing nonpublic state, restore the prior Web artifact, and preserve category IDs, drafts and database validation.

