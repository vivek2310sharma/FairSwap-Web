import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e-isolated", testMatch: "chat-v2.spec.ts", fullyParallel: false, workers: 1,
  reporter: [["list"]], outputDir: "test-results/chat-v2",
  use: { baseURL: "http://127.0.0.1:35430", trace: "retain-on-failure" },
  projects: [
    { name: "chat-desktop", use: { browserName: "chromium", viewport: { width: 1280, height: 800 } } },
    { name: "chat-mobile", use: { browserName: "chromium", viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true } },
  ],
  webServer: { command: "node tests/chat-v2/run-fixture.mjs", url: "http://127.0.0.1:35430/auth/sign-in", reuseExistingServer: false, timeout: 60000 },
});
