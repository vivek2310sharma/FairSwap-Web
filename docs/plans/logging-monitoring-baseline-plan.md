# FairSwap Logging & Monitoring Baseline Plan (r1)

> [!NOTE]
> **Historical Plan & Implementation Status Notice**:
> This document records the original architectural design plan formulated between Milestone 1.2 and Milestone 1.3 on **2026-09-13**.
> - **Implementation Status**: **IMPLEMENTED & VERIFIED**. The proposed four-channel observability and structured application logging architecture was subsequently implemented in the active codebase:
>   - Structured application logger and redaction pipeline: [`src/lib/logger/`](../../src/lib/logger/) (`index.ts`, `correlation.ts`, `redactor.ts`, `types.ts`).
>   - Request correlation & proxy instrumentation: `src/proxy.ts`.
>   - Client error capture route & UI boundaries: implemented at `src/app/api/monitoring/client-error/route.ts` (singular, distinct from the originally proposed plural `client-errors` path in the historical text below), `src/app/error.tsx`, and `src/app/global-error.tsx`.
>   - Test verification: Observability test suite in `tests/observability/` (historical verification evidence: 24/24 passing tests across six test files recorded when the baseline was accepted on 2026-09-13 per `docs/PROGRESS.md`; test coverage has subsequently expanded).
> - **Historical Content**: The sections below preserve the original historical plan and pre-implementation assessment as written on 2026-09-13.

> **Document Status**: `HISTORICAL (IMPLEMENTED)` (Originally `PROPOSED` Plan Only)  
> **Target Phase**: Post-Milestone 1.2 / Pre-Milestone 1.3 Cross-Cutting Infrastructure  
> **Milestone Roadmap Invariant**: Sits strictly between Milestone 1.2 and 1.3. Does not renumber or alter the authoritative milestone sequence.  
> **Original Execution Constraint**: PLAN ONLY. (Subsequently implemented and accepted into baseline).

---

## 1. Goals and Non-Goals

### Goals
1. **Four-Channel Separation**: Explicitly separate (1) Business/Security Audit Trail, (2) Application Operational Logging, (3) Supabase Platform Logs, and (4) Client/Browser Error Capture.
2. **Unified Structured Schema**: Establish a durable, typed JSON schema for application operational logs (`timestamp`, `level`, `service`, `environment`, `event`, `correlation_id`, `route`, `duration_ms`, `actor_id`, `error`).
3. **End-to-End Correlation**: Propagate a consistent `x-request-id` across proxy, Server Actions, Route Handlers, Supabase API calls, and client error boundaries.
4. **Rigorous Centralized Redaction**: Enforce automated redaction of passwords, tokens, session cookies, JWTs, Authorization headers, and MFA secrets before output serialization.
5. **Safe User Experience & Diagnostic References**: Display user-friendly, non-technical error messages accompanied by safe reference IDs (`ref_<id>`) rather than raw stack traces.
6. **Failure Isolation**: Ensure operational logging failures never interrupt customer classifieds transactions, while preserving atomic transaction aborts for required security audit events.
7. **Vendor-Neutral Architecture**: Output structured JSON to `stdout`/`stderr` so cloud log aggregators (Datadog, Better Stack, Logtail, Axiom, Grafana Cloud, Sentry) can be attached later with zero application rewrites.

### Non-Goals
1. **Not Starting Milestone 1.3**: Zero listing schemas, image upload pipelines, category hierarchies, or search endpoints.
2. **Not Modifying Business Audit Architecture**: Zero changes to the accepted append-only `public.audit_logs` table or its PostgreSQL RLS/ACL policies.
3. **Not a General Database Debugging Table**: `public.audit_logs` will not store operational application logs or HTTP errors.
4. **No Third-Party Paid Vendor Accounts**: Zero cloud accounts created, zero external API keys required, zero telemetry SDKs with network phoning-home during Phase 1.
5. **No Full APM / Distributed Tracing Agent**: No heavyweight profiling agents (e.g. OpenTelemetry auto-instrumentation SDKs or Datadog dd-trace) during initial local baseline.

---

## 2. Current-State Assessment in FairSwap

| Capability | Current State | Deficiencies & Gaps to Close |
|---|---|---|
| **Business / Security Auditing** | `public.audit_logs` table created in Migration 3; populated via `app_security.log_audit_event()`; viewed via `/admin/audit`. | Complete and accepted in Milestone 1.2. Needs formal event naming taxonomy for upcoming milestones. |
| **Application Logging** | Ad-hoc `console.log()` / `console.warn()` statements in scripts and tests; no standardized logger in `src/app/` or `src/lib/`. | No structured format, no timestamps, no standard levels, no correlation IDs, no automated redaction. |
| **Request Correlation** | No request ID generated in `src/proxy.ts` or propagated to client/server headers. | Impossible to correlate a client-side failure with server logs and Supabase requests during an incident. |
| **Error Handling in UI** | Missing `src/app/error.tsx` and `src/app/global-error.tsx`. Next.js displays default framework error overlay in dev. | Unexpected errors leak internal framework details or leave users stranded without a reference ID. |
| **Supabase Client Context** | `src/lib/supabase/server.ts` creates server client without request headers forwarding. | Supabase PostgREST and Auth API logs have no correlation ID matching the Next.js request. |
| **Redaction & Sanitization** | Relying entirely on manual developer discretion. | Risk of accidental token/cookie/password leaks in server logs and terminal captures. |

---

## 3. Four-Channel Observability Architecture

```
                                    +-------------------------------------------------------------+
                                    |                      FAIRSWAP USER                          |
                                    +-------------------------------------------------------------+
                                                                   |
                                              HTTP Requests with x-request-id / Cookies
                                                                   v
+-----------------------------------------------------------------------------------------------------------------------------------------+
|                                                           NEXT.JS 16 APPSERVER                                                          |
|                                                                                                                                         |
|   +--------------------------+          +--------------------------------------+          +-----------------------------------------+   |
|   |       src/proxy.ts       | -------> | Server Actions / Route Handlers      | -------> | Error Boundaries                        |   |
|   |  - Generates request_id  |          |  - Business Logic                    |          |  (error.tsx / global-error.tsx)         |   |
|   |  - Injects into headers  |          |  - Domain Error Handling             |          |  - Safe UI error messages               |   |
|   |  - Logs route entry/exit |          |  - Structured operational telemetry  |          |  - Displays ref_<id> to user            |   |
|   +--------------------------+          +--------------------------------------+          +-----------------------------------------+   |
|                 |                                          |                                                    |                       |
+-----------------|------------------------------------------|----------------------------------------------------|-----------------------+
                  |                                          |                                                    |
                  v                                          v                                                    v
     [ CHANNEL 2: OPERATIONAL ]                 [ CHANNEL 1: BUSINESS AUDIT ]                        [ CHANNEL 4: CLIENT ERRORS ]
   Structured NDJSON to stdout/stderr        PostgreSQL public.audit_logs                     POST /api/monitoring/client-errors
   - Level: debug/info/warn/error            - Append-only, RLS-protected                     - Component stack & error message
   - Correlated by request_id                - Atomic mutation dependency                     - Strictly sanitized, zero secrets
   - Centralized redaction filter            - Reusable naming taxonomy                       - User reference correlation
                  |                                          |                                                    |
                  |                                          |                                                    |
                  +------------------------------------------+----------------------------------------------------+
                                                             |
                                                             v
                                             [ CHANNEL 3: SUPABASE PLATFORM ]
                                             - Auth (GoTrue), PostgREST, Postgres, Kong
                                             - Correlated via x-request-id in client headers
                                             - Infrastructure telemetry (docker logs locally)
```

### Channel 1: Business & Security Audit Trail
- **Primary Sink**: Supabase PostgreSQL database table `public.audit_logs`.
- **Purpose**: Legally binding, append-only historical audit records of privileged business mutations (account status transitions, staff assignments, privacy request resolutions, administrative overrides).
- **Execution Invariant**: **Atomic Dependency**. If the audit entry cannot be created in the database, the privileged transaction MUST be aborted and rolled back.
- **Access Model**: Unexposed `app_security` internal procedures (`SECURITY DEFINER`); direct mutation grants revoked from all application roles; `SELECT` gated by RLS to active `administrator` with verified AAL2.
- **Naming Taxonomy**: Reusable `<domain_entity>.<action>` format:
  * Milestone 1.2: `user_account.status_update`, `staff_role.assigned`, `staff_role.revoked`, `privacy_request.resolved`, `admin.bootstrapped`.
  * Future Milestones: `listing.created`, `listing.suspended`, `listing.moderated`, `dispute.opened`, `dispute.resolved`.
- **Exclusions**: Never used for operational request timing, routine page views, database query debugging, or HTTP status logging.

### Channel 2: Application / Operational Logging
- **Primary Sink**: Standard Output (`stdout` / `stderr`) in single-line JSON format (NDJSON).
- **Purpose**: Runtime diagnostics, request tracing, operational performance monitoring, and debugging for engineers and platform operations.
- **Execution Invariant**: **Failure Isolated**. If writing to a future log collector or stdout fails, ordinary customer browsing, listings, and transactions MUST proceed unimpeded.
- **Format**: Structured JSON in production; optionally colorized human-readable output in local development (`NODE_ENV !== 'production'`).
- **Access Model**: Engineering and DevOps only. Not exposed to end users or ordinary staff members.

### Channel 3: Supabase Platform Logs
- **Primary Sink**: Supabase Container Logs locally (`docker logs`); Supabase Platform Telemetry in hosted environment.
- **Purpose**: Infrastructure health, connection pooling, GoTrue authentication internals, Kong routing latency, PostgREST query planning, and Mailpit SMTP transactions.
- **Correlation Mechanism**: FairSwap's server client passes `x-request-id` in the `global.headers` of `@supabase/supabase-js`. PostgREST logs reflect this request ID, enabling end-to-end trace correlation during incident response.

### Channel 4: Client / Browser Error Capture
- **Primary Sink**: Controlled ingestion route handler (`POST /api/monitoring/client-errors`).
- **Purpose**: Visibility into client-side React rendering crashes, unhandled script rejections, and broken client workflows.
- **Privacy & Security Boundary**: Transmits only error name, sanitized message, component stack trace, URL pathname, and active correlation ID. Form inputs, credentials, tokens, cookies, and personal user data are strictly excluded.

---

## 4. Structured Operational Event Schema

Every operational log record emitted by the FairSwap application logger adheres to this JSON schema:

```json
{
  "timestamp": "2026-09-13T16:45:00.123Z",
  "level": "info",
  "service": "fairswap-web",
  "environment": "development",
  "event": "http.request_completed",
  "correlation_id": "c7a8b9e0-1234-5678-9abc-def012345678",
  "route": "POST /auth/sign-in",
  "duration_ms": 42,
  "actor_id": "00000000-0000-0000-0000-000000000001",
  "details": {
    "status_code": 200,
    "ip_hash": "a1b2c3d4",
    "auth_method": "password"
  },
  "error": null,
  "release": "fairswap@0.1.0"
}
```

### Schema Field Specification:

| Field | Type | Required | Description |
|---|---|:---:|---|
| `timestamp` | `string` (ISO 8601 UTC) | **Yes** | Precise execution time with millisecond resolution. |
| `level` | `string` | **Yes** | Severity: `"debug"`, `"info"`, `"warn"`, or `"error"`. |
| `service` | `string` | **Yes** | Application identifier: `"fairswap-web"`. |
| `environment` | `string` | **Yes** | Current runtime environment: `"development"`, `"test"`, `"production"`. |
| `event` | `string` | **Yes** | Normalized identifier in `<namespace>.<action>` format (e.g. `"auth.login_attempt"`, `"profile.update"`). |
| `correlation_id` | `string` (UUID v4) | **Yes** | Request/operation identifier tracing execution flow across components. |
| `route` | `string` | No | HTTP method and path or Server Action name (e.g. `"POST /auth/sign-in"`, `"action:signUpAction"`). |
| `duration_ms` | `number` | No | Elapsed execution duration in milliseconds for timed operations. |
| `actor_id` | `string` (UUID) | No | Authenticated Supabase User ID (`auth.uid()`). **Never** email or plain username. |
| `details` | `Record<string, unknown>` | No | Contextual metadata strictly subjected to recursive redaction. |
| `error` | `StructuredError` | No | Present on `"error"` and high-severity `"warn"` logs. Contains `code`, `category`, and sanitized `message`. |
| `release` | `string` | No | Application version identifier from package.json or deployment metadata. |

---

## 5. Logger Implementation Recommendation & Justification

### Options Evaluated:
1. **Option A: Mature External Library (e.g. Pino or Winston)**
   - *Pros*: Battle-tested, ecosystem of transports, fast serialization.
   - *Cons*: Pino relies on worker threads (`pino/file`, `thread-stream`) and Node.js native bindings which frequently conflict with Next.js Turbopack, Edge runtimes, and SSR middleware environments. Adds ~5 transitive dependencies to the lockfile.
2. **Option B: Purpose-Built Lightweight Internal Logger (`src/lib/logger/`)**
   - *Pros*:
     * **Zero Dependencies**: 0 new packages installed, 0 lockfile inflation, 0 supply-chain surface area.
     * **Universal Runtime Compatibility**: Guaranteed 100% compatibility across Next.js 16 Turbopack, Node.js SSR runtime, and Edge middleware runtime.
     * **Exact Security Enforcement**: Custom recursive redaction engine tailored to FairSwap's exact schema and authentication token patterns.
     * **Vendor Neutral**: Outputs standard NDJSON to `process.stdout`/`process.stderr`, instantly consumable by any cloud log router or Docker daemon without code modifications.
   - *Cons*: Must maintain ~150 lines of internal logging code.

### **Recommendation: Option B (Purpose-Built Internal Logger)**
FairSwap will implement a zero-dependency, type-safe structured logger in [`src/lib/logger/`](../../src/lib/logger/). This satisfies the Project Bible constraint of avoiding unnecessary dependencies while guaranteeing seamless SSR and Edge compatibility.

---

## 6. Correlation / Request ID Architecture

1. **Generation Boundary**:
   - In [`src/proxy.ts`](../../src/proxy.ts) (Next.js middleware), every incoming HTTP request is inspected for an existing upstream header (`x-request-id` or `x-correlation-id`).
   - If present and valid, it is preserved. If absent or malformed, a standard cryptographically random UUID (`crypto.randomUUID()`) is generated.
2. **Propagation to Server Context**:
   - The correlation ID is injected into internal request headers via `request.headers.set('x-request-id', correlationId)`.
   - Server Components, Route Handlers, and Server Actions retrieve it synchronously via `const correlationId = (await headers()).get('x-request-id')`.
3. **Propagation to Outbound Response**:
   - The proxy sets `response.headers.set('x-request-id', correlationId)` on all HTTP responses, allowing browser devtools and API consumers to observe the trace ID.
4. **Propagation to Supabase Infrastructure**:
   - In [`src/lib/supabase/server.ts`](../../src/lib/supabase/server.ts), the correlation ID is added to Supabase client global headers:
     ```typescript
     global: {
       headers: { 'x-request-id': correlationId },
     }
     ```
   - This ensures PostgREST access logs and GoTrue auth events share the identical request ID.
5. **Propagation to Audit Logs**:
   - When an administrative action creates an audit log entry in `public.audit_logs`, the `correlation_id` is included inside the `details` JSONB column, linking the database audit record directly to application server logs.
6. **User Reference ID**:
   - When an unhandled error occurs, the user is presented with a human-readable support reference: `ref_${correlationId.slice(0, 8)}`.

---

## 7. Security & Centralized Redaction Policy

Logging must be secure by default. An automated recursive redactor executes prior to any stringification or stream writing.

### Redaction Rules:
1. **Sensitive Object Keys** (Case-insensitive matching; replaced with `"[REDACTED]"`):
   - `password`, `newPassword`, `confirmPassword`, `passwd`
   - `token`, `token_hash`, `access_token`, `refresh_token`, `jwt`
   - `secret`, `service_role_key`, `supabase_secret_key`, `jwt_secret`
   - `totp`, `totpSecret`, `totpCode`, `verifyCode`, `code`
   - `cookie`, `set-cookie`, `authorization`, `apikey`
   - `creditCard`, `cvv`, `pan`, `aadhaar`, `bankAccount`, `upi`
2. **Sensitive String Patterns** (Regex-matched in free text; replaced with `"[REDACTED_PATTERN]"`):
   - **JWT Tokens**: `/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g`
   - **Bearer Headers**: `/Bearer\s+[A-Za-z0-9._~+/-]+=*/gi`
   - **Supabase Demo/Service Keys**: `/eyJhbGciOiJIUzI1NiIsInR5cCI[A-Za-z0-9._-]+/g`
3. **Actor Identifiers**:
   - Standard application logs MUST use the internal Supabase UUID (`actor_id: "00000000-..."`).
   - Plain email addresses and phone numbers MUST NOT appear in operational log message strings or details unless specifically hashed or truncated for account recovery debugging.

---

## 8. Log Severity Levels & Production Guidelines

| Level | Severity | Production Behavior | When to Use |
|---|:---:|---|---|
| `debug` | 0 | Suppressed in production (`LOG_LEVEL=info`). | Fine-grained internal logic flow, SQL statement inspection during local development. |
| `info` | 1 | Emitted to stdout in production. | Significant routine business and lifecycle events (e.g. successful login, user registration, route navigation, server startup). |
| `warn` | 2 | Emitted to stdout in production. | Degraded states, handled unexpected inputs, rate-limit thresholds reached, recovery retries, non-critical service timeouts. |
| `error` | 3 | Emitted to stderr in production. Alerting trigger. | Unhandled exceptions, 5xx responses, transaction rollbacks, database connectivity failures, security invariant violations. |

**Severity Discipline**: Normal expected user mistakes (e.g. wrong password entered at login, invalid email format in sign-up form, visiting an unknown 404 URL) are **NOT** errors. They are logged at `info` or `warn` level to prevent false-positive alert storms.

---

## 9. Next.js 16 Architecture & Integration Points

```
src/
├── app/
│   ├── api/
│   │   └── monitoring/
│   │       └── client-error/
│   │           └── route.ts          <-- Channel 4 ingestion endpoint
│   ├── error.tsx                     <-- App Router nested error boundary (Channel 4)
│   ├── global-error.tsx              <-- Root layout fallback error boundary (Channel 4)
│   ├── admin/audit/page.tsx          <-- Existing Channel 1 Audit Viewer (Preserved)
├── lib/
│   ├── logger/
│   │   ├── index.ts                  <-- Primary logger interface (Channel 2)
│   │   ├── redactor.ts               <-- Centralized security redaction engine
│   │   ├── types.ts                  <-- TypeScript event and log schemas
│   │   └── context.ts                <-- Request context & correlation storage
│   ├── supabase/
│   │   └── server.ts                 <-- Updated to inject x-request-id into headers
├── proxy.ts                          <-- Generates & propagates x-request-id
tests/
├── observability/
│   ├── logger.test.ts                <-- Schema & level emission unit tests
│   ├── redaction.test.ts             <-- Automated secret redaction tests
│   ├── correlation.test.ts           <-- Request ID propagation tests
│   └── failure-isolation.test.ts     <-- Failure isolation & atomicity tests
```

### Integration Details:
1. **`src/proxy.ts`**:
   - Captures incoming `x-request-id` or generates `crypto.randomUUID()`.
   - Attaches `x-request-id` to downstream request and upstream response headers.
   - Logs incoming request start and outgoing response status with duration.
2. **`src/app/error.tsx`**:
   - Client component rendering a clean error card when page rendering throws.
   - Dispatches sanitized client error payload to `/api/monitoring/client-error`.
   - Shows `Reference ID: ref_<short_id>`.
3. **`src/app/global-error.tsx`**:
   - Handles fatal crashes in root `layout.tsx`. Contains minimal inline HTML/CSS.
4. **`src/app/api/monitoring/client-error/route.ts`**:
   - Ingests sanitized client errors with rate limiting (max 10 reports per minute per IP).
   - Emits structured operational log under `event: "client.unhandled_error"`.

---

## 10. Retention & Future Alerting Strategy

| Log Category | Channel | Local Dev Retention | Proposed Production Retention | Justification |
|---|:---:|---|---|---|
| **Security Audit Trail** | 1 | Ephemeral / disposable DB | **1 to 7 Years** (Database / Archive) | Legal auditability, dispute resolution, security forensics. Low volume, high value. |
| **Operational App Logs** | 2 | Console stdout | **14 to 30 Days** (Cloud Collector) | Sufficient for performance analysis and active debugging without runaway storage costs. |
| **Platform Telemetry** | 3 | Docker container logs | **7 to 14 Days** (Platform) | Infrastructure diagnostic window. |
| **Client Error Ingestion**| 4 | Streamed to Channel 2 | **14 to 30 Days** (Cloud Collector) | Triage and resolution window for UI bugs. |

*Compliance Note*: Exact retention policies for production will be finalized prior to public Indian launch taking into account DPDP Act (Digital Personal Data Protection Act) requirements and CERT-In logging directives.

---

## 11. Acceptance-to-Test Matrix

| Requirement | Test Type | Target File | Verification Method |
|---|---|---|---|
| **1. Structured Schema Conformance** | Unit | `tests/observability/logger.test.ts` | Verify JSON output matches schema fields (`timestamp`, `level`, `service`, `environment`, `event`, `correlation_id`). |
| **2. Correlation ID Generation & Propagation** | Integration | `tests/observability/correlation.test.ts` | Test proxy generates UUID when missing, preserves incoming header, and returns header in response. |
| **3. Centralized Secret Redaction** | Unit | `tests/observability/redaction.test.ts` | Assert automatic redaction of passwords, tokens, JWTs, cookies, Authorization headers, and MFA secrets. |
| **4. Error Stable Reference IDs** | Unit / E2E | `tests/observability/logger.test.ts` | Confirm error logs contain stable correlation IDs and safe reference format (`ref_*`). |
| **5. Logging Failure Isolation** | Unit | `tests/observability/failure-isolation.test.ts` | Mock stream failure in operational logger; assert application function completes successfully. |
| **6. Atomic Audit Requirement** | Unit / DB | `tests/observability/failure-isolation.test.ts` | Verify failure to record a required business audit log aborts the privileged transaction. |
| **7. Audit Tampering & Forgery Denial** | Security | `tests/security/rls.test.ts` | Re-verify ordinary clients cannot forge or insert debug logs into `public.audit_logs`. |
| **8. Milestone 1.2 Auth & MFA Regression** | E2E | `e2e/auth.spec.ts` | Run all 18 live Playwright auth journeys; verify 100% pass. |
| **9. Milestone 1.1 Foundation Regression** | E2E / Unit | `e2e/smoke.spec.ts`, `src/__tests__/` | Run all 42 unit tests and 10 smoke tests; verify zero regressions. |

---

## 12. Implementation Batches

```
[BATCH 1: Core Logger & Redaction Engine]
├── src/lib/logger/types.ts
├── src/lib/logger/redactor.ts
├── src/lib/logger/index.ts
└── tests/observability/logger.test.ts & redaction.test.ts

[BATCH 2: Proxy Correlation ID & Context Propagation]
├── src/proxy.ts (Inject & reflect x-request-id)
├── src/lib/supabase/server.ts (Forward x-request-id in client headers)
└── tests/observability/correlation.test.ts

[BATCH 3: Client Error Capture & Boundaries]
├── src/app/error.tsx (Nested route boundary)
├── src/app/global-error.tsx (Root layout boundary)
├── src/app/api/monitoring/client-error/route.ts (Ingestion route)
└── tests/observability/client-error.test.ts

[BATCH 4: Failure Isolation, Audit Taxonomy & Full Regressions]
├── tests/observability/failure-isolation.test.ts
├── Update docs/PROGRESS.md with baseline evidence
└── Run full regression suite (lint, typecheck, unit, build, Playwright smoke & auth)
```

---

## 13. Explicit Deferred Production Decisions

The following items are intentionally deferred until release planning to maintain vendor neutrality:
1. **Log Ingestion Provider**: Selection between Datadog, Better Stack, Logtail, Axiom, or self-hosted Grafana Loki.
2. **APM & Tracing Agents**: Selection of OpenTelemetry Collector or vendor-specific APM agents.
3. **Alerting Channels**: Configuration of PagerDuty, Slack, OpsGenie, or SMS emergency escalations.
4. **Long-Term Cold Storage**: Archival of PostgreSQL audit logs to AWS S3 / Cloudflare R2 glacier storage.

---

## 14. Remaining Risks and Blockers

- **Risk**: High-frequency operational logging could impact SSR performance if serialization is slow.  
  *Mitigation*: Zero-dependency synchronous string construction with fast regex-based key redaction; no blocking I/O.
- **Risk**: Accidental leakage of user input in nested error objects.  
  *Mitigation*: Centralized recursive redactor sanitizes all `details` and error objects before output. Automated test suite asserts redaction against 15+ sensitive key patterns.
- **Blockers**: None. Docker Desktop and local Supabase stack are fully operational.

---

## 15. Authorization Request

This plan establishes a durable, vendor-neutral logging and monitoring baseline sitting between Milestone 1.2 and Milestone 1.3 without expanding product scope.

**Awaiting human review and explicit BUILD authorization to proceed.**
