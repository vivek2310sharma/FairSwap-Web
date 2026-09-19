# FairSwap — Public Beta Operations Readiness Checklist (Issue #41)

This document is the authoritative operations readiness checklist and evidence entry point for **Public Beta Launch** under GitHub Issue **#41**. It consolidates operational baselines, establishes the monitoring matrix, tracks unresolved blockers, and links to all supporting runbooks using repository-relative links.

---

## 1. Supporting Runbooks & Documentation Index

| Operational Area | Authoritative Runbook / Document | Current Status |
|---|---|---|
| **Operational Ownership & Access Control** | [`./operational-owner-matrix.md`](./operational-owner-matrix.md) | **Updated** (Primary: Vivek Kumar; no backup owner; residual risk accepted 2026-09-19) |
| **Incident Response & Statutory Protocols** | [`./incident-response-runbook.md`](./incident-response-runbook.md) | **Updated** (P0–P3, CERT-In 6h clock, DPDP May 2027) |
| **Backup, PITR & Disaster Recovery** | [`./backup-restore-runbook.md`](./backup-restore-runbook.md) | **Updated** (Staging recovery verified; FairSwapProd backup gap verified and owner risk accepted) |
| **Recovery Drill Evidence & History** | [`./recovery-drill-evidence.md`](./recovery-drill-evidence.md) | **Updated** (Staging Point 16 drill preserved) |
| **Deployment, Quality Gates & Rollback** | [`./deployment-guide.md`](./deployment-guide.md) | **Updated** (Migrations 1–21; Vercel Instant Rollback) |
| **Tabletop Incident Simulation** | [`./tabletop-simulation-2026-09-19.md`](./tabletop-simulation-2026-09-19.md) | **Executed & Recorded** (Credential leak & 5xx procedure walkthrough) |

---

## 2. Public Beta Operations Monitoring Matrix

The following matrix tracks the required observability signals for the live production environment (`https://fairswap.in`).

> [!CAUTION]
> **Monitoring Reality Attestation**:
> FairSwap now has primary-owner external HTTP/content monitoring through UptimeRobot and TLS certificate notifications through Cloudflare, with e-mail notification paths tested on 2026-09-19. No backup production owner is designated; that single-operator risk was explicitly accepted on 2026-09-19. Automated phone/SMS alerting is not configured.
> Any remaining signal not verified through repository evidence or verified dashboard inspection is marked **`UNVERIFIED`** or **`NOT CONFIGURED — PUBLIC BETA BLOCKER`**. Documentation alone does not satisfy launch readiness.

| Signal / Source | Alert Destination | Primary Owner | Backup Owner | Expected Operational Response | Test Method | Current Status | Evidence / Notes |
|---|---|---|---|---|---|---|---|
| **1. `https://fairswap.in` Availability** | UptimeRobot e-mail alert | Vivek Kumar | None — risk accepted | Ack < 30m; triage DNS/Vercel/edge status | 5-minute HTTPS probe + provider Test Notification | **CONFIGURED & TESTED (PRIMARY OWNER)** | UptimeRobot HTTP + keyword monitors created; simulated DOWN and UP e-mails received 2026-09-19 |
| **2. Vercel Deployment Failures** | GitHub commit check / Vercel notification | Vivek Kumar | None — risk accepted | Triage build error; block rollout to main | Trigger deliberate build failure on feature branch | **CONFIGURED & ACTIVE** | Staging build checks verified in PR runs |
| **3. Application / Server Errors (5xx)** | Vercel runtime log alerts / Error webhook | Vivek Kumar | None — risk accepted | Inspect stack trace; evaluate rollback if > 1% rate | Route error probe via synthetic test | **NOT CONFIGURED — PUBLIC BETA BLOCKER** | Pending alert destination configuration |
| **4. Client-Side Rendering Errors** | Ingestion endpoint (`/api/monitoring/client-error`) | Vivek Kumar | None — risk accepted | Triage UI regression; evaluate patch priority | Trigger React error boundary in staging | **PARTIALLY CONFIGURED** (Boundary exists; alert routing unverified) | Error boundaries in repo; external alerting pending |
| **5. Supabase DB Health (Connections/CPU)** | Supabase project dashboard alerts | Vivek Kumar | None — risk accepted | Inspect pooler saturation; kill idle backends | Query `pg_stat_activity` under load | **NOT CONFIGURED — PUBLIC BETA BLOCKER** | Automated alerting unverified on FairSwapProd |
| **6. Supabase Storage Health** | Supabase storage API metric alerts | Vivek Kumar | None — risk accepted | Inspect storage API 5xx, quota limits | Upload/download test asset probe | **NOT CONFIGURED — PUBLIC BETA BLOCKER** | Manual dashboard check only |
| **7. Supabase Realtime Health** | Realtime connection monitoring | Vivek Kumar | None — risk accepted | Verify publication tables; restart client listeners | Inspect WebSocket reconnect telemetry | **NOT CONFIGURED — PUBLIC BETA BLOCKER** | No automated Realtime monitor active |
| **8. Supabase Quotas / Resource Pressure** | Supabase billing / quota threshold notification | Vivek Kumar | None — risk accepted | Upgrade tier or prune storage/logs before cutoff | Review usage metrics against plan tier limits | **UNVERIFIED — PUBLIC BETA BLOCKER** | Actual plan tier and alert delivery unverified |
| **9. Authentication Failures (Spike / Brute-force)** | Auth rate-limit alerts / Upstash Redis | Vivek Kumar | None — risk accepted | Inspect IP clusters; enforce temporary block | Scripted rate-limit threshold test | **PARTIALLY CONFIGURED** (Upstash distributed rate-limiting active; alert webhook unconfigured) | Rate limiter verified in Milestone 1.2 tests |
| **10. Transactional Email Failures** | Resend signed webhook -> operations alert sink | Vivek Kumar | None — risk accepted | Inspect Resend event/log; correct recipient/domain/provider issue | Production password reset + signed webhook test | **STAGING PASS; PRODUCTION ALERTING PENDING** | FairSwapProd custom SMTP delivery verified. Staging Resend -> signed FairSwap webhook -> Slack alert passed end-to-end on 2026-09-19. Production Resend event subscription, secret, alert sink and failure-alert test remain pending |
| **11. DNS Health (`fairswap.in`)** | External DNS propagation / lookup monitor | Vivek Kumar | None — risk accepted | Check nameserver delegation and NS records | Global DNS lookup query (dig/nslookup) | **NOT CONFIGURED — PUBLIC BETA BLOCKER** | Endpoint exists; external monitor not configured |
| **12. TLS / Certificate Health** | Cloudflare Universal SSL e-mail alert | Vivek Kumar | None — risk accepted | Verify automated certificate issuance / renewal | Cloudflare test notification | **CONFIGURED & TESTED (PRIMARY OWNER)** | Universal SSL test e-mail received 2026-09-19 |

---

## 3. Open Items and Owner-Accepted Residual Risks (Issue #41)

### Open operational items

1. **Production Transactional-Email Failure Alerting**:
   - Status: **OPEN**
   - Evidence: FairSwapProd custom SMTP delivery through Resend is functional; staging Resend -> FairSwap -> Slack failure alerting passed end-to-end on 2026-09-19.
   - Remaining work: configure the production Resend webhook, production `RESEND_WEBHOOK_SECRET`, production `OPERATIONS_ALERT_WEBHOOK_URL`, and prove one signed production failure/bounce alert reaches the operator.
2. **Application / Client Error Alert Routing**:
   - Status: **OPEN**
   - Remaining work: configure actionable alert routing for production 5xx/server errors and meaningful client-side failures.
3. **Supabase Health / Quota Monitoring**:
   - Status: **OPEN**
   - Remaining work: establish or explicitly disposition production DB, Storage, Realtime, and quota/resource-pressure alerting.
4. **Authentication-Failure Alerting**:
   - Status: **OPEN**
   - Remaining work: add actionable alerting for material authentication-failure/brute-force spikes; rate limiting already exists.
5. **DNS-Specific Monitoring**:
   - Status: **OPEN**
   - Remaining work: add a dedicated DNS-specific signal if retained as a requirement. Existing HTTP monitoring detects DNS-caused site outages but does not diagnose DNS separately.
6. **Issue #37 & Issue #38 launch gates**:
   - Status: **OPEN**
   - #37 grievance operational/legal closure and #38 final legal applicability review remain separate launch gates.

### Closed by explicit owner risk acceptance

- **Backup Production Owner** — no backup owner designated; single-operator availability/access risk accepted on 2026-09-19.
- **Production Backup / PITR Gap** — FairSwapProd remains on Supabase Free with no managed project/database backups or PITR; no production restore exercise performed; Storage recovery unverified. Data-loss/recovery risk accepted on 2026-09-19.
- **Staging credential rotation** — previously exposed staging-only credentials were not confirmed rotated; residual credential risk accepted on 2026-09-19.

Risk acceptance means these gaps are no longer treated as owner-blocking checklist items under #41, but it does **not** mean the underlying technical controls exist or were remediated.
