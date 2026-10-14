# FairSwap — Public Beta Operations Readiness Checklist (Issue #41)

> [!NOTE]
> **Dated operational readiness record:** Original evidence and owner risk acceptance are from September 2026. This checklist does not automatically certify a later or wider public launch. Before a new release or legal/compliance decision, verify live providers, migration state, operator coverage and remaining actions against [CURRENT_STATE](../CURRENT_STATE.md).


This document is the authoritative operations readiness checklist and evidence entry point for **Public Beta Launch** under GitHub Issue **#41**. It consolidates operational baselines, establishes the monitoring matrix, tracks unresolved blockers, and links to all supporting runbooks using repository-relative links.

---

## 1. Supporting Runbooks & Documentation Index

| Operational Area | Authoritative Runbook / Document | Current Status |
|---|---|---|
| **Operational Ownership & Access Control** | [`./operational-owner-matrix.md`](./operational-owner-matrix.md) | **Updated** (Primary: Vivek Kumar; no backup owner; residual risk accepted 2026-09-19) |
| **Incident Response & Statutory Protocols** | [`./incident-response-runbook.md`](./incident-response-runbook.md) | **Updated** (P0–P3, CERT-In 6h clock, DPDP May 2027) |
| **Backup, PITR & Disaster Recovery** | [`./backup-restore-runbook.md`](./backup-restore-runbook.md) | **Updated** (Staging recovery verified; FairSwapProd backup gap verified and owner risk accepted) |
| **Recovery Drill Evidence & History** | [`./recovery-drill-evidence.md`](./recovery-drill-evidence.md) | **Updated** (Staging Point 16 drill preserved) |
| **Deployment, Quality Gates & Rollback** | [`./deployment-guide.md`](./deployment-guide.md) | **Updated** (Tracked forward migrations; Vercel rollback (historical readiness matrix; re-audit current migration history before release)) |
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
| **3. Application / Server Errors (5xx)** | Vercel runtime log alerts / Error webhook | Vivek Kumar | None — risk accepted | Inspect stack trace; evaluate rollback if > 1% rate | Route error probe via synthetic test | **CLOSED / RISK ACCEPTED in #41** | Not technically implemented; residual risk accepted by Platform Owner on 2026-09-19 |
| **4. Client-Side Rendering Errors** | Ingestion endpoint (`/api/monitoring/client-error`) | Vivek Kumar | None — risk accepted | Triage UI regression; evaluate patch priority | Trigger React error boundary in staging | **CLOSED / RISK ACCEPTED in #41** | Boundary exists in code; external alerting not configured; residual risk accepted 2026-09-19 |
| **5. Supabase DB Health (Connections/CPU)** | Supabase project dashboard alerts | Vivek Kumar | None — risk accepted | Inspect pooler saturation; kill idle backends | Query `pg_stat_activity` under load | **CLOSED / RISK ACCEPTED in #41** | Automated alerting not configured on FairSwapProd; residual risk accepted 2026-09-19 |
| **6. Supabase Storage Health** | Supabase storage API metric alerts | Vivek Kumar | None — risk accepted | Inspect storage API 5xx, quota limits | Upload/download test asset probe | **CLOSED / RISK ACCEPTED in #41** | Manual dashboard check only; automated alerting not configured; residual risk accepted 2026-09-19 |
| **7. Supabase Realtime Health** | Realtime connection monitoring | Vivek Kumar | None — risk accepted | Verify publication tables; restart client listeners | Inspect WebSocket reconnect telemetry | **CLOSED / RISK ACCEPTED in #41** | Automated Realtime alerting not active; residual risk accepted 2026-09-19 |
| **8. Supabase Quotas / Resource Pressure** | Supabase billing / quota threshold notification | Vivek Kumar | None — risk accepted | Upgrade tier or prune storage/logs before cutoff | Review usage metrics against plan tier limits | **CLOSED / RISK ACCEPTED in #41** | Automated quota alert delivery unconfigured; residual risk accepted 2026-09-19 |
| **9. Authentication Failures (Spike / Brute-force)** | Auth rate-limit alerts / Upstash Redis | Vivek Kumar | None — risk accepted | Inspect IP clusters; enforce temporary block | Scripted rate-limit threshold test | **CLOSED / RISK ACCEPTED in #41** | Upstash distributed rate-limiting active in code; alert webhook not configured; residual risk accepted 2026-09-19 |
| **10. Transactional Email Failures** | Resend signed webhook -> operations Slack alert sink | Vivek Kumar | None — risk accepted | Inspect Resend event/log; correct recipient/domain/provider issue | Production bounce simulation + signed webhook | **CONFIGURED & VERIFIED (PRODUCTION PASS)** | FairSwapProd custom SMTP verified. Production Resend webhook (`https://fairswap.in/api/monitoring/resend`), `RESEND_WEBHOOK_SECRET`, and `OPERATIONS_ALERT_WEBHOOK_URL` configured; production redeploy green. Real production `email.bounced` event processed with HTTP 200 and sanitized Slack alert received by operator on 2026-09-19 |
| **11. DNS Health (`fairswap.in`)** | External DNS propagation / lookup monitor | Vivek Kumar | None — risk accepted | Check nameserver delegation and NS records | Global DNS lookup query (dig/nslookup) | **CLOSED / RISK ACCEPTED in #41** | Dedicated DNS monitor not configured; HTTP uptime probe detects site-level failure; residual risk accepted 2026-09-19 |
| **12. TLS / Certificate Health** | Cloudflare Universal SSL e-mail alert | Vivek Kumar | None — risk accepted | Verify automated certificate issuance / renewal | Cloudflare test notification | **CONFIGURED & TESTED (PRIMARY OWNER)** | Universal SSL test e-mail received 2026-09-19 |

---

## 3. Operational Status Summary & Owner-Accepted Residual Risks (Issue #41)

### Technically implemented & verified operational controls

1. **Production Transactional-Email Failure Alerting**:
   - Status: **CLOSED / VERIFIED (PRODUCTION PASS)**
   - Evidence: Production Resend webhook configured for `https://fairswap.in/api/monitoring/resend`, `RESEND_WEBHOOK_SECRET` and `OPERATIONS_ALERT_WEBHOOK_URL` set in Vercel Production. Production deployment confirmed green. A real production `email.bounced` event was delivered by Resend, processed with HTTP 200, and a sanitized operational alert was confirmed received in Slack by the operator on 2026-09-19.
2. **Uptime & TLS Monitoring**:
   - Status: **ACTIVE & TESTED**
   - Evidence: UptimeRobot HTTP probe and keyword monitoring active on `https://fairswap.in`; Cloudflare Universal SSL certificate monitoring active. Test notifications confirmed received on 2026-09-19.
3. **Deployment Safety**:
   - Status: **ACTIVE**
   - Evidence: Vercel deployment checks active on PR runs; Vercel Instant Rollback available for frontend releases.

### Closed by explicit owner risk acceptance (not technically implemented)

The Platform Owner confirmed under Issue #41 on 2026-09-19 that the following items will **not be pursued technically at this time** and are closed as owner-accepted residual risks for the current launch posture:

- **Backup Production Owner**: no backup owner designated; single-operator availability, access, and incident-response risk accepted on 2026-09-19.
- **Production Backup / PITR Gap**: FairSwapProd remains on Supabase Free with no managed project/database backups or PITR; no production restore exercise performed; Storage recovery unverified. Data-loss and recovery risk accepted on 2026-09-19.
- **Application / Server Errors (5xx Alerting)**: no automated 5xx alerting configured; residual risk accepted on 2026-09-19.
- **Client-Side Rendering Errors**: boundary exists in code, but automated external alert routing is unconfigured; residual risk accepted on 2026-09-19.
- **Supabase DB, Storage, Realtime, and Quota Alerting**: automated resource/quota metric alerts not configured; manual dashboard inspection only; residual risk accepted on 2026-09-19.
- **Authentication-Failure / Brute-Force Alerting**: distributed rate-limiting exists in code, but automated alerting on spike/threshold breach is unconfigured; residual risk accepted on 2026-09-19.
- **DNS-Specific Monitoring**: dedicated DNS lookup monitor not configured; HTTP probe detects site-level resolution failures; residual risk accepted on 2026-09-19.
- **Staging Credential Rotation**: previously exposed staging-only credentials not confirmed rotated; residual credential risk accepted on 2026-09-19.

Risk acceptance records the owner's operational decision under #41; it does **not** claim that the omitted technical controls exist, were configured, or were remediated.

### Separate external launch gates (Issues #37 & #38 — Closed as Not Planned)

Both Issue #37 and Issue #38 were closed as Not Planned by owner decision on 2026-09-19. Unresolved items remain deferred prerequisites to be revisited before a wider public launch:

- **Issue #37 (Grievance Mechanism)**: Statutory Grievance Officer details (`/grievance`, Vivek Kumar) and runbook are deployed; outbound grievance acknowledgement identity and delivery verification from `grievance@fairswap.in` remain deferred items recorded in closed #37.
- **Issue #38 (Legal Review & Registrations)**: Public Beta legal policies (`/terms`, `/privacy`, `/acceptable-use`, `/safety`) are deployed to production; formal legal counsel classification under IT Rules / Consumer Protection (E-Commerce) Rules and local Rajasthan establishment registrations (SAN / Shops Act) remain deferred items recorded in closed #38.
