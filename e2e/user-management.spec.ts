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

test.describe("Milestone 1.6 User Management Route Protection", () => {
  test("unauthenticated user accessing /admin/users is redirected to sign-in", async ({ page }) => {
    await page.goto("/admin/users");
    await expect(page).toHaveURL(/\/auth\/sign-in\?next=%2Fadmin/);
  });
});

test.describe("Milestone 1.6 Staff User Moderation Journey", () => {
  test("moderator searches, inspects, suspends, and reinstates user with immediate visibility propagation", async ({
    browser,
  }, testInfo) => {
    const timestamp = Date.now();
    const runId = `${testInfo.project.name.replace(/[^a-zA-Z0-9]/g, "_")}_${timestamp}`;
    const staffEmail = `e2e_staff_${runId}@fairswap.local`;
    const targetEmail = `e2e_target_${runId}@fairswap.local`;
    const password = "TestPassword123!";

    const serviceClient = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1. Create target user
    const { data: createdTarget, error: targetErr } = await serviceClient.auth.admin.createUser({
      email: targetEmail,
      password,
      email_confirm: true,
      user_metadata: {
        display_name: `Target User ${runId}`,
        terms_accepted: "true",
        terms_version: "2026-09-18",
        privacy_policy_version: "2026-09-18",
        acceptable_use_version: "2026-09-18",
        age_confirmed: "true",
        minimum_age_confirmed: 18,
      },
    });
    if (targetErr || !createdTarget.user) throw targetErr || new Error("Failed to create target user");

    await serviceClient.from("user_accounts").upsert({
      user_id: createdTarget.user.id,
      account_status: "active",
      terms_version: "2026-09-18",
      privacy_policy_version: "2026-09-18",
      acceptable_use_version: "2026-09-18",
      age_confirmed_at: new Date().toISOString(),
      minimum_age_confirmed: 18,
      terms_accepted_at: new Date().toISOString(),
    });

    await serviceClient.from("profiles").upsert({
      id: createdTarget.user.id,
      display_name: `Target User ${runId}`,
    });

    // 2. Create listing for target user
    const { data: cat } = await serviceClient.from("categories").select("id").limit(1).single();
    const { data: city } = await serviceClient.from("cities").select("id").limit(1).single();

    const listingSlug = `target-item-${runId}`;
    const { data: listing, error: lErr } = await serviceClient
      .from("listings")
      .insert({
        seller_id: createdTarget.user.id,
        category_id: cat!.id,
        city_id: city!.id,
        title: `Target Listing ${runId}`,
        slug: listingSlug,
        price_paise: 9900,
        price_type: "fixed",
        condition: "good",
      })
      .select("id")
      .single();

    if (lErr || !listing) throw lErr || new Error("Failed to create test listing");

    await serviceClient.from("listings").update({ status: "active" }).eq("id", listing.id);

    // 3. Create administrator staff account
    const { data: createdStaff, error: staffErr } = await serviceClient.auth.admin.createUser({
      email: staffEmail,
      password,
      email_confirm: true,
      user_metadata: {
        display_name: `Staff ${runId}`,
        terms_accepted: "true",
        terms_version: "2026-09-18",
        privacy_policy_version: "2026-09-18",
        acceptable_use_version: "2026-09-18",
        age_confirmed: "true",
        minimum_age_confirmed: 18,
      },
    });
    if (staffErr || !createdStaff.user) throw staffErr || new Error("Failed to create staff user");

    await serviceClient.from("user_accounts").upsert({
      user_id: createdStaff.user.id,
      account_status: "active",
      terms_version: "2026-09-18",
      privacy_policy_version: "2026-09-18",
      acceptable_use_version: "2026-09-18",
      age_confirmed_at: new Date().toISOString(),
      minimum_age_confirmed: 18,
      terms_accepted_at: new Date().toISOString(),
    });

    await serviceClient.from("profiles").upsert({
      id: createdStaff.user.id,
      display_name: `Staff ${runId}`,
    });

    await serviceClient.from("staff_roles").upsert({
      user_id: createdStaff.user.id,
      role: "administrator",
    });

    // 4. Staff logs in and completes MFA
    const staffContext = await browser.newContext();
    const staffPage = await staffContext.newPage();

    await staffPage.goto("/auth/sign-in");
    await staffPage.locator("input[name='email']").fill(staffEmail);
    await staffPage.locator("input[name='password']").fill(password);
    await staffPage.getByRole("button", { name: /sign in/i }).click();

    // Redirected to /account
    await expect(staffPage).toHaveURL(/\/account/);

    // Navigate to /admin -> redirects to /auth/mfa
    await staffPage.goto("/admin");
    await expect(staffPage).toHaveURL(/\/auth\/mfa\?next=%2Fadmin/);

    // Extract TOTP secret and submit
    const secretElement = staffPage.locator("span.select-all");
    await expect(secretElement).toBeVisible();
    const secretText = (await secretElement.textContent())?.trim();
    const totpCode = generateTOTP(secretText!);

    await staffPage.locator("#totpCode").fill(totpCode);
    await staffPage.getByRole("button", { name: /verify & continue/i }).click();

    await expect(staffPage).toHaveURL(/\/admin/);

    // 5. Staff navigates to /admin/users
    await staffPage.goto("/admin/users");
    await expect(staffPage.getByRole("heading", { name: /user account management/i })).toBeVisible();

    // Search for target user
    await staffPage.locator("input[name='q']").fill(targetEmail);
    await staffPage.getByRole("button", { name: /search/i }).click();

    await expect(staffPage.getByText(targetEmail)).toBeVisible();
    await expect(staffPage.locator("tbody").getByText("Active")).toBeVisible();

    // Click inspect
    await staffPage.locator("tbody").getByRole("link", { name: /inspect/i }).click();
    await expect(staffPage).toHaveURL(new RegExp(`/admin/users/${createdTarget.user.id}`));
    await expect(staffPage.getByText("Status: ACTIVE")).toBeVisible();

    // 6. Suspend target user
    await staffPage.locator("input[value='suspended']").check({ force: true });
    await staffPage.locator("textarea[name='reason']").fill("Violated marketplace conduct rules in multiple listings");
    await staffPage.getByRole("button", { name: /confirm account suspension/i }).click({ force: true });

    // Verify success banner and updated status badge
    await expect(staffPage.getByText(/account status updated to suspended successfully/i)).toBeVisible();
    await expect(staffPage.getByText("Status: SUSPENDED")).toBeVisible();

    // 7. Target user logs in in separate context and verifies suspension alert
    const targetContext = await browser.newContext();
    const targetPage = await targetContext.newPage();

    await targetPage.goto("/auth/sign-in");
    await targetPage.locator("input[name='email']").fill(targetEmail);
    await targetPage.locator("input[name='password']").fill(password);
    await targetPage.getByRole("button", { name: /sign in/i }).click();

    await expect(targetPage).toHaveURL(/\/account/);

    // Verify role="alert" suspended notice on /account (avoiding Next.js route announcer)
    const alertBanner = targetPage.getByRole("alert").filter({ hasText: /Account Suspended/i });
    await expect(alertBanner).toBeVisible();
    await expect(alertBanner).toContainText(/your account is currently suspended/i);

    // 8. Staff reinstates target user
    await staffPage.locator("input[value='active']").check({ force: true });
    await staffPage.locator("textarea[name='reason']").fill("Account reinstated following resolution of appeal");
    await staffPage.getByRole("button", { name: /confirm account reinstatement/i }).click({ force: true });

    await expect(staffPage.getByText(/account status updated to active successfully/i)).toBeVisible();
    await expect(staffPage.getByText("Status: ACTIVE")).toBeVisible();

    // Target user reloads /account; suspension alert is gone
    await targetPage.reload();
    await expect(targetPage.getByRole("alert").filter({ hasText: /Account Suspended/i })).not.toBeVisible();

    await staffContext.close();
    await targetContext.close();
  });
});
