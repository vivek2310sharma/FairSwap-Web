import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
// Requires a running FairSwap-Web build against a Test/local Supabase with the wearables foundation + activation applied
// and POST_AD_WEARABLES_V1_ENABLED=true. The spec only fakes the browser-visible /api/** calls.
export default defineConfig({ testDir: ".", testMatch: ["wearables-v1.spec.ts"], workers: 1, retries: 0, reporter: "list", outputDir: join(tmpdir(), "fairswap-wearables-v1-results"), use: { baseURL: "http://127.0.0.1:4318", headless: true, launchOptions: existsSync(chrome) ? { executablePath: chrome } : undefined } });
