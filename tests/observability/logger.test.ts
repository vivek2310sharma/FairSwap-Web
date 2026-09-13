import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { logger } from "@/lib/logger";
import { StructuredLogRecord } from "@/lib/logger/types";

describe("FairSwap Structured Operational Logger", () => {
  let stdoutOutput: string[] = [];
  let stderrOutput: string[] = [];

  beforeEach(() => {
    stdoutOutput = [];
    stderrOutput = [];
    vi.spyOn(console, "log").mockImplementation((msg: string) => {
      stdoutOutput.push(msg);
    });
    vi.spyOn(console, "error").mockImplementation((msg: string) => {
      stderrOutput.push(msg);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("emits single-line valid JSON conforming to the schema", () => {
    logger.info("auth.login_attempt", {
      correlation_id: "12345678-1234-1234-1234-123456789abc",
      route: "/auth/sign-in",
      duration_ms: 15.4,
      details: { role: "buyer" },
    });

    expect(stdoutOutput.length).toBe(1);
    const line = stdoutOutput[0].trim();
    expect(() => JSON.parse(line)).not.toThrow();

    const record: StructuredLogRecord = JSON.parse(line);
    expect(record.service).toBe("fairswap-web");
    expect(record.event).toBe("auth.login_attempt");
    expect(record.level).toBe("info");
    expect(record.correlation_id).toBe("12345678-1234-1234-1234-123456789abc");
    expect(record.route).toBe("/auth/sign-in");
    expect(record.duration_ms).toBe(15);
    expect(record.details?.role).toBe("buyer");
    expect(record.timestamp).toBeDefined();
  });

  it("routes error logs to stderr and captures digest and structured error", () => {
    const customError = new Error("Database connection dropped");
    (customError as { digest?: string }).digest = "digest_abc123";

    logger.error("database.query_failed", customError, {
      correlation_id: "err-corr-id",
      route: "/api/test",
    });

    expect(stderrOutput.length).toBe(1);
    const record: StructuredLogRecord = JSON.parse(stderrOutput[0].trim());
    expect(record.level).toBe("error");
    expect(record.event).toBe("database.query_failed");
    expect(record.error?.message).toBe("Database connection dropped");
    expect(record.error_digest).toBe("digest_abc123");
  });

  it("strips raw query strings and tokens from route property", () => {
    logger.info("http.callback_received", {
      route: "/auth/callback?token_hash=sensitive_pkce_token&type=signup&next=/account",
    });

    const record: StructuredLogRecord = JSON.parse(stdoutOutput[0].trim());
    expect(record.route).toBe("/auth/callback");
    expect(stdoutOutput[0]).not.toContain("sensitive_pkce_token");
  });
});
