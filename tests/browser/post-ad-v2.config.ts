import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
export default defineConfig({ testDir: ".", testMatch: ["post-ad-v2.spec.ts","accessories-v1.spec.ts"], workers: 1, retries: 0, reporter: "list", outputDir: join(tmpdir(), "fairswap-post-ad-v2-results"), use: { baseURL: "http://127.0.0.1:4318", headless: true, launchOptions: existsSync(chrome) ? { executablePath: chrome } : undefined } });
