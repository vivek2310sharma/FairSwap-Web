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

// Neighbourhood V4 homepage. The regular fixture marks the intro seen, so the page is directly usable.
const box = async (page: Page, selector: string) => (await page.locator(selector).first().boundingBox())!;
const noHorizontalScroll = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
const searchbox = (page: Page) => page.getByRole("searchbox", { name: "Search items", exact: true });
const heroHeight = (page: Page) => page.evaluate(() => Math.round(document.querySelector("section.fs-hero")!.getBoundingClientRect().height));

test.describe("Homepage 3.2 layout (V4)", () => {
  test.beforeEach(({}, testInfo) => { test.skip(testInfo.project.name !== "desktop-chromium", "viewports are set explicitly below"); });

  for (const [width, height] of [[1366, 768], [1440, 900], [1920, 1080]]) {
    test(`desktop ${width}px: compact hero with the approved mascots, no overflow`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto("/");
      await expect(page.getByRole("heading", { level: 1 })).toHaveText("Good things, closer to you.");
      await expect(page.getByText("Discover useful finds from people around you. Buy, sell and explore locally.")).toBeVisible();
      await expect(page.getByTestId("mascots-wide")).toBeVisible();
      await expect(page.getByTestId("mascots-mobile")).toBeHidden();
      await expect(page.getByTestId("mascots-wide").locator('img[src*="%2Fman-hero"]')).toHaveCount(1);
      await expect(page.getByTestId("mascots-wide").locator('img[src*="%2Fwoman-hero"]')).toHaveCount(1);
      expect(await heroHeight(page)).toBeLessThanOrEqual(440);
      const header = await box(page, "header");
      expect(header.height).toBeLessThanOrEqual(65); // 64px bar + 1px border
      await expect(searchbox(page)).toHaveCount(1);
      const form = await box(page, 'form[role="search"]');
      const man = await box(page, '[data-testid="mascots-wide"] img[src*="%2Fman-hero"]');
      const woman = await box(page, '[data-testid="mascots-wide"] img[src*="%2Fwoman-hero"]');
      expect(man.x + man.width).toBeLessThanOrEqual(form.x + 1); // man | search | woman: neither figure sits under the search
      expect(woman.x).toBeGreaterThanOrEqual(form.x + form.width - 1);
      expect(woman.x + woman.width).toBeLessThanOrEqual(width);
      expect(Math.abs(man.height - woman.height)).toBeLessThanOrEqual(2); // equal painted height (same padding ratio), never stretched
      expect(await noHorizontalScroll(page)).toBe(true);
    });
  }

  for (const [name, width, height] of [["small mobile", 320, 640], ["mobile", 360, 640], ["mobile", 390, 844], ["tablet", 768, 1024], ["laptop", 1024, 768]] as const) {
    test(`${name} ${width}px: wraps cleanly with no overflow and a bounded hero`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto("/");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(searchbox(page)).toBeVisible();
      await expect(page.getByRole("link", { name: "Explore nearby" })).toBeVisible();
      expect(await noHorizontalScroll(page)).toBe(true);
      if (width <= 639) {
        await expect(page.getByTestId("mascots-mobile")).toBeVisible();
        await expect(page.getByTestId("mascots-wide")).toBeHidden();
        expect(await heroHeight(page)).toBeLessThanOrEqual(width <= 320 ? 300 : 260);
      }
      const submit = await box(page, 'form[role="search"] button[type="submit"]');
      expect(submit.height).toBeGreaterThanOrEqual(44);
    });
  }

  test("safety microbar shows the three truthful lines and no verification claims", async ({ page }) => {
    await page.goto("/");
    const bar = page.getByRole("list", { name: "Safety reminders" });
    await expect(bar.getByRole("listitem").getByRole("link")).toHaveCount(3);
    for (const [title, hint] of [["Meet in a public place", /public|friend/i], ["Inspect before paying", /in person/i], ["Avoid advance UPI payments", /QR|collect request/i]] as const) {
      const card = bar.getByRole("link", { name: new RegExp(title) });
      await expect(card).toHaveAttribute("href", "/safety");
      await expect(card).toContainText(hint);
    }
    await expect(page.locator("main")).not.toContainText(/escrow|guaranteed|payment protection/i);
  });

  test("search, category links and category photos still work", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await expect(page.locator("#categories").getByRole("link", { name: /all ads|browse all ads/i }).first()).toHaveAttribute("href", "/search");
    if (await page.locator("#categories a[href*='category=']").count() > 0) {
      expect(await page.locator("#categories img").count()).toBeGreaterThan(0);
      expect(await page.locator("#categories img").count()).toBeLessThanOrEqual(8);
    } else {
      test.info().annotations.push({ type: "environment", description: "no categories seeded; tile links/photos verified by CategoryBento unit tests" });
    }
    await searchbox(page).fill("sofa");
    await searchbox(page).press("Enter");
    await expect(page).toHaveURL(/\/search\?.*q=sofa/);
  });

  test("Explore nearby scrolls to the feed without asking for location", async ({ page }) => {
    let geolocationAsked = false;
    await page.addInitScript(() => { navigator.geolocation.getCurrentPosition = () => { (window as unknown as { __geo: boolean }).__geo = true; }; });
    await page.goto("/");
    await page.getByRole("link", { name: "Explore nearby" }).click();
    await expect(page).toHaveURL(/#fresh-finds$/);
    geolocationAsked = await page.evaluate(() => !!(window as unknown as { __geo?: boolean }).__geo);
    expect(geolocationAsked).toBe(false);
  });
});