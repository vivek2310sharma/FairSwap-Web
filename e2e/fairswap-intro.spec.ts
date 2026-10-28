import { test, expect, type Page } from "@playwright/test";

// Neighbourhood Discovery Flow V4. Plain Playwright `test`: no preset seen key, so the real first-visit intro runs.
const SEEN_KEY = "fairswap.intro.neighbourhood.v1.seen";
const GATE = "data-fs-intro";
const LABEL = "FairSwap neighbourhood introduction";
const searchbox = (page: Page) => page.getByRole("searchbox", { name: "Search items", exact: true });
const intro = (page: Page) => page.getByRole("dialog", { name: LABEL });
const hydrationChunks = "**/_next/static/chunks/**/*.js";

test.describe("Neighbourhood intro: interaction", () => {
  test("shows as a modal, contains focus, and Skip dismisses it, restores the page and marks seen", async ({ page }) => {
    await page.goto("/");
    await expect(intro(page)).toBeVisible();
    const skip = intro(page).getByRole("button", { name: "Skip intro" });
    await expect(skip).toBeFocused();
    expect(await intro(page).evaluate((el) => el.matches(":modal"))).toBe(true);
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
    expect(box!.width).toBeGreaterThanOrEqual(44);
    await skip.press("Enter");
    await expect(intro(page)).toHaveCount(0);
    await expect(searchbox(page)).toBeVisible();
    expect(await page.evaluate((key) => localStorage.getItem(key), SEEN_KEY)).toBe("1");
    await expect(page.locator("html")).not.toHaveAttribute(GATE, /.*/);
  });

  test("Escape dismisses the intro", async ({ page }) => {
    await page.goto("/");
    await expect(intro(page)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(intro(page)).toHaveCount(0);
  });

  test("plays once per device: a reload and a new tab go straight to the homepage", async ({ page, context }) => {
    await page.goto("/");
    await expect(intro(page)).toBeVisible();
    await page.getByRole("button", { name: "Skip intro" }).click();
    await page.reload();
    await expect(searchbox(page)).toBeVisible();
    await expect(intro(page)).toHaveCount(0);
    const second = await context.newPage();
    await second.goto("/");
    await expect(searchbox(second)).toBeVisible();
    await expect(intro(second)).toHaveCount(0);
  });

  test("is marked seen at start, so a reload mid-play never replays it", async ({ page }) => {
    await page.goto("/");
    await expect(intro(page)).toBeVisible();
    expect(await page.evaluate((key) => localStorage.getItem(key), SEEN_KEY)).toBe("1");
    await page.reload();
    await expect(intro(page)).toHaveCount(0);
  });
});

test.describe("Neighbourhood intro: timeline", () => {
  for (const [name, width, height, total] of [["desktop", 1366, 768, 3300], ["mobile", 390, 844, 2600]] as const) {
    test(`${name}: runs ${total}ms (+-250) and closes into the homepage`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto("/");
      await expect(intro(page)).toBeVisible();
      const started = Date.now();
      await expect(intro(page)).toHaveCount(0, { timeout: 4500 });
      const elapsed = Date.now() - started;
      expect(Math.abs(elapsed - total)).toBeLessThan(900); // wall clock includes attach latency; the seeked check below is exact
      await expect(searchbox(page)).toBeVisible();
    });

    test(`${name}: beats converge on the hub, reveal the official logo and release (seeked, deterministic)`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto("/");
      await expect(intro(page)).toBeVisible();
      const probe = (t: number) => page.evaluate((time) => {
        document.getAnimations().forEach((a) => { a.pause(); a.currentTime = time; });
        const root = document.querySelector("dialog")!;
        const layer = (n: string) => root.querySelector(`[data-layer="${n}"]`) as HTMLElement;
        const op = (n: string) => Number(getComputedStyle(layer(n)).opacity);
        const stage = layer("stage").getBoundingClientRect();
        const centre = (el: HTMLElement) => { const r = el.getBoundingClientRect(); return { x: (r.left + r.width / 2 - stage.left) / stage.width * 100, y: (r.top + r.height / 2 - stage.top) / stage.height * 100 }; };
        const tokens = [...root.querySelectorAll<HTMLElement>("[data-token]")];
        return { tokens: tokens.length, tokenOpacity: tokens.map((el) => Number(getComputedStyle(el).opacity)), tokenCentres: tokens.map(centre), logo: op("logo"), scrim: op("scrim"), map: op("map"), hub: centre(layer("logo")) };
      }, t);
      const beats = name === "desktop" ? { b: 1180, d: 2130, dEnd: 2580, e: 3100 } : { b: 840, d: 1630, dEnd: 1990, e: 2420 };
      const expectedTokens = name === "desktop" ? 6 : 4;
      const start = await probe(0);
      expect(start.tokens).toBe(expectedTokens);
      expect(start.tokenOpacity.every((o) => o === 0)).toBe(true);
      expect(start.logo).toBe(0);
      expect(start.scrim).toBeCloseTo(1, 2);
      const afterB = await probe(beats.b);
      expect(afterB.tokenOpacity.every((o) => o > 0.99)).toBe(true); // all markers visible before they travel
      const mid = await probe((beats.b + beats.d) / 2);
      const hubDistance = (p: { x: number; y: number }[], hub: { x: number; y: number }) => p.map((c) => Math.hypot(c.x - hub.x, c.y - hub.y));
      const before = hubDistance(afterB.tokenCentres, afterB.hub);
      const during = hubDistance(mid.tokenCentres, mid.hub);
      during.forEach((d, i) => expect(d).toBeLessThan(before[i])); // magnetic convergence
      expect((await probe(beats.d)).logo).toBeLessThan(0.1);
      const converged = await probe(beats.dEnd);
      expect(converged.logo).toBeCloseTo(1, 2); // official logo pill revealed
      hubDistance(converged.tokenCentres, converged.hub).forEach((d) => expect(d).toBeLessThan(2));
      const late = await probe(beats.e);
      expect(late.scrim).toBeLessThan(0.05);
      expect(late.map).toBeLessThan(0.05);
      expect(late.tokenOpacity.every((o) => o < 0.05)).toBe(true);
    });
  }

  test("uses the official logo and only local, existing assets", async ({ page }) => {
    const external: string[] = [];
    page.on("request", (request) => { const url = new URL(request.url()); if (url.origin !== new URL(page.url() || "http://localhost:3001").origin && url.protocol.startsWith("http") && url.hostname !== "localhost") external.push(request.url()); });
    await page.goto("/");
    await expect(intro(page)).toBeVisible();
    await expect(page.locator('dialog img[src="/brand/FairSwap_Web_Logo_Transparent.png"]')).toHaveCount(1);
    expect(await page.locator("dialog img").evaluateAll((imgs) => imgs.map((i) => (i as HTMLImageElement).getAttribute("src")).filter((s) => s && !s.startsWith("/")))).toEqual([]);
    expect(external).toEqual([]);
  });
});

test.describe("Neighbourhood intro: gate and fail-open", () => {
  test("no frame shows the homepage before the intro on an eligible first visit", async ({ page }) => {
    await page.addInitScript(() => {
      const frames: { content: boolean; gate: boolean; dialog: boolean }[] = [];
      (window as unknown as { __frames: typeof frames }).__frames = frames;
      const tick = () => {
        frames.push({ content: !!document.querySelector("h1"), gate: document.documentElement.getAttribute("data-fs-intro") === "pending", dialog: !!document.querySelector("dialog[open]") });
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    await page.goto("/");
    await expect(intro(page)).toBeVisible();
    const frames = await page.evaluate(() => (window as unknown as { __frames: { content: boolean; gate: boolean; dialog: boolean }[] }).__frames);
    expect(frames.filter((f) => f.content && !f.gate && !f.dialog)).toEqual([]);
  });

  test("gate paints the forest backdrop while hydration is slow and releases by 4000ms", async ({ page }) => {
    await page.route(hydrationChunks, async (route) => { await new Promise((r) => setTimeout(r, 1500)); await route.continue(); });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("html")).toHaveAttribute(GATE, "pending");
    const style = await page.evaluate(() => { const s = getComputedStyle(document.body, "::before"); return { position: s.position, z: s.zIndex, bg: s.backgroundColor }; });
    expect(style).toMatchObject({ position: "fixed", z: "1000", bg: "rgb(14, 43, 34)" });
    await expect(intro(page)).toBeVisible({ timeout: 4500 });
    await expect(page.locator("html")).not.toHaveAttribute(GATE, /.*/);
  });

  test("fails open within 4000ms when hydration never arrives", async ({ page }) => {
    await page.route(hydrationChunks, (route) => route.abort());
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("html")).toHaveAttribute(GATE, "pending");
    const started = Date.now();
    await page.waitForFunction((attr) => !document.documentElement.hasAttribute(attr), GATE, { polling: 50, timeout: 5000 });
    expect(Date.now() - started).toBeLessThan(4300);
    await expect(searchbox(page)).toBeVisible();
  });

  test("fails open immediately when the map art is missing", async ({ page }) => {
    await page.route("**/animations/fairswap-neighbourhood-v4/**", (route) => route.abort());
    await page.goto("/");
    await expect(intro(page)).toHaveCount(0, { timeout: 2500 });
    await expect(page.locator("html")).not.toHaveAttribute(GATE, /.*/);
    await expect(searchbox(page)).toBeVisible();
  });

  test("a missing category photo drops only that marker", async ({ page }) => {
    await page.route("**/images/categories/electronics-cameras-photography.webp*", (route) => route.abort());
    await page.route("**/_next/image*cameras-photography*", (route) => route.abort());
    await page.goto("/");
    await expect(intro(page)).toBeVisible();
    await expect(page.locator('[data-token="cameras"]')).toHaveCount(0);
    await expect(page.locator("[data-token]")).not.toHaveCount(0);
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

  test("reduced motion skips the intro and the gate entirely", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.addInitScript(() => {
      const seen = { gate: false };
      (window as unknown as { __seen: typeof seen }).__seen = seen;
      new MutationObserver(() => { if (document.documentElement.hasAttribute("data-fs-intro")) seen.gate = true; }).observe(document.documentElement, { attributes: true });
    });
    await page.goto("/");
    await expect(searchbox(page)).toBeVisible();
    await expect(intro(page)).toHaveCount(0);
    expect(await page.evaluate(() => (window as unknown as { __seen: { gate: boolean } }).__seen.gate)).toBe(false);
  });

  test("Save-Data skips the intro", async ({ page }) => {
    await page.addInitScript(() => { Object.defineProperty(navigator, "connection", { value: { saveData: true }, configurable: true }); });
    await page.goto("/");
    await expect(searchbox(page)).toBeVisible();
    await expect(intro(page)).toHaveCount(0);
    await expect(page.locator("html")).not.toHaveAttribute(GATE, /.*/);
  });

  test("unavailable storage skips the intro instead of trapping or looping", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, "localStorage", { get() { throw new DOMException("blocked", "SecurityError"); }, configurable: true });
    });
    await page.goto("/");
    await expect(searchbox(page)).toBeVisible();
    await expect(intro(page)).toHaveCount(0);
    await expect(page.locator("html")).not.toHaveAttribute(GATE, /.*/);
  });

  test("a V2 session key does not suppress V4", async ({ page }) => {
    await page.addInitScript(() => { try { sessionStorage.setItem("fs-intro-seen", "1"); } catch { /* ignore */ } });
    await page.goto("/");
    await expect(intro(page)).toBeVisible();
  });
});

test.describe("Neighbourhood intro: frame sizing", () => {
  for (const [width, height] of [[320, 640], [360, 640], [390, 844], [768, 1024], [1366, 768]]) {
    test(`${width}px: overlay fills the viewport without body overflow`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto("/");
      await expect(intro(page)).toBeVisible();
      const geometry = await page.evaluate(() => {
        const r = document.querySelector("dialog")!.getBoundingClientRect();
        const skip = document.querySelector("dialog button")!.getBoundingClientRect();
        return { w: r.width, h: r.height, overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth, skipRight: skip.right, skipLeft: skip.left };
      });
      expect(geometry.w).toBe(width);
      expect(geometry.overflow).toBe(false);
      expect(geometry.skipRight).toBeLessThanOrEqual(width);
      expect(geometry.skipLeft).toBeGreaterThanOrEqual(0);
    });
  }
});
