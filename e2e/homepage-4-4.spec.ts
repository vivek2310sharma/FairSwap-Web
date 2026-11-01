import { test, expect } from "./helpers/test";
import { test as plain, expect as plainExpect } from "@playwright/test";
import type { Page } from "@playwright/test";

// Homepage 4.4: responsive/zoom-equivalent matrix, hero composition, language selector, replay removal, safety cards,
// intro slide-up. Browser zoom is not detectable, so zoom levels are covered by their CSS-viewport equivalents of a
// 1280px-wide window: 50% = 2560, 75% = 1707, 90% = 1422, 125% = 1024, 150% = 853, 200% = 640.
const WIDTHS = [320, 360, 390, 640, 768, 853, 1024, 1280, 1422, 1440, 1707, 1920, 2560, 3840];
const noHorizontalScroll = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);

test.describe("Homepage 4.4 responsive matrix", () => {
  test.beforeEach(({}, testInfo) => { test.skip(testInfo.project.name !== "desktop-chromium", "viewports are set explicitly below"); });

  for (const width of WIDTHS) {
    test(`${width}px: no overflow, usable header and search, undistorted mascots`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: width < 700 ? 800 : 900 });
      await page.goto("/");
      await expect(page.getByRole("heading", { level: 1 })).toHaveText("Good things, closer to you.");
      await expect(page.getByRole("searchbox", { name: "Search items", exact: true })).toBeVisible();
      expect(await noHorizontalScroll(page)).toBe(true);
      // Decorative map SVG caused a visible rectangular seam over the hero gradient; it must stay absent.
      await expect(page.locator('img[src*="neighbourhood-map"], [data-testid="hero-map-texture"]')).toHaveCount(0);
      const submit = await page.locator('form[role="search"] button[type="submit"]').boundingBox();
      expect(submit!.height).toBeGreaterThanOrEqual(44);
      // Mascots keep their intrinsic aspect ratio (never stretched).
      const ratios = await page.evaluate(() => [...document.querySelectorAll<HTMLImageElement>('[data-testid^="mascots-"] img')]
        .filter((img) => img.getBoundingClientRect().width > 0)
        .map((img) => ({ rendered: img.getBoundingClientRect().width / img.getBoundingClientRect().height, natural: img.naturalWidth / img.naturalHeight })));
      expect(ratios.length).toBeGreaterThan(0);
      for (const { rendered, natural } of ratios) if (natural > 0) expect(Math.abs(rendered - natural) / natural).toBeLessThan(0.03);
      // Wide viewports must not strand the content as a narrow island.
      if (width >= 1920) {
        const hero = await page.locator("section.fs-hero .fs-container").boundingBox();
        expect(hero!.width).toBeGreaterThanOrEqual(1500);
      }
      await page.screenshot({ path: testInfo.outputPath(`home-${width}.png`), fullPage: false });
    });
  }

  test("desktop hero is balanced man | headline and search | woman", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    const h1 = (await page.getByRole("heading", { level: 1 }).boundingBox())!;
    const man = (await page.locator('[data-testid="mascots-wide"] img[src*="%2Fman-hero"]').boundingBox())!;
    const woman = (await page.locator('[data-testid="mascots-wide"] img[src*="%2Fwoman-hero"]').boundingBox())!;
    expect(man.x + man.width).toBeLessThanOrEqual(h1.x + 1);
    expect(woman.x).toBeGreaterThanOrEqual(h1.x + h1.width - 1);
    const centre = h1.x + h1.width / 2;
    expect(Math.abs(centre - 720)).toBeLessThan(40);
    expect(Math.abs(man.height - woman.height)).toBeLessThanOrEqual(2);
  });

  test("language selector offers English and Hindi only, Hindi disabled", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    const select = page.locator("#language-select-footer");
    await expect(select.locator("option")).toHaveText(["English", "हिन्दी (coming soon)"]);
    await expect(select.locator("option[value=hi]")).toBeDisabled();
  });

  test("no visible 'Replay intro' control on the shopper homepage", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/replay intro/i)).toHaveCount(0);
  });

  test("how it works scene reacts to selection and keeps the no-payments statement", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/");
    const scene = page.getByTestId("story-art");
    await scene.scrollIntoViewIfNeeded();
    await page.getByRole("button", { name: /Exchange/ }).click();
    await expect(scene).toHaveAttribute("data-step", "3");
    await expect(page.locator("#how-it-works")).toContainText("FairSwap does not handle payments");
  });

  test("content is visible without JavaScript (progressive enhancement)", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    await page.goto("/");
    await expect(page.locator("#how-it-works h2")).toBeVisible();
    expect(await page.locator("[data-reveal='pending']").count()).toBe(0);
    await context.close();
  });

  test("reduced motion never hides reveal content", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    await page.goto("/");
    await expect(page.locator("#how-it-works h2")).toBeVisible();
    expect(await page.locator("[data-reveal='pending']").count()).toBe(0);
    await context.close();
  });
});

// Real intro (no pre-seeded session): the final screen holds ~2.4s, then slides up.
plain.describe("Homepage 4.4 intro ending", () => {
  plain("holds the FairSwap/tagline screen, then slides upward revealing the homepage", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    const intro = page.getByRole("dialog", { name: "FairSwap introduction" });
    await plainExpect(intro).toBeVisible();
    await plainExpect(intro).toHaveAttribute("data-ended", "true", { timeout: 6000 });
    const endedAt = Date.now();
    await plainExpect(page.getByTestId("intro-tagline")).toBeVisible();
    // Still on screen just before the 2.4s hold elapses.
    await page.waitForTimeout(1900);
    await plainExpect(intro).toBeVisible();
    // Sliding: the overlay translates upward before it disappears.
    const moved = await page.waitForFunction(() => {
      const el = document.querySelector('[data-testid="premium-intro"]');
      if (!el) return true;
      const t = getComputedStyle(el).transform;
      return t !== "none" && new DOMMatrixReadOnly(t).m42 < -20;
    }, null, { timeout: 4000 });
    plainExpect(moved).toBeTruthy();
    await plainExpect(intro).toHaveCount(0, { timeout: 4000 });
    plainExpect(Date.now() - endedAt).toBeGreaterThanOrEqual(2300);
    await plainExpect(page.getByRole("searchbox", { name: "Search items", exact: true })).toBeVisible();
  });
});