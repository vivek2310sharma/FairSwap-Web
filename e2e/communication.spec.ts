import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
const SERVICE_KEY =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

test.describe("Milestone 1.5 Communication & Safety Route Protection", () => {
  test("unauthenticated user accessing /account/messages is redirected to sign-in", async ({ page }) => {
    await page.goto("/account/messages");
    await expect(page).toHaveURL(/\/auth\/sign-in\?next=%2Faccount%2Fmessages/);
  });

  test("unauthenticated user accessing /account/notifications is redirected to sign-in", async ({ page }) => {
    await page.goto("/account/notifications");
    await expect(page).toHaveURL(/\/auth\/sign-in\?next=%2Faccount%2Fnotifications/);
  });

  test("unauthenticated user accessing /account/support is redirected to sign-in", async ({ page }) => {
    await page.goto("/account/support");
    await expect(page).toHaveURL(/\/auth\/sign-in\?next=%2Faccount%2Fsupport/);
  });

  test("unauthenticated user accessing /admin/reports is redirected to sign-in", async ({ page }) => {
    await page.goto("/admin/reports");
    await expect(page).toHaveURL(/\/auth\/sign-in\?next=%2Fadmin%2Freports/);
  });

  test("unauthenticated user accessing /admin/support is redirected to sign-in", async ({ page }) => {
    await page.goto("/admin/support");
    await expect(page).toHaveURL(/\/auth\/sign-in\?next=%2Fadmin%2Fsupport/);
  });

  test("unauthenticated user accessing /admin/privacy is redirected to sign-in", async ({ page }) => {
    await page.goto("/admin/privacy");
    await expect(page).toHaveURL(/\/auth\/sign-in\?next=%2Fadmin%2Fprivacy/);
  });
});

test.describe("Milestone 1.5 Authenticated Realtime Messaging & Safety E2E", () => {
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
      const { data: created, error } = await serviceClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          display_name: displayName,
          terms_version: "2026-09-01",
          privacy_policy_version: "2026-09-01",
        },
      });
      if (error || !created.user) throw error || new Error(`Failed to create ${email}`);

      await serviceClient.from("user_accounts").upsert({
        user_id: created.user.id,
        account_status: "active",
        terms_version: "2026-09-01",
        privacy_policy_version: "2026-09-01",
        terms_accepted_at: new Date().toISOString(),
      });

      await serviceClient.from("profiles").upsert({
        id: created.user.id,
        display_name: displayName,
      });

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
    await buyerPage.fill('input[type="password"]', password);
    await buyerPage.click('button[type="submit"]');
    await expect(buyerPage).toHaveURL(/\/account/);

    // 3. Open Seller browser context
    const sellerContext = await browser.newContext();
    const sellerPage = await sellerContext.newPage();

    // Seller signs in
    await sellerPage.goto("/auth/sign-in");
    await sellerPage.fill('input[type="email"]', sellerEmail);
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
    await buyerPage.getByRole("button", { name: /submit report/i }).click();

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

    // Close contexts
    await buyerContext.close();
    await sellerContext.close();
  });
});
