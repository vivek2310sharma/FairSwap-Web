import { test, expect, type Page } from "@playwright/test";
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
      const resultsGrid = page.getByRole("main").getByTestId("search-results-grid");
      await expect(resultsGrid).toBeVisible({ timeout: 10000 });
      // React may stream hidden replacement content during hydration. It must
      // settle to one grid in the entire DOM, not merely one matching landmark.
      await expect(page.getByTestId("search-results-grid")).toHaveCount(1);

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

    const resultsGrid = page.getByRole("main").getByTestId("search-results-grid");
    await expect(resultsGrid).toBeVisible({ timeout: 10000 });
      // React may stream hidden replacement content during hydration. It must
      // settle to one grid in the entire DOM, not merely one matching landmark.
      await expect(page.getByTestId("search-results-grid")).toHaveCount(1);

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

    const resultsGrid = page.getByRole("main").getByTestId("search-results-grid");
    await expect(resultsGrid).toBeVisible({ timeout: 10000 });
      // React may stream hidden replacement content during hydration. It must
      // settle to one grid in the entire DOM, not merely one matching landmark.
      await expect(page.getByTestId("search-results-grid")).toHaveCount(1);

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

test.describe("HDR-03 isolated navigation", () => {
  for (const width of [320, 360, 390]) {
    test(`guest navigation and keyboard menu at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.goto("/search");
      const bottom = page.getByRole("navigation", { name: "Mobile bottom navigation" });
      await expect(bottom).toHaveCount(1);
      await expect(bottom.getByRole("link", { name: "Sign In" })).toHaveAttribute("href", "/auth/sign-in");
      await expect(bottom.getByRole("link")).toHaveCount(5);
      const menu = page.getByRole("button", { name: "Open menu" });
      await menu.focus();
      await page.keyboard.press("Enter");
      await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Sign Out" })).toHaveCount(0);
      await page.keyboard.press("Escape");
      await expect(menu).toHaveAttribute("aria-expanded", "false");
      await expect(menu).toBeFocused();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await expect(page.getByTestId("search-results-grid")).toHaveCount(1);
    });

    test(`authenticated badges and sign-out at ${width}px`, async ({ page }) => {
      await mockAuthenticatedNavigation(page);
      await page.setViewportSize({ width, height: 844 });
      await page.goto("/search");
      const bottom = page.getByRole("navigation", { name: "Mobile bottom navigation" });
      await expect(bottom.getByRole("link", { name: "Account", exact: true })).toBeVisible();
      await expect(bottom.getByRole("link", { name: "Chats (12 unread)", exact: true })).toBeVisible();
      await expect(bottom.getByText("9+")).toBeVisible();
      await expect(bottom).toHaveCount(1);
      await page.getByRole("button", { name: "Open menu" }).click();
      const menu = page.getByRole("navigation", { name: "Mobile navigation" });
      await expect(menu.getByRole("link", { name: /Notifications/ })).toContainText("9+");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await menu.getByRole("button", { name: "Sign Out" }).click();
      await expect(page).toHaveURL("/");
      await expect(page.getByRole("navigation", { name: "Mobile bottom navigation" }).getByRole("link", { name: "Sign In" })).toBeVisible();
    });
  }
});

async function mockAuthenticatedNavigation(page: Page) {
  const user = { id: "11111111-1111-4111-8111-111111111111", aud: "authenticated", role: "authenticated", email: "fixture@example.invalid", app_metadata: {}, user_metadata: {}, created_at: "2026-01-01T00:00:00Z" };
  const expires = Math.floor(Date.now() / 1000) + 3600;
  const jwt = `${Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url")}.${Buffer.from(JSON.stringify({ sub: user.id, aud: "authenticated", exp: expires, role: "authenticated" })).toString("base64url")}.fixture`;
  const session = { access_token: jwt, refresh_token: "fixture-refresh", token_type: "bearer", expires_in: 3600, expires_at: expires, user };
  await page.addInitScript(value => {
    if (!sessionStorage.getItem("hdr-fixture-initialized")) {
      document.cookie = `sb-127-auth-token=base64-${value}; path=/; SameSite=Lax`;
      sessionStorage.setItem("hdr-fixture-initialized", "true");
    }
  }, Buffer.from(JSON.stringify(session)).toString("base64url"));
  await page.route("**/auth/v1/**", route => route.fulfill({ status: route.request().url().includes("logout") ? 204 : 200, contentType: "application/json", body: route.request().url().includes("logout") ? "" : JSON.stringify(user) }));
  await page.route("**/rest/v1/rpc/get_unread_counts", route => route.fulfill({ json: { unread_messages: 12, unread_notifications: 25 } }));
}

test('HDR-03 authenticated header at 1024px keeps shortcuts plus the menu instead of colliding', async ({ page }) => {
  await mockAuthenticatedNavigation(page);
  await page.setViewportSize({ width: 1024, height: 900 });
  await page.goto('/search');
  await expect(page.locator('header[data-nav="medium"]')).toBeAttached();
  await expect(page.locator('header .fs-medium-only').getByRole('link', { name: 'Browse' })).toBeVisible();
  await expect(page.locator('header .fs-medium-only').getByRole('link', { name: 'Post Ad' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeHidden();
  await page.getByRole('button', { name: 'Open menu' }).click();
  const menu = page.getByRole('navigation', { name: 'Mobile navigation' });
  await expect(menu.getByRole('link', { name: 'Messages (12 unread)', exact: true })).toBeVisible();
  await expect(menu.getByRole('link', { name: 'Notifications (25 unread)', exact: true })).toBeVisible();
  await expect(menu.getByRole('button', { name: 'Sign Out' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

for (const width of [320, 360, 375, 390, 430, 640, 768, 960, 1024, 1152, 1280, 1440]) {
  test('HDR-03 logo never overlaps navigation at ' + width + 'px', async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/search');
    // Streaming can briefly leave a hidden duplicate header; wait for the settled DOM.
    await expect(page.locator('header')).toHaveCount(1);
    await expect(page.locator('header[data-nav]')).toBeAttached();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const logo = (await page.locator('header a[aria-label="FairSwap home"]').boundingBox())!;
    const nav = page.getByRole('navigation', { name: 'Main navigation' });
    if (await nav.isVisible()) {
      const navBox = (await nav.boundingBox())!;
      const postAd = (await page.locator('header a[href="/account/listings/new"]').first().boundingBox())!;
      expect(logo.x + logo.width).toBeLessThanOrEqual(navBox.x + 0.5);
      expect(navBox.x + navBox.width).toBeLessThanOrEqual(postAd.x + 0.5);
      expect(postAd.height).toBeLessThanOrEqual(48);
    } else {
      const menu = (await page.getByRole('button', { name: 'Open menu' }).boundingBox())!;
      expect(logo.x + logo.width).toBeLessThanOrEqual(menu.x + 0.5);
    }
  });
}

for (const width of [1280]) {
  test('HDR-03 desktop auth navigation at ' + width + 'px', async ({ page }) => {
    await mockAuthenticatedNavigation(page);
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/search');
    await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Messages (12 unread)', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Notifications (25 unread)', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign Out' })).toHaveCount(1);
    await expect(page.getByRole('navigation', { name: 'Mobile bottom navigation' })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test('HDR-03 direct account switch drops old document and private DOM', async ({ page }) => {
  await mockAuthenticatedNavigation(page);
  await page.setViewportSize({ width: 360, height: 844 });
  await page.goto('/search');
  await expect(page.getByRole('navigation', { name: 'Mobile bottom navigation' }).getByRole('link', { name: 'Account', exact: true })).toBeVisible();
  await page.evaluate(() => {
    const privatePayload = document.createElement('p');
    privatePayload.id = 'old-private-payload'; privatePayload.textContent = 'Alice private page state';
    document.body.append(privatePayload);
    const channel = new BroadcastChannel('sb-127-auth-token');
    channel.postMessage({ event: 'SIGNED_IN', session: { user: { id: '22222222-2222-4222-8222-222222222222' } } });
    channel.close();
  });
  await expect(page).toHaveURL('/');
  await expect(page.locator('#old-private-payload')).toHaveCount(0);
});
test('HDR-03 missing RPC never announces zero unread chats', async ({ page }) => {
  await mockAuthenticatedNavigation(page);
  await page.route('**/rest/v1/rpc/get_unread_counts', route => route.fulfill({ status: 404, json: { code: 'PGRST202' } }));
  await page.route('**/rest/v1/notifications*', route => route.fulfill({ status: 200, headers: { 'content-range': '0-0/3' }, body: '' }));
  await page.setViewportSize({ width: 360, height: 844 });
  await page.goto('/search');
  await expect(page.getByRole('navigation', { name: 'Mobile bottom navigation' }).getByRole('link', { name: 'Account', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Open menu' }).click();
  await expect(page.getByRole('navigation', { name: 'Mobile navigation' }).getByRole('link', { name: 'Messages', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Messages (0 unread)', exact: true })).toHaveCount(0);
});
test('HDR-03 server markup stays neutral before auth hydration', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1280, height: 900 } });
  try {
    const page = await context.newPage();
    await page.goto(baseURL + '/search');
    await expect(page.getByRole('link', { name: 'Sign In', exact: true })).toHaveCount(0);
    await expect(page.getByRole('status').filter({ hasText: 'Checking session' }).first()).toBeVisible();
  } finally { await context.close(); }
});
