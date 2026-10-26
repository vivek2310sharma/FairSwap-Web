import { test, expect } from "./helpers/test";

test.describe("Retired Web Admin", () => {
  for (const path of [
    "/admin", "/admin/", "/admin/users", "/admin/users/",
    "/admin/reports/retired-id?status=open", "/admin/logo.png/",
  ]) {
    test(`${path} uses the standard themed HTTP 404 without redirecting`, async ({ page, request }) => {
      const direct = await request.get(path, { maxRedirects: 0 });
      expect(direct.status()).toBe(404);
      expect(direct.headers().location).toBeUndefined();

      await page.goto("/admina");
      const standard = await page.locator("header, main, footer").evaluateAll((elements) => elements.map((element) => element.outerHTML));
      const response = await page.goto(path);
      expect(response?.status()).toBe(404);
      expect(new URL(page.url()).pathname).toBe(new URL(path, "http://localhost").pathname);
      await expect(page.getByRole("heading", { name: "Page not found", exact: true })).toBeVisible();
      await expect(page.getByRole("banner")).toBeVisible();
      await expect(page.getByRole("contentinfo")).toBeVisible();
      await expect(page.getByRole("link", { name: "Back to home", exact: true })).toHaveAttribute("href", "/");
      // Compare the complete existing page design, excluding framework runtime nodes.
      expect(await page.locator("header, main, footer").evaluateAll((elements) => elements.map((element) => element.outerHTML))).toEqual(standard);
      if (path === "/admin") {
        await page.screenshot({ path: `test-results/admin-404-${test.info().project.name}.png`, fullPage: true });
        await page.getByRole("link", { name: "Back to home", exact: true }).click();
        await expect(page).toHaveURL("/");
      }
    });
  }
});

test.describe("Non-Admin trailing slash behavior", () => {
  for (const path of ["/privacy/", "/auth/sign-in/", "/account/", "/admina/", "/administrator/", "/favicon.ico/", "/api/notifications/"]) {
    test(`${path} retains the standard 308 and query string`, async ({ request }) => {
      const response = await request.get(`${path}?source=slash-test`, { maxRedirects: 0 });
      expect(response.status()).toBe(308);
      expect(new URL(response.headers().location, response.url()).pathname).toBe(path.slice(0, -1));
      expect(new URL(response.headers().location, response.url()).search).toBe("?source=slash-test");
    });
  }
  test("canonical URLs and root do not acquire slash redirects", async ({ request }) => {
    for (const path of ["/", "/privacy", "/admina"]) {
      const response = await request.get(path, { maxRedirects: 0 });
      expect(response.status()).toBe(path === "/admina" ? 404 : 200);
      expect(response.headers().location).toBeUndefined();
    }
  });
});