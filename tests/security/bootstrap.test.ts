import { describe, it, expect } from "vitest";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";

const execFileAsync = promisify(execFile);
const SCRIPT_PATH = path.resolve(__dirname, "../../scripts/bootstrap-admin.ts");

describe("Local Administrator Bootstrap Guardrails", () => {
  it("rejects execution when --email argument is missing", async () => {
    try {
      await execFileAsync("node", ["--import", "tsx", SCRIPT_PATH], {
        env: {
          ...process.env,
          NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
          SUPABASE_SERVICE_ROLE_KEY: "dummy-key",
        },
      });
      expect.unreachable("Script should have exited with error");
    } catch (err: unknown) {
      const error = err as { code: number; stderr: string };
      expect(error.code).toBe(1);
      expect(error.stderr).toContain("Error: --email=<email> argument is required");
    }
  });

  it("refuses execution when target URL is non-local (production safeguard)", async () => {
    try {
      await execFileAsync("node", ["--import", "tsx", SCRIPT_PATH, "--email=admin@fairswap.local"], {
        env: {
          ...process.env,
          NEXT_PUBLIC_SUPABASE_URL: "https://my-production-ref.supabase.co",
          SUPABASE_SERVICE_ROLE_KEY: "dummy-key",
        },
      });
      expect.unreachable("Script should have rejected remote URL");
    } catch (err: unknown) {
      const error = err as { code: number; stderr: string };
      expect(error.code).toBe(1);
      expect(error.stderr).toContain("Refusing execution: Target URL");
      expect(error.stderr).toContain("is not a confirmed local project");
    }
  });

  it("rejects execution when service key is missing", async () => {
    try {
      await execFileAsync("node", ["--import", "tsx", SCRIPT_PATH, "--email=admin@fairswap.local"], {
        env: {
          ...process.env,
          NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
          SUPABASE_SECRET_KEY: "",
          SUPABASE_SERVICE_ROLE_KEY: "",
        },
      });
      expect.unreachable("Script should have rejected missing service key");
    } catch (err: unknown) {
      const error = err as { code: number; stderr: string };
      expect(error.code).toBe(1);
      expect(error.stderr).toContain("Error: SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY environment variable is required");
    }
  });
});
