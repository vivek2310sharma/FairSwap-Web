import { test, expect } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";

const TARGET_VIEWPORTS = [
  { name: "320px", width: 320, height: 568, expectedCols: 1 },
  { name: "360px", width: 360, height: 640, expectedCols: 2 },
  { name: "375px", width: 375, height: 667, expectedCols: 2 },
  { name: "390px", width: 390, height: 844, expectedCols: 2 },
  { name: "430px", width: 430, height: 932, expectedCols: 2 },
  { name: "768px", width: 768, height: 1024, expectedCols: 2 },
  { name: "1024px", width: 1024, height: 768, expectedCols: 3 },
  { name: "1440px", width: 1440, height: 900, expectedCols: 3 },
];

test.describe("SRCH-04 browser navigation regressions", () => {
  test("mobile slow locality failure is retryable and distinct from empty", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    let requests = 0;
    await page.route("**/api/discovery/localities?*", async (route) => {
      requests += 1;
      await new Promise((resolve) => setTimeout(resolve, 250));
      await route.fulfill({ status: requests === 1 ? 503 : 200, contentType: "application/json",
        body: requests === 1 ? JSON.stringify({ error: "Unable to load areas" }) : "[]" });
    });
    await page.goto("/search");
    await page.getByRole("button", { name: "Filter & Sort" }).click();
    const drawer = page.getByRole("dialog");
    await drawer.getByLabel("District", { exact: true }).selectOption("city-1");
    await expect(drawer.getByLabel("Locality / Area")).toBeDisabled();
    await expect(drawer.getByRole("alert")).toContainText("Unable to load areas");
    await expect(drawer.getByText("No areas available in this district.")).not.toBeVisible();
    await drawer.getByRole("button", { name: "Retry areas" }).click();
    await expect(drawer.getByText("No areas available in this district.")).toBeVisible();
    expect(requests).toBe(2);
    await expect(page).toHaveURL(/\/search$/);
  });

  test("mobile Close discards drafts; Apply and history preserve filters and explicit newest", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/search?q=phone&sort=newest");
    await page.getByRole("button", { name: "Filter & Sort" }).click();
    const drawer = page.getByRole("dialog");
    await drawer.getByLabel("Category", { exact: true }).selectOption("electronics");
    await drawer.getByRole("button", { name: "Close", exact: true }).click();
    await expect(page).toHaveURL(/q=phone&sort=newest$/);
    await page.getByRole("button", { name: "Filter & Sort" }).click();
    await expect(drawer.getByLabel("Category", { exact: true })).toHaveValue("");
    await drawer.getByLabel("Category", { exact: true }).selectOption("electronics");
    await drawer.getByRole("button", { name: "Apply Filters" }).click();
    await expect(page).toHaveURL(/category=electronics.*sort=newest/);
    await expect(drawer).not.toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(/q=phone&sort=newest$/);
    await page.goForward();
    await page.getByRole("button", { name: "Filter & Sort" }).click();
    await expect(drawer.getByLabel("Category", { exact: true })).toHaveValue("electronics");
    await expect(drawer.getByLabel("Sort By")).toHaveValue("newest");
  });

  test("desktop price blur followed by select retains both filters", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/search?q=phone&sort=newest");
    await page.getByLabel("Minimum price in rupees").fill("500");
    await page.getByLabel("Minimum price in rupees").press("Tab");
    await page.getByLabel("Category", { exact: true }).selectOption("electronics");
    await expect(page).toHaveURL(/category=electronics/);
    await expect(page).toHaveURL(/price_min=500/);
    await expect(page).toHaveURL(/sort=newest/);
    await expect(page.getByTestId("search-results-grid")).toBeVisible();
  });
});

test.describe("SRCH-01 Two-Column Mobile Search Grid Verification (Real React Components)", () => {
  for (const vp of TARGET_VIEWPORTS) {
    test(`renders correct columns, real ListingCards and no overflow at ${vp.name} (${vp.width}px)`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/search");

      // Assert target results grid exists and contains real rendered cards
      const resultsGrid = page.getByTestId("search-results-grid");
      await expect(resultsGrid).toBeVisible({ timeout: 10000 });

      // Verify real listing title, long Indian price, Hindi Devanagari text, and locality
      await expect(resultsGrid.getByText("₹1,25,000")).toBeVisible();
      await expect(resultsGrid.getByText("iPhone 15 Pro Max 256GB Natural Titanium - केवल 2 महीने पुराना")).toBeVisible();
      await expect(resultsGrid.getByText("Bandra West, Mumbai")).toBeVisible();

      // Verify listing image element is present and rendered
      const listingImage = resultsGrid.locator("img[alt*='iPhone 15 Pro Max']").first();
      await expect(listingImage).toBeVisible();

      // Check horizontal overflow
      const hasHorizontalOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      expect(hasHorizontalOverflow, `Horizontal overflow detected at ${vp.width}px`).toBe(false);

      // Verify computed grid column count
      const gridCols = await resultsGrid.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return style.getPropertyValue("grid-template-columns").split(" ").filter(Boolean).length;
      });
      expect(gridCols, `Grid column count mismatch at ${vp.width}px`).toBe(vp.expectedCols);

      if (vp.name === "360px" || vp.name === "390px") {
        const screenshotDir = path.resolve("test-results", "screenshots");
        if (!fs.existsSync(screenshotDir)) {
          fs.mkdirSync(screenshotDir, { recursive: true });
        }
        await page.screenshot({ path: path.join(screenshotDir, `mobile-search-${vp.name}.png`), fullPage: false });
      }
    });
  }

  test("clicking thumbnail image navigates to listing detail page", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await page.goto("/search");

    const resultsGrid = page.getByTestId("search-results-grid");
    await expect(resultsGrid).toBeVisible({ timeout: 10000 });

    // Target the thumbnail image link (first card link)
    const thumbnailLink = resultsGrid.locator("a[href*='/listings/iphone-15-pro-max-mumbai']").first();
    await expect(thumbnailLink).toBeVisible();

    // Scroll element below sticky header before clicking natively without force
    await thumbnailLink.scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollBy(0, -100));
    await thumbnailLink.click();

    // Verify navigation settles on the expected listing detail URL
    await expect(page).toHaveURL(/\/listings\/iphone-15-pro-max-mumbai/);
  });

  test("favourite button tap executes independently without triggering listing navigation", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await page.goto("/search");

    const resultsGrid = page.getByTestId("search-results-grid");
    await expect(resultsGrid).toBeVisible({ timeout: 10000 });

    // Find the real 44px favourite button rendered by React ListingCard
    const favBtn = resultsGrid.getByRole("button", { name: "Save to favourites" }).first();
    await expect(favBtn).toBeVisible();

    // Scroll element below sticky header before clicking natively without force
    await favBtn.scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollBy(0, -100));
    await favBtn.click();

    // Verify favourite action triggered the legitimate sign-in redirect rather than direct listing page navigation
    await expect(page).toHaveURL(/\/auth\/sign-in/);
    expect(page.url()).not.toContain("/listings/iphone-15-pro-max-mumbai");
  });
});
