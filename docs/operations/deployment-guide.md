# FairSwap — Deployment Guide (Milestone 1.6)

This guide documents the procedures for deploying and operating the **FairSwap** application in staging and production environments, along with required configuration, environment variables, secrets management, and health checks.

---

## 1. System Architecture & Topology

FairSwap is a Next.js (App Router) marketplace application powered by Supabase (PostgreSQL 15+, GoTrue Auth, PostgREST, and Realtime).

* **Frontend & Server Actions**: Next.js 16 (React 19, Turbopack, Tailwind CSS v4)
* **Authoritative Data & Security Layer**: Supabase PostgreSQL with two-tier RPC architecture (`public` SECURITY INVOKER wrappers delegating to unexposed `app_security` SECURITY DEFINER functions)
* **Object Storage**: Supabase Storage (`listing-originals` and `listing-derivatives` buckets)
* **Authentication & Session Assurance**: Supabase GoTrue Auth with RFC 6238 TOTP AAL2 Multi-Factor Authentication for staff roles

---

## 2. Environment Variables & Secrets Checklist

| Variable Name | Environment | Required | Description |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | All | Yes | Public URL of the Supabase API Gateway (Kong / Cloud API) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | All | Yes | Public publishable anon key for PostgREST & Auth client |
| `SUPABASE_SERVICE_ROLE_KEY` | Server Only | Yes | Privileged service role secret key. **NEVER expose to client bundles.** |
| `JWT_SECRET` | Server/DB | Yes | Secret HMAC key used to verify Supabase JWTs (min 32 characters) |
| `PORT` | Staging/Prod | Optional | HTTP binding port (default: 3000) |
| `NODE_ENV` | All | Yes | Set to `production` in staging and production deployments |

### Secret Management Rules
* Never commit `.env.local` or raw secret strings to version control.
* In production, inject secrets via secure environment secret stores (e.g., AWS Secrets Manager, Doppler, Vault, or platform-native secret vaults).
* In CI/CD pipelines, use masked GitHub Actions / runner secrets.

---

## 3. Database Migration Deployment

FairSwap uses ordered, immutable PostgreSQL migration scripts located in `supabase/migrations/`.

### Local / Docker Execution
```powershell
# Check current migration status
npx supabase migration list

# Apply pending migrations to local stack
npx supabase migration up
```

### Direct Production / Staging Deployment
When deploying to managed Supabase or standalone PostgreSQL instances:
1. Ensure the PostgreSQL connection string has superuser or `postgres` administrative privileges.
2. Apply migrations sequentially using `psql`:
   ```bash
   psql "$DATABASE_URL" -f supabase/migrations/20260914000016_staff_user_moderation_and_hardening.sql
   ```
3. Verify that all migrations up to `20260914000016_staff_user_moderation_and_hardening.sql` are reflected in `supabase_migrations.schema_migrations`.

---

## 4. Application Build & Launch

### Production Build
```bash
# 1. Typecheck validation
corepack pnpm typecheck

# 2. Linting verification
corepack pnpm lint

# 3. Create optimized production build
corepack pnpm build
```

### Launch Service
```bash
# Start production Next.js server
corepack pnpm start -p 3000
```

---

## 5. Health Checks & Observability

* **Liveness / Readiness Probe**: `GET /api/listings/recent` (verifies Next.js runtime and read connectivity to PostgreSQL)
* **Client Error Monitoring**: `POST /api/monitoring/client-error` (accepts structured client error payloads with correlation IDs)
* **Database Extension Verification**:
  ```sql
  SELECT extname, extversion FROM pg_extension WHERE extname IN ('uuid-ossp', 'pgcrypto', 'pgjwt');
  ```

---

## 6. External Prerequisites for Public Pilot (Caveats)

Before opening FairSwap to public traffic outside controlled-pilot sandbox groups:
1. **Production SMTP Provider**: Transition from local Mailpit (`127.0.0.1:54324`) to a production transactional email service (e.g., Amazon SES, SendGrid, or Postmark) with SPF, DKIM, and DMARC DNS records configured.
2. **Statutory Grievance Officer**: Under India Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, appoint and publish the legal name and contact details of the Grievance Officer on `/contact` and `/terms`.
3. **Production Domain & TLS**: Ensure custom domain (`fairswap.in`) is bound to an SSL/TLS certificate with automatic renewal (Let's Encrypt / Cloudflare).
