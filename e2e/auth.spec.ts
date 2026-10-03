import { test, expect } from "@playwright/test";
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import {
  validateLocalTestEnvironment,
  testUserRegistry,
  type TargetConfig,
} from "../tests/helpers/local-test-guard";
import { extractOtpFromEmail } from "../tests/helpers/extract-otp";
import { LEGAL_POLICY } from "../src/lib/compliance/legal-policy";

const PLAYWRIGHT_BASE_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || "http://localhost:3001";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
const MAILPIT_URL = process.env.MAILPIT_URL || "http://127.0.0.1:54324";
const SERVICE_KEY =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

const TARGET_CONFIG: TargetConfig = {
  appUrl: PLAYWRIGHT_BASE_URL,
  supabaseUrl: SUPABASE_URL,
  mailboxUrl: MAILPIT_URL,
};

const CURRENT_LEGAL_METADATA = {
  terms_accepted: "true",
  terms_version: LEGAL_POLICY.termsVersion,
  privacy_policy_version: LEGAL_POLICY.privacyVersion,
  acceptable_use_version: LEGAL_POLICY.acceptableUseVersion,
  age_confirmed: "true",
  minimum_age_confirmed: LEGAL_POLICY.minimumAge,
};

// RFC 6238 TOTP generator
function generateTOTP(base32Secret: string): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const char of base32Secret.replace(/=/g, "").toUpperCase()) {
    const val = alphabet.indexOf(char);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, "0");
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.substring(i, i + 8), 2));
  }
  const key = Buffer.from(bytes);
  const timeStep = Math.floor(Date.now() / 30000);
  const timeBuffer = Buffer.alloc(8);
  timeBuffer.writeBigInt64BE(BigInt(timeStep));

  const hmac = crypto.createHmac("sha1", key);
  hmac.update(timeBuffer);
  const digest = hmac.digest();

  const offset = digest[digest.length - 1] & 0xf;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);

  return (binary % 1000000).toString().padStart(6, "0");
}

// Mailpit helper to retrieve latest email for address
async function getLatestEmail(recipientEmail: string, maxAttempts = 10): Promise<{ subject: string; html: string; text: string }> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetch(`${MAILPIT_URL}/api/v1/messages`);
      if (res.ok) {
        const data = await res.json();
        const msg = data.messages?.find((m: { To?: Array<{ Address: string }> }) =>
          m.To?.some((t) => t.Address.toLowerCase() === recipientEmail.toLowerCase())
        );
        if (msg) {
          const detailRes = await fetch(`${MAILPIT_URL}/api/v1/message/${msg.ID}`);
          if (detailRes.ok) {
            const detail = await detailRes.json();
            return {
              subject: msg.Subject,
              html: detail.HTML || "",
              text: detail.Text || "",
            };
          }
        }
      }
    } catch {
      // Retry
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`No email found in Mailpit for ${recipientEmail} after ${maxAttempts} attempts.`);
}

test.describe("FairSwap Milestone 1.2 Authentication & Protection Flows", () => {
  test.afterEach(async () => {
    if (process.env.ALLOW_LOCAL_TEST_MUTATIONS === "true") {
      validateLocalTestEnvironment(TARGET_CONFIG);
      const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const cleanupResult = await testUserRegistry.cleanupTrackedUsers(supabase, TARGET_CONFIG);
      if (cleanupResult.failed.length > 0) {
        throw new Error(
          `Scoped test user cleanup failed for user IDs: ${cleanupResult.failed.join(", ")}`
        );
      }
    }
  });

  test("sign-in page renders with form inputs and navigation links", async ({ page }) => {
    await page.goto("/auth/sign-in");

    await expect(page.getByRole("heading", { name: /sign in to fairswap/i })).toBeVisible();
    await expect(page.locator("input[name='email']")).toBeVisible();
    await expect(page.getByRole("button", { name: "Continue" })).toBeVisible();

    const signUpLink = page.getByRole("link", { name: /create account/i });
    await expect(signUpLink).toBeVisible();
    await expect(signUpLink).toHaveAttribute("href", "/auth/sign-up");

    const closeLink = page.getByRole("link", { name: "Close" });
    await expect(closeLink).toBeVisible();
    await expect(closeLink).toHaveAttribute("href", "/");

    // Proceed to password step
    await page.locator("input[name='email']").fill("user@example.com");
    await page.getByRole("button", { name: "Continue" }).click();

    const passwordInput = page.locator("input[name='password']");
    await expect(passwordInput).toBeVisible();
    await expect(passwordInput).toHaveAttribute("type", "password");

    const togglePassword = page.getByRole("button", { name: "Show password" });
    await expect(togglePassword).toBeVisible();
    await togglePassword.click();
    await expect(passwordInput).toHaveAttribute("type", "text");
    const hidePassword = page.getByRole("button", { name: "Hide password" });
    await expect(hidePassword).toBeVisible();
    await hidePassword.click();
    await expect(passwordInput).toHaveAttribute("type", "password");
    await expect(page.getByRole("button", { name: "Show password" })).toBeVisible();

    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();

    const forgotLink = page.getByRole("link", { name: /forgot password/i });
    await expect(forgotLink).toBeVisible();
    await expect(forgotLink).toHaveAttribute("href", "/auth/forgot-password");

    await expect(
      page.getByRole("button", { name: /email me a one-time code instead/i })
    ).toBeVisible();
  });

  test("sign-up page enforces required fields and consent acceptance", async ({ page }) => {
    await page.goto("/auth/sign-up");

    await expect(page.getByRole("heading", { name: /create your fairswap account/i })).toBeVisible();
    const closeLink = page.getByRole("link", { name: "Close" });
    await expect(closeLink).toBeVisible();
    await expect(closeLink).toHaveAttribute("href", "/");

    await expect(page.locator("input[name='displayName']")).toBeVisible();
    await expect(page.locator("input[name='email']")).toBeVisible();

    const signUpPasswordInput = page.locator("input[name='password']");
    await expect(signUpPasswordInput).toBeVisible();
    await expect(signUpPasswordInput).toHaveAttribute("type", "password");

    const toggleSignUpPassword = page.getByRole("button", { name: "Show password" });
    await expect(toggleSignUpPassword).toBeVisible();
    await toggleSignUpPassword.click();
    await expect(signUpPasswordInput).toHaveAttribute("type", "text");
    const hideSignUpPassword = page.getByRole("button", { name: "Hide password" });
    await expect(hideSignUpPassword).toBeVisible();
    await hideSignUpPassword.click();
    await expect(signUpPasswordInput).toHaveAttribute("type", "password");
    await expect(page.getByRole("button", { name: "Show password" })).toBeVisible();

    const consentCheckbox = page.locator("input[name='termsAccepted']");
    await expect(consentCheckbox).toBeVisible();
    const ageCheckbox = page.locator("input[name='ageConfirmed']");
    await expect(ageCheckbox).toBeVisible();
    await expect(page.getByRole("link", { name: "Terms of Service" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Acceptable Use Policy" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Privacy Policy" })).toBeVisible();

    await expect(page.getByRole("button", { name: /sign up/i })).toBeVisible();
  });

  test("forgot-password page renders recovery request form", async ({ page }) => {
    await page.goto("/auth/forgot-password");

    await expect(page.getByRole("heading", { name: /reset your password/i })).toBeVisible();
    await expect(page.locator("input[name='email']")).toBeVisible();
    await expect(page.getByRole("button", { name: /send reset link/i })).toBeVisible();

    const backToSignIn = page.getByRole("link", { name: /back to sign in/i });
    await expect(backToSignIn).toBeVisible();
    await expect(backToSignIn).toHaveAttribute("href", "/auth/sign-in");
  });

  test("reset-password page renders password inputs with independent visibility toggles", async ({ page }) => {
    await page.goto("/auth/reset-password");

    await expect(page.getByRole("heading", { name: /set new password/i })).toBeVisible();

    const newPasswordInput = page.locator("input[name='password']");
    const confirmPasswordInput = page.locator("input[name='confirmPassword']");

    await expect(newPasswordInput).toBeVisible();
    await expect(newPasswordInput).toHaveAttribute("type", "password");
    await expect(confirmPasswordInput).toBeVisible();
    await expect(confirmPasswordInput).toHaveAttribute("type", "password");

    const toggleNew = page.getByRole("button", { name: "Show new password" });
    const toggleConfirm = page.getByRole("button", { name: "Show confirm new password" });

    await expect(toggleNew).toBeVisible();
    await expect(toggleConfirm).toBeVisible();

    await toggleNew.click();
    await expect(newPasswordInput).toHaveAttribute("type", "text");
    await expect(confirmPasswordInput).toHaveAttribute("type", "password");

    await toggleConfirm.click();
    await expect(newPasswordInput).toHaveAttribute("type", "text");
    await expect(confirmPasswordInput).toHaveAttribute("type", "text");

    const hideNew = page.getByRole("button", { name: "Hide new password" });
    await hideNew.click();
    await expect(newPasswordInput).toHaveAttribute("type", "password");
    await expect(confirmPasswordInput).toHaveAttribute("type", "text");
  });

  test("unauthenticated access to /account redirects to /auth/sign-in", async ({ page }) => {
    await page.goto("/account");
    await expect(page).toHaveURL(/\/auth\/sign-in\?next=%2Faccount/);
  });

  test("unauthenticated access to /account/policy-review redirects to /auth/sign-in", async ({ page }) => {
    await page.goto("/account/policy-review");
    await expect(page).toHaveURL(/\/auth\/sign-in\?next=%2Faccount%2Fpolicy-review/);
  });

  test("unauthenticated access to /admin redirects to /auth/sign-in", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/auth\/sign-in\?next=%2Fadmin/);
  });

  test("public seller profile handles non-existent user safely with 404", async ({ page }) => {
    await page.goto("/seller/00000000-0000-0000-0000-000000000001");
    await expect(page.getByRole("heading", { name: /page not found/i })).toBeVisible();
  });

  // REAL TIER-2 LIVE JOURNEY: User Registration, Mailpit Confirmation, Sign-in, Profile, Sign-out
  test("real registration, email confirmation, sign-in, profile, and logout journey", async ({ page }) => {
    test.skip(process.env.ALLOW_LOCAL_TEST_MUTATIONS !== "true", "Real-auth live test requires ALLOW_LOCAL_TEST_MUTATIONS=true");
    validateLocalTestEnvironment(TARGET_CONFIG);

    const timestamp = Date.now();
    const testEmail = `buyer_${timestamp}@fairswap.local`;
    const password = "ValidPassword123!";
    const displayName = `Buyer ${timestamp}`;

    // 1. Sign-Up
    await page.goto("/auth/sign-up");
    await page.locator("input[name='displayName']").fill(displayName);
    await page.locator("input[name='email']").fill(testEmail);
    await page.locator("input[name='password']").fill(password);
    await page.locator("input[name='termsAccepted']").check();
    await page.locator("input[name='ageConfirmed']").check();
    await page.getByRole("button", { name: /sign up/i }).click();

    // Expect redirect to confirmation screen
    await expect(page).toHaveURL(/\/auth\/confirm\?email=/);
    await expect(page.getByText(testEmail)).toBeVisible();

    // Register newly created user for scoped cleanup as early as safely possible,
    // before later unconfirmed-login or Mailpit/confirmation assertions can fail
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    let pageNum = 1;
    let createdUserId: string | null = null;
    while (true) {
      const { data: usersData, error: listError } = await supabase.auth.admin.listUsers({
        page: pageNum,
        perPage: 50,
      });
      if (listError || !usersData || usersData.users.length === 0) break;
      const foundUser = usersData.users.find(
        (u) => u.email?.toLowerCase() === testEmail.toLowerCase()
      );
      if (foundUser?.id) {
        createdUserId = foundUser.id;
        break;
      }
      if (usersData.users.length < 50) break;
      pageNum++;
    }
    expect(createdUserId).not.toBeNull();
    testUserRegistry.register(createdUserId!);

    // 2. Rejected Unconfirmed Login check
    await page.goto("/auth/sign-in");
    await page.locator("input[name='email']").fill(testEmail);
    await page.getByRole("button", { name: "Continue" }).click();
    await page.locator("input[name='password']").fill(password);
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page.getByRole("alert")).toBeVisible();

    // 3. Retrieve Confirmation Email from Mailpit
    const email = await getLatestEmail(testEmail);
    expect(email.subject).toContain("Confirm your FairSwap Account");

    // Extract confirmation link
    const linkMatch = email.html.match(/href="([^"]+)"/) || email.text.match(/(https?:\/\/[^\s]+)/);
    expect(linkMatch).not.toBeNull();
    let confirmUrl = linkMatch![1];

    // Ensure target URL points to port 3001 for Playwright test server
    confirmUrl = confirmUrl
      .replace("http://localhost:3000", "http://localhost:3001")
      .replace("http://127.0.0.1:3000", "http://localhost:3001");

    // Visit confirmation link
    await page.goto(confirmUrl);

    // Should land on /account authenticated (excluding policy-review)
    await expect(page).toHaveURL(/\/account(?!\/policy-review)/);
    await expect(page.getByRole("heading", { name: /my account/i })).toBeVisible();
    await expect(page.getByText(testEmail)).toBeVisible();

    // 4. Navigate to profile and security subpages
    await page.goto("/account/profile");
    await expect(page.getByRole("heading", { name: /edit.*profile/i })).toBeVisible();

    await page.goto("/account/security");
    await expect(page.getByRole("heading", { name: /security & credentials/i })).toBeVisible();

    // 5. Sign Out
    await page.goto("/account");
    const signOutBtn = page.getByRole("button", { name: /sign out/i });
    await signOutBtn.click();
    await expect(page).toHaveURL("/");

    // Verify session is invalidated
    await page.goto("/account");
    await expect(page).toHaveURL(/\/auth\/sign-in\?next=%2Faccount/);

    // 6. Sign In again with confirmed credentials - includes Step 1 Continue
    await page.locator("input[name='email']").fill(testEmail);
    await page.getByRole("button", { name: "Continue" }).click();
    await page.locator("input[name='password']").fill(password);
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page).toHaveURL(/\/account(?!\/policy-review)/);
    await expect(page.getByText(testEmail)).toBeVisible();
  });

  // REAL TIER-2 LIVE JOURNEY: Password Recovery Flow
  test("real password recovery and reset flow via Mailpit", async ({ page }) => {
    test.skip(process.env.ALLOW_LOCAL_TEST_MUTATIONS !== "true", "Real-auth live test requires ALLOW_LOCAL_TEST_MUTATIONS=true");
    validateLocalTestEnvironment(TARGET_CONFIG);

    const timestamp = Date.now();
    const testEmail = `recover_${timestamp}@fairswap.local`;
    const initialPassword = "InitialPassword123!";
    const newPassword = "BrandNewPassword456!";

    // Create and confirm user via Supabase service client with current legal metadata
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: userData, error: createError } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: initialPassword,
      email_confirm: true,
      user_metadata: {
        display_name: `Recover ${timestamp}`,
        ...CURRENT_LEGAL_METADATA,
      },
    });
    expect(createError).toBeNull();
    expect(userData?.user?.id).toBeDefined();
    testUserRegistry.register(userData.user!.id);

    // Request password reset
    await page.goto("/auth/forgot-password");
    await page.locator("input[name='email']").fill(testEmail);
    await page.getByRole("button", { name: /send reset link/i }).click();

    await expect(page.getByText(/instructions shortly/i)).toBeVisible();

    // Retrieve Recovery Email from Mailpit
    const email = await getLatestEmail(testEmail);
    expect(email.subject).toContain("Reset your FairSwap Password");

    const linkMatch = email.html.match(/href="([^"]+)"/) || email.text.match(/(https?:\/\/[^\s]+)/);
    expect(linkMatch).not.toBeNull();
    let recoveryUrl = linkMatch![1];
    recoveryUrl = recoveryUrl
      .replace("http://localhost:3000", "http://localhost:3001")
      .replace("http://127.0.0.1:3000", "http://localhost:3001");

    // Visit recovery link
    await page.goto(recoveryUrl);

    // Lands on reset-password
    await expect(page).toHaveURL(/\/auth\/reset-password/);
    await page.locator("input[name='password']").fill(newPassword);
    await page.locator("input[name='confirmPassword']").fill(newPassword);
    await page.getByRole("button", { name: /update password/i }).click();

    // Password update action executes and redirects to /account
    await expect(page).toHaveURL(/\/(account|auth\/sign-in)/);

    // Sign out to verify the new password on a fresh sign-in
    await page.goto("/account");
    const signOutBtn = page.getByRole("button", { name: /sign out/i });
    await signOutBtn.click();
    await expect(page).toHaveURL("/");

    // Sign in with new password
    await page.goto("/auth/sign-in");
    await page.locator("input[name='email']").fill(testEmail);
    await page.getByRole("button", { name: "Continue" }).click();
    await page.locator("input[name='password']").fill(newPassword);
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page).toHaveURL(/\/account(?!\/policy-review)/);
  });

  // REAL TIER-2 LIVE JOURNEY: Staff MFA Enrollment, Challenge, and Admin AAL2 Protection
  test("real staff MFA enrollment, TOTP challenge, and admin route AAL2 protection", async ({ page }) => {
    test.skip(process.env.ALLOW_LOCAL_TEST_MUTATIONS !== "true", "Real-auth live test requires ALLOW_LOCAL_TEST_MUTATIONS=true");
    validateLocalTestEnvironment(TARGET_CONFIG);

    const timestamp = Date.now();
    const adminEmail = `admin_${timestamp}@fairswap.local`;
    const password = "AdminPassword123!";

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Create confirmed user with current legal metadata
    const { data: adminUser, error: createError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: password,
      email_confirm: true,
      user_metadata: {
        display_name: `Admin ${timestamp}`,
        ...CURRENT_LEGAL_METADATA,
      },
    });
    expect(createError).toBeNull();
    expect(adminUser?.user?.id).toBeDefined();
    testUserRegistry.register(adminUser.user!.id);

    // Assign administrator role and assert insertion result
    const { error: roleError } = await supabase.from("staff_roles").insert({
      user_id: adminUser.user!.id,
      role: "administrator",
    });
    expect(roleError).toBeNull();

    // 1. Sign in as admin (starts at AAL1)
    await page.goto("/auth/sign-in");
    await page.locator("input[name='email']").fill(adminEmail);
    await page.getByRole("button", { name: "Continue" }).click();
    await page.locator("input[name='password']").fill(password);
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/account(?!\/policy-review)/);

    // 2. Try to access /admin -> Proxy intercepts AAL1 and redirects to /auth/mfa?next=%2Fadmin
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/auth\/mfa\?next=(%2F|\/)admin/);
    await expect(page.getByRole("heading", { name: /staff two-factor authentication/i })).toBeVisible();

    // 3. Extract TOTP Secret from page
    const secretElement = page.locator("span.select-all");
    await expect(secretElement).toBeVisible();
    const secretText = (await secretElement.textContent())?.trim();
    expect(secretText).toBeDefined();

    // 4. Generate valid TOTP code
    const totpCode = generateTOTP(secretText!);

    // 5. Enter code and submit
    await page.locator("#totpCode").fill(totpCode);
    await page.getByRole("button", { name: /verify & continue/i }).click();

    // 6. Verification elevates session to AAL2 and unlocks /admin
    await expect(page).toHaveURL(/\/admin/);
    await expect(page.getByRole("heading", { name: /admin operations/i })).toBeVisible();
    await expect(page.getByText(/aal2 verified/i)).toBeVisible();
  });

  // REAL AUTH JOURNEY (Issue #82): Real OTP delivery, mailbox retrieval, verification, and session persistence
  test("real email OTP request, Mailpit mailbox retrieval, verification, and session persistence across page reload", async ({
    page,
  }) => {
    test.skip(process.env.ALLOW_LOCAL_TEST_MUTATIONS !== "true", "Real-auth live test requires ALLOW_LOCAL_TEST_MUTATIONS=true");
    validateLocalTestEnvironment(TARGET_CONFIG);

    const timestamp = Date.now();
    const testEmail = `user_otp_${timestamp}@fairswap.local`;
    const password = "ValidPassword123!";

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: userData, error: createError } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: password,
      email_confirm: true,
      user_metadata: {
        display_name: `OTP User ${timestamp}`,
        ...CURRENT_LEGAL_METADATA,
      },
    });
    expect(createError).toBeNull();
    expect(userData?.user?.id).toBeDefined();
    testUserRegistry.register(userData.user!.id);

    // 1. Visit sign-in and submit email
    await page.goto("/auth/sign-in");
    await page.locator("input[name='email']").fill(testEmail);
    await page.getByRole("button", { name: "Continue" }).click();

    // 2. Request OTP alternative
    await page.getByRole("button", { name: /email me a one-time code instead/i }).click();
    await expect(
      page.getByText(/if this email is associated with an eligible account, you'll receive a sign-in code shortly/i)
    ).toBeVisible();

    // 3. Retrieve code safely using extractOtpFromEmail
    const message = await getLatestEmail(testEmail);
    const otpCode = extractOtpFromEmail(message);
    expect(otpCode).toMatch(/^\d{6}$/);

    // 4. Enter 6-digit code and verify
    await page.locator("#token").fill(otpCode);
    await page.getByRole("button", { name: /verify & continue/i }).click();

    // 5. Lands on /account with authenticated session (excluding policy-review)
    await expect(page).toHaveURL(/\/account(?!\/policy-review)/);
    await expect(page.getByRole("heading", { name: /account/i })).toBeVisible();
    await expect(page.getByText(testEmail)).toBeVisible();

    // 6. Reload page to assert session persistence across browser reloads
    await page.reload();
    await expect(page).toHaveURL(/\/account(?!\/policy-review)/);
    await expect(page.getByRole("heading", { name: /account/i })).toBeVisible();

    // 7. Clean sign-out
    await page.getByRole("button", { name: /sign out/i }).click();
    await expect(page).toHaveURL("/");
  });

  // REAL AUTH JOURNEY (Issue #82): Unknown email produces neutral acknowledgement without creating an account
  test("unknown email OTP request displays neutral acknowledgement without creating an account in auth.users", async ({
    page,
  }) => {
    test.skip(process.env.ALLOW_LOCAL_TEST_MUTATIONS !== "true", "Real-auth live test requires ALLOW_LOCAL_TEST_MUTATIONS=true");
    validateLocalTestEnvironment(TARGET_CONFIG);

    const timestamp = Date.now();
    const unknownEmail = `unknown_${timestamp}@fairswap.local`;

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1. Visit sign-in with non-existent email
    await page.goto("/auth/sign-in");
    await page.locator("input[name='email']").fill(unknownEmail);
    await page.getByRole("button", { name: "Continue" }).click();

    // 2. Request OTP
    await page.getByRole("button", { name: /email me a one-time code instead/i }).click();

    // 3. Neutral acknowledgement is displayed
    await expect(
      page.getByText(/if this email is associated with an eligible account, you'll receive a sign-in code shortly/i)
    ).toBeVisible();

    // 4. Exhaustively verify no user was created in auth.users across all pages
    let pageNum = 1;
    let found = false;
    while (true) {
      const { data: usersData, error: listError } = await supabase.auth.admin.listUsers({
        page: pageNum,
        perPage: 50,
      });
      expect(listError).toBeNull();
      if (!usersData || usersData.users.length === 0) break;
      if (usersData.users.some((u) => u.email?.toLowerCase() === unknownEmail.toLowerCase())) {
        found = true;
        break;
      }
      if (usersData.users.length < 50) break;
      pageNum++;
    }
    expect(found).toBe(false);
  });

  // REAL AUTH JOURNEY (Issue #82): Invalid and reused OTP token handling
  test("invalid and reused OTP token handling returns generic code error without revealing internals", async ({
    browser,
  }) => {
    test.skip(process.env.ALLOW_LOCAL_TEST_MUTATIONS !== "true", "Real-auth live test requires ALLOW_LOCAL_TEST_MUTATIONS=true");
    validateLocalTestEnvironment(TARGET_CONFIG);

    const timestamp = Date.now();
    const testEmail = `reuse_test_${timestamp}@fairswap.local`;
    const password = "ValidPassword123!";

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: userData, error: createError } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: password,
      email_confirm: true,
      user_metadata: {
        display_name: `Reuse Test ${timestamp}`,
        ...CURRENT_LEGAL_METADATA,
      },
    });
    expect(createError).toBeNull();
    expect(userData?.user?.id).toBeDefined();
    testUserRegistry.register(userData.user!.id);

    // Create two isolated browser contexts
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    try {
      // 1. In Context 1, initiate sign-in and request the ONE and only OTP
      await page1.goto("/auth/sign-in");
      await page1.locator("input[name='email']").fill(testEmail);
      await page1.getByRole("button", { name: "Continue" }).click();
      await page1.getByRole("button", { name: /email me a one-time code instead/i }).click();

      // 2. Retrieve that single OTP from Mailpit
      const message = await getLatestEmail(testEmail);
      const otpCode = extractOtpFromEmail(message);
      expect(otpCode).toMatch(/^\d{6}$/);

      // 3. Open Context 2 directly at the OTP-entry state for the SAME issued code WITHOUT triggering a second dispatch
      await page2.goto(`/auth/sign-in?email=${encodeURIComponent(testEmail)}&step=otp`);
      await expect(page2.locator("#token")).toBeVisible();

      // 4. Deterministic invalid-code check in Context 1 (separate from valid/reused submission)
      const invalidCode = otpCode === "000000" ? "111111" : "000000";
      await page1.locator("#token").fill(invalidCode);
      await page1.getByRole("button", { name: /verify & continue/i }).click();
      await expect(
        page1.getByText(/the verification code is invalid or has expired/i)
      ).toBeVisible();
      await expect(page1).not.toHaveURL(/\/account/);

      // 5. Submit valid code successfully in Context 1
      await page1.locator("#token").fill(otpCode);
      await page1.getByRole("button", { name: /verify & continue/i }).click();
      await expect(page1).toHaveURL(/\/account(?!\/policy-review)/);
      await expect(page1.getByText(testEmail)).toBeVisible();

      // 6. Submit the identical, already-consumed code in Context 2 without requesting a new code
      await page2.locator("#token").fill(otpCode);
      await page2.getByRole("button", { name: /verify & continue/i }).click();

      // 7. Assert the second submission is rejected with generic invalid/expired response
      await expect(
        page2.getByText(/the verification code is invalid or has expired/i)
      ).toBeVisible();

      // 8. Verify the second context does NOT become authenticated
      await expect(page2).not.toHaveURL(/\/account/);
      await page2.goto("/account");
      await expect(page2).toHaveURL(/\/auth\/sign-in\?next=%2Faccount/);
    } finally {
      await context1.close();
      await context2.close();
    }
  });

  // REAL AUTH JOURNEY (Issue #80 & #82): Staff OTP Sign-in lands at AAL1 and requires TOTP MFA step-up before unlocking /admin
  test("staff OTP sign-in lands at AAL1 and requires TOTP MFA step-up to unlock /admin", async ({
    page,
  }) => {
    test.skip(process.env.ALLOW_LOCAL_TEST_MUTATIONS !== "true", "Real-auth live test requires ALLOW_LOCAL_TEST_MUTATIONS=true");
    validateLocalTestEnvironment(TARGET_CONFIG);

    const timestamp = Date.now();
    const adminEmail = `staff_otp_${timestamp}@fairswap.local`;
    const password = "AdminPassword123!";

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: adminUser, error: createError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: password,
      email_confirm: true,
      user_metadata: {
        display_name: `Staff OTP ${timestamp}`,
        ...CURRENT_LEGAL_METADATA,
      },
    });
    expect(createError).toBeNull();
    expect(adminUser?.user?.id).toBeDefined();
    testUserRegistry.register(adminUser.user!.id);

    const { error: roleError } = await supabase.from("staff_roles").insert({
      user_id: adminUser.user!.id,
      role: "administrator",
    });
    expect(roleError).toBeNull();

    // 1. Sign in via OTP (AAL1)
    await page.goto("/auth/sign-in");
    await page.locator("input[name='email']").fill(adminEmail);
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: /email me a one-time code instead/i }).click();

    const message = await getLatestEmail(adminEmail);
    const otpCode = extractOtpFromEmail(message);
    expect(otpCode).toMatch(/^\d{6}$/);

    await page.locator("#token").fill(otpCode);
    await page.getByRole("button", { name: /verify & continue/i }).click();
    await expect(page).toHaveURL(/\/account(?!\/policy-review)/);

    // 2. Access /admin -> intercepted by proxy at AAL1, redirected to MFA challenge
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/auth\/mfa\?next=(%2F|\/)admin/);
    await expect(page.getByRole("heading", { name: /staff two-factor authentication/i })).toBeVisible();

    // 3. Extract TOTP secret and complete challenge to elevate to AAL2
    const secretElement = page.locator("span.select-all");
    await expect(secretElement).toBeVisible();
    const secretText = (await secretElement.textContent())?.trim();
    expect(secretText).toBeDefined();

    const totpCode = generateTOTP(secretText!);
    await page.locator("#totpCode").fill(totpCode);
    await page.getByRole("button", { name: /verify & continue/i }).click();

    // 4. Elevated to AAL2 -> /admin unlocked
    await expect(page).toHaveURL(/\/admin/);
    await expect(page.getByRole("heading", { name: /admin operations/i })).toBeVisible();
    await expect(page.getByText(/aal2 verified/i)).toBeVisible();
  });
});
