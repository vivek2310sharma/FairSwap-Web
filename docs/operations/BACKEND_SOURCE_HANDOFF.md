# Backend source for Web Production-compatible CI

**Backend source transition — verified on Web staging 18 October 2026.** This changes only the **Web source and disposable CI**; it does not migrate databases or grant Backend deploy credentials.

FairSwap-Web production-focused change deletes 58 duplicate historical migration SQL files and 10 duplicate pgTAP SQL files from Web `main`, leaving the canonical immutable source in [FairSwap-Backend](https://github.com/vivek2310sharma/FairSwap-Backend), pinned to commit `2f26f839c3fa0ae690cf5c3795a983d62e1b6c47`.

All three Web `main` CI jobs use an ephemeral GitHub App installation token limited to read-only **Contents** access for the Backend private repository. They check out that exact pinned commit and run `node scripts/ci/materialize-backend.mjs` to reconstruct the 58 SHA-256-pinned SQL migrations and 10 Git-blob-pinned pgTAP test files inside the disposable runner before running the **existing** Web tests. Missing credentials, wrong commit, altered migration bytes, missing test files, or extra Test SQL all stop CI. The materialized files are Git-ignored; no live Supabase operations are performed.

**Local developers:** Check out the exact reviewed Backend commit separately and run `node scripts/ci/materialize-backend.mjs /absolute/path/to/pinned/FairSwap-Backend` from Web. Generated files are transient, not a deployable copy.

**Safety boundaries**
- Web retains Next.js APIs, Goods submission, media/auth/runtime integration, required Auth templates/config, and temporarily retained Edge/moderation source used by Web-only tests. Do not delete these without separately proving all consumers are migrated.
- The raw 58-file historic source directory contains Test-only category activation; **it is not the 52-version FairSwapProd ledger**. Never run `supabase db push` from a raw Web/Backend checkout against Production.
- Web GitHub App credentials are **read-only to Backend GitHub content** and are **not** Supabase deploy authority.
- Ownership transfer of *hosted* Supabase deployments is **not yet verified**. Backend release permissions must only be granted after revoking Web-specific deploy credentials (not Web runtime keys). The independent [Backend cutover draft PR #10](https://github.com/vivek2310sharma/FairSwap-Backend/pull/10) tracks this. No new deployment authority arises from removing files.

**Acceptance evidence:** [Web staging PR #159](https://github.com/vivek2310sharma/FairSwap-Web/pull/159) and green [Web CI 39115211722](https://github.com/vivek2310sharma/FairSwap-Web/actions/runs/39115211722). This specific main-based change needs its own CI and Preview checks before production merge. Never merge Web `staging` wholesale; its S1 Test email capture must remain Test-only.
