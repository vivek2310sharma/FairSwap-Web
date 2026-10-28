import { test, expect } from "./helpers/test";
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
    // Ticket history is authenticated navigation. Use a synthetic local session
    // for this assertion; public contact/help tests above remain signed out.
    expect(new URL(testInfo.project.use.baseURL!).hostname).toBe("localhost");
    const user = { id: "11111111-1111-4111-8111-111111111111", aud: "authenticated",
      role: "authenticated", email: "fixture@example.invalid", app_metadata: {},
      user_metadata: {}, created_at: "2026-01-01T00:00:00Z" };
    const expires = Math.floor(Date.now() / 1000) + 3600;
    const token = `${Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url")}.${Buffer.from(JSON.stringify({ sub: user.id, aud: "authenticated", exp: expires, role: "authenticated" })).toString("base64url")}.fixture`;
    const session = { access_token: token, refresh_token: "fixture-refresh",
      token_type: "bearer", expires_in: 3600, expires_at: expires, user };
    await page.context().addCookies([{ name: "sb-127-auth-token",
      value: `base64-${Buffer.from(JSON.stringify(session)).toString("base64url")}`,
      url: testInfo.project.use.baseURL! }]);
    await page.route("http://127.0.0.1:54321/auth/v1/**",
      route => route.fulfill({ json: user }));
    await page.route("http://127.0.0.1:54321/rest/v1/rpc/get_unread_counts",
      route => route.fulfill({ json: [{ unread_messages: 0, unread_notifications: 0 }] }));
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