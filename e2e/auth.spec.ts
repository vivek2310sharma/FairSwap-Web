import { test, expect } from "@playwright/test";
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
const SERVICE_KEY =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

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
      const res = await fetch("http://127.0.0.1:54324/api/v1/messages");
      if (res.ok) {
        const data = await res.json();
        const msg = data.messages?.find((m: { To?: Array<{ Address: string }> }) =>
          m.To?.some((t) => t.Address.toLowerCase() === recipientEmail.toLowerCase())
        );
        if (msg) {
          const detailRes = await fetch(`http://127.0.0.1:54324/api/v1/message/${msg.ID}`);
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
  test("sign-in page renders with form inputs and navigation links", async ({ page }) => {
    await page.goto("/auth/sign-in");

    await expect(page.getByRole("heading", { name: /sign in to fairswap/i })).toBeVisible();
    await expect(page.locator("input[name='email']")).toBeVisible();
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

    const signUpLink = page.getByRole("link", { name: /create account/i });
    await expect(signUpLink).toBeVisible();
    await expect(signUpLink).toHaveAttribute("href", "/auth/sign-up");

    const forgotLink = page.getByRole("link", { name: /forgot password/i });
    await expect(forgotLink).toBeVisible();
    await expect(forgotLink).toHaveAttribute("href", "/auth/forgot-password");

    const closeLink = page.getByRole("link", { name: "Close" });
    await expect(closeLink).toBeVisible();
    await expect(closeLink).toHaveAttribute("href", "/");
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
    await page.getByRole("button", { name: /sign up/i }).click();

    // Expect redirect to confirmation screen
    await expect(page).toHaveURL(/\/auth\/confirm\?email=/);
    await expect(page.getByText(testEmail)).toBeVisible();

    // 2. Rejected Unconfirmed Login check
    await page.goto("/auth/sign-in");
    await page.locator("input[name='email']").fill(testEmail);
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

    // Should land on /account authenticated
    await expect(page).toHaveURL(/\/account/);
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

    // 6. Sign In again with confirmed credentials
    await page.locator("input[name='email']").fill(testEmail);
    await page.locator("input[name='password']").fill(password);
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page).toHaveURL(/\/account/);
    await expect(page.getByText(testEmail)).toBeVisible();
  });

  // REAL TIER-2 LIVE JOURNEY: Password Recovery Flow
  test("real password recovery and reset flow via Mailpit", async ({ page }) => {
    const timestamp = Date.now();
    const testEmail = `recover_${timestamp}@fairswap.local`;
    const initialPassword = "InitialPassword123!";
    const newPassword = "BrandNewPassword456!";

    // Create and confirm user via Supabase service client
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: userData, error: createError } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: initialPassword,
      email_confirm: true,
      user_metadata: {
        display_name: `Recover ${timestamp}`,
        terms_accepted: "true",
        terms_version: "2026-09-13-draft",
        privacy_policy_version: "2026-09-13-draft",
      },
    });
    expect(createError).toBeNull();
    expect(userData.user).toBeDefined();

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

    // Password update action executes. Because user is authenticated via recovery token,
    // proxy redirects authenticated user to /account.
    await expect(page).toHaveURL(/\/(account|auth\/sign-in)/);

    // Sign out to verify the new password on a fresh sign-in
    await page.goto("/account");
    const signOutBtn = page.getByRole("button", { name: /sign out/i });
    await signOutBtn.click();
    await expect(page).toHaveURL("/");

    // Sign in with new password
    await page.goto("/auth/sign-in");
    await page.locator("input[name='email']").fill(testEmail);
    await page.locator("input[name='password']").fill(newPassword);
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page).toHaveURL(/\/account/);
  });

  // REAL TIER-2 LIVE JOURNEY: Staff MFA Enrollment, Challenge, and Admin AAL2 Protection
  test("real staff MFA enrollment, TOTP challenge, and admin route AAL2 protection", async ({ page }) => {
    const timestamp = Date.now();
    const adminEmail = `admin_${timestamp}@fairswap.local`;
    const password = "AdminPassword123!";

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Create confirmed user
    const { data: adminUser, error: createError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: password,
      email_confirm: true,
      user_metadata: {
        display_name: `Admin ${timestamp}`,
        terms_accepted: "true",
        terms_version: "2026-09-13-draft",
        privacy_policy_version: "2026-09-13-draft",
      },
    });
    expect(createError).toBeNull();

    // Assign administrator role
    const { error: roleError } = await supabase.from("staff_roles").insert({
      user_id: adminUser.user!.id,
      role: "administrator",
    });
    expect(roleError).toBeNull();

    // 1. Sign in as admin (starts at AAL1)
    await page.goto("/auth/sign-in");
    await page.locator("input[name='email']").fill(adminEmail);
    await page.locator("input[name='password']").fill(password);
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/account/);

    // 2. Try to access /admin -> Proxy intercepts AAL1 and redirects to /auth/mfa?next=%2Fadmin
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/auth\/mfa\?next=%2Fadmin/);
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
});
