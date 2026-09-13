# FairSwap - safe scaffold and prerequisite procedure

This is a procedure for the agent, not a command to execute immediately. PLAN ONLY permits inspection and a proposal. Scaffolding and installation require BUILD approval.

## 1. Detect the actual environment

Record workspace root, OS, shell, whether execution is native/WSL/container-based, Node/npm/pnpm versions, and Git availability/status where relevant. Inspect only project-related paths. Do not dump environment variables, home directories, or credentials.

Use read-only installed-tool checks. Missing tools are proposed prerequisites, not permission for global installation. A tool-discovery command that would download an executable is not a read-only check. Consult official documentation or run an already-installed CLI's help; downloading a new CLI requires approval.

Do not solve a PowerShell script restriction by globally relaxing execution policy. Use an approved compatible invocation or request a narrowly scoped remedy. Do not run Linux package commands because the IDE happens to look familiar; inspect the execution environment.

Milestone 1.1 needs compatible Node/pnpm, project dependencies, and the approved Chromium test binary. It does NOT need Docker, a hosted Supabase project, secrets, email/SMS services, or domain configuration.

## 2. Design for a populated, capitalized project root

The existing root is `FairSwap`. Its package name will be `fairswap`. Preserve the specification, `.agents`, `docs`, `prompts`, progress, and any existing application work.

Preferred reviewed procedure:

1. Inventory existing entries, including hidden files. Record protected-file hashes or a manifest before scaffolding, distinguishing files intentionally updated later.
2. Choose a NEW lowercase temporary directory within the workspace, for example `fairswap-bootstrap-001`. Verify that the exact path does not exist; choose another fresh name if it does. Never reuse/delete somebody else's folder.
3. Inspect the selected create-next-app version's supported arguments. Specify the intended TypeScript/App Router/Tailwind/ESLint/src/import-alias/package-manager options explicitly rather than trusting stored preferences.
4. Use supported options to skip dependency installation and Git initialization in the temporary folder. Where supported, suppress generated agent-instruction files (`--no-agents-md`) to avoid competing unreviewed rules. Otherwise inventory such files and do not copy them automatically. `--yes` can choose defaults; it is not overwrite authorization.
5. Generate only into the fresh temporary location after approval. Do not start with `create-next-app .` against the populated root. If an unexpected prompt appears, stop that command safely, inspect the reason, and fix the invocation; do not feed blind yes responses or wait indefinitely.
6. Inspect the generated tree. Produce a short transfer manifest listing each intended destination and collision. Do not transfer generated `.git`, `node_modules`, `.next`, unreviewed agent rules, credentials, or generic files that overwrite existing records.
7. Copy only necessary application files into the real root. Merge `.gitignore` and relevant configuration deliberately. Any conflict with existing application code requires review rather than force overwrite. New `README.md` may be created because this pack uses `START_HERE.md` for its guide; merge a pre-existing README instead of overwriting it.
8. Set root `package.json` name to `fairswap` before installing. Check scripts and selected versions. Install reviewed dependencies at the root and keep the correct pnpm lockfile there.
9. Verify the root application, scope, and preserved instructions. There must be only one application/package at the intended root, not a lasting nested project.
10. After verification and the applicable cleanup approval, remove ONLY the resolved temporary path created by this task. Check it remains inside the workspace and is not a symlink/junction to unrelated data. No recursive wildcard deletion or directory-mirroring command. If cleanup is not approved, report its exact location and exclude the temporary tree from final build/test discovery without hiding unverified application code.

The reviewed alternative is a small manual scaffold with compatible versions and the same verification. Do not silently change to an entirely different application stack when a generator refuses a folder.

## 3. Approval categories

| Action | When permitted |
| --- | --- |
| Read project files and installed-tool versions | Planning, with normal IDE permissions |
| Create the milestone plan and planning notes | PLAN ONLY, named files only |
| Generate scaffold / install reviewed project packages | Approved BUILD, with normal terminal review |
| Download the selected Playwright Chromium binary | Approved BUILD and terminal review; describe cache location |
| Install system libraries, global tools, change OS policy | Separate explicit approval for the actual commands |
| Initialize Git or create a local commit | Separate explicit human instruction |
| Delete the exact temporary scaffold | Only after root verification and appropriate cleanup approval |
| Connect or mutate hosted Supabase / deploy / change DNS | Separate future authorization; never part of 1.1 |

Do not grant broad access to make one command pass. Package managers and browsers may use cache directories outside the repository; request the narrow permissions the real environment requires rather than claiming all writes stay in the root.

## 4. Browser binaries versus OS libraries

Once `@playwright/test` is a reviewed installed project dependency, the normal browser-only step is:

```text
pnpm exec playwright install chromium
```

Execute it only during the approved build. Keep Playwright and its downloaded browser revisions compatible. Do not automatically install Firefox and WebKit during 1.1.

On environments that require additional OS libraries, propose the exact environment-appropriate system-dependency command separately. `install-deps chromium` and `install --with-deps chromium` may change system packages and must not be hidden inside an ordinary test command or automatically approved. Use current official documentation; do not assume every Windows/macOS/Linux/WSL host needs the same changes.

Request Review pauses are intentional. Explain the pending approval once; do not treat it as a failed test or bypass it. If permissions/network support are unavailable, mark dependent checks BLOCKED and do only independent work within scope.

## 5. Version-sensitive references

Consult `docs/REFERENCE_SOURCES.md` for create-next-app, Playwright, and Antigravity documentation. Do not pin the project to a guessed latest release in these instructions; select, record, and lock compatible stable versions during the actual plan/build.
