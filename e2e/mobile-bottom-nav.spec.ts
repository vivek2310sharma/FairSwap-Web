import { test, expect } from "@playwright/test";

test.describe("HDR-01: Mobile Bottom Navigation", () => {
  const mobileWidths = [
    { name: "320px Narrow Mobile", width: 320, height: 568 },
    { name: "360px Standard Mobile", width: 360, height: 640 },
    { name: "390px Modern Mobile", width: 390, height: 844 },
    { name: "639px Max Mobile Breakpoint", width: 639, height: 800 },
  ];

  for (const vp of mobileWidths) {
    test(`renders all 5 navigation items without horizontal overflow on ${vp.name}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/");

      const bottomNav = page.getByRole("navigation", { name: "Mobile bottom navigation" });
      await expect(bottomNav).toBeVisible();

      // Ensure no horizontal scrollbar/overflow on body
      const hasOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      expect(hasOverflow).toBe(false);

      // Verify all 5 navigation destinations exist and are visible
      const links = bottomNav.getByRole("link");
      await expect(links).toHaveCount(5);

      const homeLink = bottomNav.getByRole("link", { name: "Home" });
      const searchLink = bottomNav.getByRole("link", { name: "Search" });
      const sellLink = bottomNav.getByRole("link", { name: "Sell" });
      const chatsLink = bottomNav.getByRole("link", { name: "Chats" });
      const accountLink = bottomNav.getByRole("link", { name: "Account" });

      await expect(homeLink).toBeVisible();
      await expect(searchLink).toBeVisible();
      await expect(sellLink).toBeVisible();
      await expect(chatsLink).toBeVisible();
      await expect(accountLink).toBeVisible();

      // Verify touch targets for all 5 links are at least 44x44 CSS pixels
      for (const link of [homeLink, searchLink, sellLink, chatsLink, accountLink]) {
        const box = await link.boundingBox();
        expect(box).not.toBeNull();
        if (box) {
          expect(box.width).toBeGreaterThanOrEqual(44);
          expect(box.height).toBeGreaterThanOrEqual(44);
        }
      }
    });
  }

  test("safe-area spacer height matches fixed navigation height", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await page.goto("/");

    const bottomNav = page.getByRole("navigation", { name: "Mobile bottom navigation" });
    const navBox = await bottomNav.boundingBox();
    expect(navBox).not.toBeNull();

    const spacerHeight = await page.evaluate(() => {
      const spacer = document.querySelector('div[aria-hidden="true"].pointer-events-none');
      return spacer ? spacer.getBoundingClientRect().height : 0;
    });

    expect(spacerHeight).toBeGreaterThan(0);
    if (navBox) {
      expect(spacerHeight).toBeCloseTo(navBox.height, 0);
    }
  });

  test("hides bottom navigation at 640px and above (tablet/desktop breakpoints)", async ({
    page,
  }) => {
    const desktopViewports = [
      { name: "640px Small Tablet", width: 640, height: 800 },
      { name: "768px Tablet", width: 768, height: 1024 },
      { name: "1024px Desktop", width: 1024, height: 768 },
    ];

    for (const vp of desktopViewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/");

      const bottomNav = page.getByRole("navigation", { name: "Mobile bottom navigation" });
      await expect(bottomNav).not.toBeVisible();
    }
  });

  test.describe("Modal and Drawer stacking (z-index layering)", () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 640 });
    });

    test("mobile search filter drawer appears above bottom navigation and blocks click-through", async ({
      page,
    }) => {
      await page.goto("/search");
      const bottomNav = page.getByRole("navigation", { name: "Mobile bottom navigation" });
      await expect(bottomNav).toBeVisible();

      // Open mobile filter drawer
      const filterBtn = page.getByRole("button", { name: /filter/i }).first();
      await expect(filterBtn).toBeVisible();
      await filterBtn.click();

      // Verify filter drawer / dialog backdrop is visible
      const filterDrawer = page.locator("aside, div").filter({ hasText: "Filter Listings" }).first();
      await expect(filterDrawer).toBeVisible();

      // Check z-index stacking context: filter backdrop (z-50) vs bottom nav (z-40)
      const isDrawerOnTop = await page.evaluate(() => {
        const nav = document.querySelector('nav[aria-label="Mobile bottom navigation"]');
        const elementAtBottomPoint = document.elementFromPoint(180, 620);
        return nav !== null && elementAtBottomPoint !== null && !nav.contains(elementAtBottomPoint);
      });

      expect(isDrawerOnTop).toBe(true);
    });
  });

  test.describe("Route awareness and active state indicators", () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 640 });
    });

    test("sets Home as active on '/'", async ({ page }) => {
      await page.goto("/");
      const bottomNav = page.getByRole("navigation", { name: "Mobile bottom navigation" });
      const homeLink = bottomNav.getByRole("link", { name: "Home" });
      await expect(homeLink).toHaveAttribute("aria-current", "page");
    });

    test("sets Search as active on '/search'", async ({ page }) => {
      await page.goto("/search");
      const bottomNav = page.getByRole("navigation", { name: "Mobile bottom navigation" });
      const searchLink = bottomNav.getByRole("link", { name: "Search" });
      await expect(searchLink).toHaveAttribute("aria-current", "page");
    });

    test("unauthenticated Sell click preserves sign-in redirect", async ({ page }) => {
      await page.goto("/");
      const bottomNav = page.getByRole("navigation", { name: "Mobile bottom navigation" });
      const sellLink = bottomNav.getByRole("link", { name: "Sell" });

      await sellLink.click();
      await expect(page).toHaveURL(/\/auth\/sign-in\?next=%2Faccount%2Flistings%2Fnew/);
    });

    test("unauthenticated Chats click preserves sign-in redirect", async ({ page }) => {
      await page.goto("/");
      const bottomNav = page.getByRole("navigation", { name: "Mobile bottom navigation" });
      const chatsLink = bottomNav.getByRole("link", { name: "Chats" });

      await chatsLink.click();
      await expect(page).toHaveURL(/\/auth\/sign-in\?next=%2Faccount%2Fmessages/);
    });

    test("bottom navigation is absent on sign-in page", async ({ page }) => {
      await page.goto("/auth/sign-in");
      const bottomNav = page.getByRole("navigation", { name: "Mobile bottom navigation" });
      await expect(bottomNav).not.toBeVisible();
    });
  });

  test.describe("Keyboard accessibility", () => {
    test("supports Tab focus ring and visible focus indicators", async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 640 });
      await page.goto("/");

      const bottomNav = page.getByRole("navigation", { name: "Mobile bottom navigation" });
      const homeLink = bottomNav.getByRole("link", { name: "Home" });

      await homeLink.focus();
      await expect(homeLink).toBeFocused();

      // Verify computed focus outline style
      const outlineInfo = await homeLink.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return {
          outlineStyle: style.outlineStyle,
          outlineWidth: style.outlineWidth,
          outlineColor: style.outlineColor,
        };
      });

      expect(outlineInfo.outlineStyle).toBe("solid");
      expect(parseInt(outlineInfo.outlineWidth, 10)).toBeGreaterThanOrEqual(1);
    });
  });
});
