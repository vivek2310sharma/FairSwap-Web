# FairSwap â€” Public Beta Operations Runbook

**Issue:** #41 â€” Production monitoring, incident response and on-call ownership  
**Status:** REPOSITORY READY / EXTERNAL OPERATIONS INCOMPLETE  
**Reviewed against current public guidance:** 2026-09-18

This runbook defines the minimum operating model required before FairSwap widens from a controlled pilot to Public Beta. It complements the existing incident-response and backup/restore runbooks. It does not claim that external monitoring, alert routes, production access reviews, or drills have been completed unless evidence is recorded below.

Private phone numbers, recovery codes, personal addresses, provider secrets, and emergency contact details must stay in a private operations system, not this repository.

## 1. Production ownership and access

### Required named owners

| Responsibility | Primary owner | Backup owner | Status |
| --- | --- | --- | --- |
| Production platform / release | UNASSIGNED | UNASSIGNED | BLOCKED |
| Supabase database / Auth / Storage / Realtime | UNASSIGNED | UNASSIGNED | BLOCKED |
| Vercel runtime / deployment | UNASSIGNED | UNASSIGNED | BLOCKED |
| DNS / domain / TLS | UNASSIGNED | UNASSIGNED | BLOCKED |
| Transactional email | UNASSIGNED | UNASSIGNED | BLOCKED |
| Security incident lead | UNASSIGNED | UNASSIGNED | BLOCKED |
| Public user communication | UNASSIGNED | UNASSIGNED | BLOCKED |
| Legal / privacy escalation | UNASSIGNED | UNASSIGNED | BLOCKED |

Before Public Beta, replace each `UNASSIGNED` entry in the private operating register with a named person and backup. The public repository may contain role names, but private contact channels belong in the private register.

### Production access inventory

Review access for each system and retain least privilege only.

| System | Access that must be reviewed | Review status | Evidence location |
| --- | --- | --- | --- |
| Vercel | Project owners, deployment access, env-var editors, rollback permission | NOT VERIFIED | Private access-review record |
| Supabase production | Project owners, database access, Auth admin, service-role access | NOT VERIFIED | Private access-review record |
| Domain / DNS | Registrar, DNS provider, DNSSEC, TLS controls | NOT VERIFIED | Private access-review record |
| Transactional email | Provider admins, API-key managers, sender-domain settings | NOT VERIFIED | Private access-review record |
| GitHub | Repository admins, protected branches, Actions secrets/environments | NOT VERIFIED | Private access-review record |

Remove obsolete users, stale tokens, duplicate owner accounts, unused API keys, and shared credentials. Record the review date and reviewer privately. Do not paste credentials into issues, pull requests, logs, screenshots, or this file.

## 2. Monitoring and alerting matrix

Monitoring must be actionable: every signal needs an owner, a destination, and a tested response path.

| Signal | Minimum check | Suggested source | Severity trigger | Alert destination | Status |
| --- | --- | --- | --- | --- | --- |
| `https://fairswap.in` availability | HTTPS success and representative page load | External uptime monitor | P0 if broadly unavailable | UNCONFIGURED | BLOCKED |
| Production deployment failures | Failed/cancelled production deploy | Vercel deployment notifications | P1 | UNCONFIGURED | BLOCKED |
| Server errors | Unhandled server errors, sustained 5xx rate | Vercel logs / error platform | P0/P1 based on scope | UNCONFIGUT‘Q“ĞÒÑQŸYX[š[™Ù[ÛY[˜Z[\™\È™\X]YÛY[Y\œ›Üˆ[™Ù\İ[ÛˆÜˆÜš]XØ[›İ\›™^Hœ™XZØYÙH^\İ[™ÈØ\KÛ[Ûš]Üš[™ËØÛY[Y\œ›Ü˜
ÈYÙÜ™YØ][ÛˆKÔˆSÓÓ‘’QÕT‘Q“ĞÒÑQŸİ\X˜\ÙH]X˜\ÙH]˜Z[Xš[]KÛÛ›™Xİ[Ûˆ™\Üİ\™KİÜ˜YÙK][İHİ\X˜\ÙH\Ú›Ø\™È[\ÈÔHSÓÓ‘’QÕU$TBÂ$Äô4´TBÀ§Â7W&6RWF‚Â6–vâÖ–âÂ6ÆÆ&6²ÂFö¶VâW†6†ævRf–ÇW&R7–¶W2ÂWF‚Æöw2²Æ–6F–öâFVÆVÖWG'’Âõ"ÂTä4ôäd”uU$TBÂ$Äô4´TBÀ§Â7W&6R7F÷&vRÂWÆöB÷&VBf–ÇW&W2ÂV÷FÂ7W&6RF6†&ö&BòÆöw2Âõ"ÂTä4ôäd”uU$TBÂ$Äô4´TBÀ§Â7W&6R&VÇF–ÖRÂ&V6öææV7BöW'&÷"7–¶W2Â&÷f–FW"–æ6–FVçBÂ7W&6R7FGW2²FVÆVÖWG'’Âõ"ÂTä4ôäd”uUIğ	1=-ğ)ğQÉ…¹Í…Ñ¥½¹…°•µ…¥°ğAÉ½Ù¥‘•ÈÉ•©•ÑÌ°…ÕÑ ™…¥±ÕÉ•Ì°ÍÕÍÑ…¥¹•‘•±¥Ù•Éä™…¥±ÕÉ”ğµ…¥°ÁÉ½Ù¥‘•È‘…Í¡‰½…É½İ•‰¡½½­Ìğ@Ä½@ÈğU9=9%URED | BLOCKED |
| DNS / TLS | Resolution failure, certificate expiry/error | External DNS/TLS monitor | P0/P1 | UNCONFIGURED | BLOCKED |
| Backup jobs | Backup or verification job non-zero exit | CI/runner | P1 | UNCONFIGURED | BLOCKED |

### Alert quality rules

1. Alerts must include service, environment, first-seen time, correlation/request ID where available, and a safe link to logs/dashboard.
2. Never include passwords, tokens, cookies, full private messages, or unnecessary personal data in alert payloads.
3. P0/P1 alerts must have a primary and backup recipient.
4. Provider status pages are evidence inputs, not substitutes for FairSwap-side monitoring.
5. At least one alert must be exercised end-to-end before Public Beta and recorded in the evidence log.

## 3. Incident severity model

This P0â€“P3 model is the Public Beta severity model. Older documents using `Sev 1/2/3` should be interpreted as follows until fully normalized: `Sev 1 â‰ˆ P0`, `Sev 2 â‰ˆ P1`, `Sev 3 â‰ˆ P2/P3` depending on impact.

| Level | Criteria | Acknowledge target | Escalation target | Examples |
| --- | --- | --- | --- | --- |
| **P0 â€” Critical** | Active security compromise, data exfiltration/leak, unauthorized privileged access, destructive corruption, or broad production outage | 15 min | Immediate primary + backup + security/legal assessment | RLS bypass, stolen privileged key in active use, mass data loss, site broadly unavailable |
| **P1 â€” Major** | Core journey unavailable or major production degradation without a safe workaround | 30 min | Primary; backup by 60 min if unresolved | Sign-in broadly failing, listing/contact flows unavailable, sustained high 5xx rate |
| **P2 â€” Degraded** | Material but contained degradation with a viable workaround and no known active security compromise | 4 h | Service owner same business day | Realtime updates delayed while refresh works, isolated email delays |
| **P3 â€” Minor** | Low-impact defect, cosmetic issue, or non-urgent operational cleanup | Next business day | Normal engineering queue | Minor UI defect, non-blocking telemetry gap |

Targets are internal response objectives, not customer SLAs.

## 4. Incident lifecycle

For P0Â€â€“P2 incidents use the following sequence:

1. **Detect and declare** â€” open an incident record, assign incident lead, capture start/awareness time in UTC.
2. **Triage** â€” identify scope, affected systems/users, security/privacy indicators, and recent deployments/config changes.
3. **Contain** â€” stop ongoing harm. Options include suspending compromised accounts, revoking/rotating credentials, disabling a risky feature, rate-limiting/blocking traffic, or rolling back a deployment.
4. **Preserve evidence** â€” retain relevant logs, audit events, provider events, deployment IDs, correlation IDs, timestamps, and hashes where appropriate before destructive cleanup.
5. **Remediate** â€” correct the defect or configuration without weakening authorization, RLS, MFA, privacy, or audit controls.
6. **Recover** â€” restore service/data using the documented rollback or backup/restore process.
7. **Verify** â€” confirm the user journey, security boundary, and monitoring signal are healthy before closing.
8. **Communicate** â€” provide a user/status update when impact is material, prolonged, security-relevant, or legally required. Do not speculate about cause or impact before evidence supports it.
9. **Review** â€” P0/P1 require a written post-incident review with timeline, impact, root cause, corrective actions, owners, and target dates.

### Disable / block / rollback decision triggers

Use the least destructive containment that stops harm. Immediate disablement, traffic blocking, credential revocation, or rollback is appropriate when continuing operation materially increases data/security risk, causes destructive writes, or expands user impact. A database schema rollback must not be improvised if migrations are forward-only; prefer an application rollback plus a forward corrective migration when safe.

## 5. Security and regulatory escalation

### CERT-In

Current CERT-In Directions under section 70B require covered entities to report the cyber incidents listed in Annexure I within **6 hours of noticing the incident or being brought to notice of it**. The directions also require a designated CERT-In point of contact and require ICT-system logs to be securely maintained for a rolling **180 days**, within Indian jurisdiction.

Operational rule:

- Start the CERT-In applicability assessment at P0 declaration and for any suspected cyber incident that may fall within Annexure I, including unauthorized access, application attacks, data breach, data leak, phishing/identity theft, DDoS, cloud compromise, or malicious code.
- Record the exact awareness time in UTC; do not wait for root-cause certainty before beginning the assessment.
- Escalate to the designated security/legal owner immediately so any required report can be made within the statutory window.
- Use the current CERT-In reporting page and current contact/process at incident time; official procedures can change.
- The private operations register must contain FairSwap's designated CERT-In point of contact and backup.

Official references:
- https://www.cert-in.org.in/Directions70B.jsp
- https://www.cert-in.org.in/PDF/CERT-In_Directions_70B_28.04.2022.pdf

### DPDP personal-data-breach readiness

The Digital Personal Data Protection Rules, 2025 contain Rule 7 breach-intimation requirements. Rule 7 requires affected Data Principals to be informed without delay and the Data Protection Board to receive an initial intimation without delay, followed by specified details within 72 hours (or a longer period allowed by the Board).

However, Rule 7 is in the group of Rules 5â€“16 that the 2025 Rules schedule to commence **18 months after publication on 13 November 2025**. Therefore, as of **18 September 2026**, Rule 7 is not yet in force under that staged commencement schedule. FairSwap should nevertheless prepare the incident workflow now and must re-check the effective law and any amendments at the time of an incident or launch review.

Operational rule:

- Any suspected personal-data breach is P0 until scope is understood.
- Identify affected data categories, users, processors, geography, and likely consequences.
- Preserve evidence and processor/vendor communications.
- Engage the privacy/legal owner immediately.
- Track affected-user communication content and delivery evidence.
- Re-verify applicable DPDP commencement, Board procedure, and any additional legal obligations at incident time.

Official reference:
- https://www.meity.gov.in/documents/act-and-policies/digital-personal-data-protection-rules-2025-gDOxUjMtQWa?pageTitle=Digital-Personal-Data-Protection-Rules-2025

## 6. Recovery and continuity

The existing backup/restore runbook remains authoritative for technical recovery procedures.

Current documented targets:
- Target RPO: <= 1 hour.
- Target RTO: <= 2 hours.

Important limitation: the current repository documentation states the <= 1 hour automated RPO is **not yet achieved** unless an appropriate scheduled backup runner or managed point-in-time recovery capability is configured.

Before Public Beta:

| Requirement | Status | Evidence |
| --- | --- | --- |
| Database backup owner assigned | BLOCKED | Private owner register |
| Storage backup owner assigned | BLOCKED | Private owner register |
| Automated backup schedule verified | NOT VERIFIED | Provider/runner evidence |
| Last successful restore evidence reviewed | AVAILABLE | `docs/operations/recovery-drill-evidence.md` (2026-09-16) |
| Last-known-good application rollback process reviewed | DOCUMENTED / NOT EXERCISED FOR #41 | Vercel deployment evidence |
| Supabase outage fallback documented | DOCUMENTED | Existing incident runbook |
| Vercel outage fallback documented | DOCUMENTED | Existing incident runbook |
| Transactional-email outage fallback documented | DOCUMENTED | Existing incident runbook |

## 7. Tabletop exercise

Run at least one tabletop before Public Beta. Do not mark it complete merely by reading this scenario.

### Recommended scenario

At 10:00 UTC, the uptime monitor reports elevated 5xx responses. At 10:04, authentication errors spike. At 10:08, an operator discovers that a privileged credential may have been exposed in an external log. Some users report being signed out; there is no confirmed data exfiltration yet.

Exercise goals:

1. Declare severity and incident lead.
2. Record awareness time for CERT-In assessment.
3. Identify which credential can be safely revoked/rotated and what application impact it causes.
4. Decide whether to roll back, disable a feature, or block traffic.
5. Preserve evidence before cleanup.
6. Determine what evidence would establish or refute unauthorized data access.
7. Draft internal and user-facing communications without unverified claims.
8. Identify CERT-In and DPDP decision points.
9. Verify recovery and monitoring after containment.
10. Record follow-up actions, owners, and deadlines.

Tabletop status: **NOT RUN**.

## 8. Public Beta gate for issue #41

| Gate | Status |
| --- | --- |
| #37 grievance ownership/process operational | EXTERNAL / VERIFY |
| #38 legal review identifies incident/disclosure duties | EXTERNAL / VERIFY |
| Named primary and backup production owners | BLOCKED |
| Production access review completed | BLOCKED |
| Availability monitor configured | BLOCKED |
| Deployment/error/dependency alerts configured | BLOCKED |
| Alert destination and response ownership configured | BLOCKED |
| One alert tested end-to-end | NOT RUN |
| CERT-In PoC designated privately | BLOCKED |
| Tabletop exercise completed | NOT RUN |
| Production-safe rollback/recovery verification completed for Public Beta baseline | NOT RUN |
| Remaining risks explicitly accepted/tracked | OPEN |

Issue #41 is not complete until the external `BLOCKED` / `NOT RUN` items have real evidence.
