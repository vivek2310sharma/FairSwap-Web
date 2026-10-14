import { test, expect } from "@playwright/test";
import { HELP_CENTRE_URL } from "../src/lib/help-centre";

test.describe("Independent public Help Centre integration", () => {
  test("legacy /help is a temporary redirect that never forwards query parameters", async ({ request }) => {
    const response = await request.get("/help?token=synthetic-test&next=%2Faccount", { maxRedirects: 0 });
    expect(response.status()).toBe(307);
    expect(response.headers()["location"]).toBe(HELP_CENTRE_URL);
  });

  test("desktop header, footer and contact provide same-tab public help with natural back navigation", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium");
    await page.route(HELP_CENTRE_URL, (route) =>
      route.fulfill({
        status: 200,
        contentType: "text/html",
        body: "<!doctype html><html lang='en'><title>Help Centre</title><body><h1>Help Centre</h1></body></html>",
      }),
    );
    await page.goto("/contact");
    const navigation = page.getByRole("navigation", { name: "Main navigation" });
    const help = navigation.getByRole("link", { name: "Help Centre" });
    await expect(help).toHaveAttribute("href", HELP_CENTRE_URL);
    await expect(help).not.toHaveAttribute("target", "_blank");
    await expect(page.getByRole("contentinfo").getByRole("link", { name: "Help Centre" })).toHaveAttribute(
      "href",
      HELP_CENTRE_URL,
    );
    await expect(page.getByRole("main").getByRole("link", { name: "Support Tickets" })).toHaveAttribute(
      "href",
      "/account/support",
    );
    await help.click();
    await expect(page).toHaveURL(HELP_CENTRE_URL);
    await page.goBack();
    await expect(page).toHaveURL(/\/contact$/);
  });

  test("mobile menu separates public help from ticket history", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile-chromium");
    await page.route(HELP_CENTRE_URL, (route) =>
      route.fulfill({
        status: 200,
        contentType: "text/html",
        body: "<!doctype html><html lang='en'><title>Help Centre</title><body><h1>Help Centre</h1></body></html>",
      }),
    );
    await page.goto("/contact");
    await page.getByRole("button", { name: "Open menu" }).click();
    const mobile = page.getByRole("navigation", { name: "Mobile navigation" });
    const help = mobile.getByRole("link", { name: "Help Centre" });
    await expect(mobile.getByRole("link", { name: "Support Tickets" })).toHaveAttribute(
      "href",
      "/account/support",
    );
    await expect(help).toHaveAttribute("href", HELP_CENTRE_URL);
    await help.click();
    await expect(page).toHaveURL(HELP_CENTRE_URL);
    await page.goBack();
    await expect(page).toHaveURL(/\/contact$/);
  });

  test("auth pages expose public help even without a session", async ({ page }) => {
    await page.goto("/auth/sign-in");
    await expect(page.getByRole("link", { name: "Visit the Help Centre" })).toHaveAttribute("href", HELP_CENTRE_URL);
    await page.goto("/auth/sign-up");
    await expect(page.getByRole("link", { name: "Visit the Help Centre" })).toHaveAttribute("href", HELP_CENTRE_URL);
  });
});
