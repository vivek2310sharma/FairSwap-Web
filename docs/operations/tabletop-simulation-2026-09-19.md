# FairSwap — Tabletop Incident Simulation Evidence (2026-09-19)

> [!NOTE]
> **SIMULATION NOTICE — TABLETOP EXERCISE ONLY**:
> This document records the execution of a **non-production tabletop simulation** conducted to validate FairSwap's incident response runbook, decision points, small-team operational roles, and statutory reporting clocks.
> **No live production incident occurred**. No production systems or data were modified.

---

## 1. Simulation Metadata & Scenario

* **Exercise Date**: 2026-09-19
* **Facilitator / Participant**: Vivek Kumar (Primary Production Owner / Incident Commander)
* **Starting Context**: Latest `staging` branch (commit `e6e67050f2f298bd567724868fcee51c4755e777`)
* **Simulated Scenario**:
  > *At 10:15 UTC, automated scanning detects that a privileged database service key (`SUPABASE_SECRET_KEY`) was accidentally pasted into a public pull request discussion snippet during active troubleshooting. Simultaneously, synthetic monitoring reports an elevated 5xx error rate (6.8%) on `/api/listings` endpoints following a production deployment deployed 20 minutes earlier.*

---

## 2. Tabletop Incident Response Walkthrough

### Phase 1: Detection & Triage
* **Signal Ingestion**:
  1. Secret scanning notification received via email regarding potential exposed secret.
  2. Runtime monitoring alerts on 5xx error threshold breached (> 5%).
* **Severity Classification**:
  * Evaluated against `docs/operations/incident-response-runbook.md` Section 1.
  * **Classification**: **P0 — Critical**
  * *Rationale*: Credential exposure of a root database secret coupled with active public-facing service degradation constitutes an immediate risk of compromise and platform failure.
* **Incident Commander**:
  * Vivek Kumar assumes Incident Commander role.
  * *Operational Observation*: No secondary backup owner is available; Incident Commander must execute both containment and remediation simultaneously.

---

### Phase 2: Containment & Secret Rotation
* **Immediate Priority**: Neutralize the exposed privileged credential to prevent unauthorized exploitation.
* **Containment Execution Steps**:
  1. **Generate New Secret**: Navigate to Supabase Dashboard (`FairSwapProd`) -> Project Settings -> API -> generate new `SUPABASE_SECRET_KEY`.
  2. **Inject New Secret into Vercel**: Update `SUPABASE_SECRET_KEY` in Vercel Production Environment Variables via Vercel Project Settings.
  3. **Revoke Compromised Key**: Invalidate and delete the historical compromised secret in Supabase so any in-flight tokens generated with it immediately fail validation.
  4. **Verify Application Account Protection**:
     * Verify that `public.user_accounts` status checks (`app_security.get_account_status`) remain intact.
     * If an actor ID was linked to suspicious activity, invoke:
       ```sql
       UPDATE public.user_accounts SET account_status = 'suspended' WHERE user_id = '<ACTOR_ID>';
       ```
* **Elapsed Time for Containment**: ~8 minutes (simulated).

---

### Phase 3: Rollback Decision & Service Recovery
* **Problem**: 5xx error rate persists due to the buggy logic in the recent production deployment.
* **Rollback Decision Protocol**:
  1. **Check Database Compatibility**:
     * Review migrations deployed forward: Migration 20 and 21 added tables/columns without breaking existing queries or removing active columns.
     * The prior frontend build artifact is **backward-compatible** with the migrated schema.
  2. **Execute Instant Rollback**:
     * Navigate to Vercel Deployments dashboard.
     * Locate the last known-good deployment commit SHA prior to the faulty release.
     * Select **Instant Rollback**.
  3. **Result**: Within seconds, Vercel edge routes traffic to the prior build artifact. 5xx errors immediately drop to baseline (< 0.1%).
* **Elapsed Time for Rollback**: ~3 minutes (simulated).

---

### Phase 4: Evidence Preservation & Forensic Inspection
* **Forensic Actions**:
  1. Query `public.audit_logs` on Supabase:
     ```sql
     SELECT * FROM public.audit_logs
     WHERE created_at >= '2026-09-19 10:00:00+00'
     ORDER BY created_at DESC;
     ```
     *Verification Result*: Zero unauthorized administrative actions or unexpected role grants detected.
  2. Export Vercel runtime logs for the 30-minute incident window.
  3. Record the exact Git commit SHA, the PR comment URL containing the leak, and the exact rotation timestamp.

---

### Phase 5: Statutory Reporting Assessment (CERT-In & DPDP)

#### A. CERT-In 6-Hour Assessment Clock
* **Incident Brought to Notice**: 10:15 UTC.
* **Statutory Maximum Deadline (6 hours)**: 16:15 UTC.
* **Applicability Evaluation**:
  * The Incident Commander initiated the assessment immediately upon P0 triage.
  * Inspection of Postgres connection logs and `public.audit_logs` confirmed:
    * The exposed key was rotated and revoked within 8 minutes.
    * No unauthorized queries, data downloads, or exfiltration occurred during the exposure window.
    * The 5xx errors were attributable to an application syntax bug in the recent frontend deployment, not an external intrusion or denial-of-service attack.
  * **Determination**: The event was contained before unauthorized access occurred. However, pursuant to the conservative FairSwap operational rule, the incident log and timeline are retained in internal records should formal reporting or inquiries be required.

#### B. DPDP Assessment (Future Checkpoint: 13 May 2027)
* Evaluated against DPDP Rules 2025 Rule 7 readiness guidelines:
  * Since no personal data was compromised, altered, or accessed by unauthorized third parties, no breach notification to Data Principals or the Data Protection Board would be triggered under Rule 7 standards.
  * Noted that Rule 7 remains non-operative until the 13 May 2027 compliance checkpoint.

---

### Phase 6: User Communications Decision
* **Criteria**: Did the incident cause extended downtime (> 2 hours) or compromise user data?
* **Determination**: Total degraded window was ~14 minutes. No user data compromised. No user accounts locked out.
* **Action**: No mass emergency notification required. Post routine operational note on internal engineering log.

---

## 3. Post-Incident Review & Lessons Learned

| Category | Finding / Gap Identified | Remediation Action Item | Owner | Target Date |
|---|---|---|---|---|
| **Staffing** | Single operator had to handle simultaneous credential rotation, rollback, and forensic inspection. | Onboard and train a named Backup Production Owner (**Blocker in #41**). | Vivek Kumar | Pre-Public Beta |
| **Tooling** | Secret was detected after commit/PR posting rather than pre-commit. | Implement local pre-commit hooks running secret scanning regexes before git push. | Vivek Kumar | Next sprint |
| **Monitoring** | 5xx alert was detected manually rather than via automated SMS/voice alerting. | Configure external uptime and error webhook alerting to phones (**Blocker in #41**). | Vivek Kumar | Pre-Public Beta |
| **Architecture** | Forward-only database migration strategy allowed seamless, confident frontend rollback. | Maintain strict forward-only migration discipline across all future releases. | Engineering | Permanent Invariant |

---

## 4. Verification Attestation

This tabletop simulation confirmed that FairSwap's updated operational runbooks provide clear, unambiguous decision paths for P0 containment, rollback safety, credential rotation, and statutory assessment clocks.
