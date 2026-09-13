# Primary references and version-sensitive setup notes

Prepared 2026-09-13. Antigravity rules/settings/plan documentation, create-next-app CLI/source, Playwright browser guidance, Next Image, Supabase SSR/RLS and database-testing pages were checked for this revision. Remaining links are implementation references to recheck when their milestone is authorized. Documentation and tool flags can change: inspect the installed compatible version rather than guessing.

These references support tool behavior; the project's selected scope/approval policy is a design decision. Nothing here certifies an implemented application.

## Antigravity

- Rules: https://antigravity.google/docs/ide/rules
  Workspace rules are documented under `.agents/rules` with `.agent/rules` backward support, multiple activation modes and a 12,000-character rule-file limit. This pack keeps one short rule and asks the installed UI to persist Always On rather than inventing metadata.
- Settings: https://antigravity.google/docs/ide/settings
  Request Review controls commands; applicable allowlists/strict-mode settings affect prompts. Keep narrow file/network permissions and do not bypass protections to access evidence or install tooling.
- Artifact review: https://antigravity.google/docs/artifact-review
  Planning and review controls support a deliberate plan-review step. The project additionally uses explicit action/milestone prompts.
- Native Implementation Plan: https://antigravity.google/docs/ide/implementation-plan
  Plans are reviewable and commentable; a Proceed action can begin work. The repository plan is this project's durable record and must match the reviewed artifact.
- Walkthrough: https://antigravity.google/docs/ide/walkthrough
  Use for review summaries; retain real evidence in progress.
- Browser: https://antigravity.google/docs/ide/browser
  Browser tools can supplement local visual inspection. Availability/permissions are environment-specific and do not replace Playwright execution.

Do not infer 'permanent unlimited context' from file storage. Read only relevant requirements. Do not invent slash commands or assume every file is auto-loaded by the agent.

## Next.js

- Setup: https://nextjs.org/docs/app/getting-started/installation
  Verify supported runtime/toolchain and current App Router conventions at implementation time.
- Scaffolder: https://nextjs.org/docs/app/api-reference/cli/create-next-app
  Current options include explicit choices, skip-install, disable-git and preferences/default handling. Check selected-version help; inspect newly generated agent instruction files rather than letting defaults introduce competing rules.
- Directory checking implementation (moving upstream source): https://raw.githubusercontent.com/vercel/next.js/canary/packages/create-next-app/helpers/is-folder-empty.ts
  Directory checking has an allowlist and can report conflicts/refuse setup. This is not evidence that every nonempty folder gives an interactive Continue prompt, nor a contract for every release. The project avoids relying on either behavior by using a reviewed fresh temporary scaffold.
- Images: https://nextjs.org/docs/app/api-reference/components/image
  Use narrow current remotePatterns when images are implemented. The default optimizer has authentication/cache implications: private drafts and evidence must not become public through an image endpoint. Upload sanitization and authorization remain separate controls.

## Playwright

- Browsers and OS dependencies: https://playwright.dev/docs/browsers
  Browser binaries and system dependency installation are distinct operations; each Playwright version expects compatible binaries. Select Chromium for 1.1, and review any privileged OS changes separately. Browser caches may be outside the workspace.
- Device/viewport emulation: https://playwright.dev/docs/emulation
  Desktop/mobile viewport checks are not real-device certification. Do not accidentally select WebKit through a mobile preset while claiming Chromium-only setup; explicitly select the browser in test projects.
- Local web-server setup: https://playwright.dev/docs/test-webserver
  Configure the actual test server, readiness and lifecycle; avoid tests passing against an unrelated stale process.

## Supabase (implementation starts in 1.2)

- SSR clients: https://supabase.com/docs/guides/auth/server-side/creating-a-client
- API keys: https://supabase.com/docs/guides/getting-started/api-keys
- RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- MFA: https://supabase.com/docs/guides/auth/auth-mfa
- Local setup: https://supabase.com/docs/guides/local-development/cli/getting-started
- Database tests: https://supabase.com/docs/guides/local-development/testing/overview
- Storage access: https://supabase.com/docs/guides/storage/security/access-control
- Bucket visibility: https://supabase.com/docs/guides/storage/buckets/fundamentals
- Search: https://supabase.com/docs/guides/database/full-text-search
- Realtime authorization: https://supabase.com/docs/guides/realtime/authorization
- Optional phone auth: https://supabase.com/docs/guides/auth/phone-login

Use request-scoped SSR clients for ordinary user operations and RLS/column/function privileges for direct access. Privileged maintenance/admin clients need separate narrowly scoped authorization. Database and media recovery are distinct requirements. Recheck implementation-specific APIs, local key formats and provider prerequisites when the relevant milestone begins.

## Validation boundary

The pack author checked the instruction archive, paths, references and scope guards. No FairSwap app was executed, no user-machine prerequisite was inspected, no Supabase instance was provisioned, and no Antigravity workspace was configured by creating this pack. Application test results must be produced later in the real project.
