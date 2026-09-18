# FairSwap — Operational Ownership Matrix

This matrix defines production operational roles for FairSwap. It deliberately does **not** contain private phone numbers, personal addresses, recovery codes, or secret escalation channels.

As of 2026-09-18, named primary/backup production ownership has not been recorded in the repository. Those assignments must be maintained in a private operations register before Public Beta.

## 1. Production ownership

| Operational area | Primary role | Named primary | Backup role | Named backup | Response target | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Production platform / releases | Platform Owner | `UNASSIGNED` | Release Backup | `UNASSIGNED` | P0 15m / P1 30m | BLOCKED |
| Vercel runtime / deployments | Platform / DevOps | `UNASSIGNED` | Release Backup | `UNASSIGNED` | P0 15m / P1 30m | BLOCKED |
| Supabase database / Auth | Backend / Database Owner | `UNASSIGNED` | Platform Backup | `UNASSIGNED` | P0 15m / P1 30m | BLOCKED |
| Supabase Storage / Realtime | Infrastructure Owner | `UNASSIGNED` | Backend Backup | `UNASSIGNED` | P0 15m / P1 30m | BLOCKED |
| DNS / domain / TLS | Domain/DNS Owner | `UNASSIGNED` | Platform Backup | `UNASSIGNED` | P0 15m / P1 30m | BLOCKED |
| Transactional email | Email Operations Owner | `UNASSIGNED` | Backend Backup | `UNASSIGNED` | P1 30m | BLOCKED |
| Security incidents | Security Incident Lead | `UNASSIGNED` | Platform Owner | `UNASSIGNED` | P0 15m | BLOCKED |
| Backups / recovery | Recovery Owner | `UNASSIGNED` | Platform Backup | `UNASSIGNED` | P1 30m | BLOCKED |
| Public user communications | Communications Owner | `UNASSIGNED` | Platform Owner | `UNASSIGNED` | P0/P1 as incident requires | BLOCKED |
| Legal / privacy / CERT-In assessment | Legal/Privacy Owner | `UNASSIGNED` | Security Lead | `UNASSIGNED` | Immediate for P0 | BLOCKED |

## 2. Provider access ownership

The private access register must identify who can administer each provider and why that access is required.

| Provider/system | Minimum owners required | Least-privilege review | Private emergency access record |
| --- | --- | --- | --- |
| Vercel production project | Primary + backup | NOT VERIFIED | REQUIRED |
| Supabase production project | Primary + backup | NOT VERIFIED | REQUIRED |
| Domain registrar / DNS provider | Primary + backup | NOT VERIFIED | REQUIRED |
| Transactional email provider | Primary + backup | NOT VERIFIED | REQUIRED |
| GitHub production settings / environments | Primary + backup | NOT VERIFIED | REQUIRED |

## 3. CERT-In point of contact

CERT-In directions require covered entities to designate a Point of Contact and keep it updated. FairSwap's designated person, mobile number, office contact information, and private escalation channel must be stored outside the public repository.

Repository status: **CERT-In PoC NOT RECORDED / NOT VERIFIED**.

## 4. Handover requirements

Before Public Beta:

1. Assign a named primary and backup to every mandatory operational area.
2. Record private contact and escalation channels outside GitHub.
3. Review Vercel, Supabase, DNS/domain, email-provider, and GitHub production access; remove obsolete users and credentials.
4. Ensure no production capability depends on a single inaccessible personal account.
5. Confirm primary and backup can perform a safe rollback, credential rotation, and provider escalation.
6. Record the review date and owner acceptance in the private operating register.

See `docs/operations/public-beta-operations-runbook.md` for monitoring, severity, regulatory escalation, and drill requirements.
