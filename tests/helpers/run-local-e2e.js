import { execSync, spawnSync } from "node:child_process";

// 1. Query Supabase status JSON in memory
let status;
try {
  const output = execSync("corepack pnpm exec supabase status -o json", {
    encoding: "utf-8",
    stdio: ["pipe", "pipe", "pipe"],
  });
  // Find JSON block in output (supabase status may include warning headers)
  const jsonStart = output.indexOf("{");
  const jsonEnd = output.lastIndexOf("}");
  if (jsonStart === -1 || jsonEnd === -1) {
    throw new Error("No JSON found in supabase status output");
  }
  status = JSON.parse(output.slice(jsonStart, jsonEnd + 1));
} catch (err) {
  console.error("Failed to retrieve local Supabase status:", err.message);
  process.exit(1);
}

// 2. Build local test environment without printing secrets
const env = {
  ...process.env,
  NEXT_PUBLIC_SUPABASE_URL: status.API_URL || "http://127.0.0.1:54321",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: status.ANON_KEY,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: status.PUBLISHABLE_KEY || status.ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: status.SERVICE_ROLE_KEY,
  SUPABASE_SECRET_KEY: status.SERVICE_ROLE_KEY,
  MAILPIT_URL: status.MAILPIT_URL || "http://127.0.0.1:54324",
  PLAYWRIGHT_TEST_BASE_URL: "http://localhost:3001",
  NEXT_PUBLIC_APP_URL: "http://localhost:3001",
  NEXT_PUBLIC_SITE_URL: "http://localhost:3001",
  ALLOW_LOCAL_TEST_MUTATIONS: "true",
};

// 3. Forward suite arguments to Playwright
const args = process.argv.slice(2);
const result = spawnSync(
  "corepack",
  ["pnpm", "exec", "playwright", "test", ...args, "--project=desktop-chromium", "--workers=1"],
  {
    stdio: "inherit",
    env,
    shell: true,
  }
);

process.exit(result.status ?? 1);
