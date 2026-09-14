# FairSwap — Staff Operational Handbook (Milestone 1.6)

This handbook provides standard operating procedures, role boundaries, and moderation workflows for FairSwap staff members (Administrators, Moderators, Support Agents, and Content Editors).

---

## 1. Staff Roles & Hierarchy

Privileged access in FairSwap is governed strictly by the `public.staff_roles` table and verified at the database layer.

| Role | Primary Responsibilities | Permissions & Boundaries |
|---|---|---|
| **Administrator** | Full platform management, security configuration, role delegation, privacy/GDPR fulfillment, audit review. | Can assign/revoke staff roles; can suspend any account (except own); can view immutable audit logs (`/admin/audit`). |
| **Moderator** | Content review, listing moderation, user safety reports, account suspensions. | Can approve/reject listings; can resolve reports; can suspend/reinstate regular users; **CANNOT modify any staff account**; cannot view administrative audit logs. |
| **Support Agent** | Customer service inquiries, user disputes, account appeals. | Can triage support tickets (`/admin/support`); can view user account profiles; cannot modify staff roles or suspend accounts directly. |
| **Content Editor** | Category schemas, static documentation, locations, promotional copy. | Can edit categories and taxonomy; cannot access user private data or moderation queues. |

---

## 2. Multi-Factor Authentication (AAL2) Requirement

* **Mandatory Invariant**: Every staff mutation requires an active session with Authenticator Assurance Level 2 (AAL2) verified via RFC 6238 Time-based One-Time Password (TOTP).
* Unverified sessions attempting to access `/admin/*` are automatically intercepted and redirected to `/auth/mfa`.
* Direct API / PostgREST calls with only AAL1 are rejected by PostgreSQL security functions with `Forbidden: requires active administrator or moderator with AAL2`.

---

## 3. User Moderation Workflows

Staff members manage marketplace accounts via the dedicated User Management portal at `/admin/users`.

### A. Searching & Locating Users
1. Navigate to `/admin/users`.
2. Enter query in the search bar (supports partial matching on **email**, **display name**, or exact **UUID**).
3. Optionally filter by account status (**Active**, **Suspended**, **Deletion Pending**, **Deleted**).
4. Click **Inspect & Moderate** to view the user's comprehensive profile.

### B. Investigating Account Activity
On the User Detail page (`/admin/users/[id]`), review contextual information:
* **Account Info**: Email, display name, account creation date, total listings count, staff role.
* **User Listings Tab**: Inspect all listings created by the user, their prices, and current publication statuses.
* **Safety Reports Tab**: Review all abuse reports filed against the user, reasons, and evidence details.
* **Audit History Tab** *(Administrator Only)*: Review immutable security logs of past administrative actions targeting the user.

### C. Suspending or Reinstating an Account
1. Under **Moderation Action**, choose:
   * **Suspend Account** (to halt malicious or policy-violating activity).
   * **Reinstate (Active)** (to restore account standing following appeal or review).
2. Enter **Moderation Reason** (Mandatory, 10 to 500 characters).
   * *Examples*:
     * `"Account suspended for repeated transmission of prohibited off-platform payment links in chat."`
     * `"Reinstated following successful identity verification and resolution of appeal ticket #102."`
3. Click **Confirm Account Action**.
4. **Hard Security Rules Enforced at Database Layer**:
   * Moderation reasons under 10 or over 500 characters are rejected.
   * No-op status transitions (e.g. suspending an already suspended account) are rejected with zero audit events.
   * Self-moderation is blocked (staff cannot modify their own account).
   * Moderators cannot suspend other staff members.

---

## 4. Privacy & GDPR Requests

Administrators oversee data export and account deletion fulfillment via `/admin/privacy`.
* **Data Export Requests**: Evaluated and fulfilled via the streaming export endpoint (`/api/privacy/export/[id]`).
* **Account Deletion Requests**: Processed through atomic database anonymization, media asset purge, and identity deletion.
