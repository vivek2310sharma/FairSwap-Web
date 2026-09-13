import { test, expect } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";

test.describe("FairSwap Foundation Smoke Tests", () => {
  test("homepage loads with brand, development notice, and no console errors", async ({
    page,
  }, testInfo) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });
    page.on("pageerror", (err) => {
      consoleErrors.push(err.message);
    });

    await page.goto("/");

    // 1. Brand wordmark
    const brand = page.getByRole("link", { name: /fairswap home/i });
    await expect(brand).toBeVisible();
    await expect(brand).toContainText("FairSwap.in");

    // 2. Development notice
    const devNotice = page.getByRole("status");
    await expect(devNotice).toBeVisible();
    await expect(devNotice).toContainText("Development Foundation");
    await expect(devNotice).toContainText(
      "Accounts, listings, and communication are not connected yet."
    );

    // 3. Main landmarks
    await expect(page.getByRole("banner")).toBeVisible();
    await expect(page.getByRole("main")).toBeVisible();
    await expect(page.getByRole("contentinfo")).toBeVisible();

    // 4. Content sections
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Buy & sell locally on FairSwap.in"
    );
    await expect(
      page.getByRole("heading", { level: 2, name: /how it works/i })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: /browse categories/i })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: /your safety matters/i })
    ).toBeVisible();

    // 5. No console or hydration errors
    expect(consoleErrors).toEqual([]);

    // 6. Screenshot capture
    const screenshotDir = path.resolve("test-results", "screenshots");
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
    const screenshotPath = path.join(
      screenshotDir,
      `${testInfo.project.name}-homepage.png`
    );
    await page.screenshot({ path: screenshotPath, fullPage: true });
  });

  test("page has no unintended horizontal overflow", async ({ page }) => {
    await page.goto("/");

    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });

    expect(hasHorizontalOverflow).toBe(false);
  });

  test("navigation behaves properly for current viewport", async ({
    page,
  }, testInfo) => {
    await page.goto("/");

    if (testInfo.project.name === "mobile-chromium") {
      // Mobile menu button exists and works
      const openBtn = page.getByRole("button", { name: /open menu/i });
      await expect(openBtn).toBeVisible();
      await expect(openBtn).toHaveAttribute("aria-expanded", "false");

      // Open menu
      await openBtn.click();
      const closeBtn = page.getByRole("button", { name: /close menu/i });
      await expect(closeBtn).toBeVisible();
      await expect(closeBtn).toHaveAttribute("aria-expanded", "true");
      const mobileNav = page.getByRole("navigation", {
        name: "Mobile navigation",
      });
      await expect(mobileNav).toBeVisible();

      // Close menu
      await closeBtn.click();
      await expect(mobileNav).not.toBeVisible();
      await expect(openBtn).toBeVisible();
      await expect(openBtn).toHaveAttribute("aria-expanded", "false");
    } else {
      // Desktop nav links are visible
      const desktopNav = page.getByRole("navigation", {
        name: "Main navigation",
      });
      await expect(desktopNav).toBeVisible();
      await expect(
        desktopNav.getByRole("link", { name: "How It Works" })
      ).toBeVisible();
      await expect(
        desktopNav.getByRole("link", { name: "Categories" })
      ).toBeVisible();
      await expect(
        desktopNav.getByRole("link", { name: "Safety" })
      ).toBeVisible();
    }
  });

  test("keyboard navigation operates accessible controls for current viewport", async ({
    page,
  }, testInfo) => {
    await page.goto("/");

    if (testInfo.project.name === "mobile-chromium") {
      // 1. Tab to home brand link
      await page.keyboard.press("Tab");
      const homeLink = page.getByRole("link", { name: /fairswap home/i });
      await expect(homeLink).toBeFocused();

      // 2. Tab to mobile menu toggle button
      await page.keyboard.press("Tab");
      const openBtn = page.getByRole("button", { name: /open menu/i });
      await expect(openBtn).toBeFocused();
      await expect(openBtn).toHaveAttribute("aria-expanded", "false");

      // 3. Open menu using Enter key
      await page.keyboard.press("Enter");
      const closeBtn = page.getByRole("button", { name: /close menu/i });
      await expect(closeBtn).toBeVisible();
      await expect(closeBtn).toHaveAttribute("aria-expanded", "true");
      const mobileNav = page.getByRole("navigation", {
        name: "Mobile navigation",
      });
      await expect(mobileNav).toBeVisible();

      // 4. Close menu using Space key while toggle button is focused
      await page.keyboard.press("Space");
      await expect(mobileNav).not.toBeVisible();
      await expect(openBtn).toBeVisible();
      await expect(openBtn).toHaveAttribute("aria-expanded", "false");

      // 5. Re-open menu using Enter key
      await page.keyboard.press("Enter");
      await expect(closeBtn).toBeVisible();
      await expect(closeBtn).toHaveAttribute("aria-expanded", "true");
      await expect(mobileNav).toBeVisible();

      // 6. Tab into mobile menu links
      await page.keyboard.press("Tab");
      const firstLink = mobileNav.getByRole("link", { name: "How It Works" });
      await expect(firstLink).toBeFocused();

      // 7. Tab to next link
      await page.keyboard.press("Tab");
      const secondLink = mobileNav.getByRole("link", { name: "Categories" });
      await expect(secondLink).toBeFocused();

      // 8. Activate navigation link via Enter key
      await page.keyboard.press("Enter");
      await expect(page).toHaveURL(/#categories$/);
      await expect(page.locator("#categories")).toBeVisible();
    } else {
      // 1. Tab to home brand link
      await page.keyboard.press("Tab");
      const homeLink = page.getByRole("link", { name: /fairswap home/i });
      await expect(homeLink).toBeFocused();

      // 2. Tab through desktop nav links
      const desktopNav = page.getByRole("navigation", {
        name: "Main navigation",
      });

      await page.keyboard.press("Tab");
      const howItWorksLink = desktopNav.getByRole("link", {
        name: "How It Works",
      });
      await expect(howItWorksLink).toBeFocused();

      await page.keyboard.press("Tab");
      const categoriesLink = desktopNav.getByRole("link", {
        name: "Categories",
      });
      await expect(categoriesLink).toBeFocused();

      await page.keyboard.press("Tab");
      const safetyLink = desktopNav.getByRole("link", { name: "Safety" });
      await expect(safetyLink).toBeFocused();

      // 3. Activate navigation link via Enter key
      await page.keyboard.press("Enter");
      await expect(page).toHaveURL(/#safety$/);
      await expect(page.locator("#safety")).toBeVisible();
    }
  });

  test("unknown route shows intentional 404 page", async ({ page }, testInfo) => {
    await page.goto("/non-existent-route-404-check");

    await expect(page.getByText("404")).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 1, name: /page not found/i })
    ).toBeVisible();
    const homeBtn = page.getByRole("link", { name: /back to home/i });
    await expect(homeBtn).toBeVisible();
    await expect(homeBtn).toHaveAttribute("href", "/");

    // Screenshot 404
    const screenshotDir = path.resolve("test-results", "screenshots");
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
    const screenshotPath = path.join(
      screenshotDir,
      `${testInfo.project.name}-not-found.png`
    );
    await page.screenshot({ path: screenshotPath });
  });
});
