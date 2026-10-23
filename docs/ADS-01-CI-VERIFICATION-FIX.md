# ADS-01 verification correction — 23 October 2026

Base: `a3ebb1ab6f84a642c91a1aff47b2b132d26a43ac`. Verification-only local patch; no application or database changes. This correction supersedes the runner invocation in the historical [final verification record](ADS-01-FINAL-VERIFICATION.md).

## Runner authority

The runner derives its full candidate SHA from Git HEAD in its own repository, ignoring inherited `GIT_*` overrides. Tracked application, public assets, package/lockfile and Next configuration changes fail preflight. Verification tooling can be reviewed locally without changing that candidate. After publication, check out the new published commit: its full SHA automatically becomes the required deployment SHA. No release SHA needs editing in the runner.

Before reading seller sessions, the runner requires an authenticated read from Vercel's fixed HTTPS API (`GET /v13/deployments/{hostname}?withGitRepoInfo=true&teamId=...`). It requires all of:

- Full Git-source SHA and GitHub metadata SHA equal checkout HEAD.
- FairSwap-Web repository and owner, pinned Vercel project `prj_mapIxQi99X2TDre2UuCVf4VsAjvn` and team `team_Fk8MZq6cxDXPS4ViXloT6AZW`.
- READY Preview deployment, with the supplied hostname equal to the API's immutable deployment URL. Branch aliases and Production targets are rejected.

The project/team IDs were independently inspected through the authenticated Vercel connector on 23 October. Missing/reduced metadata, non-success HTTP responses, redirects and network errors fail closed. Requests time out after 15 seconds. Raw API errors, metadata, credentials and session paths are not printed. Missing metadata credentials produce BLOCKED (exit 2); invalid evidence produces FAIL (exit 1).

Use the immutable Preview URL, public FairSwapTest key and two existing authorized seller storage states from the previous procedure. Supply `ADS01_TEST_VERCEL_TOKEN` privately through the execution environment, with the least read access needed to inspect this deployment. Never paste it into a command, document, fixture or published artifact. `ADS01_TEST_APP_VERIFIED_SHA` and `ADS01_TEST_APP_VERIFIED_PROJECT` are optional legacy veto assertions; they cannot substitute for authenticated metadata.

Vercel commit/project identity does **not** prove the deployment's Supabase environment values. Independently verify that this exact Preview uses FairSwapTest before providing seller sessions. The runner's direct Data API target and session issuer remain pinned to FairSwapTest. Hosted two-owner/browser acceptance and full posting acceptance remain separate release requirements. No hosted acceptance is claimed by these local mock and guard tests.

## Warning handling and CI

Runner tests accept empty stderr or exactly one complete deprecation-warning line from pinned Supabase SDK 2.116.0 (LF/CRLF). Additional output, duplicate warnings and unexpected errors fail. Both stdout and stderr are checked for fixture credential/session-path disclosure. Exit codes and FAIL/BLOCKED results remain asserted. No warning handler or application runtime was changed.

The existing ADS-01 CI step additionally runs the deployment-authority suite. Existing production CI checks remain intact. Remote CI verification requires ChatGPT to publish the patch; no GitHub writes were performed locally.

## Local verification

- Node 20.20.2, exact expanded ADS-01 CI selection: 7 files, 86 tests PASS, including the original six runner guards, two additional runner checks and 18 authority checks.
- Node 24.15.0, focused ADS-01/production dashboard/action/moderation/category regression selection: 13 files, 142 tests PASS.
- Lint PASS: zero errors; existing unused `c` warning in `tests/unit/production-family-submission-boundary.test.ts:86`.
- Typecheck PASS.
- Production build PASS (existing metadataBase warning and local sitemap-enrichment failure log; command exits zero).
- Isolated Playwright PASS: 8 checks covering 320/360/390/1280px navigation, counts, pagination, invalid parameters, later-tab deep links and unauthenticated access.
- Final Node 20 runner-only recheck PASS: 2 files, 26 tests after strengthening the forged-attestation and token-disclosure assertions.
- Documentation check FAIL: existing missing `../supabase/migrations/20261013235311_moderation_vault_dispatch_auth.sql` link in `docs/MOD_03A_AUTOMATIC_MODERATION.md`. No Backend files were materialized or changed for this task.

Final patch checks and exact test commands are recorded in the accompanying handoff manifest. Hosted Vercel verification for the candidate, authenticated FairSwapTest acceptance and full Goods/Cars/Two-Wheelers/Property posting flows were NOT RUN; authorized sessions and exact-candidate Test deployment access were not supplied. No production data or hosted database was accessed. The repository-wide test suite was not rerun for this verification-only correction.
