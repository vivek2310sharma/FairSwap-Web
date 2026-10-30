import { test as base, expect } from "@playwright/test";

/**
 * Regular specs mark the intro as already seen for each tab session, so the
 * modal never intercepts focus or clicks. The dedicated intro spec uses the
 * plain Playwright `test` and exercises the real intro.
 */
export const test = base.extend({
  context: async ({ context }, provide) => {
    // The V19 policy stores "seen" as the tab's own id in sessionStorage; seed a matching pair for every document.
    await context.addInitScript(() => {
      try {
        const tab = window.sessionStorage.getItem("fairswap.intro.v19.tab") ?? `e2e-${Math.random().toString(36).slice(2)}`;
        window.sessionStorage.setItem("fairswap.intro.v19.tab", tab);
        window.sessionStorage.setItem("fairswap.intro.v19.seen", tab);
      } catch { /* storage unavailable */ }
    });
    await provide(context);
  },
});
export { expect };