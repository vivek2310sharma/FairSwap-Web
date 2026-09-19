# FairSwap — Public Beta Operations Readiness Checklist (Issue #41)

This document is the authoritative operations readiness checklist and evidence entry point for **Public Beta Launch** under GitHub Issue **#41**. It consolidates operational baselines, establishes the monitoring matrix, tracks unresolved blockers, and links to all supporting runbooks.

---

## 1. Supporting Runbooks & Documentation Index

| Operational Area | Authoritative Runbook / Document | Current Status |
|---|---|---|
| **Operational Ownership & Access Control** | [`docs/operations/operational-owner-matrix.md`](file:///c:/Users/VivekKumar/OneDrive%20-%20Nobly%20A%20S/Documents/FairSwap/docs/operations/operational-owner-matrix.md) | **Updated** (Primary: Vivek Kumar; Backup Owner required) |
| **Incident Response & Statutory Protocols** | [`docs/operations/incident-response-runbook.md`](file:///c:/Users/VivekKumar/OneDrive%20-%20Nobly%20A%20S/Documents/FairSwap/docs/operations/incident-response-runbook.md) | **Updated** (P0–P3, CERT-In 6h clock, DPDP May 2027) |
| **Backup, PITR & Disaster Recovery** | [`docs/operations/backup-restore-runbook.md`](file:///c:/Users/VivekKumar/OneDrive%20-%20Nobly%20A%20S/Documents/FairSwap/docs/operations/backup-restore-runbook.md) | **Updated** (Staging verified; Production unverified blocker) |
| **Recovery Drill Evidence & History** | [`docs/operations/recovery-drill-evidence.md`](file:///c:/Users/VivekKumar/OneDrive%20-%20Nobly%20A%20S/Documents/FairSwap/docs/operations/recovery-drill-evidence.md) | **Updated** (Staging Point 16 drill preserved) |
| **Deployment, Quality Gates & Rollback** | [`docs/operations/deployment-guide.md`](file:///c:/Users/VivekKumar/OneDrive%20-%20Nobly%20A%20S/Documents/FairSwap/docs/operations/deployment-guide.md) | **Updated** (Migrations 1–21; Vercel Instant Rollback) |
| **Tabletop Incident Simulation** | [`docs/operations/tabletop-simulation-2026-09-19.md`](file:///c:/Users/VivekKumar/OneDrive%20-%20Nobly%20A%20S/Documents/FairSwap/docs/operations/tabletop-simulation-2026-09-19.md) | **Executed & Recorded** (Credential leak & 5xx simulation) |

---

## 2. Public Beta Operations Monitoring Matrix

The following matrix tracks the required observability signals for the live production environment (`https://fairswap.in`).

> [!CAUTION]
> **Monitoring Reality Attestation**:
> FairSwap does not currently have external SaaS synthetic monitoring (e.g. Better Stack, Datadog, Checkly, Pingdom) or automated SMS/voice alerting provisioned.
> Where monitoring is not actively integrated, it is explicitly classified as **`NOT CONFIGURED — PUBLIC BETA BLOCKER`**. Documentation alone does not satisfy launch readiness.

| Signal / Source | Alert Destination | Primary Owner | Backup Owner | Expected Operational Response | Test Method | Current Status | Evidence / Date |
|---|---|---|---|---|---|---|---|
| **1. `https://fairswap.in` Availability** | External uptime webhook / push alert | Vivek Kumar | `BACKUP OWNER REQUIRED` | Ack < 30m; triage DNS/Vercel/edge status | Synthetic HTTPS probe (e.g. GET / every 1 min) | **NOT CONFIGURED — PUBLIC BETA BLOCKER** | Pending SaaS setup |
| **2. Vercel Deployment Failures** | GitHub commit check / Vercel email | Vivek Kumar | `BACKUP OWNER REQUIRED` | Triage build error; block rollout to main | Trigger deliberate build failure on feature branch | **CONFIGURED & ACTIVE** (GitHub Check Runs / Vercel Bot) | Staging build checks verified 2026-09-19 |
| **3. Application / Server Errors (5xx)** | Vercel runtime log alerts / Error webhook | Vivek Kumar | `BACKUP OWNER REQUIRED` | Inspect stack trace; evaluate rollback if > 1% rate | Route error probe via synthetic test | **NOT CONFIGURED — PUBLIC BETA BLOCKER** | Pending alert destination configuration |
| **4. Client-Side Rendering Errors** | Ingestion endpoint (`/api/monitoring/client-error`) | Vivek Kumar | `BACKUP OWNER REQUIRED` | Triage UI regression; evaluate patch priority | Trigger React error boundary in staging | **PARTIALLY CONFIGURED** (Boundary exists; alert routing pending) | Error boundaries in repo; external alerting pending |
| **5. Supabase DB Health (Connections/CPU)** | Supabase project dashboard alerts | Vivek Kumar | `BACKUP OWNER REQUIRED` | Inspect pooler saturation; kill idle backends | Query `pg_stat_activity` under load | **NOT CONFIGURED — PUBLIC BETA BLOCKER** | Supabase dashboard manual only; automated alerts unverified |
| **6. Supabase Storage Health** | Supabase storage API metric alerts | Vivek Kumar | `BACKUP OWNER REQUIRED` | Inspect storage API 5xx, quota limits | Upload/download test asset probe | **NOT CONFIGURED — PUBLIC BETA BLOCKER** | Manual dashboard check only |
| **7. Supabase Realtime Health** | Realtime connection monitoring | Vivek Kumar | `BACKUP OWNER REQUIRED` | Verify publication tables; restart client listeners | Inspect WebSocket reconnect telemetry | **NOT CONFIGURED — PUBLIC BETA BLOCKER** | No automated Realtime monitor active |
| **8. Supabase Quotas / Resource Pressure** | Supabase billing / quota threshold email | Vivek Kumar | `BACKUP OWNER REQUIRED` | Upgrade tier or prune storage/logs before cutoff | Review usage metrics against Free/Pro limits | **PARTIALLY CONFIGURED** (Supabase native threshold emails to Vivek Kumar) | Vivek Kumar account alerts active |
| **9. Authentication Failures (Spike / Brute-force)** | Auth rate-limit alerts / Upstash Redis | Vivek Kumar | `BACKUP OWNER REQUIRED` | Inspect IP clusters; enforce temporary block | Scripted rate-limit threshold test | **PARTIALLY CONFIGURED** (Upstash distributed rate-limiting active; alert webhook unconfigured) | Rate limiter verified in Milestone 1.2 tests |
| **10. Transactional Email Failures** | SMTP provider bounce/failure webhook | Vivek Kumar | `BACKUP OWNER REQUIRED` | Inspect bounce logs; verify SPF/DKIM; notify users | Send test password reset / verification | **NOT CONFIGURED — PUBLIC BETA BLOCKER** | Sandbox email in use; production SMTP pending setup |
| **11. DNS Health (`fairswap.in`)** | External DNS propagation checker | Vivek Kumar | `BACKUP OWNER REQUIRED` | Check nameserver delegation and NS records | Global DNS lookup query (dig/nslookup) | **NOT CONFIGURED — PUBLIC BETA BLOCKER** | Production custom domain binding pending |
| **12. TLS / Certificate Health** | SSL expiration / renewal monitor | Vivek Kumar | `BACKUP OWNER REQUIRED` | Verify Vercel automated certificate issuance | Automated TLS validity check (validity > 14 days) | **NOT CONFIGURED — PUBLIC BETA BLOCKER** | Bound to production domain launch |

---

## 3. Launch Blocker Summary (Issue #41)

The following items are unresolved and must remain open blockers before authorizing Public Beta launch:

1. **Named Backup Production Owner**:
   - Status: **UNRESOLVED (BLOCKER)**
   - Requirement: A qualified secondary engineer must accept the role, obtain emergency access, and be briefed on runbooks.
2. **External Production Uptime & Alerting Integration**:
   - Status: **UNRESOLVED (BLOCKER)**
   - Requirement: Provision synthetic external monitoring for `https://fairswap.in` with verified alert routing to Vivek Kumar and the backup owner.
3. **Production Backup Schedule & PITR Verification (`FairSwapProd`)**:
   - Status: **UNRESOLVED (BLOCKER)**
   - Requirement: Conduct a human-authorized backup and test-restore verification against `FairSwapProd` data to confirm production backup integrity.
4. **Production Transactional Email (SMTP) Setup**:
   - Status: **UNRESOLVED (BLOCKER)**
   - Requirement: Provision production email provider with valid SPF, DKIM, and DMARC DNS records on `fairswap.in`.
5. **Issue #37 & Issue #38 Legal Applicability Finalization**:
   - Status: **UNRESOLVED (BLOCKER)**
   - Requirement: Formal legal determination of statutory intermediary classification and statutory compliance requirements.
