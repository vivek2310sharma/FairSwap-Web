# FairSwap.in

> India-focused peer-to-peer classifieds marketplace foundation.

FairSwap.in is a hyperlocal discovery and communication platform enabling buyers and sellers to arrange direct, in-person exchanges within their local communities.

---

## Current Status: Milestone 1.3 (Listings, Photographs & Moderation)

This repository contains the verified implementation through **Milestone 1.3**:
- **Milestone 1.1 (Foundation)**: Core responsive design system, Tailwind CSS v4 tokens, accessible layouts, system font stack, and multi-viewport test harnesses.
- **Milestone 1.2 (Accounts & Security)**: PostgreSQL schemas, Direct-API RLS policies, two-layer security RPCs, customer auth journeys (sign-up, confirm, sign-in, recovery, TOTP MFA), AAL2-gated staff portal, and privacy request handling.
- **Logging & Monitoring Baseline**: Zero-dependency structured JSON logger, recursive PII redactor, W3C/UUID request correlation, Next.js 16 instrumentation, and client-error ingestion.
- **Milestone 1.3 (Listings & Moderation)**:
  * Categories and structured attribute schemas with staff administration (`/admin/categories`).
  * Location hierarchy (cities and localities) with staff management (`/admin/locations`).
  * Full seller listing lifecycle (`/account/listings`, `/account/listings/new`, `/account/listings/[id]/edit`) supporting draft, pending review, active, reserved, paused, sold, rejected, and expired states.
  * Strict material-edit re-review policy enforcing automatic `pending_review` transition and revision increment on material changes in `active`, `reserved`, or `paused` states.
  * Documented database-level `rejected -> draft` transition with history preservation.
  * Private, server-mediated Supabase Storage pipeline (`sharp` v0.35.4) generating WebP thumbnails, medium, and large derivatives, with magic-byte validation, EXIF stripping, and server-controlled deletion.
  * Staff moderation queue (`/admin/listings`, `/admin/listings/[id]`) with atomic status transitions and audit logging.
  * Automated technical maintenance jobs for expired listings and orphan media cleanup.
  * Synthetic 30-listing test fixture seed script with fail-closed local loopback guardrails.

> **Upcoming Milestones**:
> - **Milestone 1.4**: Public listing discovery, search, category browsing, location filtering, and public media delivery.
> - **Milestone 1.5**: Buyer-seller direct messaging, abuse reporting, and privacy export/erasure fulfillment.
> - **Milestone 1.6**: Trust, safety, and operational production launch hardening.

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
- `/` — Homepage with value proposition, category shortcuts, and safety guidelines
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
- `/seller/[id]` — Public seller profile

### Staff Routes (AAL2 Gated)
- `/admin` — Staff portal navigation
- `/admin/staff` — Staff role assignments (`administrator` only)
- `/admin/audit` — Immutable audit log viewer
- `/admin/categories` — Marketplace category and attribute schema management
- `/admin/locations` — City and locality hierarchy management
- `/admin/listings` — Moderator review queue
- `/admin/listings/[id]` — Moderator listing inspection and approve/reject/remove actions

### API Endpoints
- `POST /api/listings/[id]/media` — Authenticated photo upload and asynchronous sharp processing
- `DELETE /api/listings/[id]/media/[mediaId]` — Server-mediated photo deletion and derivative cleanup
- `GET /api/listings/[id]/media/[mediaId]/[size]` — Authenticated private signed-URL media delivery
- `POST /api/monitoring/client-error` — Rate-limited client error telemetry ingestion
