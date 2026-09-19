# Contributing to FairSwap-Web

Thank you for contributing to FairSwap-Web.

FairSwap is currently operated as a controlled-pilot product. Contributions should preserve the existing security, privacy, moderation, and release boundaries while keeping changes easy to review, test, and roll back.

This guide explains the day-to-day GitHub contribution workflow. It complements, but does not replace, the project authorization and review contract in `docs/WORKFLOW.md`.

## 1. Sources of truth

Before changing code, review the documents relevant to your work:

- `FAIRSWAP_SPEC.md` — product requirements, architecture, anti-goals, and security constraints.
- `.agents/rules/fairswap.md` — repository-specific operating rules.
- `docs/WORKFLOW.md` — authorization, verification, review, and acceptance process.
- `docs/ROADMAP.md` — phase boundaries and sequencing.
- `docs/PROGRESS.md` — factual implementation and verification history.
- `docs/milestones/` — milestone-level behavior and acceptance contracts.

If this guide conflicts with a higher-authority product, security, or authorization rule, follow the higher-authority rule and flag the conflict in the pull request.

## 2. Branching model

`main` is the long-lived source-of-truth branch.

Do not use a permanent development branch for routine work. Start each change from the latest `main` and use a short-lived branch.

Recommended prefixes:

- `feat/<short-description>` — new product capability.
- `fix/<short-description>` — bug or regression fix.
- `chore/<short-description>` — infrastructure, tooling, dependency, or maintenance work.
- `docs/<short-description>` — documentation-only work.
- `test/<short-description>` — test-only work.
- `security/<short-description>` — focused security hardening.

Keep one logical change per branch. Delete the branch after the pull request is merged unless there is a specific reason to retain it.

## 3. Start from current `main`

Before creating a branch:

```bash
git checkout main
git pull --ff-only
git checkout -b fix/example-change
```

Do not build new work on an old feature branch or on the historical `Phase1` branch.

## 4. Issues and scope

For non-trivial changes, use a GitHub issue to describe the problem, expected behavior, and acceptance criteria before implementation.

Pull requests should reference the relevant issue when one exists.

During the controlled pilot:

- Regressions and bugs affecting existing behavior may enter the pilot fix queue.
- Serious UX problems may be fixed when they block testing, safety, or user trust.
- New feature requests should normally remain in the Public Beta / v1.0 backlog unless separately authorized.
- Phase 2 work must not be introduced through an unrelated pilot fix.

The FairSwap GitHub Project currently supports the fields `Status`, `Work Type`, `Priority`, `Area`, `Environment`, `Phase`, and `Severity`. Project automation may populate those fields from issue metadata; avoid inventing classifications that are not supported by the issue or maintainer decision.

## 5. Development setup

Use the repository-pinned package manager:

```bash
corepack pnpm install
```

For local Supabase work:

```bash
corepack pnpm supabase start
corepack pnpm supabase db reset
```

Use only disposable/local test targets for destructive database operations unless a remote change has been explicitly authorized.

## 6. Required verification

Run checks that are relevant to the change before marking a pull request ready for review.

Baseline checks:

```bash
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm test:unit
```

For changes affecting authentication, authorization, RLS, staff access, moderation, privacy, or security boundaries:

```bash
corepack pnpm test:security
```

For browser-visible behavior or critical user journeys:

```bash
corepack pnpm test:e2e
```

For runtime, dependency, configuration, routing, or deployment-sensitive changes:

```bash
corepack pnpm build
```

Database changes should also run the relevant Supabase/pgTAP verification where applicable.

Do not weaken, skip, or delete a failing test merely to make a pull request pass. Fix the underlying behavior or explain the blocker.

## 7. Vercel Preview verification

Pull requests that affect the application should use the Vercel Preview deployment when available.

Before merge, verify the hosted behavior relevant to the change, especially for:

- authentication callbacks and cookies;
- sign-up, sign-in, recovery, and MFA;
- listing creation/editing and image upload;
- staff/admin authorization;
- moderation actions;
- public discovery and listing visibility;
- server routes that depend on Supabase connectivity;
- environment-variable-dependent behavior.

A passing local test suite does not automatically prove hosted behavior is correct.

Do not merge a deployment-sensitive change while its required preview/deployment check is failing unless the failure is understood, documented, and explicitly accepted.

## 8. Database and Supabase changes

Treat schema, RLS, functions, grants, storage policies, and authentication configuration as security-sensitive changes.

When adding a database change:

- Add a new ordered migration under `supabase/migrations/`.
- Do not rewrite an already-applied migration to change production/staging history.
- Keep RLS enabled and fail closed by default.
- Review table, column, schema, and function grants explicitly.
- Add or update security tests for permission changes.
- Preserve the two-layer RPC/security architecture where applicable.
- Verify anonymous, authenticated, owner, staff, and service-role boundaries as relevant.
- Avoid production-specific identifiers or secrets in migration files.

Any destructive or remote migration requires explicit deployment authorization in addition to code review.

## 9. Secrets and environment variables

Never commit real secrets.

Do not commit:

- `.env.local`;
- Supabase service-role/secret keys;
- database passwords or connection strings;
- SMTP credentials;
- Vercel tokens;
- GitHub tokens;
- private signing/JWT secrets;
- production-only credentials or recovery material.

Document new variables in `.env.example` using safe placeholders and clearly identify whether they are public or server-only.

Values prefixed with `NEXT_PUBLIC_` are exposed to browser code and must never contain secrets.

## 10. Media and file-upload changes

FairSwap listing media has privacy and moderation requirements.

Changes to upload or delivery behavior must preserve, as applicable:

- server-mediated upload validation;
- original-media privacy;
- derivative generation;
- content-type and image validation;
- listing ownership checks;
- moderation visibility rules;
- active/public listing restrictions;
- safe deletion and orphan handling.

Add focused tests whenever a media trust boundary changes.

## 11. Authentication and admin changes

Staff/admin behavior is security-sensitive.

Changes must preserve the distinction between:

- ordinary authenticated users;
- staff roles;
- administrator permissions;
- AAL2/TOTP requirements for staff workflows.

Normal users must not be offered staff-only MFA enrollment as a path to gaining admin access, and they must not receive admin data or content.

Authorization must be enforced server-side. UI hiding alone is not an access-control mechanism.

## 12. Pull request expectations

A pull request should be small enough to review and should explain:

- what problem it solves;
- what changed;
- what is intentionally out of scope;
- the linked issue, if applicable;
- tests/checks actually run;
- hosted/preview verification performed, if applicable;
- database or environment changes required;
- security/privacy impact;
- known limitations or follow-up work.

Do not claim a check passed if it was not run.

Keep generated output, local test artifacts, credentials, and temporary debugging files out of the commit unless they are intentionally required repository assets.

## 13. Review and merge

Routine contribution flow:

1. Branch from current `main`.
2. Make one focused change.
3. Add/update tests and documentation.
4. Run relevant local verification.
5. Open a pull request to `main`.
6. Use the Vercel Preview for hosted verification when applicable.
7. Address review findings.
8. Merge only after required checks and review are satisfied.
9. Delete the merged branch.

The maintainer decides the merge method based on the change and repository history.

Direct pushes to `main` should be avoided for routine work even if repository permissions technically allow them.

## 14. Production changes are separate

Merging code does not automatically authorize a production-side change.

The following require explicit operational authorization and verification:

- production Supabase migrations;
- production environment-variable or secret changes;
- production Auth/SMTP changes;
- DNS/domain changes;
- storage-policy changes against production;
- user/staff bootstrap or account mutation in production;
- public-launch or pilot-expansion decisions.

Keep production actions auditable and separate from ordinary source-code review.

## 15. Controlled-pilot priorities

Until the controlled pilot is completed, prefer:

1. security and authorization correctness;
2. data/privacy integrity;
3. reliable core buyer/seller/moderation flows;
4. pilot-blocking bug fixes;
5. observability and operational safety;
6. non-blocking UX improvements;
7. new features only when separately prioritized.

Avoid unrelated refactors during a critical pilot fix unless they are necessary for correctness or safety.

## 16. Documentation responsibility

Update documentation when behavior, configuration, operational procedures, or known readiness state changes.

Relevant locations include:

- `README.md`;
- `docs/PROGRESS.md`;
- `docs/ROADMAP.md`;
- `docs/operations/`;
- milestone documents and tests.

Keep readiness claims evidence-based. Distinguish local verification, hosted-preview verification, staging verification, and production verification.

## 17. Security reporting

Do not publish live credentials, tokens, private user data, exploit details against the production environment, or other sensitive operational material in a public issue or pull request description.

For security-sensitive findings, contact the repository owner/maintainer through an appropriate private channel and create only the minimum safe tracking record needed in GitHub.

---

By contributing to FairSwap-Web, you are expected to preserve the product boundaries and verification discipline that protect buyers, sellers, staff, and marketplace data.