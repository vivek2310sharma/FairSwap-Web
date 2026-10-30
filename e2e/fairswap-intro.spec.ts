import { test, expect, type Page } from "@playwright/test";

// FairSwap V19 intro, final playback policy. Plain Playwright `test` (not helpers/test): nothing is pre-seeded, so the real intro runs.
const KEYS = { tab: "fairswap.intro.v19.tab", seen: "fairswap.intro.v19.seen", theme: "fairswap.intro.v19.theme" };
const GATE = "data-fs-intro";
const LABEL = "FairSwap introduction";
const TAGLINES = [
  "India’s marketplace. Buy, sell, exchange and share.",
  "India’s marketplace. Fairer ways to buy and sell.",
  "India’s marketplace. Local deals, fair exchanges.",
  "India’s marketplace. Reuse more, waste less.",
];
const searchbox = (page: Page) => page.getByRole("searchbox", { name: "Search items", exact: true });
const intro = (page: Page) => page.getByRole("dialog", { name: LABEL });
const hydrationChunks = "**/_next/static/chunks/**/*.js";
const storage = (page: Page) => page.evaluate((keys) => ({ tab: sessionStorage.getItem(keys.tab), seen: sessionStorage.getItem(keys.seen), theme: sessionStorage.getItem(keys.theme) }), KEYS);
const skipIntro = (page: Page) => intro(page).getByRole("button", { name: "Skip intro" });
/** Opens the homepage and lets the first intro run be dismissed, leaving a tab that has seen it. */
async function visitAndSkip(page: Page) {
  await page.goto("/");
  await expect(intro(page)).toBeVisible();
  await skipIntro(page).click();
  await expect(intro(page)).toHaveCount(0);
}

test.describe("V19 intro: first visit", () => {
  test("plays automatically as a modal, focuses Skip, and marks the tab seen as playback begins", async ({ page }) => {
    await page.goto("/");
    await expect(intro(page)).toBeVisible();
    await expect(skipIntro(page)).toBeFocused();
    expect(await intro(page).evaluate((el) => el.matches(":modal"))).toBe(true);
    const { tab, seen } = await storage(page);
    expect(tab).toBeTruthy();
    expect(seen).toBe(tab);
    expect(await page.evaluate(() => Object.keys(localStorage).filter((k) => /seen|cooldown/i.test(k)))).toEqual([]);
    for (const key of ["Tab", "Tab", "Shift+Tab"]) {
      await page.keyboard.press(key);
      expect(await page.evaluate(() => { const a = document.activeElement; return !!a && a !== document.body && !a.closest("dialog"); })).toBe(false);
    }
    const box = (await skipIntro(page).boundingBox())!;
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.width).toBeGreaterThanOrEqual(44);
  });

  test("shows नमस्ते first and 15 distinct greetings, then the text-only FairSwap reveal, and releases the homepage by itself", async ({ page }) => {
    await page.addInitScript(() => {
      const seen: string[] = [];
      (window as unknown as { __greetings: string[] }).__greetings = seen;
      const tick = () => {
        const g = document.querySelector('[data-testid="intro-greeting"]')?.textContent;
        if (g && seen[seen.length - 1] !== g) seen.push(g);
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    await page.goto("/");
    await expect(intro(page)).toBeVisible();
    await expect(intro(page)).toHaveAttribute("data-ended", "true", { timeout: 6000 });
    await expect(page.getByTestId("intro-tagline")).toBeVisible();
    expect(TAGLINES).toContain(await page.getByTestId("intro-tagline").textContent());
    await expect(intro(page)).toContainText("MADE IN INDIA");
    await expect(intro(page)).toContainText("FairSwap");
    expect(await intro(page).locator("img").count()).toBe(0);
    await expect(page.getByRole("status")).toContainText("FairSwap.");
    await expect(intro(page)).toHaveCount(0, { timeout: 6000 });
    await expect(searchbox(page)).toBeVisible();
    await expect(page.locator("html")).not.toHaveAttribute(GATE, /.*/);
    const greetings = await page.evaluate(() => (window as unknown as { __greetings: string[] }).__greetings);
    expect(greetings[0]).toBe("नमस्ते");
    expect(greetings.length).toBeGreaterThanOrEqual(13); // frame sampling can miss a ~60ms slide; the unit tests assert all 15
    expect(new Set(greetings).size).toBe(greetings.length);
  });
});

test.describe("V19 intro: tab-session policy", () => {
  test.describe.configure({ timeout: 60_000 }); // several tests open a second tab and wait through real reloads under parallel load
  test("a refresh never replays it, including a refresh mid-playback", async ({ page }) => {
    await page.goto("/");
    await expect(intro(page)).toBeVisible();
    await page.reload();
    await expect(searchbox(page)).toBeVisible();
    await expect(intro(page)).toHaveCount(0);
    await page.reload();
    await expect(intro(page)).toHaveCount(0);
  });

  test("internal navigation never replays it", async ({ page }) => {
    await visitAndSkip(page);
    await page.evaluate(() => { (window as unknown as { __doc: number }).__doc = 1; });
    await page.locator('a[href="/safety"]:visible').first().click();
    await expect(page).toHaveURL(/\/safety$/);
    await page.goBack();
    await expect(searchbox(page)).toBeVisible();
    expect(await page.evaluate(() => (window as unknown as { __doc?: number }).__doc)).toBe(1); // a client-side navigation, not a reload
    await expect(intro(page)).toHaveCount(0);
  });

  test("a new independent tab gets its own intro, and each tab then stays seen on its own", async ({ page, context }) => {
    await visitAndSkip(page);
    const other = await context.newPage();
    await other.goto("/");
    await expect(intro(other)).toBeVisible();
    expect((await storage(other)).tab).not.toBe((await storage(page)).tab);
    await skipIntro(other).click();
    await other.reload();
    await expect(intro(other)).toHaveCount(0);
    await page.reload();
    await expect(intro(page)).toHaveCount(0);
  });

  test("a tab opened with a copy of sessionStorage (duplicate tab) still gets its own intro", async ({ page, context }) => {
    await page.goto("/");
    await expect(intro(page)).toBeVisible();
    const original = await page.evaluate(() => JSON.stringify(Object.entries(sessionStorage)));
    const duplicate = await context.newPage();
    await duplicate.addInitScript((copy) => {
      if (!sessionStorage.length) for (const [k, v] of JSON.parse(copy) as [string, string][]) sessionStorage.setItem(k, v);
    }, original);
    await duplicate.goto("/");
    await expect(intro(duplicate)).toBeVisible();
    const copied = await storage(duplicate);
    expect(copied.tab).not.toBe((await storage(page)).tab);
    expect(copied.seen).toBe(copied.tab);
    // The original is unaffected and still never replays.
    await page.reload();
    await expect(intro(page)).toHaveCount(0);
  });

  test("Skip dismisses to the homepage and counts as seen (a refresh does not bring it back)", async ({ page }) => {
    await visitAndSkip(page);
    await expect(searchbox(page)).toBeVisible();
    await expect(page.locator("html")).not.toHaveAttribute(GATE, /.*/);
    const { tab, seen } = await storage(page);
    expect(seen).toBe(tab);
    await page.reload();
    await expect(intro(page)).toHaveCount(0);
  });

  test("Escape dismisses it", async ({ page }) => {
    await page.goto("/");
    await expect(intro(page)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(intro(page)).toHaveCount(0);
  });

  test("manual Replay works any time, keeps the tab's palette and does not reset eligibility", async ({ page }) => {
    await visitAndSkip(page);
    const before = await storage(page);
    await page.evaluate(() => window.dispatchEvent(new Event("fairswap:replay-intro")));
    await expect(intro(page)).toBeVisible();
    await expect(intro(page)).toHaveAttribute("data-replay", "true");
    await expect(intro(page)).toHaveAttribute("data-theme", before.theme!);
    expect(await storage(page)).toEqual(before);
    await skipIntro(page).click();
    await expect(intro(page)).toHaveCount(0);
    expect(await storage(page)).toEqual(before);
    await page.reload();
    await expect(intro(page)).toHaveCount(0);
  });
});

test.describe("V19 intro: gate and fail-open", () => {
  test("no frame shows the homepage before the intro on an eligible tab", async ({ page }) => {
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

  test("gate paints the tab's palette while hydration is slow, then the intro opens on it", async ({ page }) => {
    await page.route(hydrationChunks, async (route) => { await new Promise((r) => setTimeout(r, 1500)); await route.continue(); });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("html")).toHaveAttribute(GATE, "pending");
    const gate = await page.evaluate((key) => {
      const s = getComputedStyle(document.body, "::before");
      return { position: s.position, z: s.zIndex, bg: document.documentElement.style.getPropertyValue("--fs-intro-bg"), theme: sessionStorage.getItem(key), image: s.backgroundImage };
    }, KEYS.theme);
    expect(gate).toMatchObject({ position: "fixed", z: "1000" });
    expect(gate.image).toContain("radial-gradient");
    expect(gate.bg).toMatch(/^#[0-9a-f]{6}$/i);
    await expect(intro(page)).toBeVisible({ timeout: 4500 });
    await expect(intro(page)).toHaveAttribute("data-theme", gate.theme!);
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
    expect((await storage(page)).seen).toBeNull();
  });

  test("Save-Data skips the intro", async ({ page }) => {
    await page.addInitScript(() => { Object.defineProperty(navigator, "connection", { value: { saveData: true }, configurable: true }); });
    await page.goto("/");
    await expect(searchbox(page)).toBeVisible();
    await expect(intro(page)).toHaveCount(0);
    await expect(page.locator("html")).not.toHaveAttribute(GATE, /.*/);
  });

  test("unavailable sessionStorage skips the intro instead of trapping or looping", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, "sessionStorage", { get() { throw new DOMException("blocked", "SecurityError"); }, configurable: true });
    });
    await page.goto("/");
    await expect(searchbox(page)).toBeVisible();
    await expect(intro(page)).toHaveCount(0);
    await expect(page.locator("html")).not.toHaveAttribute(GATE, /.*/);
  });

  test("blocked localStorage still plays once per tab", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, "localStorage", { get() { throw new DOMException("blocked", "SecurityError"); }, configurable: true });
    });
    await page.goto("/");
    await expect(intro(page)).toBeVisible();
    await skipIntro(page).click();
    await page.reload();
    await expect(intro(page)).toHaveCount(0);
  });

  test("loads no remote assets and fetches no data", async ({ page }) => {
    const external: string[] = [];
    const origin = new URL(process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3001").origin;
    page.on("request", (request) => { const url = new URL(request.url()); if (url.protocol.startsWith("http") && url.origin !== origin) external.push(request.url()); });
    await page.goto("/");
    await expect(intro(page)).toBeVisible();
    await expect(intro(page)).toHaveCount(0, { timeout: 7000 });
    expect(external).toEqual([]);
  });
});

test.describe("V19 intro: composition", () => {
  const VIEWPORTS: [number, number][] = [[320, 568], [360, 740], [375, 812], [390, 844], [430, 932], [768, 1024], [1024, 768], [1280, 720], [1440, 900]];
  for (const [width, height] of VIEWPORTS) {
    test(`${width}x${height}: motifs never overlap each other or the greeting, nothing overflows, SVGs keep their aspect ratio`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.addInitScript(() => {
        type Box = { left: number; right: number; top: number; bottom: number };
        const probe = { text: null as Box | null, motifs: [] as Box[], squares: true, overflow: false, device: "", count: 0 };
        (window as unknown as { __probe: typeof probe }).__probe = probe;
        const grow = (el: Element | null) => {
          if (!el || !el.textContent) return;
          const range = document.createRange();
          range.selectNodeContents(el);
          const r = range.getBoundingClientRect();
          if (!r.width) return;
          const t = probe.text;
          probe.text = t ? { left: Math.min(t.left, r.left), right: Math.max(t.right, r.right), top: Math.min(t.top, r.top), bottom: Math.max(t.bottom, r.bottom) } : { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
        };
        const tick = () => {
          const dlg = document.querySelector("dialog[open]");
          if (dlg) {
            probe.device = dlg.getAttribute("data-device") ?? "";
            grow(dlg.querySelector('[data-testid="intro-greeting"]'));
            grow(dlg.querySelector('[class*="logoFallback"]'));
            grow(dlg.querySelector('[data-testid="intro-tagline"]'));
            if (!probe.motifs.length) {
              const items = [...dlg.querySelectorAll("[data-motif]")];
              probe.motifs = items.map((el) => { const r = el.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom }; });
              probe.count = items.length;
              probe.squares = items.every((el) => { const svg = el.querySelector("svg")!.getBoundingClientRect(); return Math.abs(svg.width - svg.height) < 0.5; });
            }
            if (document.documentElement.scrollWidth > document.documentElement.clientWidth) probe.overflow = true;
          }
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
      await page.goto("/");
      await expect(intro(page)).toBeVisible();
      await expect(intro(page)).toHaveAttribute("data-ended", "true", { timeout: 6000 });
      await page.waitForTimeout(150);
      const probe = await page.evaluate(() => (window as unknown as { __probe: { text: Record<string, number>; motifs: Record<string, number>[]; squares: boolean; overflow: boolean; device: string; count: number } }).__probe);
      expect(probe.device).toBe(width <= 639 ? "mobile" : width <= 1023 ? "tablet" : "desktop");
      expect(probe.count).toBeGreaterThan(0);
      expect(probe.count).toBeLessThanOrEqual(probe.device === "mobile" ? 16 : probe.device === "tablet" ? 21 : 28);
      expect(probe.squares).toBe(true);
      expect(probe.overflow).toBe(false);
      const hit = (a: Record<string, number>, b: Record<string, number>, pad = 0) => a.left - pad < b.right && a.right + pad > b.left && a.top - pad < b.bottom && a.bottom + pad > b.top;
      probe.motifs.forEach((m, i) => {
        expect(hit(m, probe.text, 2), `motif ${i} vs greeting/reveal/tagline`).toBe(false); // 2px float envelope
        expect(m.left).toBeGreaterThanOrEqual(0);
        expect(m.right).toBeLessThanOrEqual(width);
        for (let j = i + 1; j < probe.motifs.length; j++) expect(hit(m, probe.motifs[j], 2), `motif ${i}/${j}`).toBe(false);
      });
    });
  }
});