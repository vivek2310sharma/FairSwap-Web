import { test, expect } from "@playwright/test";

// Exercises the real first-visit intro (plain Playwright `test`: no sessionStorage preset).
test.describe("FairSwap first-visit intro", () => {
  test("shows as a modal, contains focus, and Skip dismisses it and restores the page", async ({ page }) => {
    await page.goto("/");
    const intro = page.getByRole("dialog", { name: "FairSwap introduction" });
    await expect(intro).toBeVisible();
    const skip = intro.getByRole("button", { name: "Skip intro" });
    await expect(skip).toBeFocused();
    expect(await intro.evaluate((el) => el.matches(":modal"))).toBe(true);

    // Focus is contained: Tab and Shift+Tab never reach the (inert) page behind the dialog.
    // With one control the browser may move focus to its own UI, so the document's
    // active element is either inside the dialog or the body, never a background element.
    for (const key of ["Tab", "Tab", "Shift+Tab", "Tab"]) {
      await page.keyboard.press(key);
      const inBackground = await page.evaluate(() => {
        const active = document.activeElement;
        return !!active && active !== document.body && !active.closest("dialog");
      });
      expect(inBackground).toBe(false);
    }
    await skip.focus();
    const box = await skip.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);

    await skip.press("Enter");
    await expect(intro).toHaveCount(0);
    await expect(page.getByRole("searchbox", { name: "Search items", exact: true })).toBeVisible();
    expect(await page.evaluate(() => sessionStorage.getItem("fs-intro-seen"))).toBe("1");
  });

  test("Escape dismisses the intro", async ({ page }) => {
    await page.goto("/");
    const intro = page.getByRole("dialog", { name: "FairSwap introduction" });
    await expect(intro).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(intro).toHaveCount(0);
  });

  test("dismisses itself automatically within 6s", async ({ page }) => {
    await page.goto("/");
    const intro = page.getByRole("dialog", { name: "FairSwap introduction" });
    await expect(intro).toBeVisible();
    await expect(intro).toHaveCount(0, { timeout: 6000 });
  });

  test("does not replay in the same tab after a reload", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Skip intro" }).click();
    await page.reload();
    await expect(page.getByRole("searchbox", { name: "Search items", exact: true })).toBeVisible();
    await expect(page.getByRole("dialog", { name: "FairSwap introduction" })).toHaveCount(0);
  });

  test("is bypassed with reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await expect(page.getByRole("searchbox", { name: "Search items", exact: true })).toBeVisible();
    await expect(page.getByRole("dialog", { name: "FairSwap introduction" })).toHaveCount(0);
  });
});