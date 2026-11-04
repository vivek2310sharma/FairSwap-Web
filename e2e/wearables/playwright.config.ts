import { defineConfig } from "@playwright/test";

/**
 * Standalone config for the hosted-Test Wearables journey. The repository's playwright.config.ts is untouched:
 * it starts a local `next start`, whereas this run targets the already-deployed runner-commit Preview deployment.
 * Run: pnpm exec playwright test -c e2e/wearables/playwright.config.ts
 */
const dir = process.env.E2E_EVIDENCE_DIR ?? "";
export default defineConfig({
  testDir: ".",
  testMatch: /.*\.journey\.ts$/,
  fullyParallel: false,
  workers: 1,
  retries: 0, // a flaky pass must never become evidence
  forbidOnly: true,
  timeout: 120_000,
  reporter: [["list"], ["json", { outputFile: dir ? `${dir}/results.json` : "wearables-results.json" }]],
});
