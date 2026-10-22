import { test, expect } from "@playwright/test";

test.describe("Milestone 1.4 Public Discovery, Search, and Favourites E2E", () => {
  test("search page renders filters, handles keyword queries, and keyboard interaction", async ({
    page,
  }) => {
    await page.goto("/search");

    // 1. Check title and search filter landmarks
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Discover Local Listings");

    const mobileFilterBtn = page.getByRole("button", { name: /filter & sort/i });
    if (await mobileFilterBtn.isVisible()) {
      await mobileFilterBtn.click();
    }

    const filterForm = page.locator("form[aria-label='Listing filters']").filter({ visible: true });
    await expect(filterForm).toBeVisible();

    // 2. Keyword input
    const keywordInput = page.getByPlaceholder("Search items, titles, brands...").filter({ visible: true });
    await expect(keywordInput).toBeVisible();

    // 3. Test keyboard submission (Enter key)
    await keywordInput.fill("laptop");
    await keywordInput.press("Enter");

    await expect(page).toHaveURL(/q=laptop/);

    // 4. Test zero-result query and empty state
    await page.goto("/search?q=superuniquestringnonexistent999");
    await expect(page.getByRole("heading", { level: 2, name: /no listings match/i })).toBeVisible();

    const clearButton = page.getByRole("link", { name: /clear all filters/i });
    await expect(clearButton).toBeVisible();
    await clearButton.click();
    await expect(page).toHaveURL("/search");
  });

  test("draft policy, safety, and contact guidance pages render truthful notices", async ({
    page,
  }) => {
    // 1. Safety page
    await page.goto("/safety");
    await expect(page.getByRole("heading", { level: 1, name: /safety guidelines/i })).toBeVisible();
    await expect(page.getByText("Meet in Public Spaces")).toBeVisible();
    await expect(page.getByText("No Advance Payments")).toBeVisible();

    // 2. Help page
    await page.goto("/help");
    await expect(page.getByRole("heading", { level: 1, name: /frequently asked questions/i })).toBeVisible();
    await expect(page.getByText("Development Prototype Documentation")).toBeVisible();

    // 3. Terms draft
    await page.goto("/terms");
    await expect(page.getByText("terms-2026-09-draft")).toBeVisible();

    // 4. Privacy draft
    await page.goto("/privacy");
    await expect(page.getByText("privacy-2026-09-draft")).toBeVisible();

    // 5. Contact guidance
    await page.goto("/contact");
    await expect(page.getByRole("heading", { level: 1, name: /contact guidance/i })).toBeVisible();
    await expect(page.getByText("Milestone 1.4")).toBeVisible();
  });

  test("homepage quick search redirects to /search with parameters", async ({ page }) => {
    await page.goto("/");

    const heroSearchInput = page.getByPlaceholder("Search items, categories, or keywords...");
    await expect(heroSearchInput).toBeVisible();
    await heroSearchInput.fill("electronics");

    const searchButton = page.getByRole("button", { name: "Search" });
    await searchButton.click();

    await expect(page).toHaveURL(/q=electronics/);
  });
});
