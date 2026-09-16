# FairSwap — Incident Response Runbook (Milestone 1.6)

This runbook defines severity classifications, escalation channels, emergency playbooks, containment procedures, and post-mortem protocols for operational and security incidents across FairSwap.

---

## 1. Incident Severity Classifications

| Severity Level | Definition | Target Response | Target Resolution | Example Scenarios |
|---|---|---|---|---|
| **Sev 1 — Critical** | Total platform outage, unauthorized privileged access, active data exfiltration, or complete database/storage failure. | < 15 minutes | < 2 hours | Primary database unreachable, bypass of MFA/AAL2 controls, critical RLS bypass, mass data deletion. |
| **Sev 2 — Major** | Core user journey blocked, major component degraded, or severe partial failure with no viable workaround. | < 30 minutes | < 4 hours | Listing creation/upload failing, chat messages failing to deliver, excessive 5xx errors (> 5%). |
| **Sev 3 — Minor** | Non-critical component degraded, isolated edge-case bug, or minor operational defect with available workaround. | Next business day | < 48 hours | Non-blocking filter bug, localized UI styling anomaly, minor telemetry delivery delay. |

---

## 2. Emergency Incident Playbooks

### Playbook 1: Compromised Staff Account or Privileged Credential
* **Detection**: Alert from security telemetry, anomalous audit log entries in `public.audit_logs`, or report from account holder.
* **Containment**:
  1. **Revoke Staff Privileges Immediately**:
     ```sql
     DELETE FROM public.staff_roles WHERE user_id = '<COMPROMISED_USER_ID>';
     ```
  2. **Suspend User Account** (blocks all marketplace interactions and RLS operations):
     ```sql
     UPDATE public.user_accounts
     SET account_status = 'suspended'
     WHERE user_id = '<COMPROMISED_USER_ID>';
     ```
  3. **Revoke Active Sessions via Supported Supabase Admin API**:
     Use the official Supabase Auth Admin API (or server-side admin client) to terminate all sessions globally:
     ```typescript
     await supabase.auth.admin.signOut('<COMPROMISED_USER_ID>', 'global');
     ```
     > [!WARNING]
     > **NEVER DIRECTLY MUTATE INTERNAL SUPABASE AUTH TABLES**:
     > Do **NOT** execute manual SQL `DELETE FROM auth.refresh_tokens` or `DELETE FROM auth.mfa_factors`. Direct mutation of internal GoTrue tables can corrupt auth state machine invariants. Always invoke `supabase.auth.admin.signOut(userId, 'global')` or standard administrative API methods.
* **Preservation of Evidence**:
  * Snapshot `public.audit_logs` entries filtered by `actor_id = '<COMPROMISED_USER_ID>'`.
  * Export server access logs containing the IP and User-Agent signatures of the compromised sessions.
* **Escalation**: Notify Security Lead / Platform Owner within 15 minutes.
* **Recovery**: Reset password through authorized recovery flow; require new TOTP factor enrollment before re-assigning any staff role.
* **Customer Communication Owner**: `OWNER REQUIRED BEFORE PUBLIC PILOT` (Default: Platform Administrator).
* **Post-Incident Review**: Conduct 5-Whys root cause analysis; review credential hygiene and MFA enforcement.

---

### Playbook 2: Credential Exposure (API Keys, Bypass Secrets, Tokens)
* **Detection**: Automated scanning (e.g. GitHub secret scanning), transcript review, or developer self-report.
* **Containment**:
  1. Rotate the exposed secret immediately at its source (Vercel Project Settings, Supabase Dashboard, or Redis provider).
  2. Deploy replacement environment variable to staging/production without logging its value.
  3. Revoke/delete the prior credential version.
* **Preservation of Evidence**: Note commit SHA or exposure location; log timestamp of exposure vs timestamp of revocation.
* **Escalation**: Escalate immediately to Security Lead and Platform Owner.
* **Recovery**: Verify application health and automated test suites with new credentials.
* **Customer Communication Owner**: Not applicable unless customer data accessed; if customer impact exists, `OWNER REQUIRED BEFORE PUBLIC PILOT`.
* **Post-Incident Review**: Implement pre-commit hooks and CI lint guards to prevent secret exposure.

---

### Playbook 3: Database Outage or Unavailability
* **Detection**: Health check endpoint `/api/listings/recent` returns 500/503; Vercel server functions log connection timeouts to Supabase.
* **Containment**:
  1. Inspect Supabase platform status (status.supabase.com) for provider-wide incidents.
  2. Inspect connection pooler (PgBouncer / Supavisor) metrics on Supabase project dashboard.
  3. Check connection pool saturation; terminate lingering idle transactions if necessary:
     ```sql
     SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle in transaction' AND state_change < current_timestamp - INTERVAL '5 minutes';
     ```
* **Preservation of Evidence**: Capture connection pooler metrics, active query count, and Postgres error logs.
* **Escalation**: Escalate to Lead Database Administrator (`OWNER REQUIRED BEFORE PUBLIC PILOT`).
* **Recovery**: If primary database is unrecoverable, follow `docs/operations/backup-restore-runbook.md` to restore to the latest verified backup.
* **Customer Communication Owner**: `OWNER REQUIRED BEFORE PUBLIC PILOT`.
* **Post-Incident Review**: Review connection limits, query timeouts, and pooler settings.

---

### Playbook 4: Object Storage Outage
* **Detection**: Image uploads fail; media processing jobs throw 5xx; listing detail pages render fallback placeholder images.
* **Containment**:
  1. Verify Supabase Storage API health.
  2. Check Storage egress and API quotas on Supabase dashboard.
  3. Inspect client and server logs for storage endpoint error payloads.
* **Preservation of Evidence**: Save failed upload error bodies and correlation IDs.
* **Escalation**: Escalate to DevOps / Storage Engineer (`OWNER REQUIRED BEFORE PUBLIC PILOT`).
* **Recovery**: Re-enable service; if objects were lost, restore from verified storage backup manifest using `scripts/backup-storage.ts` artifacts.
* **Customer Communication Owner**: `OWNER REQUIRED BEFORE PUBLIC PILOT`.
* **Post-Incident Review**: Assess storage redundancy, multi-region failover, or CDN caching layer.

---

### Playbook 5: Realtime / WebSocket Outage
* **Detection**: Chat messages do not update in real-time without manual browser refresh; presence indicators fail.
* **Containment**:
  1. Verify Realtime service status in Supabase project dashboard.
  2. Check whether `supabase_realtime` publication includes expected tables:
     ```sql
     SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
     ```
  3. If publication was dropped or modified, re-add tables:
     ```sql
     ALTER PUBLICATION supabase_realtime ADD TABLE messages;
     ```
* **Preservation of Evidence**: Capture Realtime client reconnection logs.
* **Escalation**: Escalate to Realtime / Frontend Lead (`OWNER REQUIRED BEFORE PUBLIC PILOT`).
* **Recovery**: Restart Realtime listeners; fallback to polling mode in client application if necessary.
* **Customer Communication Owner**: Not required for Sev 3; if persistent Sev 2, `OWNER REQUIRED BEFORE PUBLIC PILOT`.
* **Post-Incident Review**: Review database replication slots and Realtime broadcast limits.

---

### Playbook 6: Failed Deployment (Vercel / Next.js)
* **Detection**: Vercel deployment status is `ERROR` or build fails; production endpoint serves 500 on route loading.
* **Containment**:
  1. Immediately navigate to Vercel Deployments dashboard.
  2. Trigger **Instant Rollback** to the last known-good deployment.
  3. If database migrations were executed forward, evaluate whether the application is backward-compatible before rolling back frontend.
* **Preservation of Evidence**: Save full Vercel build and runtime function logs.
* **Escalation**: Escalate to Release Manager / DevOps Engineer (`OWNER REQUIRED BEFORE PUBLIC PILOT`).
* **Recovery**: Fix regression on feature branch, run typecheck, lint, and build locally, and redeploy.
* **Customer Communication Owner**: `OWNER REQUIRED BEFORE PUBLIC PILOT`.
* **Post-Incident Review**: Enforce automated deployment preflight checks.

---

### Playbook 7: Excessive 5xx Error Rate
* **Detection**: Vercel runtime telemetry or monitoring endpoint indicates 5xx rate > 1%.
* **Containment**:
  1. Query Vercel runtime logs filtering by status code $\ge$ 500.
  2. Identify failing route (e.g. `/api/listings/create`, `/api/messages/send`).
  3. If caused by external dependency (e.g. Redis, SMTP), activate circuit breaker or fallback gracefully.
* **Preservation of Evidence**: Record error stack traces, request paths, and timestamps.
* **Escalation**: Escalate to On-Call Backend Engineer (`OWNER REQUIRED BEFORE PUBLIC PILOT`).
* **Recovery**: Patch offending logic or scale serverless memory/timeout allocations.
* **Customer Communication Owner**: `OWNER REQUIRED BEFORE PUBLIC PILOT`.
* **Post-Incident Review**: Add regression test suite covering the failure pattern.

---

### Playbook 8: Backup Failure (DB, Storage, or Verification Drill)
* **Detection**: Scheduled backup script exits with non-zero code or manifest SHA-256 validation fails.
* **Containment**:
  1. Quarantine any incomplete or corrupted backup files under `artifacts/backups/`.
  2. Verify active production/staging database and storage are unaffected.
  3. Re-execute manual backup with explicit target:
     ```bash
     pnpm tsx scripts/backup-database.ts --target=staging
     pnpm tsx scripts/backup-storage.ts --target=staging
     ```
* **Preservation of Evidence**: Save execution logs detailing CLI failure, disk full, or API timeout.
* **Escalation**: Escalate to Reliability Lead (`OWNER REQUIRED BEFORE PUBLIC PILOT`).
* **Recovery**: Ensure fresh valid backup and verified manifest exist.
* **Customer Communication Owner**: Internal only (no customer impact).
* **Post-Incident Review**: Review disk quotas, network egress limits, and API timeouts.

---

### Playbook 9: Suspected Data Corruption
* **Detection**: Integrity checks report orphan foreign keys, broken relationships, or users report missing listings.
* **Containment**:
  1. Place platform into maintenance mode if corruption is propagating.
  2. Run read-only referential integrity diagnostic script across all application tables.
  3. Identify corruption boundary (specific table, user cohort, or time window).
* **Preservation of Evidence**: Take an immediate read-only snapshot before any remediation.
* **Escalation**: Escalate immediately to Principal Database Architect and Platform Owner.
* **Recovery**: Execute forward corrective SQL repair scripts if isolated, or restore from verified backup if widespread.
* **Customer Communication Owner**: `OWNER REQUIRED BEFORE PUBLIC PILOT`.
* **Post-Incident Review**: Add database-level constraints or triggers to prevent invalid state transitions.

---

### Playbook 10: Email Provider Outage (SMTP / Transactional Email)
* **Detection**: User reports of missing verification emails, password resets, or support ticket notifications; mail server returns timeout/auth errors.
* **Containment**:
  1. Inspect status of transactional email provider (SendGrid / Postmark / SES).
  2. Verify application email delivery queue or client logs.
  3. Enable graceful UI messaging notifying users that email delivery is currently delayed.
* **Preservation of Evidence**: Save SMTP failure error codes and affected recipient addresses.
* **Escalation**: Escalate to Operations Engineer (`OWNER REQUIRED BEFORE PUBLIC PILOT`).
* **Recovery**: Switch to secondary backup SMTP relay or wait for upstream recovery; replay queued notification events.
* **Customer Communication Owner**: `OWNER REQUIRED BEFORE PUBLIC PILOT`.
* **Post-Incident Review**: Implement dead-letter queue and automatic retry mechanism for transactional emails.

---

## 3. Post-Mortem & Ownership Requirements

Following any Sev 1 or Sev 2 incident, a blameless post-mortem must be published within 48 hours covering:
1. Incident timeline (UTC)
2. Quantitative impact assessment
3. Root Cause Analysis (RCA)
4. Preventive action items with designated owners and target completion dates.

> [!IMPORTANT]
> **Operational Ownership Prerequisite**:
> All role placeholders marked `OWNER REQUIRED BEFORE PUBLIC PILOT` must be assigned to named staff members with documented 24/7 on-call contact channels before public production launch.
