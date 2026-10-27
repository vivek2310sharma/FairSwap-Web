import { test, expect } from "./helpers/test";
import type { Page } from "@playwright/test";

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
    await expect(page.getByRole("searchbox", { name: "Search items", exact: true })).toBeVisible();
  });
});

// Seamless Reveal V2 hero composition. The regular fixture marks the intro seen, so the page is directly usable.
const box = async (page: Page, selector: string) => (await page.locator(selector).first().boundingBox())!;
const overlaps = (a: { x: number; y: number; width: number; height: number }, b: typeof a) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
const noHorizontalScroll = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
const searchbox = (page: Page) => page.getByRole("searchbox", { name: "Search items", exact: true });
const trackHeroArt = (page: Page) => {
  const urls: string[] = [];
  page.on("request", (request) => { if (/\/(man|woman)-hero-/.test(request.url())) urls.push(request.url()); });
  return urls;
};

test.describe("Homepage hero layout (V2)", () => {
  test.beforeEach(({}, testInfo) => { test.skip(testInfo.project.name !== "desktop-chromium", "viewports are set explicitly below"); });

  for (const [width, height] of [[1366, 768], [1440, 900], [1920, 1080]]) {
    test(`desktop ${width}px: larger figures flank the search without overlap or overflow`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto("/");
      await expect(page.getByTestId("hero-art-left")).toBeVisible();
      await expect(page.getByTestId("hero-art-right")).toBeVisible();
      await expect(page.getByTestId("hero-art-pair")).toBeHidden();
      const l = await box(page, '[data-testid="hero-art-left"] img');
      const r = await box(page, '[data-testid="hero-art-right"] img');
      const form = await box(page, 'form[role="search"]');
      const h1 = await box(page, "h1");
      expect(l.height).toBeGreaterThanOrEqual(300); // noticeably larger than the previous ~190px figures
      expect(l.x).toBeGreaterThanOrEqual(0);
      expect(r.x + r.width).toBeLessThanOrEqual(width);
      for (const figure of [l, r]) { expect(overlaps(figure, form)).toBe(false); expect(overlaps(figure, h1)).toBe(false); }
      expect(await noHorizontalScroll(page)).toBe(true);
    });
  }

  for (const [name, width, height] of [["tablet", 768, 1024], ["mobile", 390, 844], ["small mobile", 360, 640]] as const) {
    test(`${name} ${width}px: compact pair below the search, no overflow, no 720w art`, async ({ page }) => {
      const hero = trackHeroArt(page);
      await page.setViewportSize({ width, height });
      await page.goto("/");
      await expect(page.getByTestId("hero-art-pair")).toBeVisible();
      await expect(page.getByTestId("hero-art-left")).toBeHidden();
      const pair = await box(page, '[data-testid="hero-art-pair"]');
      const form = await box(page, 'form[role="search"]');
      expect(overlaps(pair, form)).toBe(false);
      expect(pair.x).toBeGreaterThanOrEqual(0);
      expect(pair.x + pair.width).toBeLessThanOrEqual(width);
      expect(await noHorizontalScroll(page)).toBe(true);
      await page.waitForLoadState("networkidle");
      expect(hero.length).toBeGreaterThan(0);
      expect(hero.filter((url) => url.includes("-720w"))).toEqual([]); // small screens never download the 720w art
    });
  }

  test("desktop does not fetch the hidden below-lg pair", async ({ page }) => {
    const hero = trackHeroArt(page);
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    expect(hero).toHaveLength(2); // one image per visible figure
  });

  test("search, category links and category photos still work", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await expect(page.locator("#categories").getByRole("link", { name: /all ads|browse all ads/i }).first()).toHaveAttribute("href", "/search");
    // Category tiles come from the database; without seeded categories the section shows its fallback (covered by unit tests).
    if (await page.locator("#categories a[href*='category=']").count() > 0) {
      expect(await page.locator("#categories img").count()).toBeGreaterThan(0);
    } else {
      test.info().annotations.push({ type: "environment", description: "no categories seeded; tile links/photos verified by CategoryBento unit tests" });
    }
    await searchbox(page).fill("sofa");
    await searchbox(page).press("Enter");
    await expect(page).toHaveURL(/\/search\?.*q=sofa/);
  });
});
