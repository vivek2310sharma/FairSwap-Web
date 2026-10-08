import { test, expect } from "@playwright/test";

const APPROVED_VIEWPORTS = [
  { name: "Desktop", width: 1280, height: 720 },
  { name: "Tablet", width: 768, height: 1024 },
  { name: "Mobile", width: 360, height: 640 },
];

test.describe("Approved Viewports Responsive & Usability Verification", () => {
  for (const vp of APPROVED_VIEWPORTS) {
    test.describe(`${vp.name} (${vp.width}px)`, () => {
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
      });

      test("has no unintended horizontal overflow across key pages", async ({ page }) => {
        const routes = ["/", "/auth/sign-in", "/search"];
        for (const route of routes) {
          await page.goto(route);
          const hasOverflow = await page.evaluate(() => {
            return document.documentElement.scrollWidth > window.innerWidth;
          });
          expect(hasOverflow, `Unintended horizontal overflow on ${route} at ${vp.width}px`).toBe(false);
        }
      });

      test("navigation remains accessible and usable", async ({ page }) => {
        await page.goto("/");
        if (vp.width < 1024) {
          // Mobile & Tablet: menu button opens mobile drawer
          const menuBtn = page.getByRole("button", { name: /open menu/i });
          await expect(menuBtn).toBeVisible();
          await menuBtn.click();
          const mobileNav = page.getByRole("navigation", { name: "Mobile navigation" });
          await expect(mobileNav).toBeVisible();
          const closeBtn = page.getByRole("button", { name: /close menu/i });
          await closeBtn.click();
          await expect(mobileNav).not.toBeVisible();
        } else {
          // Desktop: main navigation is visible
          const mainNav = page.getByRole("navigation", { name: "Main navigation" });
          await expect(mainNav).toBeVisible();
          await expect(mainNav.getByRole("link", { name: "How It Works" })).toBeVisible();
          await expect(mainNav.getByRole("link", { name: "Categories" })).toBeVisible();
        }
      });

      test("critical forms and actions remain accessible and fillable", async ({ page }) => {
        await page.goto("/auth/sign-in");
        const emailInput = page.locator("input[name='email']");
        const passwordInput = page.locator("input[name='password']");
        const submitBtn = page.getByRole("button", { name: /sign in/i });

        await expect(emailInput).toBeVisible();
        await expect(passwordInput).toBeVisible();
        await expect(submitBtn).toBeVisible();

        // Verify elements can be filled and focused
        await emailInput.fill("responsive-test@fairswap.local");
        await passwordInput.fill("TestPassword123!");
        await expect(emailInput).toHaveValue("responsive-test@fairswap.local");
      });

    });
  }
});

test.describe("Focus-Visible Visible Focus Indicator Verification", () => {
  test("keyboard Tab focus produces an actual visible focus indicator with solid outline", async ({ page }) => {
    await page.goto("/");

    // Tab to first interactive element (FairSwap home link)
    await page.keyboard.press("Tab");
    const brandLink = page.getByRole("link", { name: /fairswap home/i });
    await expect(brandLink).toBeFocused();

    // Verify computed outline style on focused element
    const outlineInfo = await brandLink.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return {
        outlineStyle: style.outlineStyle,
        outlineWidth: style.outlineWidth,
        outlineColor: style.outlineColor,
        outlineOffset: style.outlineOffset,
      };
    });

    // Authoritative verification: visible focus ring is rendered by CSS
    expect(outlineInfo.outlineStyle).toBe("solid");
    expect(parseInt(outlineInfo.outlineWidth, 10)).toBeGreaterThanOrEqual(1);
    expect(outlineInfo.outlineColor).not.toBe("transparent");
  });
});
