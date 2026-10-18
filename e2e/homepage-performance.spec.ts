import { test, expect } from "@playwright/test";

test.describe("Homepage Performance & SSR Optimization", () => {
  test("loads initial recent listings via SSR without making a browser-side fetch", async ({ page }) => {
    let recentListingsApiCalled = false;

    // Listen to network requests before navigating to the homepage
    page.on("request", (request) => {
      if (request.url().includes("/api/listings/recent")) {
        recentListingsApiCalled = true;
      }
    });

    await page.goto("/");

    // Verify the page loads and displays the Recent Listings heading
    await expect(page.getByRole("heading", { name: "Recent Verified Listings" })).toBeVisible();

    // Verify we did not trigger the client side fetch
    expect(recentListingsApiCalled).toBe(false);
  });
});
