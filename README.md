# FairSwap.in

> India-focused peer-to-peer classifieds marketplace foundation.

FairSwap.in is a hyperlocal discovery and communication platform enabling buyers and sellers to arrange direct, in-person exchanges within their local communities.

---

## Current Status: Phase 1 Complete (Controlled-Pilot Code Ready — Public Launch Blocked on External Prerequisites)

### Release & Readiness Classification
* **Phase 1 Implementation Readiness**: **COMPLETE** — All Milestones 1.1 through 1.6 are implemented, hardened, and verified locally.
* **Controlled-Pilot Code Readiness**: **GO** (`v0.1.6-pilot.1` pre-release candidate) — Verified for invitation-only, restricted-scope testing in local/staging sandboxes.
* **Hosted / Public Pilot Readiness**: **PENDING** — FairSwap is **not yet certified for public production launch** until external operational and statutory prerequisites are fulfilled.
* **Remaining External Launch Prerequisites**:
  1. **Production SMTP Provider**: Provision and verify production transactional email (e.g., Amazon SES, SendGrid, or Postmark) with authenticated DKIM/SPF domains.
  2. **Production Domain & SSL/TLS**: Provision hosting infrastructure and bind custom domain (`fairswap.in`) with automated certificate management.
  3. **Statutory Grievance Officer**: Formally appoint and publish Grievance Officer details in compliance with the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules of India.

This repository contains the verified implementation through **Milestone 1.6** (Phase 1 complete):
- **Milestone 1.1 (Foundation)**: Core responsive design system, Tailwind CSS v4 tokens, accessible layouts, system font stack, and multi-viewport test harnesses.
- **Milestone 1.2 (Accounts & Security)**: PostgreSQL schemas, Direct-API RLS policies, two-layer security RPCs, customer auth journeys (sign-up, confirm, sign-in, recovery, TOTP MFA), AAL2-gated staff portal, and privacy request handling.
- **Logging & Monitoring Baseline**: Zero-dependency structured JSON logger, recursive PII redactor, W3C/UUID request correlation, Next.js 16 instrumentation, and client-error ingestion.
- **Milestone 1.3 (Listings & Moderation)**: Categories and locations hierarchy, seller listing lifecycle, material-edit re-review policies, private Supabase Storage pipeline (`sharp` v0.35.4 WebP derivatives), staff moderation queue, and automated expiry/cleanup maintenance.
- **Milestone 1.4 (Public Browsing & Discovery)**: Full-text PostgreSQL search with GIN indexing, public discovery RPC with composite filters, canonical listing views with slug history redirects, anonymous WebP media delivery, authenticated favourites, and truthful static policy pages.
- **Milestone 1.5 (Communication & Safety)**: Direct persistent buyer-seller messaging with Realtime streaming, bidirectional user blocking, report intake and staff resolution, support ticketing and appeals, in-app notifications, and GDPR/DPDP privacy fulfillment (sanitized data export and account deletion preserving counterparty history).
- **Milestone 1.6 (Release Hardening & Pilot Readiness)**: End-to-end cross-journey regression verification, staff user management portal (`/admin/users`), disaster recovery backup/restore verification, reliability and failure injection testing, WCAG AA accessibility audit, operational production runbooks, and evidence-based Go/No-Go release assessment.

> **Future Phases**: Phase 2 and beyond will be planned separately. This repository represents the complete Phase 1 controlled-pilot foundation.

---

## Getting Started

### Prerequisites

- **Node.js**: `v20.x` or higher (verified on `v24.15.0`)
- **Package Manager**: `pnpm` (pinned via Corepack to `10.12.1`)
- **Docker**: Docker Desktop or Docker engine for local Supabase services
- **Operating System**: Windows, macOS, or Linux

### Installation

Clone the repository and install dependencies at the project root using Corepack:

```bash
corepack pnpm install
```

### Local Supabase Stack

FairSwap uses the local Supabase CLI for database, authentication, and private storage:

```bash
# Start local Supabase containers (PostgreSQL, GoTrue Auth, Storage, Inbucket email)
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

## Verification & Testing Scripts

| Command | Description |
|---|---|
| `corepack pnpm dev` | Starts Next.js development server with hot reload |
| `corepack pnpm build` | Compiles production Next.js App Router bundle (Turbopack) |
| `corepack pnpm start` | Runs production Next.js server |
| `corepack pnpm lint` | Runs ESLint flat configuration across the project |
| `corepack pnpm typecheck` | Runs TypeScript compiler verification (`tsc --noEmit`) |
| `corepack pnpm test:unit` | Executes Vitest component, unit, and media processing tests |
| `corepack pnpm test:security` | Runs direct-API RLS invariant and security test suites |
| `corepack pnpm test:e2e` | Runs Playwright Chromium desktop & mobile end-to-end journeys |
| `corepack pnpm supabase test db` | Runs database pgTAP schema, RLS, and security tests |
| `corepack pnpm tsx scripts/check-expired-listings.ts` | Runs scheduled expiry check for active listings |
| `corepack pnpm tsx scripts/cleanup-orphan-media.ts` | Cleans up technical orphan/stale media records |
| `corepack pnpm tsx scripts/seed-listings.ts` | Populates local environment with 30 synthetic listings |
| `corepack pnpm tsx scripts/backup-database.ts` | Backs up local database to isolated `fairswap_restore_test` |
| `corepack pnpm tsx scripts/backup-storage.ts` | Backs up storage buckets to `recovery-test-*` buckets |
| `corepack pnpm tsx scripts/verify-restore.ts` | Verifies database and storage restore integrity |

---

## Architecture & Design Documentation

Detailed technical specifications are available in the `docs/` directory:

- [Project Bible & Core Rules](.agents/rules/fairswap.md) (`.agents/rules/fairswap.md`) — Foundational pilot principles, boundary rules, and non-negotiables.
- [Complete Phased Roadmap](docs/ROADMAP.md) (`docs/ROADMAP.md`) — Milestone sequencing, pilot scope, and release gates.
- [Milestone 1.3 Specification](docs/milestones/1.3-listings-moderation.md) (`docs/milestones/1.3-listings-moderation.md`) — Authoritative specification for listings, photographs, and moderation.
- [Milestone 1.3 Implementation Plan](docs/plans/1.3-plan.md) (`docs/plans/1.3-plan.md`) — Durable plan with binding amendments for listings, photographs, and moderation.
- [Architecture & Foundation Design](docs/FOUNDATION.md) (`docs/FOUNDATION.md`) — System boundary, route map, data flow, entity relationships, permissions matrix, and state transitions.
- [Implementation Progress](docs/PROGRESS.md) (`docs/PROGRESS.md`) — Current milestone register, verified checks, and evidence logs.
- [Milestone 1.2 Implementation Plan](docs/plans/1.2-plan.md) (`docs/plans/1.2-plan.md`) — Accounts, security, and authentication plan.
- [Logging & Monitoring Baseline Plan](docs/plans/logging-monitoring-baseline-plan.md) (`docs/plans/logging-monitoring-baseline-plan.md`) — Four-channel observability baseline.
- [Milestone 1.6 Go/No-Go Report](docs/release/1.6-go-no-go-report.md) (`docs/release/1.6-go-no-go-report.md`) — Evidence-based controlled-pilot release assessment.
- [Deployment Guide](docs/operations/deployment-guide.md) (`docs/operations/deployment-guide.md`) — Production deployment procedures.
- [Backup & Restore Runbook](docs/operations/backup-restore-runbook.md) (`docs/operations/backup-restore-runbook.md`) — Disaster recovery procedures.
- [Incident Response Runbook](docs/operations/incident-response-runbook.md) (`docs/operations/incident-response-runbook.md`) — Incident classification and escalation.
- [Staff Handbook](docs/operations/staff-handbook.md) (`docs/operations/staff-handbook.md`) — Staff operating guidelines.

---

## Environment Configuration

Local development uses Supabase CLI default credentials pre-configured in `.env.local`:

```ini
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
```

The server-side service role key is strictly isolated to Route Handlers and background scripts requiring elevated permissions (private Storage uploads/deletions and processing RPC completion). It is never exposed to client bundles or browser code.

---

## Route Inventory

### Customer Routes
- `/` — Homepage with value proposition, search bar, category shortcuts, recent listings, and safety guidelines
- `/search` — Hyperlocal search explorer with full-text search, category/city/locality filters, price ranges, and sorting
- `/listings/[slug]` — Public canonical listing detail page with photo gallery, seller details, and contact modal
- `/seller/[id]` — Public seller profile and active listings showcase
- `/account/favourites` — Saved favourites dashboard with privacy-preserving unavailable item notices
- `/account/messages` — Direct buyer-seller messaging inbox
- `/account/messages/[id]` — Conversation thread with Realtime streaming
- `/account/notifications` — In-app notification centre
- `/account/support` — Support ticket submission and appeal management
- `/account/support/[id]` — Individual support ticket detail
- `/help` — How It Works, trading guide, and buyer/seller FAQs
- `/safety` — Meeting location, cash handling, and anti-fraud guidelines
- `/terms` — Pilot terms of service and acceptable use policy
- `/privacy` — Privacy notice, data handling, and statutory rights
- `/contact` — Support and feedback contact channels
- `/auth/sign-in` — Email/password authentication
- `/auth/sign-up` — Registration with mandatory Terms of Service & Privacy Policy consent
- `/auth/forgot-password` / `/auth/reset-password` — Password recovery flow
- `/auth/mfa` — Staff AAL2 TOTP challenge
- `/account` — Account overview and profile hub
- `/account/profile` — Display name and contact profile management
- `/account/security` — Password updates and staff TOTP enrollment
- `/account/privacy` — Privacy request submission (export/erasure)
- `/account/listings` — Seller listing dashboard and lifecycle transition actions
- `/account/listings/new` — Listing creation wizard (saves as draft)
- `/account/listings/[id]/edit` — Listing editor with photo uploads and review submission

### Staff Routes (AAL2 Gated)
- `/admin` — Staff portal navigation
- `/admin/staff` — Staff role assignments (`administrator` only)
- `/admin/audit` — Immutable audit log viewer
- `/admin/categories` — Marketplace category and attribute schema management
- `/admin/locations` — City and locality hierarchy management
- `/admin/listings` — Moderator review queue
- `/admin/listings/[id]` — Moderator listing inspection and approve/reject/remove actions
- `/admin/users` — Staff user search, account inspection, and moderation
- `/admin/users/[id]` — Individual user detail and suspend/reinstate actions
- `/admin/reports` — Abuse report management queue
- `/admin/reports/[id]` — Report investigation and resolution
- `/admin/support` — Support ticket management
- `/admin/support/[id]` — Support ticket detail and resolution
- `/admin/privacy` — Privacy request processing

### API Endpoints
- `GET /api/listings/recent` — Public recent active listings for homepage
- `GET /api/listings/[id]/media/[mediaId]/[size]` — Authenticated & anonymous WebP derivative media delivery
- `POST /api/listings/[id]/media` — Authenticated photo upload and asynchronous sharp processing
- `DELETE /api/listings/[id]/media/[mediaId]` — Server-mediated photo deletion and derivative cleanup
- `POST /api/monitoring/client-error` — Rate-limited client error telemetry ingestion
- `GET /api/privacy/export/[id]` — Sanitized personal data export download
