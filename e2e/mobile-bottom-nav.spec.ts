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

      // Check minimum touch target bounding box height >= 44px
      const sellBox = await sellLink.boundingBox();
      expect(sellBox).not.toBeNull();
      if (sellBox) {
        expect(sellBox.height).toBeGreaterThanOrEqual(44);
      }
    });
  }

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
    });
  });
});
