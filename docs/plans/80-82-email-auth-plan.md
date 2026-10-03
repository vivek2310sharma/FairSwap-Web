# Implementation Plan: Issues #80 & #82 — Email-First Authentication Redesign

- **Milestone / Issues**: Issue #80 (Remove Google Authentication) & Issue #82 (Email-First Login with Password or Email OTP)
- **Plan Revision**: `r3`
- **Status**: `PROPOSED`
- **Date**: 2026-10-02
- **Author**: Antigravity (AI Assistant)
- **Repository**: `vivek2310sharma/FairSwap-Web`
- **Durable Plan Location**: `docs/plans/80-82-email-auth-plan.md`
- **Native Implementation Plan Artifact**: Mirrored (`r3`, `PROPOSED`)
- **Current Lifecycle State**: `CONDITIONAL LOCAL IMPLEMENTATION COMPLETE — LIVE AUTH NOT VERIFIED`

---

## 1. Executive Summary & Problem Statement

This plan combines two closely linked authentication initiatives for FairSwap Web:
1. **Issue #80 (Remove Google Authentication)**: Remove Google OAuth UI affordances and provider-specific sign-in handling from the Web interface, establishing a clean operational boundary for Google provider retirement without breaking existing account data, shared token verification, or future cross-platform services.
2. **Issue #82 (Email-First Login with Password or Email OTP)**: Redesign `/auth/sign-in` into a responsive, stepped, email-first authentication experience where users enter their email first, followed by a choice between password sign-in (with existing show/hide visibility controls) or a 6-digit email One-Time Password (OTP) code.

This work is strictly scoped to `/auth/sign-in` and its supporting actions, templates, and tests. It preserves the existing sign-up consent and email confirmation flows, password recovery, staff MFA (AAL2) boundaries, session cookie security, and multi-tier account status enforcement.

---

## 2. Verified Baseline & Environment State

### 2.1 Repository & Git Status
- **Repository Origin**: `https://github.com/vivek2310sharma/FairSwap-Web.git` (confirmed `vivek2310sharma/FairSwap-Web`).
- **Current Branch**: `feat/80-82-email-auth` (created from freshly verified `origin/staging`).
- **Current HEAD Commit**: `98fd25d0e2e75a1ae407dd765fc85e960a6e7bd9` (`Merge pull request #100 from vivek2310sharma/chore/81-sync-supabase-types`).
- **Ref Revalidation (via `git fetch` on 2026-10-02)**:
  - `origin/staging`: `98fd25d0e2e75a1ae407dd765fc85e960a6e7bd9` (merges PR #100).
  - `origin/main`: `840d615fff0b08218b96228718169a18df544a6a` (merges PR #99; staging is 2 commits ahead for location type-sync).
  - `origin/feature/82-password-email-otp`: `28d8560bf021187f99ffe2c46039e2d33e93bd55` (candidate commit by Raghav Marwah).
- **Candidate Commit Application**: Applied via `git cherry-pick --no-commit 28d8560` (uncommitted staged/unstaged changes under active review).

### 2.2 Toolchain, Runtime, & Readiness State
- **Host OS**: Windows 11 Enterprise (NT 10.0.26200.0), native x64, PowerShell 5.1 (`$PSVersionTable.PSVersion = 5.1.26100.2161`).
- **Node.js**: `v24.15.0`
- **Package Manager**: `pnpm@10.12.1` pinned via Corepack (`corepack 0.34.6`).
- **Git**: `2.45.1.windows.1`
- **Next.js**: `16.3.5` App Router (documented in `node_modules/next/dist/docs/01-app/`).
- **Supabase SSR / Client**: `@supabase/ssr@0.12.7`, `@supabase/supabase-js@2.116.0`.
- **Supabase CLI**: Pinned `2.117.0` (in `devDependencies`).
- **PGlite Migration Failure Root Cause Note**:
  - `tests/security/legal-acceptance-audit.test.ts` and `tests/security/pilot-policy-reacceptance.test.ts` run disposable in-process `@electric-sql/pglite` instances. Their `beforeAll` hooks replay migrations from `supabase/migrations/`.
  - Migration 24 (`20260926000024_email_outbox_runtime_extensions.sql`) requires PostgreSQL extension `pg_net`.
  - WebAssembly PGlite does not support `pg_net`, throwing `error: extension "pg_net" is not available` during setup.
  - This failure is completely independent of Docker and is a known pre-existing harness limitation on the post-Migration 24 staging tree.
- **Docker Client vs Daemon Readiness**:
  - `docker.exe` version 29.7.2 is installed.
  - **Docker Desktop Engine is STOPPED** (`failed to connect to the docker API at npipe:////./pipe/dockerDesktopLinuxEngine`).
  - **Impact**: Real local Supabase containers (`fairswap-local`) and Inbucket (`54324-54326`) are **UNAVAILABLE / STOPPED**. Tier-2 live container tests (`supabase test db` pgTAP assertions and live Supabase integration journeys) are **BLOCKED / NOT RUN** until the engine daemon is started by the operator. Unit mocks and in-process tests remain executable.

---

## 3. Product Decisions & User Experience Flow

The `/auth/sign-in` route will be retained as a stepped, responsive page without browser popups or external authentication redirects.

### Step 1: Email Input
- **Heading**: `"Sign in to FairSwap"`
- **Input**: Single email address field (`type="email"`, `required`, `autoComplete="email"`, placeholder `"you@example.com"`).
- **Action**: Primary button labelled `"Continue"` (emerald brand styling, full width).
- **Navigation**:
  - Separate link: `"Create account"` pointing to `/auth/sign-up`.
  - Close button (`<AuthCloseLink />`) returning to sanitized redirect path or `/`.
- **Exclusions**: Completely remove Google sign-in button, "or use email" divider, and all phone authentication references.
- **Client Validation**: Zod email schema validation occurs on client submit before progressing to Step 2.

### Step 2: Password Authentication
- **Header Badge / Pill**: Displays the entered email with a prominent `"Change"` action. Clicking `"Change"` returns the user to Step 1 with the email preserved for editing, clearing sensitive inputs.
- **Password Input**: Uses `<PasswordInput>` with the existing accessible eye toggle affordance (`aria-label`, `aria-controls`, `aria-pressed`, `type="password" <-> "text"`).
- **Actions**:
  - Primary button: `"Sign In"` (submits credentials via Server Action `signInAction`).
  - Helper link: `"Forgot password?"` pointing to `/auth/forgot-password`.
  - Secondary text action: `"Email me a one-time code instead"`.

### Step 3: Email OTP Verification
- **Header Badge / Pill**: Displays the entered email with a `"Change"` action. Clicking `"Change"` returns the user to Step 1 and resets OTP-specific state.
- **Status Notice**: Displays a neutral request acknowledgement banner (`"If this email is associated with an eligible account, you'll receive a sign-in code shortly."`) **only** after the server request completes successfully.
- **Input**: Monospace 6-digit numeric verification code input (`type="text"`, `inputMode="numeric"`, `pattern="[0-9]{6}"`, `maxLength={6}`, `autoComplete="one-time-code"`, placeholder `"123456"`).
- **Actions**:
  - Primary button: `"Verify & Continue"` (submits code via Server Action `verifyEmailOtpAction`).
  - Secondary link: `"Sign in with password instead"` (switches view back to Step 2 without re-entering email).
  - Resend control: `"Resend code"` button with a 60-second client-side countdown timer (`"Resend code (45s)"`). Disabled while countdown is active or while a send request is in-flight.

### Relationship Between Methods
- Password and Email OTP are **independent, alternative** authentication mechanisms.
- OTP is not an extra required 2FA factor for ordinary users.
- Staff accounts signing in via password or OTP both establish an AAL1 session and remain subject to mandatory TOTP AAL2 verification at `/auth/mfa` before gaining access to `/admin`.

---

## 4. Account Compatibility & Multi-Tier Authorization Model

### 4.1 Historical Repository Intent vs Unverified Hosted Reality
- **Historical Repository Intent**: PR #48 and PR #61 implemented Google OAuth on staging/production exclusively for accounts with a verified email matching an existing account. Google-first registration was prevented.
- **Unverified Hosted Reality**: The actual state of hosted accounts in `FairSwapTest` and `FairSwapProd` is **unverified**. We do not assume all users possess usable passwords or that all Google-linked accounts originated from identical signup paths.
- **Strict Boundary**: This plan does **not** authorize production database inspection, account exports, identity mutations, or user enumeration.

### 4.2 Account Category Behavior & Verification Matrix

| Account Category | Password Sign-In Behavior | Email OTP Sign-In Behavior | Expected Outcome & Verification Requirement |
|---|---|---|---|
| **A. Confirmed Email/Password** | Signs in directly with password. | Receives 6-digit code via email; enters code to sign in. | Full dual-method parity. Session established at AAL1. |
| **B. Google-Linked (with Usable Password)** | Signs in directly with password. | Receives 6-digit code to Google email; enters code. | Full parity. User data, ID, listings, and history preserved without Google OAuth button. |
| **C. Google-Linked (No Usable Password)** | Cannot use password directly (fails generic credentials check). | Receives 6-digit code to Google email; enters code to authenticate. | **Verification Requirement**: Must be empirically tested. User can also use "Forgot password?" to set a password. No data loss. |
| **D. Existing Unconfirmed Account** | Rejected by GoTrue with unconfirmed email error; UI shows generic credentials failure. | GoTrue behavior with `shouldCreateUser: false`: either rejects unconfirmed user or sends confirmation/OTP. | **Explicitly Unresolved until Tested**: Must be tested against local GoTrue stack. Expected: user must confirm registration before sign-in is allowed. Signup confirmation requirements must not be bypassed. |
| **E. Suspended Account** (`account_status = 'suspended'`) | Authenticates to AAL1 in GoTrue; downstream server guards immediately restrict access. | Authenticates to AAL1 in GoTrue; downstream server guards immediately restrict access. | Status invariant preserved across all layers (proxy, Server Actions, RPC, RLS). |
| **F. Application-Deleted Account** (`account_status = 'deleted'`) | Authenticates to AAL1 in GoTrue; downstream server guards immediately restrict access. | Authenticates to AAL1 in GoTrue; downstream server guards immediately restrict access. | Account remains unusable in marketplace; privacy fulfillment records preserved. |
| **G. Auth-Deleted Account** (Removed from `auth.users`) | Rejected by GoTrue as non-existent user; UI shows generic credentials failure. | GoTrue returns user not found; server action returns neutral request acknowledgement. | No code sent; no account created; zero enumeration. |
| **H. Privileged Staff Account** | Authenticates to AAL1; accessing `/admin` prompts for TOTP AAL2 MFA. | Authenticates to AAL1; accessing `/admin` prompts for TOTP AAL2 MFA. | Staff security invariant preserved. Neither method bypasses AAL2 enforcement. |

### 4.3 Multi-Tier Authorization Enforcement Architecture
Authentication produces an authenticated session token, but **authorization is enforced across multiple defense-in-depth layers**:
1. **Edge Route Guard (`src/proxy.ts`)**:
   - Inspects `getClaims()` and session tokens.
   - Redirects unauthenticated requests from `/account/*` and `/admin/*` to `/auth/sign-in`.
   - Enforces `has_current_policy_acceptance` RPC check before allowing access to user account surfaces.
   - **Preserves Legitimate Exceptions**: Directly exempts `/account/policy-review`, `/account/privacy`, and `/account/support` so suspended or policy-pending users can access legal and support remedies.
2. **Server Actions & Route Handlers (`src/app/account/*`, `src/app/admin/*`)**:
   - Request-scoped Supabase client calls `getUser()` to verify cryptographic identity.
   - Invokes `app_security.get_account_status()` to verify caller account status is `active`.
   - Admin actions check `claims.aal === "aal2"` and staff role prior to executing mutations.
3. **Database Two-Tier RPCs & RLS Policies**:
   - Public RPC wrappers (`SECURITY INVOKER`) delegate to unexposed `app_security` (`SECURITY DEFINER`) functions with search path pinned.
   - Database functions check caller account status, role, and AAL2 assurance at the SQL transaction level.
   - Table RLS policies fail closed if the session is unauthenticated or restricted.

---

## 5. Google Authentication Removal Strategy (Issue #80)

### 5.1 Two-Phase Rollout Architecture
Issue #80 comprises two distinct gates:
1. **Phase 1 (Web Application Scope — Current Task)**:
   - Remove `<GoogleAuthButton>` from `/auth/sign-in`.
   - Remove Google promotional/explanatory copy and dividers.
   - Delete `src/components/auth/GoogleAuthButton.tsx`.
   - Clean up OAuth-specific error banners (`oauth_failed`) from `/auth/sign-in`.
   - Retain the shared auth callback route (`src/app/auth/callback/route.ts`) for token hash verification and PKCE exchange.
2. **Phase 2 (Operational Rollout & Provider Deprecation — Future Operational Task)**:
   - **Hosted provider configuration remains UNCHANGED during local work.**
   - Google provider in hosted Supabase (`FairSwapTest` and `FairSwapProd`) remains active until replacement login and existing-account compatibility are verified on staging.
   - Cross-platform dependencies (e.g., native mobile apps, third-party integrations) must be formally reviewed before disabling the provider in Supabase Dashboard.
   - **Issue #80 will not be marked closed on GitHub until both Phase 1 (code) and Phase 2 (operational provider shutdown) are complete.**

### 5.2 Preservation of Shared Auth Callback
The Route Handler at `src/app/auth/callback/route.ts` serves multiple critical functions:
- Email signup confirmation (`token_hash` + `type=signup`).
- Password recovery (`token_hash` + `type=recovery`).
- Email change confirmation (`token_hash` + `type=email_change`).
- General PKCE code exchange (`exchangeCodeForSession(code)`).

The callback will **not** be deleted. Only OAuth provider error handling will be neutralized to avoid dead redirects to removed OAuth parameters.

---

## 6. OTP Request-Result Contract & Error Mapping

### 6.1 Request vs Delivery Distinction
The application server cannot confirm inbox delivery. Calling `signInWithOtp` merely enqueues an email via GoTrue/SMTP.
- **Neutral Success Copy**: `"If this email is associated with an eligible account, you'll receive a sign-in code shortly."`
- The UI must distinguish between:
  1. *In-flight submission*: `"Sending code..."` (pending spinner, inputs disabled).
  2. *Server-accepted acknowledgement*: Neutral informational notice.
  3. *Client-side countdown*: Time until next request permitted.

### 6.2 Error Mapping & Scoped Account Enumeration Safeguard
- **Scoped Statement**: Application-layer response parity ensures that on the public `/auth/sign-in` endpoint, identical status notices and structures are returned for both existing and non-existing accounts, preventing application-level enumeration.
- **Residual Direct-Provider Limitations**: Upstream timing differences or direct Supabase API probes without application middleware could exhibit different response characteristics.

| GoTrue Response / Error Condition | Internal Log Event | Client Response Object | Client UI Presentation |
|---|---|---|---|
| **Success (HTTP 200)** | `auth.send_otp_acknowledged` | `{ success: true, message: "If this email is associated with an eligible account, you'll receive a sign-in code shortly." }` | Emerald informational notice; starts 60s cooldown; advances to OTP step. |
| **User Not Found / Signups Not Allowed** (`shouldCreateUser: false`) | `auth.send_otp_unknown_account` (redacted) | `{ success: true, message: "If this email is associated with an eligible account, you'll receive a sign-in code shortly." }` | Identical emerald notice; starts 60s cooldown; advances to OTP step. **Application-layer response parity.** |
| **Email Rate Limit Exceeded** (`over_email_send_rate_limit` / 429) | `auth.send_otp_rate_limited` | `{ error: "Too many requests. Please wait a few minutes before trying again." }` | Amber warning banner; does not advance step; leaves email intact. |
| **Network / Transport Failure** (Fetch failed / timeout) | `auth.send_otp_network_error` | `{ error: "Unable to reach the sign-in service. Please check your connection and try again." }` | Red error alert; allows immediate retry. |
| **Service / SMTP Failure** (500, SMTP rejection) | `auth.send_otp_service_error` | `{ error: "Unable to send sign-in code right now. Please try again later or use your password." }` | Red error alert; suggests password fallback. |
| **Invalid Email Syntax** (Zod parse failure) | `auth.send_otp_validation_failed` | `{ error: "Please provide a valid email address." }` | Inline field error below email input. |

### 6.3 Mutually Exclusive UI State (No Contradictory Notices)
- `otpNotice` (green status) and `errorAlert` (red error) are mutually exclusive.
- Triggering a new send or resend clears all existing notices.
- If a server error returns, `otpNotice` is explicitly set to `null` before setting `errorAlert`.

---

## 7. Configuration Contract: Local vs Hosted

### 7.1 Pinned Parameters & Settings
The Supabase GoTrue authentication engine governs email OTP behavior via specific configuration keys inside the existing `[auth.email]` section in `supabase/config.toml`:

| Configuration Parameter | Parameter Key in `supabase/config.toml` | Target Value | Impact & Side-Effect Assessment |
|---|---|---|---|
| **OTP Code Length** | `auth.email.otp_length` | `6` (integer) | Proposed local value subject to verification against pinned CLI. Standard 6-digit numeric token. Matches client regex `/^\d{6}$/`. |
| **Resend Rate Limit** | `auth.email.max_frequency` | `"1m"` (duration string) | Enforces minimum 60s between email dispatches per user. (Note: Distinguish per-user resend frequency from IP/project rate limits). |
| **OTP Expiry** | `auth.email.otp_expiry` | `3600` (integer seconds) | Proposed local value subject to verification against pinned CLI. **Shared-Token Expiry Note**: GoTrue shares `otp_expiry` across Magic Links, email OTPs, and password reset tokens. Setting to standard 3600s preserves recovery link validity. |
| **Magic Link / OTP Template** | `[auth.email.template.magic_link]` | `./supabase/templates/magic_link.html` | Renders `{{ .Token }}` as a 6-digit monospace code in branded FairSwap email layout. |

### 7.2 Current Known vs Unknown Values
- **Local Stack (`supabase/config.toml`)**:
  - `enable_confirmations = true` (Known)
  - `enable_signup = true` (Known)
  - `otp_length`, `max_frequency`, `otp_expiry` are currently default/implicit.
  - Template `magic_link.html` is currently **missing** in `supabase/templates/`.
- **Hosted Stack (`FairSwapTest` & `FairSwapProd`)**:
  - Actual values in Supabase Cloud Dashboard are **UNKNOWN / UNCHANGED**.
  - Do not assume Resend SMTP is already configured for Supabase Auth in hosted projects.
  - Hosted settings must be audited and configured as an operational task prior to staging PR merge.
- **No configuration edits are authorized now.**

---

## 8. Request Lifecycle, Concurrency, & Session Safety

### 8.1 Generation Tracking & Stale Response Prevention
To prevent race conditions where a slow response for email $A$ arrives after the user has navigated to email $B$:
- The client component maintains an integer `requestId` / `generationId` that increments on every email or method change.
- When an asynchronous send/resend action returns, the response is discarded if its generation ID does not match the active generation ID.
- **Scenario A -> B -> A**: User enters `test1@example.com` -> clicks OTP -> quickly clicks Change -> enters `test2@example.com`. The response for `test1` will not transition Step 3 for `test2`.
- **Method Switching**: If a user requests an OTP, then immediately switches back to Password, any delayed OTP response is invalidated and will not interrupt the active password entry screen.

### 8.2 Per-Email Cooldown Preservation
- If a user triggers an OTP for `seller@example.com`, clicks Change to inspect Step 1, and immediately re-enters `seller@example.com`, the client must **not** reset the cooldown timer.
- The component tracks `resendAvailableAt: Record<string, number>` keyed by normalized email.
- The UI calculates remaining countdown from `Math.max(0, Math.ceil((resendAvailableAt[email] - Date.now()) / 1000))`.

### 8.3 Input Locking & Concurrency Protection
- **No Duplicate Submissions**: While `isSignInPending` or `isVerifyOtpPending` is true, all submit buttons, text inputs, and navigation buttons are `disabled` in-flow.
- **Accessible Pending States**: Uses standard aria-disabled, spinners, and accessible loading text. **No intrusive modal dialogs** will be introduced solely to lock the form.
- **Browser/Cookie Realism**: Acknowledging that disabling UI controls does not prevent a user from pressing the browser back button or closing the tab, and does not cancel an in-flight server redirect or HTTP session-cookie update.

---

## 9. Branch Preparation, Reuse Strategy, & Test Safety

### 9.1 Branch & Worktree Preparation Sequence (Executed in Preparation Pass)
1. **Ref Freshness Verified**: Freshly fetched `origin/staging`, `origin/main`, `origin/feature/82-password-email-otp`.
2. **Branch Created**: `git switch --no-track -c feat/80-82-email-auth origin/staging` executed cleanly.
3. **Planning Files Preserved**: Verified SHA-256 hashes of `docs/plans/80-82-email-auth-plan.md` and `docs/PROGRESS.md` before and after branch switch.
4. **Baseline Verification Executed**: Captured native exit statuses for `typecheck`, `lint`, `test:unit`, `test:security`, and `build` prior to applying candidate changes.
5. **Candidate Commit NOT Applied**: `28d8560` remains unapplied, awaiting human review.

### 9.2 Test Safety & Environmental Isolation Rules
- **Fail Closed**: All test scripts must run strictly against local mock environments or the confirmed disposable local Supabase instance (`fairswap-local` at `127.0.0.1:54321`).
- **Zero Remote Contamination**: Never execute tests with credentials pointing to `FairSwapTest` or `FairSwapProd`.
- **Local Mail Capture Only**: All email delivery tests must verify emails via local Inbucket/Mailpit (`127.0.0.1:54324`). Real SMTP or user-targeted emails are prohibited.
- **Docker Readiness Distinction**: The presence of `docker.exe` does not prove the Docker engine is running. (Verified: Docker daemon is currently stopped; container tests are blocked).
- **PowerShell 5.1 Exit Code Handling**: All multi-command PowerShell invocations must inspect `$LASTEXITCODE` after each step to prevent masking failures.
- **Classification of Results**: Test reports must explicitly distinguish between:
  - `PASS`: Test executed and passed assertions.
  - `FAIL`: Test executed and failed assertions.
  - `PRE-EXISTING BASELINE FAILURE`: Known failures present on clean `staging` prior to changes.
  - `BLOCKED / NOT RUN`: Test could not be executed due to missing local runtime (e.g. Docker daemon stopped).

---

## 10. Proposed Affected Files Inventory

| File Path | Action | Description of Planned Changes |
|---|---|---|
| `src/app/auth/actions.ts` | Edit | Add `sendEmailOtpAction` and `verifyEmailOtpAction` with strict Zod regex `/^\d{6}$/`, neutral non-enumerating responses, and redacted structured logging. Fix typo in error message (`couldn\'t` -> `couldn't`). |
| `src/app/auth/sign-in/page.tsx` | Edit | Refactor to 3-step email-first login, remove GoogleAuthButton and divider, fix premature OTP notice, implement per-email 60s cooldown timer, and set heading to "Sign in to FairSwap". |
| `src/components/auth/GoogleAuthButton.tsx` | Delete | Remove unused component. |
| `src/app/auth/callback/route.ts` | Edit | Neutralize obsolete `oauth_failed` error redirects while preserving code exchange and token_hash verification. |
| `supabase/config.toml` | Edit | Register `[auth.email.template.magic_link]` pointing to template file; document default OTP parameters. |
| `supabase/templates/magic_link.html` | Create | New HTML template rendering `{{ .Token }}` as a 6-digit verification code in branded FairSwap layout. |
| `src/__tests__/password-visibility.test.tsx` | Edit | Update Sign In test to transition through the email step before asserting password visibility toggle. |
| `src/__tests__/email-login-redesign.test.tsx` | Create / Port | Comprehensive unit tests for stepped flow, 6-digit validation, premature notice prevention, error handling, and method switching. |
| `tests/security/auth-account-enumeration.test.ts` | Edit | Add non-enumeration assertions for OTP send action responses; align expectation with fixed `actions.ts`. |
| `tests/auth/callback.test.ts` | Edit | Adjust tests to reflect neutralized callback error handling without breaking token_hash tests. |
| `tests/security/auth-otp-aal2.test.ts` | Create (PLANNED) | Dedicated security integration test proving OTP-authenticated staff session remains subject to AAL2 MFA enforcement. |
| `e2e/auth.spec.ts` | Edit | Update sign-in steps in Playwright tests (enter email, click Continue, enter password) to match stepped UX; add OTP flow smoke test. |
| `e2e/communication.spec.ts` | Edit | Update login helpers / steps to stepped email-first flow. |
| `e2e/listings.spec.ts` | Edit | Update login helpers / steps to stepped email-first flow. |
| `e2e/responsive-audit.spec.ts` | Edit | Update sign-in page checks for stepped responsive flow. |
| `e2e/user-management.spec.ts` | Edit | Update staff sign-in steps to stepped flow. |
| `docs/operations/deployment-guide.md` | Edit | Document hosted Supabase Magic Link / OTP template configuration and transition plan for Google-linked accounts. |
| `docs/PROGRESS.md` | Edit | Append planning and verification status entries for Issues #80 & #82. |

---

## 11. Ordered Implementation Batches (for BUILD phase)

### Batch 1: Server Actions & Security Hardening
1. In `src/app/auth/actions.ts`:
   - Refactor `SendOtpSchema` to validate email.
   - Refactor `VerifyOtpSchema` to enforce exact 6-digit regex `/^\d{6}$/`.
   - Update `sendEmailOtpAction` to return a neutral success message regardless of whether the user exists (`shouldCreateUser: false`), handling rate limit errors cleanly.
   - Update `verifyEmailOtpAction` with identity confirmation via `getUser()`, structured logging, and sanitized redirect.
   - Fix pre-existing escaped quote typo in `signInAction` line 117 (`couldn\'t` -> `couldn't`).
2. In `tests/security/auth-account-enumeration.test.ts`:
   - Add test asserting `sendEmailOtpAction` uses non-enumerating neutral responses.

### Batch 2: Stepped Sign-In Page & Component Cleanup
1. In `src/app/auth/sign-in/page.tsx`:
   - Update Step 1 heading to `"Sign in to FairSwap"`.
   - Remove `GoogleAuthButton` and "or use email" divider.
   - Remove `oauth_failed` error banner.
   - Implement Step 1 (Email) -> Step 2 (Password) -> Step 3 (OTP) state machine.
   - Add "Change" email action on Steps 2 and 3 that resets state cleanly.
   - Fix premature OTP notice: display status only when `sendOtpState?.success` is true; never show conflicting success + error.
   - Implement 60-second client-side resend cooldown timer with per-email timestamp tracking.
   - Implement attempt ID generation tracking to invalidate stale in-flight responses.
   - Ensure proper focus management, accessible labels (`aria-live="polite"` for status notices, `role="alert"` for errors).
2. Delete `src/components/auth/GoogleAuthButton.tsx`.
3. In `src/app/auth/callback/route.ts`:
   - Clean up OAuth-specific error redirects while preserving code exchange and token_hash verification.

### Batch 3: Supabase Templates & Local Configuration
1. Create `supabase/templates/magic_link.html`:
   - Render `{{ .Token }}` prominently with monospace styling and clear instructions.
2. Update `supabase/config.toml`:
   - Add `[auth.email.template.magic_link]` block.
   - Document `otp_length = 6`, `max_frequency = "1m"`, `otp_expiry = 3600` inside `[auth.email]`.
3. Update `docs/operations/deployment-guide.md`:
   - Document hosted Supabase Magic Link / OTP email template configuration.
   - Document transition plan and account preservation for existing Google-linked users.

### Batch 4: Unit & Security Test Suite Alignment
1. Update `src/__tests__/password-visibility.test.tsx`:
   - Enter email and click Continue before testing password visibility toggle.
2. Port and adapt `src/__tests__/email-login-redesign.test.tsx`:
   - Test "Sign in to FairSwap" heading.
   - Test email validation and step transition.
   - Test absence of Google and phone auth elements.
   - Test OTP transition, 6-digit validation, and resend cooldown.
   - Test status/error banner isolation (no premature success notice).
   - Test email A -> B -> A transition and stale response cancellation.
3. Update `tests/auth/callback.test.ts`:
   - Align with updated callback error handling.
4. Add `tests/security/auth-otp-aal2.test.ts` (PLANNED):
   - Proves OTP sign-in produces an AAL1 session that cannot access staff routes without TOTP AAL2 verification.

### Batch 5: E2E Test Suite Alignment (Across All Login Journeys)
1. Update `e2e/auth.spec.ts`:
   - Update existing sign-in tests to use the two-step flow (`email` -> `Continue` -> `password` -> `Sign In`).
   - Add OTP flow journey test using Mailpit local email retrieval.
   - Add test verifying session persistence after page reload.
2. Update `e2e/communication.spec.ts`, `e2e/listings.spec.ts`, `e2e/responsive-audit.spec.ts`, `e2e/user-management.spec.ts`:
   - Update sign-in interactions to stepped email-first flow.

### Batch 6: Final Verification & Evidence Packaging
1. Execute full local test matrix:
   - `corepack pnpm typecheck`
   - `corepack pnpm lint`
   - `corepack pnpm test:unit`
   - `corepack pnpm test:security`
   - `corepack pnpm test:e2e` (if local Supabase stack is running)
   - `corepack pnpm build`
2. Prepare review walkthrough and update `docs/PROGRESS.md`.

---

## 12. Complete Acceptance-to-Test Matrix

| Acceptance Criterion | Test Target / File | Specific Assertion / Test Name | Test Tier |
|---|---|---|---|
| **Step 1 Heading & Controls** | `src/__tests__/email-login-redesign.test.tsx` | `renders the exact heading 'Sign in to FairSwap'` | Unit (RTL / jsdom) |
| **No Google / Phone Elements** | `src/__tests__/email-login-redesign.test.tsx` | `completely removes Google sign-in UI and references` | Unit (RTL / jsdom) |
| **Client Email Validation** | `src/__tests__/email-login-redesign.test.tsx` | `shows inline validation error for invalid email address format` | Unit (RTL / jsdom) |
| **Step 2 Password Transition** | `src/__tests__/email-login-redesign.test.tsx` | `proceeds to password step on valid email submission` | Unit (RTL / jsdom) |
| **Successful Password Sign-In** | `e2e/auth.spec.ts` | `signs in successfully with email and password to /account` | Browser E2E (Playwright) |
| **Password Visibility Toggle** | `src/__tests__/password-visibility.test.tsx` | `renders password input and allows toggling visibility` | Unit (RTL / jsdom) |
| **Change Email Action** | `src/__tests__/email-login-redesign.test.tsx` | `allows user to change email and return to Step 1` | Unit (RTL / jsdom) |
| **Switch to OTP without Premature Success** | `src/__tests__/email-login-redesign.test.tsx` | `does not show OTP notice before send action completes` | Unit (RTL / jsdom) |
| **Strict 6-Digit Server OTP Validation** | `src/__tests__/email-login-redesign.test.tsx` | `validates OTP code format strictly (6 digits) via Zod` | Unit (RTL / jsdom) |
| **Successful OTP Sign-In & Reload Persistence** | `e2e/auth.spec.ts` | `authenticates with 6-digit email OTP and persists session across page reload` | Browser E2E (Playwright) |
| **Invalid, Expired, Reused OTP** | `e2e/auth.spec.ts` | `shows error banner on invalid or expired OTP code` | Browser E2E (Playwright) |
| **Resend 60s Cooldown** | `src/__tests__/email-login-redesign.test.tsx` | `disables resend button during active cooldown` | Unit (RTL / jsdom) |
| **Preserve Cooldown on Return (A -> B -> A)** | `src/__tests__/email-login-redesign.test.tsx` | `preserves resend cooldown when changing and returning to email` | Unit (RTL / jsdom) |
| **Stale Response Cancellation** | `src/__tests__/email-login-redesign.test.tsx` | `discards delayed send response after email or method switch` | Unit (RTL / jsdom) |
| **Switch Back to Password** | `src/__tests__/email-login-redesign.test.tsx` | `supports switching back to password sign-in` | Unit (RTL / jsdom) |
| **Pending & Duplicate Submissions** | `src/__tests__/email-login-redesign.test.tsx` | `disables form controls during in-flight credential verification` | Unit (RTL / jsdom) |
| **Unknown Email Non-Enumeration** | `tests/security/auth-account-enumeration.test.ts` | `keeps OTP send responses neutral and non-enumerating` | Security Unit |
| **No Auto-Signup on OTP** | `e2e/auth.spec.ts` | `OTP request for unregistered email does not provision user account` | Browser E2E (Playwright) |
| **Password Failure Non-Enumeration** | `tests/security/auth-account-enumeration.test.ts` | `keeps sign-in failures generic and non-enumerating` | Security Unit |
| **Open Redirect Sanitization** | `tests/auth/callback.test.ts` | `rejects malicious open redirect in next parameter` | Integration Unit |
| **Account Restriction at Trusted Boundaries** | `tests/security/user-moderation-rls.test.ts` | `proves suspended user rejected by database RPC and RLS` | Security Integration (PGlite) |
| **Staff MFA / AAL2 Enforcement after OTP** | `tests/security/auth-otp-aal2.test.ts` (PLANNED) | `proves OTP-authenticated staff session rejected at /admin without AAL2` | Security Integration |
| **Staff MFA Layout Check** | `tests/unit/admin-auth-and-moderation.test.ts` | `AdminLayout checks staff role BEFORE checking AAL2 assurance` | Unit |
| **Signup Confirmation Preservation** | `tests/auth/callback.test.ts` | `handles valid signup TokenHash and redirects to /account` | Integration Unit |
| **Password Recovery Preservation** | `tests/auth/callback.test.ts` | `handles valid recovery TokenHash and redirects to password reset` | Integration Unit |
| **Keyboard Navigation & Accessibility** | `src/__tests__/email-login-redesign.test.tsx` | `supports full tab navigation and accessible error announcements` | Unit (RTL / jsdom) |
| **Mobile Viewport Stepped Flow** | `e2e/responsive-audit.spec.ts` | `renders stepped sign-in flow cleanly on mobile-chromium viewport` | Browser E2E (Playwright) |
| **Production Build Compilation** | `next build` | Exit status 0, 45+ application routes compiled | Production Build |

---

## 13. Rollout Gates & Operational Checkpoints

Promoting this change from local development to production requires passing through four distinct gates:

```text
[ Gate 1: Local Code Complete ]
  ├── All Batches 1–6 implemented
  ├── Unit, security, and build checks PASS
  └── PR opened targeting 'staging'
             │
             ▼
[ Gate 2: Staging Hosted Verification (FairSwapTest) ]
  ├── Vercel Preview deployed on FairSwapTest
  ├── Supabase Dashboard (FairSwapTest) configured with Magic Link {{ .Token }} template
  ├── Live email delivery verified via Resend SMTP
  └── Existing-account compatibility test matrix verified
             │
             ▼
[ Gate 3: Production Promotion (FairSwapProd) ]
  ├── Staging PR merged to 'staging'
  ├── Promotion PR opened 'staging' -> 'main'
  ├── Supabase Dashboard (FairSwapProd) configured with Magic Link {{ .Token }} template
  └── Human smoke test passes on fairswap.in
             │
             ▼
[ Gate 4: Operational Google Provider Shutdown ]
  ├── Cross-platform (mobile) review completed
  ├── Operator explicitly disables Google provider in Supabase Dashboard
  └── Close GitHub Issues #80 & #82
```

---

## 14. Rollback Approach

1. **Application Code Rollback**:
   - Because no database schema migrations, column alterations, or RLS policy changes are introduced, application rollback requires only reverting the Git PR on `staging` or `main`.
   - Vercel Instant Rollback can be deployed to restore the previous immutable build.
2. **Operational Configuration Rollback**:
   - `supabase/config.toml` changes revert cleanly via Git.
   - Hosted email templates in Supabase can be restored to prior versions via the dashboard.
   - **Post-Shutdown Provider Rollback**: If Google OAuth provider shutdown in Gate 4 needs to be rolled back, the operator must re-enable Google OAuth in the Supabase Dashboard and re-deploy the application commit containing `<GoogleAuthButton>`. A recoverable pre-change configuration record of provider client IDs and callback URLs must be archived in operator secrets management prior to shutdown.

---

## 15. Required Permissions, Readiness, & Blockers

- **LOCAL PREPARATION & BASELINE State**: COMPLETE.
- **BUILD Authorization**: PENDING. Execution of Batches 1–6 requires explicit human review and authorization of this plan (`r3`).
- **External Blockers & Local Limitations**:
  - Docker daemon is stopped on the local workstation. Local containerized Supabase (`fairswap-local`) and Inbucket (`54324`) cannot be started without starting Docker Desktop.
  - Full E2E Playwright tests and pgTAP tests requiring live containers are **BLOCKED / NOT RUN** until Docker Desktop is started.
  - Hosted configurations for `FairSwapTest` and `FairSwapProd` remain **UNKNOWN / UNCHANGED**.
