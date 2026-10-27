import { test, expect, type Page } from "@playwright/test";

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

  test("dismisses itself automatically within 7s", async ({ page }) => {
    await page.goto("/");
    const intro = page.getByRole("dialog", { name: "FairSwap introduction" });
    await expect(intro).toBeVisible();
    await expect(intro).toHaveCount(0, { timeout: 7000 });
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

// V2 first-paint gate and choreography. These prove behaviour in a real browser, not just that markup exists.
const GATE = "data-fs-intro";
const searchbox = (page: Page) => page.getByRole("searchbox", { name: "Search items", exact: true });
const hydrationChunks = "**/_next/static/chunks/**/*.js";

// Records, for every animation frame, whether homepage content is in the DOM and what covers it.
async function recordFrames(page: Page) {
  await page.addInitScript(() => {
    const frames: { content: boolean; gate: boolean; dialog: boolean }[] = [];
    (window as unknown as { __frames: typeof frames }).__frames = frames;
    const tick = () => {
      const root = document.documentElement;
      frames.push({
        content: !!document.querySelector("h1"),
        gate: root.getAttribute("data-fs-intro") === "pending",
        dialog: !!document.querySelector("dialog[open]"),
      });
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}
const framesOf = (page: Page) => page.evaluate(() => (window as unknown as { __frames: { content: boolean; gate: boolean; dialog: boolean }[] }).__frames);

test.describe("FairSwap Seamless Reveal V2", () => {
  test("no frame shows the homepage before the intro on an eligible first visit", async ({ page }) => {
    await recordFrames(page);
    await page.goto("/");
    const intro = page.getByRole("dialog", { name: "FairSwap introduction" });
    await expect(intro).toBeVisible();
    const frames = await framesOf(page);
    expect(frames.some((f) => f.content && f.gate)).toBe(true); // the homepage was in the DOM, covered by the gate
    expect(frames.filter((f) => f.content && !f.gate && !f.dialog)).toEqual([]); // never uncovered before the dialog
    await expect(page.locator("html")).not.toHaveAttribute(GATE, /.*/);
  });

  test("keeps the gate backdrop while hydration is slow, then hands over to the dialog", async ({ page }) => {
    await page.route(hydrationChunks, async (route) => { await new Promise((r) => setTimeout(r, 1500)); await route.continue(); });
    await recordFrames(page);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("html")).toHaveAttribute(GATE, "pending");
    const style = await page.evaluate(() => { const s = getComputedStyle(document.body, "::before"); return { position: s.position, top: s.top, z: s.zIndex, bg: s.backgroundColor }; });
    expect(style).toMatchObject({ position: "fixed", z: "1000", bg: "rgb(238, 247, 241)" });
    await expect(page.getByRole("dialog", { name: "FairSwap introduction" })).toBeVisible({ timeout: 7000 });
    await expect(page.locator("html")).not.toHaveAttribute(GATE, /.*/);
    const frames = await framesOf(page);
    expect(frames.filter((f) => f.content && !f.gate && !f.dialog)).toEqual([]);
  });

  test("fails open within the bound when hydration never arrives", async ({ page }) => {
    await page.route(hydrationChunks, (route) => route.abort());
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("html")).toHaveAttribute(GATE, "pending");
    await expect(page.locator("html")).not.toHaveAttribute(GATE, /.*/, { timeout: 8500 });
    await expect(searchbox(page)).toBeVisible();
  });

  test("fails open when the intro artwork is missing", async ({ page }) => {
    await page.route("**/animations/fairswap-intro/**", (route) => route.abort());
    await page.goto("/");
    await expect(page.getByRole("dialog", { name: "FairSwap introduction" })).toHaveCount(0, { timeout: 4000 });
    await expect(page.locator("html")).not.toHaveAttribute(GATE, /.*/);
    await expect(searchbox(page)).toBeVisible();
  });

  test("never sets the gate without JavaScript", async ({ browser, baseURL }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
    const page = await context.newPage();
    await page.goto("/");
    await expect(page.locator("html")).not.toHaveAttribute(GATE, /.*/);
    await expect(searchbox(page)).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await context.close();
  });

  test("a returning same-tab visit goes straight to the homepage with no gate", async ({ page }) => {
    await recordFrames(page);
    await page.goto("/");
    await page.getByRole("button", { name: "Skip intro" }).click();
    await page.reload();
    await expect(searchbox(page)).toBeVisible();
    const frames = await framesOf(page);
    expect(frames.some((f) => f.gate || f.dialog)).toBe(false);
  });

  test("reduced motion never sets the gate", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await recordFrames(page);
    await page.goto("/");
    await expect(searchbox(page)).toBeVisible();
    expect((await framesOf(page)).some((f) => f.gate || f.dialog)).toBe(false);
  });

  test("plays for about 5.2s then dismisses into the homepage", async ({ page }) => {
    await page.goto("/");
    const intro = page.getByRole("dialog", { name: "FairSwap introduction" });
    await expect(intro).toBeVisible();
    const started = Date.now();
    await expect(intro).toHaveCount(0, { timeout: 8000 });
    const elapsed = Date.now() - started;
    expect(elapsed).toBeGreaterThan(4200);
    expect(elapsed).toBeLessThan(6200);
    await expect(searchbox(page)).toBeVisible();
  });

  test("choreography: handshake held >=1.2s, logo held >=0.9s, backdrop dissolves last", async ({ page }) => {
    await page.goto("/");
    const intro = page.getByRole("dialog", { name: "FairSwap introduction" });
    await expect(intro).toBeVisible();
    // Deterministic: pause every CSS animation and seek, rather than sampling wall-clock time.
    const at = (t: number) => page.evaluate((time) => {
      document.getAnimations().forEach((a) => { a.pause(); a.currentTime = time; });
      const op = (sel: string) => Number(getComputedStyle(document.querySelector(`dialog [class*="${sel}"]`)!).opacity);
      return { handshake: op("handshake"), logo: op("logo"), bg: op("bg"), left: op("left") };
    }, t);
    for (const t of [2500, 3000, 3690]) expect((await at(t)).handshake).toBeCloseTo(1, 2); // 1.19s hold from fully visible
    expect((await at(2300)).handshake).toBeGreaterThan(0); // crossfade has begun
    for (const t of [3950, 4400, 4840]) expect((await at(t)).logo).toBeCloseTo(1, 2); // 0.89s+ hold
    expect((await at(4640)).bg).toBeCloseTo(1, 2);
    const late = await at(5100);
    expect(late.bg).toBeLessThan(0.2);
    expect((await at(0)).left).toBe(0); // starts clear, characters enter from the sides
    expect((await at(1600)).left).toBeCloseTo(1, 2);
  });
});
