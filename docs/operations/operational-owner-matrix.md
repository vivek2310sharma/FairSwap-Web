# FairSwap — Operational Ownership Matrix (Public Beta Readiness)

This matrix establishes the small-team operational and incident response ownership model for **FairSwap** (a peer-to-peer local classifieds platform). It reflects actual operational realities rather than theoretical enterprise staffing.

FairSwap is currently operated solely by **Vivek Kumar**.

---

## 1. Operational Roles & Responsibilities

| Functional Area | Primary Production Owner | Backup Owner | Operational Target | Launch Requirement |
|---|---|---|---|---|
| **Incident Commander (P0 / P1)** | Vivek Kumar | `BACKUP OWNER REQUIRED BEFORE PUBLIC BETA` | Immediate acknowledgement (< 30m target during operational hours) | **BLOCKER in #41** |
| **Production Deployments & Rollback** | Vivek Kumar | `BACKUP OWNER REQUIRED BEFORE PUBLIC BETA` | Rapid triage & rollback execution | **BLOCKER in #41** |
| **Database Administration (Supabase)** | Vivek Kumar | `BACKUP OWNER REQUIRED BEFORE PUBLIC BETA` | Health inspection, pooler & migration safety | **BLOCKER in #41** |
| **Storage & Media Health** | Vivek Kumar | `BACKUP OWNER REQUIRED BEFORE PUBLIC BETA` | Bucket quotas, integrity & manifest tracking | **BLOCKER in #41** |
| **Credential & Secret Rotation** | Vivek Kumar | `BACKUP OWNER REQUIRED BEFORE PUBLIC BETA` | Immediate containment upon suspected leak | **BLOCKER in #41** |
| **Statutory Grievance Redressal** | Vivek Kumar | `BACKUP OWNER REQUIRED BEFORE PUBLIC BETA` | Statutory acknowledgement within 24–48 hours | Mandatory (India IT Rules) |
| **User Communications (Outages/Breaches)** | Vivek Kumar | `BACKUP OWNER REQUIRED BEFORE PUBLIC BETA` | Timely notification as assessed | Mandatory |

> [!IMPORTANT]
> **Single-Point-of-Failure (SPOF) Blocker**:
> FairSwap currently has **one** active production operator (Vivek Kumar).
> A qualified backup production owner must be formally onboarded, granted verified emergency access, and briefed on emergency runbooks before public launch.
> The placeholder **`BACKUP OWNER REQUIRED BEFORE PUBLIC BETA`** constitutes an active operational launch blocker tracked under Issue **#41**.

---

## 2. Infrastructure Access-Control Matrix

Access to production systems follows the principle of least privilege with mandatory Multi-Factor Authentication (RFC 6238 TOTP or WebAuthn/FIDO2 hardware keys).

| Platform / Resource | Administrative Role | Access Scope & Expectations | MFA Requirement | Access Holder(s) |
|---|---|---|---|---|
| **GitHub** (`vivek2310sharma/FairSwap-Web`) | Repository Owner / Admin | Branch protections (`main`, `staging`), PR reviews, CI/CD secrets management | Mandatory 2FA | Vivek Kumar (Primary)<br>`BACKUP OWNER REQUIRED BEFORE PUBLIC BETA` |
| **Vercel** (`fair-swap`) | Team Owner / Admin | Staging/Production deployments, environment variable injection, Instant Rollback | Mandatory 2FA | Vivek Kumar (Primary)<br>`BACKUP OWNER REQUIRED BEFORE PUBLIC BETA` |
| **Supabase** (`FairSwapProd`) | Project Owner / Admin | Database settings, PITR/backups, connection pooling, Storage policies, Auth settings | Mandatory 2FA | Vivek Kumar (Primary)<br>`BACKUP OWNER REQUIRED BEFORE PUBLIC BETA` |
| **DNS / Domain Registrar** (`fairswap.in`) | Account Holder | DNS records (A, CNAME, ALIAS), TLS certificate verification, CAA/DNSSEC records | Mandatory 2FA | Vivek Kumar (Primary)<br>`BACKUP OWNER REQUIRED BEFORE PUBLIC BETA` |
| **Transactional Email Provider** (SMTP/API) | Account Admin | Sender verification, DKIM/SPF/DMARC DNS keys, API keys, delivery rate monitoring | Mandatory 2FA | Vivek Kumar (Primary)<br>`BACKUP OWNER REQUIRED BEFORE PUBLIC BETA` |
| **Uptime / External Monitoring Provider** | Account Admin | Uptime synthetic probes, alert routing policies, escalation notifications | Mandatory 2FA | Vivek Kumar (Primary)<br>`BACKUP OWNER REQUIRED BEFORE PUBLIC BETA` |

> [!CAUTION]
> **Credential & Secret Hygiene Invariant**:
> Individual phone numbers, residential addresses, recovery codes, personal email addresses, API tokens, and private emergency contacts must **NEVER** be committed to version control.
> Access credentials and recovery keys must be held exclusively in secure, encrypted password management vaults accessible only to authorized operators.

---

## 3. Launch Readiness Handover Checklist

Prior to lifting the Public Beta operational freeze:
1. [ ] A real individual accepts and is recorded as the named backup production owner.
2. [ ] Backup owner successfully completes emergency access test (GitHub, Vercel, Supabase, DNS, Email).
3. [ ] Emergency notification channels (SMS / phone / push alerts) are configured and tested outside Git.
4. [ ] The statutory Grievance Officer details on customer-facing routes (`/contact`, `/terms`) are verified accurate.
