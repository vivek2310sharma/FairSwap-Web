# Private Backend source for Web CI (Stage 1: 68 duplicate SQL files)

This change is **draft-only and cannot merge until acceptance checks pass**. It prepares removal of 58 duplicated migration SQL files and 10 duplicated pgTAP files from FairSwap-Web. It does **not** remove runtime imports, Web application/server actions, Auth, media routes, the staging-only S1 capture worker, or manual recovery tools.

## Trusted cross-repository source

- Canonical private repo: `vivek2310sharma/FairSwap-Backend`.
- Immutable allowed checkout commit: `2f26f839c3fa0ae690cf5c3795a983d62e1b6c47`. Any update requires an explicit new reviewed pin.
- Read-only Web CI credential: an owner-approved **GitHub App** installed on the private Backend repo with **Contents: Read** permission only; no deploy, actions:write, secrets, or administration permissions.
- On Web repository **Actions** configuration (UI, not source), set variable `FAIRSWAP_BACKEND_CI_APP_ID` and secret `FAIRSWAP_BACKEND_CI_APP_PRIVATE_KEY`. Never paste, print or commit the App private key. Installation must have explicit Backend read permission.
- Every Web CI job checks out that exact Backend commit, uses `scripts/ci/materialize-backend.mjs` to demand **58 SHA-256 pinned migrations + 10 Git blob pinned tests + matching local config**, then removes the transient Backend checkout. CI fails closed if credentials, paths, hashes, or inventory differ. Do not replace these guards with an unauthenticated URL or a public archive.
- A Web PR from a fork without the App key intentionally fails closed. Use a trusted same-repository branch for acceptance.
- No live Supabase credentials and no hosted database writes are used by materialization; local Supabase tests still run only on disposable runner databases.

## Local development

In a separate authenticated local checkout of the Backend repository, checkout `2f26f839c3fa0ae690cf5c3795a983d62e1b6c47` and verify the exact HEAD. Then, from FairSwap-Web:

```sh
node scripts/ci/materialize-backend.mjs /absolute/path/to/pinned/FairSwap-Backend
```

Only the verified SQL and pgTAP files are materialized into local Web paths. They are ignored by Git; they are never accepted as a new Web source of truth. Use local/test Supabase only. In Production, the approved 52-version ledger differs from this historical 58-file Test/local-source inventory. **Never run `supabase db push` against FairSwapProd from Web or from the raw Backend migration directory.**

## Merge / ownership gates

**GitHub App setup reported complete by the repository owner (18 October 2026).** Web Actions variable and secret were configured through the GitHub UI; their values are not stored or inspected here. This is **not yet a successful private checkout**. A controlled CI run against the pinned commit must prove that the read-only installation token works before this draft can merge.


1. Privately configure and independently verify the GitHub App's read-only cross-repo checkout and the exact pin.
2. Run Web staging CI (typecheck, unit, local Post Ad / MOD, pgTAP, RLS, PG17) and the Vercel Preview. No skipped checks; verify the Web Goods listing submission remains intact.
3. Prove all 68 duplicate SQL/test files are absent from Web Git yet available transiently for CI; the immutable Backend originals and 58-file manifest remain unchanged.
4. Inspect remaining duplicated Edge/auth/moderation files *individually*, remove only once runtime/CI consumers are migrated or intentionally kept.
5. Separately complete hosted backend deployment ownership: inventory manual/Web deploy secrets and authority; revoke Web backend deployment rights **and verify** before granting Backend deploy authority. Keep Web runtime Supabase keys and Vercel deployment permission as needed for normal listing APIs.
6. Nothing here authorizes changes to FairSwapProd/ Test, Web production promotion, Edge deployment, Vault or category activation. Keep staged Test-only S1 capture isolated.

See [Web Issue #157](https://github.com/vivek2310sharma/FairSwap-Web/issues/157) and [Backend deployment ownership](https://github.com/vivek2310sharma/FairSwap-Backend/blob/main/docs/operations/DEPLOYMENT_OWNERSHIP.md).
