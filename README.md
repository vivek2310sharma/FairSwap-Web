# FairSwap.in

> India-focused peer-to-peer classifieds marketplace foundation.

FairSwap.in is a hyperlocal discovery and communication platform enabling buyers and sellers to arrange direct, in-person exchanges within their local communities.

---

## Milestone 1.1 — Foundation Status

> **Important**: This repository currently contains the **Milestone 1.1 running foundation**. It provides the core application layout, design tokens, responsive navigation, and test harnesses.
>
> **NOT YET IMPLEMENTED**: User accounts, phone authentication, Supabase database/storage connections, listing management, search indexing, messaging, and admin workflows are scheduled for Milestones 1.2 through 1.6.

---

## Getting Started

### Prerequisites

- **Node.js**: `v20.x` or higher (verified on `v24.15.0`)
- **Package Manager**: `pnpm` (pinned via Corepack to `10.12.1`)
- **Operating System**: Windows, macOS, or Linux

### Installation

Clone the repository and install dependencies at the project root:

```bash
pnpm install
```

### Running Locally

```bash
# Start the local development server on http://localhost:3000
pnpm dev

# Build the production bundle
pnpm build

# Start the production server on http://localhost:3000
pnpm start
```

---

## Verification & Testing Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Starts Next.js development server with hot reload |
| `pnpm build` | Compiles production Next.js App Router bundle |
| `pnpm start` | Runs production Next.js server |
| `pnpm lint` | Runs ESLint flat configuration across the project |
| `pnpm typecheck` | Runs TypeScript compiler verification (`tsc --noEmit`) |
| `pnpm test:unit` | Executes Vitest component & unit tests in jsdom environment |
| `pnpm test:e2e` | Runs Playwright Chromium desktop & mobile smoke tests |

---

## Architecture & Design Documentation

Detailed technical designs and conceptual specifications are available in the `docs/` directory:

- [Architecture & Foundation Design](docs/FOUNDATION.md) (`docs/FOUNDATION.md`) — Product boundaries, route map, data flow, entity relationships, permissions matrix, state transitions, and threat model.
- [Implementation Progress](docs/PROGRESS.md) (`docs/PROGRESS.md`) — Current milestone register, verified checks, and evidence logs.
- [Milestone 1.1 Plan](docs/plans/1.1-plan.md) (`docs/plans/1.1-plan.md`) — Scaffolding and verification specification for Milestone 1.1.

---

## Project Structure

```
FairSwap/
├── docs/                      # Architectural specs, milestone contracts, progress logs
├── e2e/                       # Playwright end-to-end smoke tests
├── public/                    # Static assets and icons
├── src/
│   ├── app/
│   │   ├── globals.css        # Tailwind CSS v4 design tokens and theme variables
│   │   ├── icon.svg           # Original FairSwap application icon
│   │   ├── layout.tsx         # Root layout with system font stack and robots noindex
│   │   ├── not-found.tsx      # Branded 404 page
│   │   └── page.tsx           # Homepage with brand, flow, categories & safety notice
│   ├── components/
│   │   ├── development-notice.tsx # Prominent foundation status banner
│   │   ├── footer.tsx         # Footer with brand & copyright
│   │   └── header.tsx         # Responsive header with mobile hamburger navigation
│   └── __tests__/             # Vitest unit and component tests
├── eslint.config.mjs          # Flat ESLint configuration
├── next.config.ts             # Next.js configuration
├── package.json               # Project manifest and package scripts
├── playwright.config.ts       # Playwright multi-viewport configuration
├── tsconfig.json              # Strict TypeScript compiler options
└── vitest.config.ts           # Vitest unit test configuration
```
