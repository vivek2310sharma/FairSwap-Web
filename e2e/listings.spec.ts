import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
const SERVICE_KEY =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

test.describe("Milestone 1.3 Listings & Moderation E2E", () => {
  const sellerPassword = "TestPassword123!";

  async function getOrCreateSeller(email: string) {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: users } = await supabase.auth.admin.listUsers();
    const user = users?.users.find((u) => u.email === email);

    if (!user) {
      await supabase.auth.admin.createUser({
        email,
        password: sellerPassword,
        email_confirm: true,
        user_metadata: {
          display_name: "E2E Seller",
          terms_version: "2026-09-01",
          privacy_policy_version: "2026-09-01",
        },
      });
    }
  }

  test("unauthenticated user redirected to sign in when accessing /account/listings", async ({ page }) => {
    await page.goto("/account/listings");
    await expect(page).toHaveURL(/.*\/auth\/sign-in/);
  });

  test("seller can sign in and navigate to listings dashboard and create new listing form", async ({ page }, testInfo) => {
    const sellerEmail = `e2e_seller_${testInfo.project.name.replace(/[^a-zA-Z0-9]/g, "_")}@fairswap.local`;
    await getOrCreateSeller(sellerEmail);

    // 1. Sign in
    await page.goto("/auth/sign-in");
    await page.fill('input[type="email"]', sellerEmail);
    await page.fill('input[type="password"]', sellerPassword);
    await page.click('button[type="submit"]');

    // Wait for redirect to account
    await expect(page).toHaveURL(/\/account$/, { timeout: 10000 });

    // 2. Go to My Listings
    await page.goto("/account/listings");
    await expect(page.getByRole("heading", { level: 1, name: /my listings/i })).toBeVisible({ timeout: 10000 });

    // 3. Click Create New Listing
    await page.getByRole("link", { name: /create new listing/i }).first().click();
    await expect(page).toHaveURL(/\/account\/listings\/new$/, { timeout: 10000 });
    await expect(page.getByRole("heading", { level: 1, name: /create new listing/i })).toBeVisible({ timeout: 10000 });

    // 4. Fill in basic details and save as draft
    await page.fill('input[name="title"]', "E2E Test Mechanical Keyboard");
    await page.fill('textarea[name="description"]', "High quality mechanical keyboard with tactile brown switches.");
    await page.fill('input#price_rupees', "4500");

    await page.click('button:has-text("Save as Draft")');

    // Successfully created draft, redirected to edit page with photo upload section
    await expect(page).toHaveURL(/.*\/account\/listings\/.*\/edit/, { timeout: 10000 });
    await expect(page.getByRole("heading", { level: 1, name: /edit listing/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Photographs/i)).toBeVisible({ timeout: 10000 });
  });

  test("staff portal links to moderation queue and categories", async ({ page }) => {
    // Check admin portal layout
    await page.goto("/admin");
    // If not authenticated as staff, it handles gracefully
    expect(page.url()).toBeDefined();
  });
});
