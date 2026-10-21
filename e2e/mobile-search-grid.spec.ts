import { test, expect } from "@playwright/test";

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

test.describe("SRCH-01 Two-Column Mobile Search Grid Verification", () => {
  for (const vp of TARGET_VIEWPORTS) {
    test(`renders correct columns and no overflow at ${vp.name} (${vp.width}px)`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/search");

      // Verify page loaded
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

      // Check horizontal overflow
      const hasHorizontalOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      expect(hasHorizontalOverflow, `Horizontal overflow detected at ${vp.width}px`).toBe(false);

      // Verify results container grid layout computed style
      const resultsGrid = page.locator("main .grid.grid-cols-1").filter({ has: page.locator("a[href^='/listings/']") });
      if (await resultsGrid.isVisible()) {
        const gridCols = await resultsGrid.evaluate((el) => {
          const style = window.getComputedStyle(el);
          return style.getPropertyValue("grid-template-columns").split(" ").filter(Boolean).length;
        });
        expect(gridCols, `Grid column count mismatch at ${vp.width}px`).toBe(vp.expectedCols);
      }
    });
  }
});
