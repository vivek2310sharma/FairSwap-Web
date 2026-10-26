import { test, expect } from "@playwright/test";
const user = "11111111-1111-4111-8111-111111111111";
const conversation = "33333333-3333-4333-8333-333333333333";
test.beforeEach(async ({ context, request }) => {
  await request.post("http://127.0.0.1:35431/__reset");
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const token = `${Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url")}.${Buffer.from(JSON.stringify({ sub: user, aud: "authenticated", role: "authenticated", exp })).toString("base64url")}.${Buffer.from("fixture-signature").toString("base64url")}`;
  const session = { access_token: token, refresh_token: "synthetic-fixture", expires_at: exp, expires_in: 3600, token_type: "bearer", user: { id: user, aud: "authenticated", role: "authenticated", app_metadata: {}, user_metadata: {} } };
  await context.addCookies([{ name: "sb-127-auth-token", value: `base64-${Buffer.from(JSON.stringify(session)).toString("base64url")}`, url: "http://127.0.0.1:35430", sameSite: "Lax" }]);
});
test("inbox to thread and back respects mobile and desktop panes", async ({ page, isMobile }) => {
  await page.goto("/account/messages");
  await expect(page.getByRole("link", { name: "All (3)", exact: true })).toBeVisible();
  await expect(page.getByRole("main").getByTestId("chat-v2-inbox-pane")).toBeVisible();
  await page.getByRole("link", { name: /Seller One/ }).click();
  await expect(page).toHaveURL(new RegExp(`/messages/${conversation}`));
  await expect(page.getByRole("main").getByTestId("chat-v2-thread-pane")).toBeVisible();
  if (isMobile) await expect(page.getByRole("main").getByTestId("chat-v2-inbox-pane")).toBeHidden();
  else await expect(page.getByRole("main").getByTestId("chat-v2-inbox-pane")).toBeVisible();
  await expect(page.getByRole("main").getByText(/Never share your UPI PIN or OTP/)).toBeVisible();
  await expect(page.getByRole("main").getByText("Do not share OTPs or UPI PINs.", { exact: true })).toBeVisible();
  await expect(page.getByRole("main").getByText("27 Oct 2026", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Back to inbox" }).click();
  await expect(page.getByRole("main").getByTestId("chat-v2-inbox-pane")).toBeVisible();
});
test("seller listing drilldown exposes buyer-level navigation", async ({ page }) => {
  await page.goto("/account/messages?tab=selling");
  await page.getByRole("link", { name: /2 enquiries/ }).click();
  await expect(page).toHaveURL(/listing_id=/);
  await expect(page.getByRole("link", { name: /Buyer One/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Buyer Two/ })).toBeVisible();
  await page.getByRole("link", { name: /Buyer One/ }).click();
  await expect(page.getByRole("main").getByTestId("chat-v2-thread-pane")).toBeVisible();
});
test("search errors stay explicit and a text send uses canonical rendering", async ({ page }) => {
  await page.goto("/account/messages?q=denied");
  await expect(page.getByRole("main").getByTestId("chat-v2-inbox-pane").getByRole("alert")).toContainText("do not have access");
  await page.goto(`/account/messages/${conversation}`);
  await page.getByRole("textbox", { name: "Type your message…", exact: true }).fill("Synthetic browser message");
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(page.getByRole("main").getByText("Synthetic browser message", { exact: true })).toHaveCount(1);
  await expect(page.getByRole("main").getByText(/· Sent/)).toBeVisible();
});
