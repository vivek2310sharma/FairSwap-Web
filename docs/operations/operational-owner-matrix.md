# FairSwap — Operational Ownership Matrix (Public Beta Readiness)

This matrix establishes the small-team operational and incident response ownership model for **FairSwap** (a peer-to-peer local classifieds platform). It reflects actual operational realities rather than theoretical enterprise staffing.

FairSwap is currently operated solely by **Vivek Kumar**. On 2026-09-19, the Platform Owner explicitly accepted the operational risk of continuing without a backup production owner for the current launch posture. This records risk acceptance; it does **not** create redundant staffing or emergency access.

---

## 1. Operational Roles & Responsibilities

| Functional Area | Primary Production Owner | Backup Owner | Operational Target | Launch Requirement |
|---|---|---|---|---|
| **Incident Commander (P0 / P1)** | Vivek Kumar | None — owner risk accepted | Immediate acknowledgement (< 30m target during operational hours) | **CLOSED / RISK ACCEPTED in #41** |
| **Production Deployments & Rollback** | Vivek Kumar | None — owner risk accepted | Rapid triage & rollback execution | **CLOSED / RISK ACCEPTED in #41** |
| **Database Administration (Supabase)** | Vivek Kumar | None — owner risk accepted | Health inspection, pooler & migration safety | **CLOSED / RISK ACCEPTED in #41** |
| **Storage & Media Health** | Vivek Kumar | None — owner risk accepted | Bucket quotas, integrity & manifest tracking | **CLOSED / RISK ACCEPTED in #41** |
| **Credential & Secret Rotation** | Vivek Kumar | None — owner risk accepted | Immediate containment upon suspected leak | **CLOSED / RISK ACCEPTED in #41** |
| **Grievance Redressal** | Vivek Kumar | None — owner risk accepted | If IT Rules Rule 3 applies: acknowledge general grievance within 24h; general resolution within 7 days; shorter categories handled per the applicable rule. (Applicability subject to #38). | Pre-launch requirement |
| **User Communications (Outages/Breaches)** | Vivek Kumar | None — owner risk accepted | Timely notification as assessed | Pre-launch requirement |
| **Legal Counsel Escalation** | Vivek Kumar | None — owner risk accepted | FairSwap does not currently have retained counsel; Vivek Kumar evaluates and engages external legal counsel if/when required. | Operational procedure |

> [!IMPORTANT]
> **Single-Operator Residual Risk — Accepted**:
> FairSwap currently has **one** active production operator (Vivek Kumar).
> No backup production owner is designated. On 2026-09-19, the Platform Owner explicitly closed this readiness gap by accepting the associated single-operator availability, access, and incident-response risk under Issue **#41**.
> This is an owner risk decision, not evidence that redundancy or backup access exists.

---

## 2. Infrastructure Access-Control Matrix

Access to production systems follows the principle of least privilege with mandatory Multi-Factor Authentication (RFC 6238 TOTP or WebAuthn/FIDO2 hardware keys).

| Platform / Resource | Administrative Role | Access Scope & Expectations | MFA Requirement | Access Holder(s) |
|---|---|---|---|---|
| **GitHub** (`vivek2310sharma/FairSwap-Web`) | Repository Owner / Admin | Branch protections (`main`, `staging`), PR reviews, CI/CD secrets management | Mandatory 2FA | Vivek Kumar (Primary)<br>None — owner risk accepted |
| **Vercel** (`fair-swap`) | Team Owner / Admin | Staging/Production deployments, environment variable injection, Instant Rollback | Mandatory 2FA | Vivek Kumar (Primary)<br>None — owner risk accepted |
| **Supabase** (`FairSwapProd`) | Project Owner / Admin | Database settings, backups, connection pooling, Storage policies, Auth settings | Mandatory 2FA | Vivek Kumar (Primary)<br>None — owner risk accepted |
| **DNS / Domain Registrar** (`fairswap.in`) | Account Holder | DNS records (A, CNAME, ALIAS), TLS certificate verification, CAA/DNSSEC records | Mandatory 2FA | Vivek Kumar (Primary)<br>None — owner risk accepted |
| **Transactional Email Provider** | Account Admin | Sender verification, DKIM/SPF/DMARC DNS records, API keys, delivery rate monitoring | Mandatory 2FA | Vivek Kumar (Primary)<br>None — owner risk accepted |
| **Uptime / External Monitoring Provider** | Account Admin | Uptime synthetic probes, alert routing policies, escalation notifications | Mandatory 2FA | Vivek Kumar (Primary)<br>None — owner risk accepted |

> [!CAUTION]
> **Credential & Secret Hygiene Invariant**:
> Individual phone numbers, residential addresses, recovery codes, personal email addresses, API tokens, and private emergency contacts must **NEVER** be committed to version control.
> Access credentials and recovery keys must be held exclusively in secure, encrypted password management vaults accessible only to authorized operators.

---

## 3. Launch Readiness Handover Checklist

For the current owner-accepted launch posture:
1. [x] Primary production owner recorded: Vivek Kumar.
2. [x] No backup production owner is designated; the Platform Owner explicitly accepted this residual risk on 2026-09-19 under #41.
3. [ ] If a backup owner is added later, complete emergency access testing across GitHub, Vercel, Supabase, DNS, and Email before relying on that person operationally.
4. [ ] Emergency notification channels beyond the currently verified e-mail/Slack paths may be added and tested outside Git as operational needs evolve.
5. [ ] The statutory Grievance Officer details on customer-facing routes (`/contact`, `/terms`, `/grievance`) are verified accurate.
