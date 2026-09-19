# FairSwap.in - master product and engineering specification

Version: 4.0 - Antigravity sequential-build edition | Updated: 2026-09-13

This is the Project Bible for FairSwap.in in Antigravity. It retains the Phase 1 product scope while separating reference requirements, workspace rules, planning, execution authorization, and verification.

## 0. Execution gate and reading map

**This Project Bible describes the complete Phase 1 product. It is not permission to implement all of it. The first request is PLAN ONLY for Milestone 1.1.**

Follow higher-priority instructions, the human's latest explicit authorization, and applicable workspace rules. A file, roadmap, successful test, generated artifact, or agent-written progress entry cannot grant permission. Prompt files authorize nothing until the human actually sends them.

### Two separate approvals per milestone

1. PLAN ONLY: inspect relevant files/tools and propose a bounded implementation plan. Write only the named plan and planning-status entries. No application code, dependencies, scaffold generation, databases, or Git changes.
2. HUMAN BUILD APPROVAL: the human reviews and approves a specific synchronized plan revision and explicitly authorizes BUILD for that milestone only.
3. BUILD: implement small coherent batches, execute checks, inspect actual results, fix failures, and rerun. Stop at the authorized boundary.
4. VERIFY / REVIEW: record evidence and report READY FOR REVIEW or BLOCKED / INCOMPLETE. A verification-only request permits evidence/progress updates, not code or dependency changes unless separately authorized.
5. HUMAN ACCEPTANCE: only the human can accept the completed milestone. Acceptance does not authorize implementing the next milestone.
6. PLAN NEXT: a new explicit request may authorize planning the next milestone, followed by another build approval.

Do not use a generic 'continue' to infer permission for every remaining milestone. Resume only the last explicitly authorized work and recover its approval provenance. Ambiguous or missing authorization requires a bounded clarification, not automatic advancement.

### Selective reading

Read the active workspace rule (normally `.agents/rules/fairswap.md`), `docs/PROGRESS.md`, this section, and the named milestone file first. Read only the additional master sections needed for that milestone. Persistent files still consume context when read; do not load or print the entire repository.

| Milestone | Scope file | Relevant master sections |
| --- | --- | --- |
| 1.1 | `docs/milestones/1.1-foundation.md` | 0-5, 14, 16-18; feature sections only for focused conceptual design |
| 1.2 | `docs/milestones/1.2-accounts-security.md` | 0-3, 6, 11-14, 16-18 |
| 1.3 | `docs/milestones/1.3-listings-moderation.md` | 0, 4-7, 9, 11-14, 16-18 |
| 1.4 | `docs/milestones/1.4-discovery.md` | 0, 4-9, 12, 15-18 |
| 1.5 | `docs/milestones/1.5-communication-safety.md` | 0, 5-6, 10-14, 16-18 |
| 1.6 | `docs/milestones/1.6-pilot-readiness.md` | Current implemented requirements, all release/security/operations criteria |

Detailed future milestone contracts are supplied for reference; they are not approved implementation plans. Create `docs/plans/<milestone>-plan.md` only when that planning task is authorized. Propose smaller batches or reviewed sub-gates for a large milestone instead of creating every feature at once.

### One durable plan, two review surfaces

`docs/plans/<milestone>-plan.md` is the durable record. Include milestone ID, plan revision (r1, r2...), scope, exclusions, file/dependency changes, prerequisites, commands, risks, and acceptance criteria. Present the same revision in Antigravity's native Implementation Plan artifact when available. Do not maintain contradictory plans.

Copy artifact review decisions back into the repository plan before build approval. If the two representations disagree, resolve the difference with the human. A material scope, dependency, privilege, or acceptance-criteria change requires a new reviewed revision. Minor fixes within the approved scope do not require an entirely new plan but must be recorded.

Record the human's actual authorization and accepted revision in progress. Never infer approval from an agent-written status. A native 'Proceed' action must not silently expand the explicit chat scope. Use the separate BUILD prompt to make intent clear. Walkthroughs summarize results; executed commands and test reports provide the evidence.

### Safe populated-root scaffolding

The existing `FairSwap` root contains valuable instructions. The final application must live there with lowercase package name `fairswap`.

Do not rely on `create-next-app .`, a generic 'Continue?' prompt, `--yes` as overwrite permission, or a blind stream of yes responses. Plan a fresh lowercase temporary scaffold directory inside the workspace, then a reviewed collision-safe transfer of application files to the root. A controlled manual setup is an alternative only when documented in the reviewed plan.

Follow `docs/BOOTSTRAP.md`: inspect the selected CLI version and options, avoid unwanted dependency installation/Git initialization/generated agent-rule files in the temporary scaffold, inventory files, preserve existing instructions and progress, set the final package name before installation, verify at the root, and clean up only the precisely identified temporary files created for this task. No wildcard copy, force overwrite, destructive sync, or deletion of existing work.

### Antigravity settings and continuity

Use one implementation conversation at a time. Activate one workspace rule as Always On through the installed IDE's rule UI. Current documentation uses `.agents/rules`; a supported legacy `.agent/rules` path is acceptable when the actual path is recorded and duplicate active rules are avoided.

Prefer Planning mode and Request Review for artifacts and terminal execution. Do not globally disable safety controls to install dependencies or read evidence. Detect the actual OS/shell and whether execution is native, WSL, or container-based. Ask for narrow installation/system permissions when needed.

Milestone 1.1 requires only a compatible Node/pnpm toolchain, project dependencies, and its test browser. No Supabase credentials, Docker, hosted services, SMS, or domain purchase. Chromium-only desktop/mobile viewport smoke tests are the baseline for 1.1. They are not a claim of Safari, Firefox, real-device, or full accessibility coverage.

Read `docs/WORKFLOW.md`, `docs/BOOTSTRAP.md`, and `docs/VERIFICATION.md` for operational details. Do not repeatedly load the full master or create unused future service stubs.

## 1. Product and anti-goals

FairSwap.in is an India-focused classifieds marketplace inspired by the general concept of local classified advertising, including DBA.dk. Create an original brand and interface; do not copy another site's logo, assets, text, or page layouts.

Core journey: a seller publishes an advertisement; a buyer finds it; they communicate; they independently arrange payment and exchange; the seller marks it sold.

The brand does not imply automated barter matching or exchange credits. Domain ownership and connection are external prerequisites, not facts to assume.

Phase 1 includes public discovery, buyer/seller accounts, listings, search, photographs, text messaging, favourites, notifications, moderation, support, privacy workflows, and operational reliability.

Phase 1 excludes shopping carts, product checkout, escrow, wallets, seller payouts, delivery, returns, buyer-protection guarantees, auctions, native apps, AI features, professional seller subscriptions, paid promotion, and public star ratings. Do not create unused tables or placeholder routes for these features.

One customer account can buy and sell. Staff permissions are separate from customer abilities.

## 2. Launch defaults

Use configurable defaults rather than blocking on nonessential product questions:

- India; INR; English interface with translation-ready copy; UTC storage and Asia/Kolkata display.
- Indian currency/number formatting. Store prices as integer paise with explicit validation and bounds.
- One pilot city. Jaipur is a development assumption only, not a hardcoded market or a claim that a launch decision has been made.
- Categories: electronics, furniture, home appliances, bicycles and sports, books, and hobbies. Exclude regulated/high-risk categories initially.
- Adults-only self-declaration as a proposed product rule, without claiming legal sufficiency or collecting unnecessary dates of birth/identity documents.
- Email/password authentication with mandatory email confirmation; Google sign-in is active in production for existing FairSwap accounts with matching verified email (`/auth/sign-in`). Google-first account registration is intentionally disabled because FairSwap signup captures required terms/privacy acceptance and 18+ age confirmation. Phone-number authentication is not implemented (Issue #12 closed as Not Planned, PR #60 closed without merge).
- Manual listing review for the pilot; configurable listing expiry, initially 30 days.
- Approximate city/locality, optional PIN code as a string; no public home address or required precise GPS.
- No monetization or purchase of listed goods through the platform in Phase 1.

Record important assumptions and unresolved launch decisions in project documentation. Do not invent business identity, contact information, regulatory approval, or a grievance officer.

## 3. Architecture and dependencies

Use Next.js App Router, React, strict TypeScript, Tailwind CSS, Lucide, and selected accessible shadcn/ui components where useful. Use React Hook Form and Zod when real forms are implemented.

Use Supabase Auth, PostgreSQL, Storage, and Realtime. Use Next.js Server Actions and Route Handlers for server work. No separate Express, FastAPI, Django, or microservice backend.

Use pnpm, Vitest/Testing Library for unit and component tests, Playwright for browser tests, and pgTAP plus authenticated local integration tests for database behavior and security. Use Chromium at desktop and mobile viewport sizes in 1.1; record a broader target-browser matrix during release planning rather than claiming untested compatibility.

Check current official documentation for version-sensitive implementation choices. Select compatible stable dependencies, pin reproducible versions through the lockfile, and document required Node/pnpm versions. Do not upgrade unrelated existing code without reason.

Install dependencies when needed. Milestone 1.1 does not need a configured Supabase client, active database, Docker runtime, or unused background-job framework.

Use SQL migrations as the future schema source of truth. Generate database types from the applied schema when one exists; never fabricate generated types during 1.1.

Prefer one organized application with modules for accounts, listings, discovery, messaging, moderation, and support. Start with PostgreSQL search; no external search cluster or speculative caching infrastructure.

Use a durable, authenticated background-processing approach supported by the selected environment. Do not introduce a separate queue vendor unnecessarily.

## 4. Visual design and experience

Create a marketplace-first experience rather than a generic startup landing page. Use an original FairSwap wordmark, a restrained green/teal accent, neutral backgrounds, accessible typography, large listing images, a clear search/location area, and a prominent posting action when functional.

Support mobile and desktop, visible focus, semantic headings, readable labels, keyboard navigation, comfortable touch targets, and reduced-motion preferences. Include intentional loading, empty, validation, error, and success states.

Reuse components actually needed by the current feature. Do not scaffold an entire unused design system.

In 1.1, a visibly labelled foundation preview is allowed: it demonstrates layout but must not impersonate a working marketplace. Disabled future actions must be explained. Do not create fake listings, fake users, fabricated statistics, or buttons that pretend to save/search/sign in.

In later milestones, replace preview states with real capabilities. No operational feature may use mock arrays or localStorage instead of Supabase. Synthetic test fixtures are permitted in clearly separated tests and development seeds only.

Do not use production font or image downloads as a hidden prerequisite for a local build. Use a system font stack initially or a properly licensed local asset without redistributing unrelated font files.

## 5. Planned interfaces and routes

The route map is a plan. Create routes only in the milestone that implements them; do not produce dozens of empty screens in 1.1.

### Public, primarily 1.4

`/`, `/search`, `/category/[slug]`, `/listing/[id]/[slug]`, `/seller/[id]`, `/help`, `/safety`, `/contact`, `/terms`, `/privacy`, `/prohibited-items`.

Listing IDs are stable. Redirect old readable slugs correctly. Public pages show only permitted fields and public listing states. Content and policy routes must contain actual approved/draft-labelled content, not fake business facts.

### Authentication and account, 1.2 onward

`/auth/sign-up`, `/auth/sign-in`, `/auth/confirm`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/mfa`.

`/account`, `/account/profile`, `/account/security`, `/account/privacy`, `/account/listings`, `/account/listings/new`, `/account/listings/[id]/edit`, `/account/favourites`, `/account/messages`, `/account/messages/[conversationId]`, `/account/notifications`, `/account/support`.

### Staff, introduced alongside each workflow

`/admin`, `/admin/listings`, `/admin/listings/[id]`, `/admin/users`, `/admin/users/[id]`, `/admin/reports`, `/admin/support`, `/admin/categories`, `/admin/locations`, `/admin/content`, `/admin/staff`, `/admin/audit`.

Staff pages require actual authorization when implemented. The 1.1 scaffold must not expose a fake authenticated admin portal.

## 6. Accounts, SSR clients, roles, and MFA

Implement confirmed email/password authentication, recovery, logout, session refresh, profile changes, security settings, and private contact information. Require confirmed authentication for listing submission and initiating conversations.

Use current official Supabase SSR patterns. Each user-initiated Server Action, Route Handler, and server-side user-data read uses a request-scoped SSR client backed by that user's cookies/session and a publishable key. Do not pass tokens through form fields or use a shared cross-user client.

Verify server-side identity with the documented token-verification APIs; do not authorize from an unverified session user object. Follow installed-version cookie and proxy/middleware conventions.

**Never use a secret/service-role client for ordinary user mutations to bypass RLS.** Elevated utilities may be introduced later for narrowly defined Auth administration or maintenance jobs. Isolate them in server-only modules, authenticate/authorize the caller or job explicitly, enforce staff assurance where relevant, validate inputs, and audit actions. They are not an error-recovery fallback.

Keep trusted status and role assignments outside user-editable metadata. Account statuses: active, suspended, deletion_pending, deleted. Check current status in trusted data access so suspension constrains existing sessions. Suspended users retain only explicitly permitted support, appeal, security, and privacy workflows.

Staff roles: administrator, moderator, support agent, content editor. Require MFA for privileged staff actions in the database/server authorization path, not only at a login screen. Bootstrap the first administrator through an explicitly authorized secure procedure, never by first-signup wins.

Phone-number authentication is not implemented (Issue #12 closed as Not Planned, PR #60 closed without merge). Never display phone verification without actual verification. Google sign-in is enabled for existing accounts only.

## 7. Listings, attributes, ownership, and moderation

Fields: stable ID, slug, seller, category, title, description, condition, price type (fixed, negotiable, free), price paise, INR, city/locality, optional PIN code, typed category values, media references/order/cover, status, creation/update/publication/expiry/sold timestamps, revision, and relevant removal metadata.

Allow incomplete drafts; submission requires complete validation. Define safe length, price, and enum limits in both server validation and critical database constraints.

Category definitions describe typed required/optional attributes and filterability. Examples: phone model/storage; furniture material/dimensions; appliance type; bicycle type/frame size; book author/language. Validate attribute values against the selected category, including category changes.

Lifecycle: draft -> pending_review -> active -> reserved -> sold. Also support rejected, paused, expired, and removed through an explicit transition matrix.

Rules:
- Derive owner from authenticated identity. Sellers cannot approve advertisements or change ownership.
- Material changes to approved text, category, price, or photographs require re-review under the documented policy.
- For the pilot, a materially edited approved listing may become non-public pending re-review; do not accidentally continue showing unreviewed changes.
- Resuming/renewing cannot bypass approval, restrictions, or expiry. A removed listing cannot be restored by seller edits.
- Reserved is informational, not an order or guarantee.
- Sold listings leave available-item search. Hidden states are not publicly retrievable through direct URLs or APIs.
- Evaluate expiry during public access, not only through a scheduled update.
- Account suspension removes that seller's listings from public availability according to a documented policy without rewriting audit history.
- Preserve justified case evidence and participant history rather than blindly cascading deletes.

Record the actor, reason, relevant revision, and timestamps for moderation. Approve only fully validated content whose required images have finished processing.

## 8. Discovery, profiles, and favourites

Implement keyword, category, city/locality, price, and condition filters; relevance/newest/price sort; stable pagination; persistent URL filters; and useful empty results.

Validate inputs, bound page sizes, index common filters and RLS lookups, and use parameterized database operations. Start with PostgreSQL full-text search. Document language behavior; do not imply complete multilingual or transliteration support without tests.

City/locality search is sufficient initially. Do not invent distance accuracy. Distance filtering belongs to a later explicit requirement.

Public profiles show minimal chosen public fields, account age, permitted verification labels, and other available advertisements. Never reveal contact addresses, private notes, or full profile-table rows by default.

Favourites are per-user and access-controlled. Do not label feedback as a verified purchase when a transaction happens off-platform.

## 9. Media storage, image optimization, and cache safety

Implement media in 1.3, not during 1.1.

Maximum defaults: eight photos, five MB each, JPEG/PNG/WebP input. Verify actual content, decode safely with pixel/resource bounds, strip unnecessary metadata, re-encode, and generate appropriate derivatives. Reject SVG and arbitrary remote fetch URLs as user uploads. Store files in Supabase Storage with identifiers and metadata in PostgreSQL.

Separate private original uploads, processed listing media, and private case evidence. Enforce owner/path constraints for read, write, overwrite, and delete. Include progress, retry, ordering, cover selection, and orphan cleanup. Never enable public-bucket retrieval for drafts or evidence.

Use current `next/image` configuration for assets eligible for optimization. Restrict `images.remotePatterns` to the exact configured project host, protocol, relevant bucket/path, and intended query behavior; never allow every `*.supabase.co` project or arbitrary URLs. Do not use deprecated `images.domains`. Local development exceptions must stay local. Use dimensions/aspect ratio, `sizes`, appropriate lazy loading, and bounded formats/qualities as required by the installed version.

Optimization does not sanitize uploaded files or provide access control. The default Next.js optimizer does not forward authentication headers and has its own cache. Do not route private originals, draft photos, case evidence, or authorization-sensitive signed URLs through that shared optimizer. For private derivatives, use an explicitly authorized no-store delivery path or short-lived direct signed URLs with optimization bypassed and documented residual access behavior. Use pre-generated responsive derivatives where necessary.

For approved listing media, choose and document a delivery design before coding, including access after removal, signed-URL lifetime, browser/CDN caching, and any invalidation limitation. Removing a listing must prevent new unauthorized delivery links. Do not promise instantaneous erasure of previously downloaded images or revocation merely because a URL expires.

Test hidden images through both Storage and any image/proxy endpoints. Do not solve a cache/access bug by making a bucket public. Disable unnecessary optimizer redirects and prohibit arbitrary image-proxy destinations where supported.

## 10. Messaging, blocking, and notifications

Implement persistent text conversations in 1.5. One conversation references one listing, its seller, and one buyer; enforce uniqueness for listing/buyer and immutable participants.

Derive sender and seller identities from trusted state. Prevent self-conversations, outsider access, participant swaps, and user impersonation. Enforce both-direction blocking and current account restrictions for new messages. Keep appropriately authorized past history available.

Include stable message pagination, conversation summaries, unread/read state, failed-send handling, deduplicated retries, and reconnect recovery. Use a sender-scoped client request ID for idempotency. Persist before reporting delivered; Realtime is an update mechanism, not the data source.

Start with RLS-protected Postgres Changes. If other Realtime channel features are adopted, implement their authorization explicitly and test outsider subscriptions. Guess-resistant channel names are not authorization.

No attachments, calls, or structured offers in Phase 1. Existing authorized conversations may continue after sold status according to the documented policy; disallow new enquiries on non-available listings.

Implement in-app notifications. Optional activity email must have a real provider boundary, delivery attempts, preferences, and truthful unavailable/failed states. Never fake a successful email. Registration emails must use the actual configured Auth/local test-mail system.

## 11. Staff workflows, reports, and support

Administrator: explicitly permitted management functions. Moderator: listing review, reports, and permitted restrictions. Support: assigned or authorized cases and appeals. Content editor: help/policy content, not private conversations or security details.

Do not provide universal private-message browsing. Case evidence access must be justified, narrowly scoped, and audited. Avoid bulk private-data exports in Phase 1.

Reports reference a listing, user, or message with validated reporter access, reason, explanation, status, assignment, and resolution. Do not expose reporter identity to the target.

Support states: open, in_progress, awaiting_user, resolved, closed. Separate user-visible replies and internal staff notes. Permit appeals and relevant safe access for suspended users.

Sensitive actions require reasons and append-only application audit records. Audit role changes, restrictions, moderation, and private-evidence access. Audit tables are not editable through ordinary staff APIs. Do not log passwords, tokens, or unnecessary full private content.

## 12. Schema, RLS, and abuse controls

Create the schema incrementally with each authorized milestone. Conceptual areas: public/private profiles, status, staff roles, categories/typed attributes, locations, listings/media/revisions, favourites, conversations/messages/read state, blocks, reports/cases/evidence access, support/replies, notifications/deliveries, content/policy versions, privacy requests, audit, job/outbox and abuse-control records.

Use appropriate foreign keys, uniqueness, checks, and indexes. Avoid redundant tables purely to satisfy a checklist. Keep public/private access separation deliberate. Document deletion and retention relationships.

Enable RLS on exposed tables and define explicit least-privilege grants. Test direct Supabase access, not just Next.js routes. Protect privileged columns using grants, trusted functions, and/or triggers; ownership of a row must not imply permission to change its moderation state, role, owner, verification, or counters.

Prefer security-invoker functions and correctly configured views. Any necessary security-definer helper must have a narrowly scoped purpose, a fixed safe search path, qualified object references, restricted execution, and internal caller validation. Avoid recursive policies and test execution roles.

Authorization must cover anonymous users, owners, other registered users, participants, suspended accounts, each staff role, and insufficient MFA assurance. Do not use unrestricted policies to silence errors.

Prevent spam, repeated reporting, over-uploading, unauthorized state transitions, unsafe redirects, XSS, and cross-site mutation abuse. Render user content as safe text initially. Bound request sizes and costs.

Server route limits alone are insufficient if equivalent direct database writes remain unrestricted. Use durable trusted quotas/limits where needed; do not rely solely on process memory or client controls. Do not hold secrets in browser-accessible variables.

## 13. Privacy, jobs, and operations

Implement account-data and deletion-request workflows with precise requester identity and status tracking. Document what is deleted, anonymized, retained, or kept as another participant's legitimate history. Auth-account deletion requires an isolated privileged operation; do not indiscriminately cascade shared conversations.

Terms, privacy, and prohibited-item content remain labelled drafts until reviewed. Collect only justified data. Public addresses are approximate. Safety guidance must not claim the platform verifies off-platform payments or guarantees transactions.

Add authenticated idempotent work for expiry, orphan cleanup, notification retries, and approved privacy processing. Track attempts, backoff, failures, and manual investigation. A failed maintenance job must not defeat privacy or listing-visibility rules.

Use separate environments where practical; secure secrets; monitor availability/errors; cap usage; and document escalation, incident handling, and rollbacks.

Back up and test recovery of database records and stored image bytes separately. Never assume one automatically includes the other. Do not claim a restore test ran without evidence.

## 14. Local development and seeds

Milestone 1.1 needs only the selected Node/pnpm toolchain and the local web scaffold. It must build and start with no Supabase credentials and no Docker. Avoid module imports that force authentication infrastructure to initialize during scaffold rendering.

From 1.2, support reproducible local Supabase via CLI/Docker. Provide configuration, migrations, local email testing, environment validation, and generated database types at the appropriate time.

Provide `.env.example` without secrets and document variables at their actual point of use. Likely names: NEXT_PUBLIC_SITE_URL, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, and server-only SUPABASE_SECRET_KEY only when genuinely needed. Respect current local/hosted key compatibility rather than inventing credentials.

Do not print secrets. Setup diagnostics must not claim services are configured when they are absent.

Introduce seed data with implemented features: synthetic sellers/buyers/staff, categories, locations, about 30 varied listings, then conversations/cases. Development fixtures must be clearly synthetic, reproducible, and local-safe; never auto-create demo accounts in production. Use licensed/local images with provenance. Seed scripts must refuse unintended remote/production targets.

If external configuration is unavailable, report relevant checks BLOCKED; do not replace real feature persistence with mocks. Ordinary isolated unit-test mocks are acceptable when their scope is explicit and they do not replace required integration tests.

## 15. SEO, metrics, performance, and accessibility

Implement public server rendering, accurate metadata, stable URLs/canonicals, sharing previews, and appropriate sitemaps with discovery in 1.4. Avoid indexing unlimited filter combinations and private routes. Access control remains mandatory regardless of indexing directives.

Prevent shared caches from serving personalized data or retaining unauthorized listing content. Bound queries, use stable pagination, index real access patterns, and test removed-content behavior.

Track useful privacy-conscious metrics: available listings, empty searches, enquiry rate, seller response, retention, report volume/resolution, and seller-reported sales. Do not represent listing asking-price totals as verified transaction volume. Exclude private-message text and unnecessary contacts from analytics.

Measure performance under stated conditions. Do not invent load-test, Lighthouse, or accessibility scores. Use responsive image sizing, bounded JavaScript, semantic forms, keyboard checks, and real mobile/desktop inspection.

## 16. Verification contract

Follow `docs/VERIFICATION.md`. Browser downloads and operating-system dependency changes are distinct approval categories; do not automatically run privileged dependency installers. After each coherent change, execute relevant checks and inspect their output. Fix and rerun before dependent work. Allow expected red-to-green test development, but do not leave unexplained failures or claim readiness from red tests.

Before review, run the authorized milestone's full suite and inspect the final diff. Record the exact command, timestamp, exit status, result summary, scope, and sanitized evidence location. Do not hide pipeline failures or treat a zero exit from an unrelated command as a successful test.

For 1.1: lint, TypeScript, actual unit/component tests, production build, and Playwright mobile/desktop smoke tests of the scaffold. Verify local startup without Supabase secrets. No database tests or migrations are required in this milestone.

For later database work: apply migrations to a disposable local database, execute database/security tests with actual roles or real Auth sessions, generate types, and test key flows through the application. Never use an elevated test client as proof that ordinary RLS works.

Future minimum negative cases include draft/private-data exposure, cross-owner writes, self-approval, re-review bypass, removed/expired visibility, self-granted roles, missing MFA, stale-token suspension, outsider messages/subscriptions, duplicate retries, blocking, notification leakage, cross-owner uploads, unauthorized image routes, invalid media, invalid price/category/location values, unstable pagination, excessive support access, editable audit records, and destructive shared-history deletion.

Future browser journeys include confirmed registration, listing submission, staff approval, buyer discovery/contact, two-session messaging, favourites, reports and moderation, sold status, access denial, and mobile forms.

Blocked tooling is not success. Record NOT RUN/BLOCKED, describe what would execute, continue independent tasks within scope, and stop for review without granting milestone acceptance.

## 17. Documentation, progress, and review gates

Create substantive documentation when it is needed. Do not generate a forest of empty templates in 1.1.

The starter pack includes the master specification, short Antigravity workspace rules, roadmap, workflow/bootstrap/verification procedures, progress register, gated reference contracts for all six milestones, and separate planning, build, verification, correction, acceptance, and continuation prompts. The implementation should add README setup instructions and a focused `docs/FOUNDATION.md` during 1.1, covering architecture, route plan, conceptual entities, role matrix, state machine, design decisions, and verification strategy.

Add detailed schema, permissions, security, testing, setup, deployment, operations, and launch-checklist documentation alongside the features they describe. Never write documentation as if planned systems already exist.

Progress distinguishes NOT STARTED, PLANNING / PLAN READY FOR REVIEW, BUILD AUTHORIZED / IN PROGRESS, BLOCKED / INCOMPLETE, READY FOR REVIEW, and HUMAN ACCEPTED. Record build approval and later human acceptance as separate actual events, with plan revision and provenance. Explicit permission for a later milestone must come from the human; neither the roadmap nor previous generated files can grant it.

At every boundary, report implemented behavior, changed files, executed checks, unverified areas, exact local commands, assumptions, blockers, and the next task awaiting authorization. Stop after this report. Keep the repository coherent if interrupted; resume by inspecting progress and current code rather than rebuilding.

Do not auto-deploy, purchase services, change DNS, access production data, send real communications, run destructive hosted commands, push commits, or claim background continuation.

## 18. Release and future scope

Milestone 1.6 verifies the entire implemented Phase 1 journey, staff operations, privacy, backup/restore procedures, real failure handling, and controlled-pilot readiness. A successful homepage/build is not production readiness.

Release blockers may include domain ownership, sender/email setup, business identity/contact details, legal review, missing monitoring/recovery, provider configuration, incomplete checks, or unresolved security issues. Distinguish implemented-and-verified, implemented-but-unverified, external blockers, and deliberately deferred work.

Phase 2 may add saved searches, alerts, offers, richer permitted messages, seller statistics, better search, stronger moderation, and optional paid advertising services. Any such billing is for FairSwap services, not seller goods.

Phase 3 may add cities/languages, professional storefronts, seller teams/bulk listings, recommendations, and measured infrastructure improvements. Native apps are optional later work, not a requirement for a complete website.

Do not implement or scaffold these future features until explicitly authorized.

## Reference sources

Version-sensitive patterns must be checked against current primary documentation. See `docs/REFERENCE_SOURCES.md` for official sources and the reasoning behind the corrected SSR, image, and agent-context rules. Product requirements above are proposed design decisions, not claims that the application already exists.
