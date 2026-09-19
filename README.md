# FairSwap.in

> India-focused peer-to-peer classifieds marketplace foundation.

FairSwap.in is a hyperlocal discovery and communication platform enabling buyers and sellers to arrange direct, in-person exchanges within their local communities.

---

## Current Status: Controlled Production Pilot

* **Phase 1 Implementation**: **COMPLETE & VERIFIED** across all Milestones (1.1 through 1.6).
* **Controlled Production Pilot**: **TECHNICALLY OPERATIONAL** on `https://fairswap.in`, deployed from `main` and connected to the dedicated **FairSwapProd** Supabase project (`kriuhwppxgxsyyrbjsau`). The immutable production-pilot baseline is tagged `prod-pilot-baseline-2026-09-18` at commit `a81b0a5e3c77172e9f691462cac0cecb21a86723`.
* **Authentication**: Primary authentication is email/password with mandatory email confirmation. Google sign-in is live in production for existing FairSwap accounts with matching verified email (`/auth/sign-in`); FairSwap does not use Google-first signup because registration requires explicit acceptance of legal policies and age confirmation. Phone-number authentication is **not implemented**; Issue #12 was closed as Not Planned and PR #60 was closed without merge.
* **Legal & Grievance Policies**: Published and promoted to production on 2026-09-19 (PR #56), including Terms of Service (`/terms`), Privacy Policy (`/privacy`), Acceptable Use Policy (`/acceptable-use`), Safety Guide (`/safety`), mandatory 18+ age declaration, pilot policy re-acceptance (`/auth/reaccept-policies`), and the statutory Grievance Redressal mechanism (`/grievance`, Grievance Officer: Vivek Kumar) with conditional Rule 3A / GAC appeal guidance.
* **Operational Monitoring & Posture**: UptimeRobot HTTP/keyword monitoring and Cloudflare Universal SSL alerts are active. Production transactional-email failure monitoring is active and verified end-to-end via signed Resend webhooks (`POST /api/monitoring/resend`) routed to an operations Slack webhook sink. Single-operator operational risk (Vivek Kumar as sole operator, no backup owner) and the Supabase Free tier backup/PITR gap were explicitly accepted by the Platform Owner under Issue #41 on 2026-09-19. Additional monitoring gaps (5xx, client errors, Supabase DB/storage/realtime metrics, auth spike alerting, DNS-specific monitoring) were closed by owner risk acceptance under #41 rather than technical implementation.
* **Stable Staging**: `staging` deploys to `https://fair-swap-git-staging-fairswap.vercel.app` and connects to **FairSwapTest** (`wpppxlnbzqynvhpeuavd`). The stable staging domain is shareable with testers without Vercel project access; ordinary feature previews remain protected by default.
* **Development Workflow**: Routine work starts from the latest `staging`, uses short-lived branches, is verified against **FairSwapTest**, merges back into `staging` for shared integration testing, and promotes from `staging` to `main` via dedicated production release PRs. Targeted production releases from `main` are reconciled back into `staging`.
* **Historical Hosted Baseline**: The accepted staging reference remains preserved by tag `hosted-phase1-baseline-2026-09-18`. The former long-lived `Phase1` branch has been retired.
* **Public Production Launch**: **NOT YET CERTIFIED**. Wider public launch remains gated by deferred business items and operational items documented below and in the [Go/No-Go Release Report](docs/release/1.6-go-no-go-report.md).
* **Phase 2**: **NOT STARTED / NOT AUTHORIZED**. Planning or implementation begins only after explicit human authorization.

### Deployment topology

| Purpose | Git branch | Vercel target | Supabase target |
|---|---|---|---|
| Production pilot | `main` | `https://fairswap.in` | `FairSwapProd` (`kriuhwppxgxsyyrbjsau`) |
| Shared staging | `staging` | `https://fair-swap-git-staging-fairswap.vercel.app` | `FairSwapTest` (`wpppxlnbzqynvhpeuavd`) |
| Feature development | short-lived `feature/*` | Vercel Preview | `FairSwapTest` (`wpppxlnbzqynvhpeuavd`) |

---

## Technology Stack

The platform is built using the following core technologies directly configured in this repository:

| Layer | Technology | Details |
|---|---|---|
| **Framework & App** | [Next.js](https://nextjs.org/) `16.3.5` | App Router, Turbopack, React Server Components, Server Actions |
| **UI Library** | [React](https://react.dev/) `19.2.8` | Modern hooks, concurrent rendering, dynamic form state |
| **Language** | [TypeScript](https://www.typescriptlang.org/) `5.x` | Strict typing, no implicit any (`tsc --noEmit`) |
| **Styling & Design** | [Tailwind CSS](https://tailwindcss.com/) `v4` | Modern CSS tokens, dark mode, responsive utility layer |
| **Icons** | [Lucide React](https://lucide.dev/) `0.525.0` | Accessible iconography |
| **Validation** | [Zod](https://zod.dev/) `3.24.2` | Runtime request and schema boundary validation |
| **Form Handling** | [React Hook Form](https://react-hook-form.com/) `7.88.0` | Performant client form state and validation integration |
| **Database & Auth** | [Supabase](https://supabase.com/) | PostgreSQL 15, Direct-API Row-Level Security (RLS), GoTrue Auth, Realtime streaming |
| **Client Libraries** | `@supabase/ssr` `0.12.7`, `@supabase/supabase-js` `2.116.0` | Request-scoped SSR cookie auth clients with trust boundaries |
| **Media Processing** | [Sharp](https://sharp.pixelplumbing.com/) `0.35.4` | Server-side WebP conversion and derivative generation (thumb, medium, large) |
| **Unit Testing** | [Vitest](https://vitest.dev/) `3.2.4` | Fast unit, component, media, observability, and security test runner |
| **E2E Testing** | [Playwright](https://playwright.dev/) `1.52.0` | Multi-viewport Chromium browser journey tests (desktop 1280px, mobile 360px) |
| **Linting** | [ESLint](https://eslint.org/) `9.x` | Flat configuration (`eslint.config.mjs`) with Next.js core web vitals rules |
| **Package Manager** | [pnpm](https://pnpm.io/) `10.12.1` | Pinned via Node.js Corepack |

---

## Phase 1 Feature Summary (Milestones 1.1–1.6)

- **Milestone 1.1 — Foundation**: Responsive design system, Tailwind CSS v4 token hierarchy, system font stack, accessible landmark layouts, and multi-viewport test harnesses.
- **Milestone 1.2 — Accounts & Security**: PostgreSQL schemas, Direct-API RLS policies, two-layer security RPCs (`SECURITY INVOKER` wrappers delegating to unexposed `SECURITY DEFINER` implementations), customer auth journeys (sign-up, email confirm, sign-in, recovery, TOTP MFA), Google sign-in for existing accounts with verified email, AAL2-gated staff portal, and privacy request intake.
- **Logging & Monitoring Baseline**: Zero-dependency structured JSON logger, recursive PII redactor, W3C/UUID request correlation, Next.js 16 instrumentation, client-error ingestion telemetry, and signed Resend transactional-email failure monitoring webhook bridge.
- **Milestone 1.3 — Listings & Moderation**: Category and location hierarchies, seller listing lifecycle (`draft`, `pending_review`, `active`, `paused`, `reserved`, `sold`, `expired`, `rejected`), material-edit re-review policies, private Supabase Storage pipeline with Sharp WebP derivatives, staff moderation queue, and automated expiry/cleanup maintenance scripts.
- **Milestone 1.4 — Public Browsing & Discovery**: Full-text PostgreSQL search with GIN index, public discovery RPC with composite filters, canonical listing detail views with slug history redirects, anonymous WebP media delivery, authenticated favourites, and truthful static policy pages.
- **Milestone 1.5 — Communication & Safety**: Direct persistent buyer-seller messaging with Realtime streaming, bidirectional user blocking, report intake and staff resolution, support ticketing and appeals, in-app notifications, and GDPR/DPDP privacy fulfillment (sanitized export and account deletion preserving counterparty history).
- **Milestone 1.6 — Release Hardening & Pilot Readiness**: Staff user management portal (`/admin/users`), user suspension/reinstatement cascading to listings, automated disaster recovery scripts (database dump and storage backup/restore verification against disposable targets), reliability/idempotency tests, WCAG AA contrast audit, operational runbooks, and evidence-based Go/No-Go release assessment.
- **Public Beta Legal & Grievance Policies (Post-1.6)**: Terms of Service, Privacy Policy, Acceptable Use, Security disclosure, mandatory 18+ age declaration audit, pilot policy re-acceptance, and statutory Grievance Redressal mechanism (`/grievance`, designated Grievance Officer Vivek Kumar) with conditional Rule 3A / GAC appeal guidance.

---

## Phase 1 Verification Baseline

The Phase 1 completion baseline was executed and verified against commit `79026f28e893f340a7da06e16e00d2f2836013cb`:

| Verification Gate | Test Command | Result | Scope / Coverage |
|---|---|---|---|
| **TypeScript Types** | `corepack pnpm typecheck` | **PASS** | 0 type errors across all application code, components, and scripts |
| **Static Analysis** | `corepack pnpm lint` | **PASS** | 0 errors, 0 warnings across flat ESLint configuration |
| **Unit & Component Tests** | `corepack pnpm test:unit` | **PASS** | 21 test files, 173 tests passing (100%) |
| **Security & RLS Invariants** | `corepack pnpm test:security` | **PASS** | 5 test files, 85 tests passing (RLS denial, AAL2, moderation, bootstrap) |
| **Production Build** | `corepack pnpm build` | **PASS** | 41 Next.js App Router routes compiled cleanly with Turbopack |
| **End-to-End Browser Journeys** | `corepack pnpm test:e2e` | **PASS** | 84 browser tests passing across desktop (1280px) and mobile (360px) |
| **Database Backup** | `corepack pnpm tsx scripts/backup-database.ts` | **PASS** | Full `pg_dump` with SHA-256 checksum manifest |
| **Storage Backup** | `corepack pnpm tsx scripts/backup-storage.ts` | **PASS** | 120/120 storage objects backed up with SHA-256 checksums |
| **Restore Verification** | `corepack pnpm tsx scripts/verify-restore.ts` | **PASS** | Restored dump into disposable target `fairswap_restore_test` (11 tables, row counts match, zero orphans); 120/120 storage objects restored and 100% SHA-256 matched; clean disposable teardown |

*Note: These metrics reflect the official Phase 1 completion baseline. Future milestones may add or adjust test suites as features expand.*

---

## Getting Started

### Prerequisites

- **Node.js**: `v20.x` or higher (verified on `v24.15.0`)
- **Package Manager**: `pnpm` (pinned via Corepack to `10.12.1`)
- **Docker**: Docker Desktop or Docker engine for local Supabase services
- **Operating System**: Windows, macOS, or Linux

### Installation

Clone the repository and install dependencies using Corepack:

```bash
corepack pnpm install
```

### Local Supabase Stack

FairSwap uses the local Supabase CLI for database, authentication, and private storage:

```bash
# Start local Supabase containers (PostgreSQL, GoTrue Auth, Storage, Inbucket/Mailpit email)
corepack pnpm supabase start

# Apply all migrations and reset the local database
corepack pnpm supabase db reset

# Seed synthetic marketplace listings for local development (fail-closed to localhost)
corepack pnpm tsx scripts/seed-listings.ts

# Optional: Bootstrap a local administrator with full staff privileges
corepack pnpm bootstrap:admin --email=admin@example.com
```

### Running Locally

```bash
# Start the local Next.js development server on http://localhost:3000
corepack pnpm dev

# Build the production bundle
corepack pnpm build

# Start the production server on http://localhost:3000
corepack pnpm start
```

---

## Verification & Operational Scripts

| Command | Description |
|---|---|
| `corepack pnpm dev` | Starts Next.js development server with hot reload |
| `corepack pnpm build` | Compiles production Next.js App Router bundle via Turbopack |
| `corepack pnpm start` | Starts compiled Next.js production server |
| `corepack pnpm lint` | Runs ESLint flat configuration across the codebase |
| `corepack pnpm typecheck` | Runs strict TypeScript compiler verification (`tsc --noEmit`) |
| `corepack pnpm test:unit` | Executes Vitest unit, component, media, and reliability tests |
| `corepack pnpm test:security` | Runs direct-API RLS invariant and security test suites |
| `corepack pnpm test:e2e` | Runs Playwright desktop and mobile end-to-end journeys |
| `corepack pnpm supabase test db` | Runs database pgTAP schema, RLS, and security assertions |
| `corepack pnpm bootstrap:admin` | Bootstraps a local user as staff administrator |
| `corepack pnpm tsx scripts/check-expired-listings.ts` | Runs scheduled expiry scan for active listings |
| `corepack pnpm tsx scripts/cleanup-orphan-media.ts` | Cleans up technical orphan and stale media records |
| `corepack pnpm tsx scripts/seed-listings.ts` | Populates local environment with 30 synthetic listings |
| `corepack pnpm tsx scripts/backup-database.ts` | Generates full database dump with SHA-256 manifest |
| `corepack pnpm tsx scripts/backup-storage.ts` | Backs up storage bucket objects with SHA-256 manifest |
| `corepack pnpm tsx scripts/verify-restore.ts` | Verifies database and storage restoration in disposable targets |

---

## Environment Configuration

Local development uses Supabase CLI credentials pre-configured in `.env.local`:

```ini
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
```

The server-side service role key is strictly isolated to server Route Handlers and operational background scripts requiring elevated permissions (e.g. private Storage derivative operations and maintenance jobs). It is never exposed to client bundles or browser code.

---

## Documentation & Runbooks

Detailed architectural, operational, and milestone documentation is maintained in the `docs/` directory:

### Roadmap & Specifications
- [Complete Phased Roadmap](docs/ROADMAP.md) (`docs/ROADMAP.md`) — High-level milestone roadmap, staging bridge, and phase sequencing.
- [Implementation Progress](docs/PROGRESS.md) (`docs/PROGRESS.md`) — Official milestone register, verification logs, and review history.
- [Architecture & Foundation Design](docs/FOUNDATION.md) (`docs/FOUNDATION.md`) — System boundaries, route map, data models, entity relationships, and state transitions.
- [Project Bible & Core Rules](.agents/rules/fairswap.md) (`.agents/rules/fairswap.md`) — Foundational pilot principles and non-negotiables.

### Milestone Specifications
- [Milestone 1.1 Foundation](docs/milestones/1.1-foundation.md)
- [Milestone 1.2 Accounts & Security](docs/milestones/1.2-accounts-security.md)
- [Milestone 1.3 Listings & Moderation](docs/milestones/1.3-listings-moderation.md)
- [Milestone 1.4 Discovery](docs/milestones/1.4-discovery.md)
- [Milestone 1.5 Communication & Safety](docs/milestones/1.5-communication-safety.md)
- [Milestone 1.6 Pilot Readiness](docs/milestones/1.6-pilot-readiness.md)

### Operations & Runbooks
- [Go/No-Go Release Report](docs/release/1.6-go-no-go-report.md) (`docs/release/1.6-go-no-go-report.md`) — Original Milestone 1.6 controlled-pilot assessment and pre-production baseline.
- [Public Beta Operations Readiness](docs/operations/public-beta-operations-readiness.md) (`docs/operations/public-beta-operations-readiness.md`) — Authoritative launch readiness matrix, monitoring status, and owner risk-acceptance decisions under #41.
- [Operational Owner Matrix](docs/operations/operational-owner-matrix.md) (`docs/operations/operational-owner-matrix.md`) — Single-operator ownership model and access controls.
- [Deployment Guide](docs/operations/deployment-guide.md) (`docs/operations/deployment-guide.md`) — Staging and production deployment procedures and rollback protocols.
- [Backup & Restore Runbook](docs/operations/backup-restore-runbook.md) (`docs/operations/backup-restore-runbook.md`) — Disaster recovery objectives, staging verification, and production backup posture.
- [Incident Response Runbook](docs/operations/incident-response-runbook.md) (`docs/operations/incident-response-runbook.md`) — Incident classification, containment playbooks, and CERT-In/DPDP protocols.
- [Grievance Handling Runbook](docs/operations/grievance-handling-runbook.md) (`docs/operations/grievance-handling-runbook.md`) — Statutory grievance handling workflow and conditional GAC appeals under #37.
- [Staff Handbook](docs/operations/staff-handbook.md) (`docs/operations/staff-handbook.md`) — Moderator guidelines and user account actions.
- [Tabletop Incident Simulation (2026-09-19)](docs/operations/tabletop-simulation-2026-09-19.md) (`docs/operations/tabletop-simulation-2026-09-19.md`) — Recorded credential-leak and rollback drill.

---

## Public Launch Prerequisites

The controlled production pilot is technically operational. Infrastructure, legal, and operational gates completed to date include:

- **Production transactional email**: custom Supabase SMTP configured through Resend using the verified `auth.fairswap.in` sending domain (2026-09-18).
- **Production domain & TLS**: `fairswap.in` and `www.fairswap.in` routed to Vercel with HTTPS/TLS active (2026-09-18).
- **Statutory Grievance Redressal**: published `/grievance` page with designated Grievance Officer Vivek Kumar and conditional Rule 3A / GAC appeal guidance (PR #56, 2026-09-19).
- **Public Beta Legal Policies**: Terms of Service (`/terms`), Privacy Policy (`/privacy`), Acceptable Use (`/acceptable-use`), Safety Guide (`/safety`), 18+ age declaration audit, and pilot policy re-acceptance flow live in production (PR #56, 2026-09-19).
- **Production Transactional-Email Failure Monitoring**: verified end-to-end via signed Resend webhooks (`/api/monitoring/resend`) delivering sanitized failure alerts to the operations Slack webhook (PR #54, verified under #41 on 2026-09-19).
- **Google Sign-In**: released to production for existing FairSwap accounts with matching verified email (PR #61, 2026-09-19).
- **Operational Risk Acceptance (Issue #41)**: on 2026-09-19, the Platform Owner explicitly accepted the residual risks of operating as a single operator (no backup production owner), running on Supabase Free without managed backups or PITR, and omitting additional automated alerting channels (5xx, client errors, DB/storage metrics, auth spikes, DNS-specific probes).

**Public production launch is still not certified.** Remaining external business and compliance gates include:

1. **Intermediary & E-Commerce Legal Applicability**: Finalize legal counsel classification (deferred items recorded in closed Issue #38; formal IT Rules / Consumer Protection E-Commerce applicability).
2. **Grievance Acknowledgement Delivery**: Verify outbound grievance email acknowledgement identity and delivery from `grievance@fairswap.in` (deferred item recorded in closed Issue #37).
3. **Local Registration**: Evaluate SAN / Rajasthan Shops and Commercial Establishments Act registration.

Refer to the [Milestone 1.6 Go/No-Go Report](docs/release/1.6-go-no-go-report.md) as the original pre-production assessment; this README and the [Public Beta Operations Readiness Checklist](docs/operations/public-beta-operations-readiness.md) record subsequent infrastructure, legal, and operational milestones.
