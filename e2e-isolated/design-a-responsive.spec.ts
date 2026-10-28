import { test, expect } from "@playwright/test";

// Design A home page: no horizontal scroll, no obscured CTAs, long Hindi labels wrap inside tiles.
const WIDTHS = [320, 360, 390, 430, 768, 1024, 1280, 1440];
const LONG_HINDI = "इलेक्ट्रॉनिक्स और घरेलू उपकरण — सुरक्षित खरीद-बिक्री";

for (const width of WIDTHS) {
  test(`home layout is clean at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/");
    await page.locator("#home-category-grid li a span.break-words").first().evaluate((el, text) => { el.textContent = text; }, LONG_HINDI);

    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), "horizontal overflow").toBe(false);

    const tile = (await page.locator("#home-category-grid li a").first().boundingBox())!;
    const label = (await page.locator("#home-category-grid li a span.break-words").first().boundingBox())!;
    expect(label.x).toBeGreaterThanOrEqual(tile.x - 0.5);
    expect(label.x + label.width).toBeLessThanOrEqual(tile.x + tile.width + 0.5);

    const submit = (await page.getByRole("button", { name: "Search", exact: true }).boundingBox())!;
    expect(submit.height).toBeGreaterThanOrEqual(44);
    expect(submit.x + submit.width).toBeLessThanOrEqual(width + 0.5);

    // Fixed bottom nav (mobile) must not cover the search field.
    const search = (await page.getByRole("searchbox", { name: "Search items" }).boundingBox())!;
    const bottomNav = page.getByRole("navigation", { name: "Mobile bottom navigation" });
    if (await bottomNav.isVisible()) {
      const nav = (await bottomNav.boundingBox())!;
      expect(search.y + search.height).toBeLessThanOrEqual(nav.y + 0.5);
    }
  });
}
