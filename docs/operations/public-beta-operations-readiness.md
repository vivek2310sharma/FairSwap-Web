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
> FairSwap now has primary-owner external HTTP/content monitoring through UptimeRobot and TLS certificate notifications through Cloudflare, with e-mail notification paths tested on 2026-09-19. Automated phone/SMS alerting and backup-owner alert routing are not configured.
> Any remaining signal not verified through repository evidence or verified dashboard inspection is marked **`UNVERIFIED`** or **`NOT CONFIGURED — PUBLIC BETA BLOCKER`**. Documentation alone does not satisfy launch readiness.

| Signal / Source | Alert Destination | Primary Owner | Backup Owner | Expected Operational Response | Test Method | Current Status | Evidence / Notes |
|---|---|---|---|---|---|---|---|
| **1. `https://fairswap.in` Availability** | UptimeRobot e-mail alert | Vivek Kumar | `BACKUP OWNER REQUIRED` | Ack < 30m; triage DNS/Vercel/edge status | 5-minute HTTPS probe + provider Test Notification | **CONFIGURED & TESTED (PRIMARY OWNER)** | UptimeRobot HTTP + keyword monitors created; simulated DOWN and UP e-mails received 2026-09-19 |
| **2. Vercel Deployment Failures** | GitHub commit check / Vercel notification | Vivek Kumar | `BACKUP OWNER REQUIRED` | Triage build error; block rollout to main | Trigger deliberate build failure on feature branch | **CONFIGURED & ACTIVE** | Staging build checks verified in PR runs |
| **3. Application / Server Errors (5xx)** | Vercel runtime log alerts / Error webhook | Vivek Kumar | `BACKUP OWNER REQUIRED` | Inspect stack trace; evaluate rollback if > 1% rate | Route error probe via synthetic test | **NOT CONFIGURED — PUBLIC BETA BLOCKER** | Pending alert destination configuration |
| **4. Client-Side Rendering Errors** | Ingestion endpoint (`/api/monitoring/client-error`) | Vivek Kumar | `BACKUP OWNER REQUIRED` | Triage UI regression; evaluate patch priority | Trigger React error boundary in staging | **PARTIALLY CONFIGURED** (Boundary exists; alert routing unverified) | Error boundaries in repo; external alerting pending |
| **5. Supabase DB Health (Connections/CPU)** | Supabase project dashboard alerts | Vivek Kumar | `BACKUP OWNER REQUIRED` | Inspect pooler saturation; kill idle backends | Query `pg_stat_activity` under load | **NOT CONFIGURED — PUBLIC BETA BLOCKER** | Automated alerting unverified on FairSwapProd |
| **6. Supabase Storage Health** | Supabase storage API metric alerts | Vivek Kumar | `BACKUP OWNER REQUIRED` | Inspect storage API 5xx, quota limits | Upload/download test asset probe | **NOT CONFIGURED — PUBLIC BETA BLOCKER** | Manual dashboard check only |
| **7. Supabase Realtime Health** | Realtime connection monitoring | Vivek Kumar | `BACKUP OWNER REQUIRED` | Verify publication tables; restart client listeners | Inspect WebSocket reconnect telemetry | **NOT CONFIGURED — PUBLIC BETA BLOCKER** | No automated Realtime monitor active |
| **8. Supabase Quotas / Resource Pressure** | Supabase billing / quota threshold notification | Vivek Kumar | `BACKUP OWNER REQUIRED` | Upgrade tier or prune storage/logs before cutoff | Review usage metrics against plan tier limits | **UNVERIFIED — PUBLIC BETA BLOCKER** | Actual plan tier and alert delivery unverified |
| **9. Authentication Failures (Spike / Brute-force)** | Auth rate-limit alerts / Upstash Redis | Vivek Kumar | `BACKUP OWNER REQUIRED` | Inspect IP clusters; enforce temporary block | Scripted rate-limit threshold test | **PARTIALLY CONFIGURED** (Upstash distributed rate-limiting active; alert webhook unconfigured) | Rate limiter verified in Milestone 1.2 tests |
| **10. Transactional Email Failures** | Resend signed webhook -> operations alert sink | Vivek Kumar | `BACKUP OWNER REQUIRED` | Inspect Resend event/log; correct recipient/domain/provider issue | Production password reset + signed webhook test | **PARTIALLY CONFIGURED — ALERT ROUTING PENDING** | FairSwapProd custom SMTP uses Resend; real password-reset delivery received. Signed `/api/monitoring/resend` receiver implemented; production Resend event subscription, secret and alert sink still require configuration/test |
| **11. DNS Health (`fairswap.in`)** | External DNS propagation / lookup monitor | Vivek Kumar | `BACKUP OWNER REQUIRED` | Check nameserver delegation and NS records | Global DNS lookup query (dig/nslookup) | **NOT CONFIGURED — PUBLIC BETA BLOCKER** | Endpoint exists; external monitor not configured |
| **12. TLS / Certificate Health** | Cloudflare Universal SSL e-mail alert | Vivek Kumar | `BACKUP OWNER REQUIRED` | Verify automated certificate issuance / renewal | Cloudflare test notification | **CONFIGURED & TESTED (PRIMARY OWNER)** | Universal SSL test e-mail received 2026-09-19 |

---

## 3. Launch Blocker Summary (Issue #41)

The following items are unresolved and remain open blockers before authorizing Public Beta launch:

1. **Named Backup Production Owner**:
   - Status: **UNRESOLVED (BLOCKER)**
   - Requirement: A qualified secondary engineer must accept the role, obtain emergency access, and be briefed on runbooks.
2. **Live External Production Monitoring & Alerting**:
   - Status: **PRIMARY OWNER VERIFIED; BACKUP ROUTING UNRESOLVED (BLOCKER)**
   - Evidence: UptimeRobot HTTP/keyword monitoring and DOWN/UP e-mail alert delivery to Vivek Kumar passed on 2026-09-19; Cloudflare Universal SSL notification test also passed.
   - Requirement: route appropriate alerts to the named Backup Production Owner once that role is filled; DNS-specific monitoring remains separate if retained.
3. **Production Backup & PITR Verification (`FairSwapProd`)**:
   - Status: **VERIFIED GAP (BLOCKER)**
   - Evidence: FairSwapProd is currently on Supabase Free and does not include managed project/database backups; no production restore was attempted.
   - Requirement: upgrade to verified managed-backup coverage or implement a production-safe external database backup/export strategy, then prove recovery into an isolated non-production target. Storage objects require a separate recovery strategy. **Never restore a test backup over `FairSwapProd`**.
4. **Production Transactional Email (SMTP)**:
   - Status: **DELIVERY VERIFIED; FAILURE ALERTING IN PROGRESS (BLOCKER)**
   - Evidence: FairSwapProd Custom SMTP is enabled with Resend and a real production password-reset e-mail was received. The signed Resend monitoring receiver is implemented in the current operations-monitoring change.
   - Requirement: configure the Resend production webhook, `RESEND_WEBHOOK_SECRET`, and `OPERATIONS_ALERT_WEBHOOK_URL`; then prove one signed failure/bounce test reaches the operator alert destination.
5. **Issue #37 & Issue #38 Legal Applicability Finalization**:
   - Status: **UNRESOLVED (BLOCKER)**
   - Requirement: Formal legal determination of statutory intermediary classification and compliance obligations under India IT Rules and related statutes.
