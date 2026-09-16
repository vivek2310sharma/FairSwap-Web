# FairSwap — Operational Ownership Matrix (Milestone 1.6)

This matrix documents operational and incident ownership for FairSwap. Where individual staff members have not yet been formally appointed, the role is explicitly marked **`OWNER REQUIRED BEFORE PUBLIC PILOT`** to prevent ambiguity during Phase 1.

---

## 1. Operational Ownership Matrix

| Operational Area | Primary Role | Designated Individual / Team | Escalation Backup | On-Call SLA | Launch Requirement |
|---|---|---|---|---|---|
| **Backup Success Review** | Reliability Operator | `OWNER REQUIRED BEFORE PUBLIC PILOT` | Lead DevOps Engineer | Daily (24h) | Mandatory |
| **Disaster Recovery Drill** | Disaster Recovery Lead | `OWNER REQUIRED BEFORE PUBLIC PILOT` | Platform Architect | Monthly | Mandatory |
| **Database Incidents (Supabase)** | Lead DBA / Backend Eng | `OWNER REQUIRED BEFORE PUBLIC PILOT` | Platform Architect | < 15 mins (Sev 1) | Mandatory |
| **Object Storage Incidents** | DevOps / Infrastructure | `OWNER REQUIRED BEFORE PUBLIC PILOT` | Lead Backend Eng | < 30 mins (Sev 2) | Mandatory |
| **Vercel / Frontend Runtime** | Frontend / DevOps Lead | `OWNER REQUIRED BEFORE PUBLIC PILOT` | Release Manager | < 15 mins (Sev 1) | Mandatory |
| **Supabase Platform / Network** | Infrastructure Lead | `OWNER REQUIRED BEFORE PUBLIC PILOT` | Platform Architect | < 30 mins (Sev 1) | Mandatory |
| **Auth / Security Incidents (MFA)**| Security Officer | `OWNER REQUIRED BEFORE PUBLIC PILOT` | Platform Administrator | < 15 mins (Sev 1) | Mandatory |
| **Moderation & Support Outage** | Lead Trust & Safety | `OWNER REQUIRED BEFORE PUBLIC PILOT` | Support Team Lead | < 1 hour (Sev 2) | Mandatory |
| **Transactional Email Outage** | Systems Integration Eng | `OWNER REQUIRED BEFORE PUBLIC PILOT` | Backend Engineer | < 1 hour (Sev 2) | Mandatory |
| **Public User Communications** | Public Relations / Comm Lead | `OWNER REQUIRED BEFORE PUBLIC PILOT` | Product Director | < 2 hours (Sev 1) | Mandatory |
| **Legal / Privacy Escalations** | Statutory Grievance Officer | `OWNER REQUIRED BEFORE PUBLIC PILOT` | Legal Counsel | < 24 hours | Statutory Requirement (India IT Rules) |

---

## 2. Staffing & Handover Guidelines for Public Pilot

Before transitioning from controlled Phase 1 staging to public pilot launch:
1. Every entry labeled `OWNER REQUIRED BEFORE PUBLIC PILOT` must be replaced by a named engineer or manager.
2. 24/7 on-call rotation schedules must be published in the internal operations calendar.
3. Escalation notification channels (e.g. automated PagerDuty / Opsgenie escalation paths) must be configured for all Sev 1 and Sev 2 incident classifications.
4. The statutory Grievance Officer must be formally registered and published on the customer-facing `/contact` and `/terms` routes.
