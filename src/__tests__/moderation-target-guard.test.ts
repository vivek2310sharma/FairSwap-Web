import { describe, it, expect } from "vitest";

function validateTestTargetConfig(env: Record<string, string | undefined>): {
  isOptedIn: boolean;
  runId: string;
  host: string;
  port: number;
  db: string;
} {
  const isOptedIn = env.MOD03A_RUN_LOCAL_DB_TESTS === "true";
  if (!isOptedIn) {
    return {
      isOptedIn: false,
      runId: "",
      host: "127.0.0.1",
      port: 5433,
      db: "postgres",
    };
  }

  const rawRunId = env.MOD03A_TASK_RUN_ID;
  const rawHost = env.MOD03A_DB_HOST;
  const rawPort = env.MOD03A_DB_PORT;
  const rawDb = env.MOD03A_DB_NAME || "postgres";

  if (!rawRunId || rawRunId.trim().length === 0) {
    throw new Error("ABORT: MOD03A_TASK_RUN_ID must be explicitly set and non-empty when MOD03A_RUN_LOCAL_DB_TESTS=true.");
  }
  if (!rawHost || rawHost.trim().length === 0) {
    throw new Error("ABORT: MOD03A_DB_HOST must be explicitly specified when MOD03A_RUN_LOCAL_DB_TESTS=true.");
  }
  if (!rawPort || isNaN(parseInt(rawPort, 10))) {
    throw new Error("ABORT: MOD03A_DB_PORT must be an explicitly specified integer when MOD03A_RUN_LOCAL_DB_TESTS=true.");
  }
  if (!["127.0.0.1", "localhost", "::1"].includes(rawHost)) {
    throw new Error(`ABORT: Database host "${rawHost}" is not on the loopback allowlist.`);
  }

  return {
    isOptedIn: true,
    runId: rawRunId,
    host: rawHost,
    port: parseInt(rawPort, 10),
    db: rawDb,
  };
}

describe("MOD-03A Test Target Guard & Safety Verification", () => {
  it("allows disabled mode with zero connection configuration", () => {
    const res = validateTestTargetConfig({});
    expect(res.isOptedIn).toBe(false);
  });

  it("rejects opted-in run when MOD03A_TASK_RUN_ID is missing or empty", () => {
    expect(() =>
      validateTestTargetConfig({
        MOD03A_RUN_LOCAL_DB_TESTS: "true",
        MOD03A_TASK_RUN_ID: "",
        MOD03A_DB_HOST: "127.0.0.1",
        MOD03A_DB_PORT: "5433",
      })
    ).toThrow("MOD03A_TASK_RUN_ID must be explicitly set and non-empty");

    expect(() =>
      validateTestTargetConfig({
        MOD03A_RUN_LOCAL_DB_TESTS: "true",
        MOD03A_DB_HOST: "127.0.0.1",
        MOD03A_DB_PORT: "5433",
      })
    ).toThrow("MOD03A_TASK_RUN_ID must be explicitly set and non-empty");
  });

  it("rejects opted-in run when MOD03A_DB_HOST is missing or invalid", () => {
    expect(() =>
      validateTestTargetConfig({
        MOD03A_RUN_LOCAL_DB_TESTS: "true",
        MOD03A_TASK_RUN_ID: "mod03a_run_123",
        MOD03A_DB_HOST: "",
        MOD03A_DB_PORT: "5433",
      })
    ).toThrow("MOD03A_DB_HOST must be explicitly specified");

    expect(() =>
      validateTestTargetConfig({
        MOD03A_RUN_LOCAL_DB_TESTS: "true",
        MOD03A_TASK_RUN_ID: "mod03a_run_123",
        MOD03A_DB_HOST: "db.staging.example.com",
        MOD03A_DB_PORT: "5433",
      })
    ).toThrow("not on the loopback allowlist");
  });

  it("rejects opted-in run when MOD03A_DB_PORT is missing or non-integer", () => {
    expect(() =>
      validateTestTargetConfig({
        MOD03A_RUN_LOCAL_DB_TESTS: "true",
        MOD03A_TASK_RUN_ID: "mod03a_run_123",
        MOD03A_DB_HOST: "127.0.0.1",
        MOD03A_DB_PORT: "abc",
      })
    ).toThrow("MOD03A_DB_PORT must be an explicitly specified integer");
  });

  it("accepts valid explicitly configured target and run identity", () => {
    const res = validateTestTargetConfig({
      MOD03A_RUN_LOCAL_DB_TESTS: "true",
      MOD03A_TASK_RUN_ID: "mod03a_task_run_valid",
      MOD03A_DB_HOST: "127.0.0.1",
      MOD03A_DB_PORT: "5433",
      MOD03A_DB_NAME: "postgres",
    });
    expect(res.isOptedIn).toBe(true);
    expect(res.runId).toBe("mod03a_task_run_valid");
    expect(res.host).toBe("127.0.0.1");
    expect(res.port).toBe(5433);
    expect(res.db).toBe("postgres");
  });
});
