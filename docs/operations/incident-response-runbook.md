# FairSwap — Incident Response Runbook (Public Beta Readiness)

This runbook defines severity classifications, operational response flows, emergency containment playbooks, statutory reporting considerations, and post-incident review protocols for **FairSwap** (a peer-to-peer local classifieds platform).

It is tailored to a single-operator model led by the Primary Production Owner (Vivek Kumar). On 2026-09-19, the Platform Owner explicitly accepted the operational risk under Issue #41 of operating without a designated backup owner for the current launch posture.

---

## 1. Incident Severity Classifications (P0 – P3)

The following operational targets are internal engineering goals to guide triage and prioritization during Public Beta. They are **operational targets**, not contractual customer Service Level Agreements (SLAs).

| Severity | Definition | Operational Target (Ack / Triage) | Target Resolution / Containment | Representative Scenarios |
|---|---|---|---|---|
| **P0 — Critical** | Active security compromise, verified data exfiltration/leak, destructive malicious tampering, or complete platform outage impacting all users. | Immediate (< 30 mins) | Immediate containment (< 2 hours) | Active administrative credential compromise, public leak of user databases, total Supabase or Vercel production outage, RLS authorization bypass leaking personal data. |
| **P1 — Major** | Core classifieds journeys blocked, severe security degradation, or major platform component unavailable without a viable workaround. | < 1 hour | < 4 hours | Users cannot sign in or view listings, image upload pipeline completely down, message delivery failing across all active chats, elevated 5xx error rate (> 5%). |
| **P2 — Moderate** | Important platform feature degraded or impaired, but core functionality remains usable or an operational workaround exists. | < 4 hours (operational hours) | < 24 hours | Search filtering degraded, notification delivery delayed, localized UI rendering defect on specific devices, support ticket creation intermittent. |
| **P3 — Minor** | Low-impact defect, non-blocking cosmetic anomaly, localized edge case, or routine operational maintenance inquiry. | Next business day | Scheduled release cycle | Minor styling inconsistency, non-blocking telemetry warning in logs, minor documentation defect. |

---

## 2. End-to-End Incident Lifecycle Flow

All incidents follow this structured 10-stage lifecycle:

```
[1. DETECT] ----> [2. ASSESS] ----> [3. TRIAGE] ----> [4. CONTAIN] ----> [5. PRESERVE]
                                                                               |
[10. REVIEW] <--- [9. COMMUNICATE] <-- [8. VERIFY] <-- [7. RECOVER] <--- [6. REMEDIATE]
```

1. **Detect**: Signal identified via uptime monitor, Vercel runtime alerts, Supabase dashboard, user report to Grievance Officer, or automated code scanning.
2. **Assess**: Initial evaluation of user impact, data integrity, and security exposure.
3. **Triage**: Assign severity (P0, P1, P2, P3); activate Incident Commander (Vivek Kumar; single-operator posture accepted under #41).
4. **Contain**: Execute immediate non-destructive containment to arrest ongoing harm or exposure.
5. **Preserve Evidence**: Export logs, snapshot audit entries, and record commit SHAs and timestamps before modifying state.
6. **Remediate**: Deploy code fix, execute forward database migration, rotate exposed credentials, or adjust infrastructure settings.
7. **Recover**: Restore full service availability; remove emergency access restrictions.
8. **Verify**: Perform smoke tests and regression checks to confirm normal behavior across frontend and backend.
9. **Communicate**: Provide factual updates to affected users and initiate regulatory assessments where applicable.
10. **Review**: Conduct a blameless post-mortem; track corrective action items in GitHub issues.

---

## 3. Explicit Decision Points Matrix

The Incident Commander must evaluate these critical decision points during active triage and containment:

| Decision Point | Trigger Criteria | Authorization & Execution Path |
|---|---|---|
| **Frontend Rollback** | Recent Vercel deployment causes elevated 5xx or breaks core journeys, and **database schema remains backward-compatible**. | **Incident Commander**. Trigger Instant Rollback in Vercel to last-known-good deployment. |
| **Feature Disablement** | Specific feature (e.g. chat, media upload, registration) is malfunctioning or under attack while remainder of platform is healthy. | **Incident Commander**. Deploy environment variable flag or feature toggle; display graceful maintenance notice. |
| **Traffic Restriction** | Severe DDoS, aggressive automated scraping, or resource exhaustion threatening platform stability. | **Incident Commander**. Enable Vercel Attack Mode or apply IP/rate-limit controls at proxy layer. |
| **Account Suspension** | Staff or user account suspected compromised, abusing platform, or attempting privilege escalation. | **Incident Commander / Staff**. Update `public.user_accounts` status to `'suspended'` via supported RPC/SQL. |
| **Credential Rotation** | Any secret, API key, service token, or database password exposed in Git, logs, or third-party breaches. | **Incident Commander**. Immediately rotate in Vercel / Supabase / Upstash; revoke prior version; test deployment. |
| **Vendor Escalation** | Outage or degradation originating in upstream infrastructure (Vercel, Supabase, Upstash, DNS, Email). | **Incident Commander**. Inspect vendor status pages; file high-priority support ticket; inform users of upstream dependency. |
| **User Communications** | Incident impacts user data accessibility, security, or causes extended visible downtime (> 2 hours). | **Primary Production Owner / Grievance Officer**. Publish transparent notice on platform banner or direct communication. |
| **Authority / Legal Escalation** | Cyber incident potentially falls under CERT-In Annexure I or data protection statutes. | **Primary Production Owner**; engage external legal counsel if/when required. The owner of deciding and escalating that engagement is Vivek Kumar. Initiate 6-hour CERT-In assessment clock immediately. |

---

## 4. Statutory Cyber Security & Data Breach Protocols

### A. CERT-In Direction (Section 70B) Operational Protocol
Pursuant to the **Directions under sub-section (6) of section 70B of the Information Technology Act, 2000** (issued 28 April 2022 by CERT-In; see [CERT-In Directions 70B](https://www.cert-in.org.in/Directions70B.jsp)):
* **Broad Scope & Applicability**:
  * The Directions specify covered categories including service providers, intermediaries, data centres, body corporates, and Government organisations.
  * Furthermore, CERT-In's official FAQs clarify that "body corporate" is defined broadly (including sole proprietorships, partnerships, and companies), and state that the 28 April 2022 Directions apply to all entities insofar as cyber-incident reporting is concerned.
* **Annexure-I Reportable Incidents**: Reportable incident types include unauthorized access to IT systems/data, compromise of critical systems, targeted scanning/probing, identity theft/spoofing, data breach/data leak, attacks on servers/network infrastructure, and other listed cyber security incidents.
* **Reporting Window**: Covered entities must report Annexure-I incidents to CERT-In **within 6 hours** of noticing the incident or the incident being brought to notice.
* **Reporting Channel**: Formal report to `incident@cert-in.org.in` using the format published on the CERT-In portal.
* **Point of Contact (PoC)**: Covered entities must designate a Point of Contact for liaison with CERT-In. (Note: Formal designation of FairSwap's CERT-In PoC is an unverified operational item subject to legal review in #38; contact records must be maintained securely outside Git).
* **System Log Retention**: Covered entities are required to maintain ICT-system logs securely within India for a rolling duration of **180 days**.

> [!IMPORTANT]
> **FairSwap Operational Rule on CERT-In Reporting**:
> While FairSwap's precise legal classification is under formal review in Issue **#38**, CERT-In's broad interpretation of covered entities requires a conservative posture.
> **Conservative Operational Invariant**: Any security incident that appears to match CERT-In Annexure I (e.g. credential compromise, unauthorized database access, suspected data leak) must **immediately start a CERT-In applicability and reportability assessment**.
> The Incident Commander must treat the **six-hour window** as the internal maximum escalation clock, ensuring FairSwap preserves the capability to report on time if the requirement applies.

### B. Digital Personal Data Protection (DPDP) Readiness Framework
* **Statutory Baseline**: Based on the 13 November 2025 commencement notification and the DPDP Rules 2025:
  * **Rule 7** establishes the detailed notification process for personal data breaches.
  * Rules 3, 5–16, 22, and 23—along with their corresponding substantive Act provisions—come into force **eighteen months** following official publication.
* **Current Operational Posture (September 2026)**:
  * Rule 7 is **not yet in force** as a binding legal obligation.
  * **Future Compliance Checkpoint**: **13 May 2027** (end of 18-month staging transition).
* **Readiness Architecture (Future Requirements under Rule 7)**:
  1. **Notification to Data Principals**: In the event of a confirmed personal data breach, affected individuals must be notified **without delay** with clear guidance on protective steps.
  2. **Initial Report to the Data Protection Board**: An initial description of the breach must be submitted **without delay**.
  3. **Detailed Follow-up**: Comprehensive report submitted to the Board within **72 hours** (or within an extension permitted by the Board).
* During Public Beta, FairSwap tracks these guidelines as operational best practices to ensure procedural readiness prior to 13 May 2027.

---

## 5. Emergency Technical Playbooks

### Playbook 1: Compromised Staff Account or Privileged Credential
* **Detection**: Anomalous entries in `public.audit_logs`, unexpected administrative actions, or staff notification.
* **Containment Protocol**:
  1. **Immediately Suspend User Account**:
     ```sql
     UPDATE public.user_accounts
     SET account_status = 'suspended'
     WHERE user_id = '<COMPROMISED_USER_ID>';
     ```
     *Security Invariant*: FairSwap's database RPCs and data layer evaluate `app_security.get_account_status(auth.uid())`. A `'suspended'` status immediately revokes all classifieds-platform mutations/features and access, even if the caller holds a valid, unexpired JWT.
  2. **Immediately Revoke Staff Roles**:
     ```sql
     DELETE FROM public.staff_roles WHERE user_id = '<COMPROMISED_USER_ID>';
     ```
  3. **User Session Containment vs. API Key Containment**:
     * Supabase Auth `supabase.auth.admin.signOut(jwt, 'global')` requires an active session JWT, not a standalone user ID.
     * Stateless user JWTs remain cryptographically valid until expiration (1 hour). Therefore, **Step 1 (`account_status = 'suspended'`) is the authoritative real-time security barrier** dynamically enforced by database RPCs.
     * Note: Rotating an application API key (`sb_secret_...`) prevents programmatic backend access but does not invalidate end-user Auth sessions; conversely, user session containment does not affect application service keys.
  4. **Strict Safety Prohibition**:
     > [!CAUTION]
     > **DO NOT DIRECTLY MUTATE `auth.*` INTERNAL TABLES**:
     > Never execute manual SQL `DELETE FROM auth.sessions` or `DELETE FROM auth.users`. Bypassing GoTrue auth internal state machines risks data corruption.
* **Preservation of Evidence**: Export all `public.audit_logs` where `actor_id = '<COMPROMISED_USER_ID>'`. Record source IP and User-Agent from Vercel runtime logs.
* **Remediation**: Reset account credentials via official administrative recovery flow; require fresh TOTP factor enrollment.

---

### Playbook 2: Application Credential / Secret Exposure
* **Detection**: GitHub Secret Scanning alert, transcript inspection, or developer disclosure.
* **Containment**:
  1. Rotate exposed secret immediately at its source (Vercel Project Settings, Supabase Dashboard, Upstash Redis, or SMTP provider).
  2. Deploy updated environment variable to staging/production.
  3. Revoke/delete the compromised secret version at the provider so any requests using it fail immediately.
* **Preservation of Evidence**: Note commit SHA or exposure location; log timestamp of exposure vs timestamp of revocation.
* **Assessment**: Start 6-hour CERT-In assessment clock if credentials could have enabled access to user data.

---

### Playbook 3: Application Rollback & Compatibility
* **Detection**: Vercel deployment fails, serves 500s, or introduces critical application defect.
* **Rollback Procedure**:
  1. Check database migration history before rolling back frontend:
     * FairSwap migrations use a **forward-only corrective strategy**.
     * Verify whether the previous frontend code is compatible with the current database schema.
     * If backward-compatible: Navigate to Vercel Deployments -> select last-known-good deployment -> click **Instant Rollback**.
     * If incompatible (breaking schema change): Do **NOT** roll back frontend alone. Deploy a forward corrective fix or repair migration.
  2. Capture full build/runtime error logs from Vercel.

---

### Playbook 4: Database / Supabase Platform Outage
* **Detection**: Synthetic monitor reports 5xx/503; Vercel server functions log connection timeouts to Supabase API/database.
* **Triage & Containment**:
  1. Check [Supabase Status](https://status.supabase.com) for upstream platform incidents.
  2. Check Supabase Dashboard for connection pool exhaustion (PgBouncer/Supavisor).
  3. If pool is exhausted by lingering idle transactions, terminate idle connections:
     ```sql
     SELECT pg_terminate_backend(pid)
     FROM pg_stat_activity
     WHERE state = 'idle in transaction'
       AND state_change < current_timestamp - INTERVAL '5 minutes';
     ```
* **Fallback & Recovery**: FairSwap has **no automatic database failover** in Phase 1 / Public Beta. If the hosted primary is unrecoverable, follow `docs/operations/backup-restore-runbook.md` under human authorization.

---

### Playbook 5: Object Storage Outage
* **Detection**: Media uploads fail; listing photo galleries render placeholders; storage API returns 5xx.
* **Containment & Triage**:
  1. Verify Supabase Storage API status and egress quotas.
  2. Confirm whether storage bucket configuration (`listing-originals`, `listing-derivatives`) is intact.
  3. Display non-blocking UI alert to users attempting to upload new photos while keeping listing browsing functional.

---

### Playbook 6: Transactional Email Outage (SMTP)
* **Detection**: Verification emails, password resets, or account notices fail to send.
* **Containment & Triage**:
  1. Inspect upstream email provider status.
  2. Inspect server error logs for SMTP rejection codes (e.g. auth failure, rate limit, SPF/DKIM bounce).
  3. FairSwap does **not** have an automated secondary SMTP failover relay configured.
  4. Temporarily surface an informational banner on `/auth/sign-in` and `/auth/sign-up` notifying users of temporary email delays.

---

### Playbook 7: DNS / TLS Incident
* **Detection**: Browser TLS certificate errors, DNS resolution failures on `fairswap.in`.
* **Containment & Triage**:
  1. Check domain registrar status, nameserver delegation, and domain renewal status.
  2. Check Vercel Domain dashboard for certificate renewal status (Let's Encrypt / DigiCert).
  3. If CAA records are misconfigured, verify CAA permits Vercel certificate issuance authorities.

---

## 6. Post-Mortem & Corrective Review

Following any P0 or P1 incident, the Incident Commander must publish a blameless post-mortem within **48 hours**:
1. **Incident Overview**: Severity, start time (UTC), detection time, containment time, full recovery time.
2. **Impact Assessment**: Number of affected users, broken journeys, data exposure (if any).
3. **Timeline**: Chronological sequence of events and operational actions taken.
4. **Root Cause Analysis (5-Whys)**: Underlying technical, process, or operational failure points.
5. **Action Items**: Preventative engineering and documentation tasks, each assigned to a named owner with target completion dates.
