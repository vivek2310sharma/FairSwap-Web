# FairSwap — Incident Response Runbook (Milestone 1.6)

This runbook outlines severity definitions, escalation procedures, containment protocols, and post-incident review workflows for operational and security incidents in FairSwap.

---

## 1. Incident Severity Classifications

| Severity Level | Definition | Response Target | Examples |
|---|---|---|---|
| **Sev 1 — Critical** | Total platform outage, critical security vulnerability, unauthorized privileged access, or confirmed data leak. | Immediate (< 15 mins) | Database unavailable, AAL2 MFA bypassed, PostgREST RLS failure, active data exfiltration. |
| **Sev 2 — Major** | Key feature unavailable or degraded; core user journey blocked for multiple users without immediate workaround. | < 1 hour | Listing creation failing, messaging system broken, media upload/processing stalled. |
| **Sev 3 — Minor** | Non-critical defect, cosmetic issue, or isolated edge case with viable workaround. | Next business day | Minor styling glitch, non-blocking administrative filter bug, non-critical telemetry issue. |

---

## 2. Emergency Incident Playbooks

### Playbook A: Compromised Staff Account or Privileged Credential
1. **Immediate Containment**:
   * Revoke staff role immediately via SQL or administrator portal:
     ```sql
     DELETE FROM public.staff_roles WHERE user_id = '<COMPROMISED_USER_ID>';
     ```
   * Terminate active sessions and invalidate refresh tokens in GoTrue Auth:
     ```sql
     DELETE FROM auth.refresh_tokens WHERE user_id = '<COMPROMISED_USER_ID>';
     ```
   * Suspend user account to block all marketplace actions:
     ```sql
     UPDATE public.user_accounts
     SET account_status = 'suspended'
     WHERE user_id = '<COMPROMISED_USER_ID>';
     ```
2. **Forensic Audit**:
   * Query `public.audit_logs` for all privileged actions initiated by the compromised user ID:
     ```sql
     SELECT created_at, action, target_entity, target_id, details
     FROM public.audit_logs
     WHERE actor_id = '<COMPROMISED_USER_ID>'
     ORDER BY created_at DESC;
     ```
3. **Remediation**:
   * Force password reset and re-enroll MFA factor before restoring any privileges.

---

### Playbook B: Abusive User Account Containment
1. Navigate to `/admin/users` or search by user ID/email.
2. Open user detail page `/admin/users/[id]`.
3. Under **Moderation Action**, select **Suspend Account**.
4. Enter mandatory reason (10–500 characters) detailing the violation and evidence.
5. Click **Confirm Account Suspension**.
6. **Immediate System Propagation**:
   * Active listings are hidden from public search immediately.
   * Listing submission and mutations are blocked.
   * Sending messages is prohibited.
   * Target user is presented with the suspended account alert upon viewing `/account`.

---

### Playbook C: Database or Media Outage
1. Check Docker container health:
   ```powershell
   docker ps --filter "name=supabase"
   ```
2. Inspect logs for failing container:
   ```powershell
   docker logs supabase_db_fairswap-local --tail 100
   ```
3. If data corruption or failure is unrecoverable, follow `docs/operations/backup-restore-runbook.md` to restore from the latest verified backup.

---

## 3. Post-Mortem Guidelines

Following any Sev 1 or Sev 2 incident, the engineering and operational team must conduct a blameless post-mortem within 48 hours.

The post-mortem document must record:
1. **Incident Summary**: Exact timeline (UTC) from detection to containment and final resolution.
2. **Impact Assessment**: Number of affected users, listings, or transactions.
3. **Root Cause Analysis (RCA)**: 5-Whys analysis identifying the underlying technical or procedural trigger.
4. **Corrective & Preventive Actions**: Action items assigned to specific owners with ticket references and completion deadlines.
