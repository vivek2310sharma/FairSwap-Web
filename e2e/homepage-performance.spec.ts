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

    // We expect the network fetch to /api/listings/recent NOT to be called.
    // This strictly ensures we've removed the client-side fetch from the homepage loading process.
    // Because we cannot guarantee a populated test database fixture with approved listings here,
    // we only verify the absence of the client-side API call and the successful rendering
    // of the rest of the homepage (e.g. the search bar).
    expect(recentListingsApiCalled).toBe(false);

    // Verify the hero search bar exists to confirm the page has successfully loaded
    await expect(page.getByPlaceholder("Search items, categories, or keywords...")).toBeVisible();
  });
});
