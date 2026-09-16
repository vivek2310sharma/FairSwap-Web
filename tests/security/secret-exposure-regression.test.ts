import { describe, it, expect } from "vitest";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

describe("Point 16 Secret-Exposure Regression & Hygiene Gates", () => {
  const rootDir = process.cwd();

  it("ensures .env.local and artifacts/ are strictly ignored by Git", () => {
    const gitignoreContent = fs.readFileSync(path.join(rootDir, ".gitignore"), "utf8");
    expect(gitignoreContent).toMatch(/\.env\*/);
    expect(gitignoreContent).toMatch(/\/artifacts\//);

    // Verify git ls-files does not track .env.local or artifacts/ files
    const trackedFiles = execSync("git ls-files", { encoding: "utf8" });
    expect(trackedFiles).not.toMatch(/\.env\.local/);
    expect(trackedFiles).not.toMatch(/^artifacts\//m);
  });

  it("verifies recovery scripts and operations docs do not contain hard-coded Supabase service-role JWTs", () => {
    const directoriesToScan = ["scripts", "docs/operations"];
    const jwtRegex = /eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+/g;

    for (const dir of directoriesToScan) {
      const fullDir = path.join(rootDir, dir);
      if (!fs.existsSync(fullDir)) continue;

      const files = fs.readdirSync(fullDir, { recursive: true }) as string[];
      for (const file of files) {
        const fullPath = path.join(fullDir, file);
        if (fs.statSync(fullPath).isDirectory()) continue;
        if (!file.endsWith(".ts") && !file.endsWith(".js") && !file.endsWith(".md") && !file.endsWith(".json")) continue;

        const content = fs.readFileSync(fullPath, "utf8");
        const matches = content.match(jwtRegex) || [];

        for (const token of matches) {
          try {
            const parts = token.split(".");
            const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf8"));
            if (payload.role === "service_role" && payload.ref) {
              throw new Error(`Hardcoded privileged service_role JWT found in ${fullPath}!`);
            }
          } catch (e: unknown) {
            if (e instanceof Error && e.message.includes("Hardcoded privileged service_role JWT")) {
              throw e;
            }
            // Not a valid JSON payload token, ignore
          }
        }
      }
    }
  });

  it("verifies no literal sb_secret_ API keys are hard-coded in scripts or docs", () => {
    const directoriesToScan = ["scripts", "docs/operations"];
    // Match literal sb_secret_ keys with at least 25 characters
    const secretKeyRegex = /sb_secret_[A-Za-z0-9_-]{25,}/g;

    for (const dir of directoriesToScan) {
      const fullDir = path.join(rootDir, dir);
      if (!fs.existsSync(fullDir)) continue;

      const files = fs.readdirSync(fullDir, { recursive: true }) as string[];
      for (const file of files) {
        const fullPath = path.join(fullDir, file);
        if (fs.statSync(fullPath).isDirectory()) continue;

        const content = fs.readFileSync(fullPath, "utf8");
        const matches = content.match(secretKeyRegex) || [];
        expect(matches).toEqual([]);
      }
    }
  });

  it("verifies no literal Vercel automation bypass secrets are hardcoded in test scripts or docs", () => {
    const directoriesToScan = ["scripts", "docs/operations"];
    // Ensure header setting uses process.env.VERCEL_AUTOMATION_BYPASS_SECRET rather than string literals
    for (const dir of directoriesToScan) {
      const fullDir = path.join(rootDir, dir);
      if (!fs.existsSync(fullDir)) continue;

      const files = fs.readdirSync(fullDir, { recursive: true }) as string[];
      for (const file of files) {
        const fullPath = path.join(fullDir, file);
        if (fs.statSync(fullPath).isDirectory()) continue;
        if (!file.endsWith(".ts") && !file.endsWith(".js") && !file.endsWith(".md")) continue;

        const content = fs.readFileSync(fullPath, "utf8");
        expect(content).not.toMatch(/x-vercel-protection-bypass:\s*["'][a-zA-Z0-9_-]{16,}["']/i);
      }
    }
  });
});
