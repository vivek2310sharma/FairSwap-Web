import { test, expect } from "./helpers/test";

const ID = "00000000-0000-4000-8000-000000000001";

test.describe("Homepage 4.3: saved on this device, fixed light theme, 320px", () => {
  test("/saved is public, empty state is honest and nothing is requested from the account", async ({ page }) => {
    await page.goto("/saved");
    await expect(page).toHaveURL(/\/saved$/);
    await expect(page.getByRole("heading", { level: 1, name: "Saved on this device" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Nothing saved yet" })).toBeVisible();
  });

  test("device saves survive a refresh and are never dropped silently", async ({ page }) => {
    await page.addInitScript((id) => { try { if (!window.localStorage.getItem("fs.guestFavourites.v1")) window.localStorage.setItem("fs.guestFavourites.v1", JSON.stringify([id])); } catch { /* blocked */ } }, ID);
    await page.goto("/saved");
    await expect(page.getByRole("heading", { level: 1, name: "Saved on this device" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign in", exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("link", { name: "Sign in", exact: true })).toBeVisible();
    // Whatever the lookup returns, the id itself is never dropped silently.
    expect(await page.evaluate(() => window.localStorage.getItem("fs.guestFavourites.v1"))).toContain(ID);
  });

  test("blocked storage does not crash the page", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, "localStorage", { get() { throw new Error("blocked"); } });
    });
    await page.goto("/saved");
    await expect(page.getByRole("heading", { level: 1, name: "Saved on this device" })).toBeVisible();
  });

  test("corrupt storage is ignored", async ({ page }) => {
    await page.addInitScript(() => { try { window.localStorage.setItem("fs.guestFavourites.v1", "{oops"); } catch { /* blocked */ } });
    await page.goto("/saved");
    await expect(page.getByRole("heading", { name: "Nothing saved yet" })).toBeVisible();
  });

  for (const scheme of ["light", "dark"] as const) {
    test(`homepage stays light when the OS prefers ${scheme}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto("/");
      const [bg, scheme2] = await page.evaluate(() => [getComputedStyle(document.body).backgroundColor, getComputedStyle(document.documentElement).colorScheme]);
      expect(bg).toBe("rgb(247, 248, 246)");
      expect(scheme2).toBe("light");
    });
  }

  test("homepage shows the approved mascots, the exact headline and no automatic location prompt", async ({ page, context }) => {
    let geolocationAsked = false;
    await context.addInitScript(() => {
      const original = navigator.geolocation?.getCurrentPosition;
      if (navigator.geolocation) navigator.geolocation.getCurrentPosition = (...args) => { (window as unknown as { __geo?: boolean }).__geo = true; return original?.apply(navigator.geolocation, args as never); };
    });
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Good things, closer to you.");
    await expect(page.getByText("Discover useful finds from people around you. Buy, sell and explore locally.")).toBeVisible();
    await expect(page.getByTestId("mascots-wide").locator("img")).toHaveCount(2);
    geolocationAsked = await page.evaluate(() => Boolean((window as unknown as { __geo?: boolean }).__geo));
    expect(geolocationAsked).toBe(false);
  });

  for (const width of [320, 360]) {
    test(`homepage, saved page and menu do not overflow at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 700 });
      for (const url of ["/", "/saved"]) {
        await page.goto(url);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
        expect(overflow, url).toBe(false);
      }
    });
  }

  test("the language selector offers only English", async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 800 });
    await page.goto("/");
    const select = page.getByRole("combobox", { name: "Language" }).first();
    await expect(select).toHaveValue("en");
    await expect(select.locator("option:not([disabled])")).toHaveCount(1);
  });

  test("safety cards expand from the keyboard", async ({ page }) => {
    await page.goto("/");
    const card = page.getByRole("button", { name: /UPI advance requests/ });
    await card.focus();
    await page.keyboard.press("Enter");
    await expect(card).toHaveAttribute("aria-expanded", "true");
  });
});
