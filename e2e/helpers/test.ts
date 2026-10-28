import { test as base, expect } from "@playwright/test";

/**
 * Regular specs mark the first-visit intro as already seen for this device, so the
 * modal never intercepts focus or clicks. The dedicated intro spec uses the
 * plain Playwright `test` and exercises the real intro.
 */
export const test = base.extend({
  context: async ({ context }, provide) => {
    await context.addInitScript(() => {
      try { window.localStorage.setItem("fairswap.intro.neighbourhood.v1.seen", "1"); } catch { /* storage unavailable */ }
    });
    await provide(context);
  },
});
export { expect };