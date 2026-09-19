# FairSwap — Tabletop Incident Simulation Evidence (2026-09-19)

> [!NOTE]
> **SIMULATION NOTICE — TABLETOP EXERCISE ONLY**:
> This document records the theoretical walkthrough of a **non-production tabletop exercise** conducted to evaluate FairSwap's incident response runbook, decision points, small-team operational roles, and statutory reporting clocks.
> **No live production incident occurred**.
> **No production systems, credentials, databases, or logs (including `FairSwapProd` and Vercel Production) were accessed, modified, rotated, rolled back, or inspected during this exercise.**

---

## 1. Simulation Metadata & Hypothetical Scenario

* **Exercise Date**: 2026-09-19
* **Participant**: Vivek Kumar (exercising the role of Primary Production Owner / Incident Commander)
* **Starting Context**: Latest `staging` branch (commit `e6e67050f2f298bd567724868fcee51c4755e777`)
* **Hypothetical Scenario Injected**:
  > *At 10:15 UTC, automated scanning reports that an application database secret key (`SUPABASE_SECRET_KEY`) was inadvertently included in a pull request discussion snippet during active troubleshooting. Simultaneously, synthetic monitoring reports an elevated 5xx error rate (6.8%) on `/api/listings` endpoints following a production deployment deployed 20 minutes earlier.*

---

## 2. Tabletop Procedure Walkthrough

### Phase 1: Detection & Triage
* **Hypothetical Signal Ingestion**:
  1. Secret scanning notification received via email regarding potential exposed application secret.
  2. Runtime monitoring alerts on 5xx error threshold breached (> 5%).
* **Severity Classification**:
  * Evaluated against `docs/operations/incident-response-runbook.md` Section 1.
  * **Simulated Severity**: **P0 — Critical**
  * *Rationale*: Exposure of an application secret key with administrative database privileges, concurrent with active customer-facing service degradation, would require immediate P0 triage.
* **Incident Commander**:
  * Vivek Kumar would assume the Incident Commander role.
  * *Operational Observation*: No secondary backup owner is currently available; under the current single-operator model, the Incident Commander would need to coordinate containment and remediation sequentially.

---

### Phase 2: Containment & Credential Separation
* **Immediate Priority**: Neutralize the exposed application API secret and address potential account abuse.
* **Key Architecture & Containment Distinction**:
  > [!IMPORTANT]
  > **API Key Containment vs. User Session Containment**:
  > A modern `sb_secret_...` key is an **application API key** (service role) used for backend administrative access.
  > Rotating or deleting a leaked `sb_secret_...` key prevents future unauthorized use of that API key at the PostgREST / Supabase API gateway.
  > However, rotating an API key **does not automatically invalidate or revoke existing user Auth session JWTs**.
  > Therefore, user-session containment and application API-key containment are treated as separate, distinct procedures:
* **Walkthrough of Documented API Key Rotation**:
  1. *Generate Replacement API Key*: In Supabase Dashboard (`FairSwapProd`), the operator would navigate to Project Settings -> API and generate a new `SUPABASE_SECRET_KEY`.
  2. *Update Environment Variable*: In Vercel Project Settings, the operator would update `SUPABASE_SECRET_KEY` in production environment variables without logging the secret value.
  3. *Revoke Leaked API Key*: In Supabase Dashboard, the operator would delete/revoke the old key so any requests using it are immediately rejected with 401 Unauthorized.
* **Walkthrough of User Session Containment (if actor abuse suspected)**:
  * If anomalous user actions were detected from a specific account, the operator would invoke application-level account suspension:
    ```sql
    UPDATE public.user_accounts SET account_status = 'suspended' WHERE user_id = '<ACTOR_ID>';
    ```
    *Mechanism*: Database RPCs evaluate `app_security.get_account_status(auth.uid())`, immediately denying classifieds-platform mutations/features even if the caller holds an unexpired JWT.
* **Assumed Exercise Duration for Containment**: ~8 minutes (modeled).

---

### Phase 3: Rollback Decision & Service Recovery
* **Problem**: In the scenario, the elevated 5xx error rate stems from a software defect in the recent production release.
* **Rollback Decision Protocol**:
  1. *Database Compatibility Evaluation*:
     * The Incident Commander would review whether migrations deployed forward are backward-compatible with the previous frontend release.
     * For example, Migrations 20 and 21 added additive tables and functions without removing active columns.
     * In this scenario, the prior build artifact is assumed backward-compatible with the schema.
  2. *Vercel Instant Rollback Walkthrough*:
     * In Vercel Deployments dashboard, the operator would locate the last known-good deployment commit SHA and trigger **Instant Rollback**.
  3. *Assumed Outcome*: Edge routing directs traffic to the prior build artifact within seconds, resolving the 5xx error elevation.
* **Assumed Exercise Duration for Rollback**: ~3 minutes (modeled).

---

### Phase 4: Evidence Preservation & Forensic Procedure
* **Documented Steps**:
  1. *Audit Log Inspection Walkthrough*:
     * The operator would query `public.audit_logs` on Supabase for the incident window:
       ```sql
       SELECT * FROM public.audit_logs
       WHERE created_at >= '2026-09-19 10:00:00+00'
       ORDER BY created_at DESC;
       ```
     * *Assumed Exercise Outcome*: The scenario posited that the exposed key was revoked before any unauthorized administrative actions were executed.
  2. *Runtime Log Export Walkthrough*:
     * The operator would export Vercel runtime logs for the incident duration to capture client IPs, paths, and timestamps.
  3. *Timeline Recording*:
     * The operator would record the commit SHA, exposure timestamp, key revocation timestamp, and rollback timestamp.

---

### Phase 5: Statutory Reporting Assessment (CERT-In & DPDP)

#### A. CERT-In 6-Hour Assessment Clock Walkthrough
* **Hypothetical Notice Time**: 10:15 UTC.
* **Maximum Internal Evaluation Deadline (6 hours)**: 16:15 UTC.
* **Applicability Walkthrough**:
  * The Incident Commander would immediately initiate a CERT-In applicability assessment.
  * *Statutory Context*: CERT-In FAQs interpret "body corporate" broadly (including sole proprietorships) and note that the 28 April 2022 Directions apply to all entities regarding cyber-incident reporting.
  * *Assumed Exercise Outcome*: In this simulated scenario, investigation indicated the leaked key was revoked before unauthorized database queries or data exfiltration occurred, and the 5xx spike was due to an application bug rather than an attack.
  * *Decision Rule*: If evidence of actual unauthorized data access or leak had emerged, a formal report to `incident@cert-in.org.in` would be mandatory within the 6-hour window.

#### B. DPDP Assessment Walkthrough (Future Checkpoint: 13 May 2027)
* *Statutory Context*: Rule 7 (personal-data-breach reporting) is staged to 18 months from 13 November 2025 and is not currently in force as of September 2026.
* *Readiness Walkthrough*: Under future Rule 7 standards (effective 13 May 2027), if a personal data breach were confirmed, affected Data Principals and the Data Protection Board would require notification without delay. In this simulated scenario, no personal data breach occurred.

---

### Phase 6: User Communications Decision
* *Decision Criteria*: Did the incident cause extended downtime (> 2 hours) or compromise user data?
* *Assumed Exercise Outcome*: The simulated outage was brief (~14 minutes) and no user data was compromised. The Incident Commander would determine that no emergency mass user communication is necessary, logging the resolution internally.

---

## 3. Post-Incident Review & Lessons Learned

| Category | Gap Identified in Exercise | Planned Corrective Action Item | Owner | Target Status |
|---|---|---|---|---|
| **Staffing** | Single operator would face high cognitive load handling key rotation, rollback, and forensics concurrently. | Onboard and verify a named Backup Production Owner (**Blocker in #41**). | Vivek Kumar | Pre-Public Beta |
| **Tooling** | Exposure was noticed post-commit rather than pre-commit. | Implement local pre-commit hooks to scan for secret key patterns prior to git push. | Vivek Kumar | Next release |
| **Monitoring** | 5xx alert was simulated as an email/dashboard alert rather than an urgent phone notification. | Configure external uptime and error webhook alerting to phone (**Blocker in #41**). | Vivek Kumar | Pre-Public Beta |
| **Architecture** | Forward-only database migration discipline enables frontend rollback without schema conflicts. | Maintain strict forward-only migration discipline across all releases. | Engineering | Permanent Invariant |

---

## 4. Exercise Attestation

This tabletop exercise walked through the documented secret-rotation, user-session containment, rollback, and statutory assessment procedures without touching production systems. It demonstrated procedural clarity while highlighting the critical operational dependency on onboarding a Backup Production Owner.
