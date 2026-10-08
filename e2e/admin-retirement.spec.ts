import { test, expect } from "@playwright/test";

test.describe("Retired Web Admin", () => {
  for (const path of [
    "/admin",
    "/admin/",
    "/admin/users",
    "/admin/reports/retired-id?status=open",
  ]) {
    test(`${path} returns HTTP 404 without redirecting`, async ({ page }) => {
      const response = await page.goto(path);

      expect(response?.status()).toBe(404);
      expect(new URL(page.url()).pathname).toBe(new URL(path, "http://localhost").pathname);
      await expect(page.getByRole("heading", { name: /404 - page not found/i })).toBeVisible();
      expect(page.url()).not.toContain("/auth/sign-in");
    });
  }
});
