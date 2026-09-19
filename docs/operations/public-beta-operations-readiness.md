# FairSwap — Public Beta Operations Readiness Checklist (Issue #41)

This document is the authoritative operations readiness checklist and evidence entry point for **Public Beta Launch** under GitHub Issue **#41**. It consolidates operational baselines, establishes the monitoring matrix, tracks unresolved blockers, and links to all supporting runbooks using repository-relative links.

---

## 1. Supporting Runbooks & Documentation Index

| Operational Area | Authoritative Runbook / Document | Current Status |
|---|---|---|
| **Operational Ownership & Access Control** | [`./operational-owner-matrix.md`](./operational-owner-matrix.md) | **Updated** (Primary: Vivek Kumar; Backup Owner required) |
| **Incident Response & Statutory Protocols** | [`./incident-response-runbook.md`](./incident-response-runbook.md) | **Updated** (P0–P3, CERT-In 6h clock, DPDP May 2027) |
| **Backup, PITR & Disaster Recovery** | [`./backup-restore-runbook.md`](./backup-restore-runbook.md) | **Updated** (Staging verified; Production unverified blocker) |
| **Recovery Drill Evidence & History** | [`./recovery-drill-evidence.md`](./recovery-drill-evidence.md) | **Updated** (Staging Point 16 drill preserved) |
| **Deployment, Quality Gates & Rollback** | [`./deployment-guide.md`](./deployment-guide.md) | **Updated** (Migrations 1–21; Vercel Instant Rollback) |
| **Tabletop Incident Simulation** | [`./tabletop-simulation-2026-09-19.md`](./tabletop-simulation-2026-09-19.md) | **Executed & Recorded** (Credential leak & 5xx procedure walkthrough) |

---

## 2. Public Beta Operations Monitoring Matrix

The following matrix tracks the required observability signals for the live production environment (`https://fairswap.in`).

> [!CAUTION]
> **Monitoring Reality Attestation**:
> FairSwap does not currently have external SaaS synthetic monitoring (e.g. Better Stack, Datadog, Checkly, Pingdom) or automated phone/SMS alerting provisioned.
> Any signal not verified through repository evidence or verified dashboard inspection is marked **`UNVERIFIED`** or **`NOT CONFIGURED — PUBLIC BETA BLOCKER`**. Documentation alone does not satisfy launch readiness.

| Signal / Source | Alert Destination | Primary Owner | Backup Owner | Expected Operational Response | Test Method | Current Status | Evidence / Notes |
|---|---|---|---|---|---|---|---|
| **1. `https://fairswap.in` Availability** | External uptime webhook / push alert | Vivek Kumar | `BACKUP OWNER REQUIRED` | Ack < 30m; triage DNS/Vercel/edge status | Synthetic HTTPS probe (e.g. GET / every 1 min) | **NOT CONFIGURED — PUBLIC BETA BLOCKER** | Pending SaaS setup |
| **2. Vercel Deployment Failures** | GitHub commit check / Vercel notification | Vivek Kumar | `BACKUP OWNER REQUIRED` | Triage build error; block rollout to main | Trigger deliberate build failure on feature branch | **CONFIGURED & ACTIVE** | Staging build checks verified in PR runs |
| **3. Application / Server Errors (5xx)** | Vercel runtime log alerts / Error webhook | Vivek Kumar | `BACKUP OWNER REQUIRED` | Inspect stack trace; evaluate rollback if > 1% rate | Route error probe via synthetic test | **NOT CONFIGURED — PUBLIC BETA BLOCKER** | Pending alert destination configuration |
| **4. Client-Side Rendering Errors** | Ingestion endpoint (`/api/monitoring/client-error`) | Vivek Kumar | `BACKUP OWNER REQUIRED` | Triage UI regression; evaluate patch priority | Trigger React error boundary in staging | **PARTIALLY CONFIGURED** (Boundary exists; alert routing unverified) | Error boundaries in repo; external alerting pending |
| **5. Supabase DB Health (Connections/CPU)** | Supabase project dashboard alerts | Vivek Kumar | `BACKUP OWNER REQUIRED` | Inspect pooler saturation; kill idle backends | Query `pg_stat_activity` under load | **NOT CONFIGURED — PUBLIC BETA BLOCKER** | Automated alerting unverified on FairSwapProd |
| **6. Supabase Storage Health** | Supabase storage API metric alerts | Vivek Kumar | `BACKUP OWNER REQUIRED` | Inspect storage API 5xx, quota limits | Upload/download test asset probe | **NOT CONFIGURED — PUBLIC BETA BLOCKER** | Manual dashboard check only |
| **7. Supabase Realtime Health** | Realtime connection monitoring | Vivek Kumar | `BACKUP OWNER REQUIRED` | Verify publication tables; restart client listeners | Inspect WebSocket reconnect telemetry | **NOT CONFIGURED — PUBLIC BETA BLOCKER** | No automated Realtime monitor active |
| **8. Supabase Quotas / Resource Pressure** | Supabase billing / quota threshold notification | Vivek Kumar | `BACKUP OWNER REQUIRED` | Upgrade tier or prune storage/logs before cutoff | Review usage metrics against plan tier limits | **UNVERIFIED — PUBLIC BETA BLOCKER** | Actual plan tier and alert delivery unverified |
| **9. Authentication Failures (Spike / Brute-force)** | Auth rate-limit alerts / Upstash Redis | Vivek Kumar | `BACKUP OWNER REQUIRED` | Inspect IP clusters; enforce temporary block | Scripted rate-limit threshold test | **PARTIALLY CONFIGURED** (Upstash distributed rate-limiting active; alert webhook unconfigured) | Rate limiter verified in Milestone 1.2 tests |
| **10. Transactional Email Failures** | SMTP provider bounce/failure webhook | Vivek Kumar | `BACKUP OWNER REQUIRED` | Inspect bounce logs; verify delivery; notify users | Send test password reset / verification | **NOT CONFIGURED — PUBLIC BETA BLOCKER** | Production email configuration and alerts unverified |
| **11. DNS Health (`fairswap.in`)** | External DNS propagation / lookup monitor | Vivek Kumar | `BACKUP OWNER REQUIRED` | Check nameserver delegation and NS records | Global DNS lookup query (dig/nslookup) | **NOT CONFIGURED — PUBLIC BETA BLOCKER** | Endpoint exists; external monitor not configured |
| **12. TLS / Certificate Health** | SSL expiration / renewal monitor | Vivek Kumar | `BACKUP OWNER REQUIRED` | Verify automated certificate issuance / renewal | Automated TLS validity check (validity > 14 days) | **NOT CONFIGURED — PUBLIC BETA BLOCKER** | Automated renewal alerting not configured |

---

## 3. Launch Blocker Summary (Issue #41)

The following items are unresolved and remain open blockers before authorizing Public Beta launch:

1. **Named Backup Production Owner**:
   - Status: **UNRESOLVED (BLOCKER)**
   - Requirement: A qualified secondary engineer must accept the role, obtain emergency access, and be briefed on runbooks.
2. **Live External Production Monitoring & Alerting**:
   - Status: **UNRESOLVED (BLOCKER)**
   - Requirement: Provision synthetic external monitoring for `https://fairswap.in` with verified alert routing to Vivek Kumar and the backup owner.
3. **Production Backup & PITR Verification (`FairSwapProd`)**:
   - Status: **UNRESOLVED (BLOCKER)**
   - Requirement: Inspect production backup configuration and, when human-authorized, restore a production backup/copy into an isolated non-production recovery target where technically supported. **Never restore a test backup over `FairSwapProd`**.
4. **Production Transactional Email (SMTP)**:
   - Status: **UNRESOLVED (BLOCKER)**
   - Requirement: Production transactional-email configuration and failure alerting must be verified and configured.
5. **Issue #37 & Issue #38 Legal Applicability Finalization**:
   - Status: **UNRESOLVED (BLOCKER)**
   - Requirement: Formal legal determination of statutory intermediary classification and compliance obligations under India IT Rules and related statutes.
