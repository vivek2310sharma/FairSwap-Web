import { test, expect } from "./helpers/test";
import fs from "node:fs";
import path from "node:path";

const VIEWPORTS = [
  { name: "360", width: 360, height: 740 },
  { name: "768", width: 768, height: 1024 },
  { name: "1280", width: 1280, height: 800 },
];

test.describe("Homepage editorial redesign", () => {
  for (const vp of VIEWPORTS) {
    for (const scheme of ["light", "dark"] as const) {
      test(`renders without overflow at ${vp.name}px (${scheme})`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.emulateMedia({ colorScheme: scheme });
        await page.goto("/");

        await expect(page.getByRole("searchbox", { name: "Search items", exact: true })).toBeVisible();
        await expect(page.getByRole("heading", { level: 2, name: /browse categories/i })).toBeVisible();
        await expect(page.getByRole("heading", { level: 2, name: /your safety matters/i })).toBeVisible();
        await expect(page.getByText(/inspect before paying/i)).toBeVisible();
        await expect(page.getByRole("heading", { level: 2, name: /how it works/i })).toBeVisible();

        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
        expect(overflow).toBe(false);

        const dir = path.resolve("test-results", "screenshots");
        fs.mkdirSync(dir, { recursive: true });
        await page.screenshot({ path: path.join(dir, `home-a2-${vp.name}-${scheme}.png`), fullPage: true });
      });
    }
  }
});