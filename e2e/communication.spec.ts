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

test.describe("Milestone 1.5 Communication & Safety Route Protection", () => {
  test("unauthenticated user accessing /account/messages is redirected to sign-in", async ({ page }) => {
    await page.goto("/account/messages");
    await expect(page).toHaveURL(/\/auth\/sign-in\?next=(%2F|\/)account(%2F|\/)messages/);
  });

  test("unauthenticated user accessing /account/notifications is redirected to sign-in", async ({ page }) => {
    await page.goto("/account/notifications");
    await expect(page).toHaveURL(/\/auth\/sign-in\?next=(%2F|\/)account(%2F|\/)notifications/);
  });

  test("unauthenticated user accessing /account/support is redirected to sign-in", async ({ page }) => {
    await page.goto("/account/support");
    await expect(page).toHaveURL(/\/auth\/sign-in\?next=(%2F|\/)account(%2F|\/)support/);
  });

});

test.describe("Milestone 1.5 Authenticated Realtime Messaging & Safety E2E", () => {
  const trackedListingIds = new Set<string>();
  const trackedReportIds = new Set<string>();

  test.afterEach(async () => {
    if (process.env.ALLOW_LOCAL_TEST_MUTATIONS === "true") {
      validateLocalTestEnvironment(TARGET_CONFIG);
      const serviceClient = createClient(SUPABASE_URL, SERVICE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      // 1. Delete tracked reports
      for (const reportId of Array.from(trackedReportIds)) {
        const { error: repErr } = await serviceClient.from("reports").delete().eq("id", reportId);
        if (repErr) throw new Error(`Failed to delete tracked report ${reportId}: ${repErr.message}`);
        trackedReportIds.delete(reportId);
      }
      for (const userId of testUserRegistry.getRegisteredIds()) {
        const { error: userRepErr } = await serviceClient.from("reports").delete().eq("reporter_id", userId);
        if (userRepErr) throw new Error(`Failed to delete reports for user ${userId}: ${userRepErr.message}`);
      }

      // 2. Delete conversations and messages for tracked listings
      for (const listingId of Array.from(trackedListingIds)) {
        const { error: convErr } = await serviceClient.from("conversations").delete().eq("listing_id", listingId);
        if (convErr) throw new Error(`Failed to delete conversations for listing ${listingId}: ${convErr.message}`);

        const { error: listErr } = await serviceClient.from("listings").delete().eq("id", listingId);
        if (listErr) throw new Error(`Failed to delete tracked listing ${listingId}: ${listErr.message}`);
        trackedListingIds.delete(listingId);
      }

      // 3. Delete tracked auth users (cascades to user_accounts and profiles)
      const cleanupResult = await testUserRegistry.cleanupTrackedUsers(serviceClient, TARGET_CONFIG);
      if (cleanupResult.failed.length > 0) {
        throw new Error(
          `Scoped test user cleanup failed for user IDs: ${cleanupResult.failed.join(", ")}`
        );
      }
    }
  });

  test("two authenticated sessions exchange live messages via Realtime and submit report", async ({ browser }, testInfo) => {
    // 1. Seed buyer & seller accounts
    const timestamp = Date.now();
    const runId = `${testInfo.project.name.replace(/[^a-zA-Z0-9]/g, "_")}_${timestamp}`;
    const sellerEmail = `e2e_seller_${runId}@fairswap.local`;
    const buyerEmail = `e2e_buyer_${runId}@fairswap.local`;
    const password = "TestPassword123!";

    const serviceClient = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Helper to create and activate user
    async function seedUser(email: string, displayName: string) {
      validateLocalTestEnvironment(TARGET_CONFIG);

      const { data: created, error } = await serviceClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          display_name: displayName,
          terms_accepted: "true",
          terms_version: LEGAL_POLICY.termsVersion,
          privacy_policy_version: LEGAL_POLICY.privacyVersion,
          acceptable_use_version: LEGAL_POLICY.acceptableUseVersion,
          age_confirmed: "true",
          minimum_age_confirmed: LEGAL_POLICY.minimumAge,
        },
      });
      if (error || !created.user) throw error || new Error(`Failed to create ${email}`);

      // Register immediately before later fixture setup assertions can fail
      testUserRegistry.register(created.user.id);

      return created.user;
    }

    const sellerUser = await seedUser(sellerEmail, `Seller ${runId}`);
    const buyerUser = await seedUser(buyerEmail, `Buyer ${runId}`);

    // Create active listing owned by seller
    const { data: cat } = await serviceClient.from("categories").select("id").limit(1).single();
    const { data: city } = await serviceClient.from("cities").select("id").limit(1).single();

    const listingSlug = `item-${runId}`;
    const { data: listing, error: lErr } = await serviceClient
      .from("listings")
      .insert({
        seller_id: sellerUser.id,
        category_id: cat!.id,
        city_id: city!.id,
        title: `Realtime Safety Item ${runId}`,
        slug: listingSlug,
        status: "active",
      })
      .select("id")
      .single();

    if (lErr || !listing) throw lErr || new Error("Failed to create test listing");

    trackedListingIds.add(listing.id);

    // Explicitly transition status to active to satisfy trigger and visibility checks
    await serviceClient
      .from("listings")
      .update({ status: "active" })
      .eq("id", listing.id);

    // 2. Open Buyer browser context
    const buyerContext = await browser.newContext();
    const buyerPage = await buyerContext.newPage();

    // Buyer signs in
    await buyerPage.goto("/auth/sign-in");
    await buyerPage.fill('input[type="email"]', buyerEmail);
    await buyerPage.click('button[type="submit"]');
    await buyerPage.fill('input[type="password"]', password);
    await buyerPage.click('button[type="submit"]');
    await expect(buyerPage).toHaveURL(/\/account/);

    // 3. Open Seller browser context
    const sellerContext = await browser.newContext();
    const sellerPage = await sellerContext.newPage();

    // Seller signs in
    await sellerPage.goto("/auth/sign-in");
    await sellerPage.fill('input[type="email"]', sellerEmail);
    await sellerPage.click('button[type="submit"]');
    await sellerPage.fill('input[type="password"]', password);
    await sellerPage.click('button[type="submit"]');
    await expect(sellerPage).toHaveURL(/\/account/);

    // Seller navigates to /account/messages to wait for incoming inquiries
    await sellerPage.goto("/account/messages");

    // 4. Buyer visits seller's listing and clicks Contact Seller
    await buyerPage.goto(`/listings/${listingSlug}`);
    await expect(buyerPage.getByRole("heading", { level: 1 })).toContainText(`Realtime Safety Item ${runId}`);

    const contactBtn = buyerPage.getByRole("button", { name: /contact seller/i });
    await expect(contactBtn).toBeVisible();
    await contactBtn.click();

    // 5. Buyer fills and sends message
    const uniqueBuyerMsg = `Hello Seller! Inquiring at ${timestamp}`;
    await buyerPage.locator("#contact-message").fill(uniqueBuyerMsg);
    await buyerPage.getByRole("button", { name: /send message/i }).click();

    // Buyer is redirected to /account/messages/[id]
    await expect(buyerPage).toHaveURL(/\/account\/messages\/[a-f0-9-]+/, { timeout: 10000 });
    await expect(buyerPage.getByText(uniqueBuyerMsg)).toBeVisible();

    // 6. Seller navigates to the new conversation
    await sellerPage.goto("/account/messages");
    const threadLink = sellerPage.getByRole("link", { name: new RegExp(`Realtime Safety Item ${runId}`, "i") });
    await expect(threadLink).toBeVisible({ timeout: 10000 });
    await threadLink.click();

    await expect(sellerPage).toHaveURL(/\/account\/messages\/[a-f0-9-]+/);
    await expect(sellerPage.getByText(uniqueBuyerMsg)).toBeVisible();

    // 7. Seller sends a reply via ChatThread
    const uniqueSellerReply = `Hi Buyer! Item is available, replied at ${timestamp}`;
    await sellerPage.locator("textarea").fill(uniqueSellerReply);
    await sellerPage.locator("button[type='submit']").click();

    // Verify reply renders in seller page
    await expect(sellerPage.getByText(uniqueSellerReply)).toBeVisible();

    // 8. Buyer sees reply WITHOUT page reload via Realtime
    await expect(buyerPage.getByText(uniqueSellerReply)).toBeVisible({ timeout: 10000 });

    // 9. Verify single occurrence (no duplicate rendering)
    const buyerOccurrences = await buyerPage.getByText(uniqueSellerReply).count();
    expect(buyerOccurrences).toBe(1);

    const sellerOccurrences = await sellerPage.getByText(uniqueBuyerMsg).count();
    expect(sellerOccurrences).toBe(1);

    // 10. Safety Workflow: Buyer submits report through ReportDialog
    const reportUserBtn = buyerPage.locator('button[title="Report User"]');
    await expect(reportUserBtn).toBeVisible();
    await reportUserBtn.click({ force: true });

    const reportDialog = buyerPage.locator('div[role="dialog"]');
    await expect(reportDialog).toBeVisible();
    await buyerPage.locator("#report-reason").selectOption("Suspicious behavior or scam");
    await buyerPage.locator("#report-details").fill("Tested safety reporting via E2E");
    await buyerPage.getByRole("button", { name: /submit report/i }).click({ force: true });

    // Confirmation message appears
    await expect(buyerPage.getByText(/report submitted/i)).toBeVisible({ timeout: 5000 });

    // Verify report was persisted in database
    const { data: dbReport } = await serviceClient
      .from("reports")
      .select("id, status, target_id, reporter_id")
      .eq("reporter_id", buyerUser.id)
      .single();

    expect(dbReport).toBeDefined();
    expect(dbReport?.status).toBe("pending");
    expect(dbReport?.target_id).toBe(sellerUser.id);
    if (dbReport?.id) {
      trackedReportIds.add(dbReport.id);
    }

    // Close contexts
    await buyerContext.close();
    await sellerContext.close();
  });
});
