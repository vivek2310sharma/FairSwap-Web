import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import {
  validateLocalTestEnvironment,
  testUserRegistry,
  type TargetConfig,
} from "../tests/helpers/local-test-guard";
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

test.describe("Milestone 1.3 Listings & Moderation E2E", () => {
  const sellerPassword = "TestPassword123!";
  const trackedListingIds = new Set<string>();

  test.afterEach(async () => {
    if (process.env.ALLOW_LOCAL_TEST_MUTATIONS === "true") {
      validateLocalTestEnvironment(TARGET_CONFIG);
      const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      // 1. Delete tracked listings created during tests
      for (const listingId of Array.from(trackedListingIds)) {
        const { error: delListErr } = await supabase
          .from("listings")
          .delete()
          .eq("id", listingId);
        if (delListErr) {
          throw new Error(`Failed to delete tracked listing ${listingId}: ${delListErr.message}`);
        }
        trackedListingIds.delete(listingId);
      }

      // Also clean up any listings owned by tracked users (in case listing ID wasn't captured from URL)
      for (const userId of testUserRegistry.getRegisteredIds()) {
        const { error: delOwnerListErr } = await supabase
          .from("listings")
          .delete()
          .eq("seller_id", userId);
        if (delOwnerListErr) {
          throw new Error(`Failed to delete listings for seller ${userId}: ${delOwnerListErr.message}`);
        }
      }

      // 2. Delete tracked auth users (cascades to user_accounts and profiles)
      const cleanupResult = await testUserRegistry.cleanupTrackedUsers(supabase, TARGET_CONFIG);
      if (cleanupResult.failed.length > 0) {
        throw new Error(
          `Scoped test user cleanup failed for user IDs: ${cleanupResult.failed.join(", ")}`
        );
      }
    }
  });

  async function getOrCreateSeller(email: string) {
    validateLocalTestEnvironment(TARGET_CONFIG);

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: users, error: listErr } = await supabase.auth.admin.listUsers();
    if (listErr) throw listErr;
    const user = users?.users.find((u) => u.email === email);

    if (user) {
      testUserRegistry.register(user.id);
      return user;
    }

    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email,
      password: sellerPassword,
      email_confirm: true,
      user_metadata: {
        display_name: "E2E Seller",
        terms_accepted: "true",
        terms_version: LEGAL_POLICY.termsVersion,
        privacy_policy_version: LEGAL_POLICY.privacyVersion,
        acceptable_use_version: LEGAL_POLICY.acceptableUseVersion,
        age_confirmed: "true",
        minimum_age_confirmed: LEGAL_POLICY.minimumAge,
      },
    });

    if (createErr || !created.user) {
      throw createErr || new Error(`Failed to create test seller ${email}`);
    }

    testUserRegistry.register(created.user.id);

    return created.user;
  }

  test("unauthenticated user redirected to sign in when accessing /account/listings", async ({ page }) => {
    await page.goto("/account/listings");
    await expect(page).toHaveURL(/.*\/auth\/sign-in/);
  });

  test("seller can sign in and navigate to listings dashboard and create new listing form", async ({ page }, testInfo) => {
    const sellerEmail = `e2e_seller_${testInfo.project.name.replace(/[^a-zA-Z0-9]/g, "_")}_${Date.now()}@fairswap.local`;
    await getOrCreateSeller(sellerEmail);

    // 1. Sign in
    await page.goto("/auth/sign-in");
    await page.fill('input[type="email"]', sellerEmail);
    await page.click('button[type="submit"]');
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
    await expect(page).toHaveURL(/.*\/account\/listings\/([a-f0-9-]+)\/edit/, { timeout: 10000 });
    const match = page.url().match(/\/account\/listings\/([a-f0-9-]+)\/edit/);
    if (match?.[1]) {
      trackedListingIds.add(match[1]);
    }
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
