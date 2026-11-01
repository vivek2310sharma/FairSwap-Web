import { test, expect } from "./helpers/test";
import type { Page } from "@playwright/test";

// Homepage 4.5 (Midnight Plum & Champagne): scoped palette, safety links, footer destinations, no overflow.
const WIDTHS = [320, 360, 390, 768, 1024, 1280, 1440, 1920, 2560, 3840];
const noHorizontalScroll = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
const SHOTS = process.env.HOME45_SHOTS_DIR;

test.describe("Homepage 4.5", () => {
  test.beforeEach(({}, testInfo) => { test.skip(testInfo.project.name !== "desktop-chromium", "viewports are set explicitly below"); });

  for (const width of WIDTHS) {
    test(`${width}px: plum hero, no overflow, no map seam`, async ({ page }) => {
      await page.setViewportSize({ width, height: width < 700 ? 800 : 900 });
      await page.goto("/");
      await expect(page.getByRole("heading", { level: 1 })).toHaveText("Good things, closer to you.");
      expect(await noHorizontalScroll(page)).toBe(true);
      await expect(page.locator('img[src*="neighbourhood-map"], [data-testid="hero-map-texture"]')).toHaveCount(0);
      const bg = await page.locator("section.fs-hero").evaluate(el => getComputedStyle(el).backgroundImage);
      expect(bg).toContain("39, 27, 56");
    });
  }

  test("safety reminders link to /safety and footer keeps all destinations", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    const reminders = page.getByRole("list", { name: "Safety reminders" }).getByRole("link");
    await expect(reminders).toHaveCount(3);
    for (const link of await reminders.all()) await expect(link).toHaveAttribute("href", "/safety");
    const footer = page.getByRole("contentinfo");
    await expect(footer.getByText("Good things deserve another chapter.")).toBeVisible();
    for (const href of ["/search", "/saved", "/account/favourites", "/account/listings/new", "/safety", "/terms", "/refund-policy", "/privacy", "/acceptable-use", "/grievance", "mailto:support@fairswap.in"]) {
      await expect(footer.locator(`a[href="${href}"]`).first()).toBeVisible();
    }
  });

  test("How It Works step reacts to focus and keeps the payments disclaimer", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/");
    const exchange = page.getByRole("button", { name: /Exchange/ });
    await exchange.focus();
    await expect(exchange).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText("FairSwap does not handle payments")).toBeVisible();
  });

  test("other routes keep the root palette", async ({ page }) => {
    await page.goto("/search");
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--fs-primary").trim().toUpperCase())).toBe("#08704A");
    expect(await page.locator("header.fs-header").evaluate(el => el.className)).not.toContain("fs-plum-dark");
  });

  test("reduced motion keeps content visible", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Have something to pass on?" })).toBeVisible();
  });

  test("captures desktop and mobile screenshots", async ({ page }) => {
    test.skip(!SHOTS, "set HOME45_SHOTS_DIR to capture");
    for (const [name, width, height] of [["desktop", 1440, 900], ["mobile", 390, 844]] as const) {
      await page.setViewportSize({ width, height });
      await page.goto("/");
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${SHOTS}/${name}-hero.png` });
      await page.locator("#fresh-finds").scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${SHOTS}/${name}-listings.png` });
      await page.locator("#how-it-works").scrollIntoViewIfNeeded();
      await page.getByRole("button", { name: /Inspect/ }).hover();
      await page.screenshot({ path: `${SHOTS}/${name}-how-it-works-hover.png` });
      await page.getByRole("contentinfo").scrollIntoViewIfNeeded();
      await page.waitForTimeout(900);
      await page.screenshot({ path: `${SHOTS}/${name}-footer.png` });
      await page.screenshot({ path: `${SHOTS}/${name}-full.png`, fullPage: true });
    }
  });
});