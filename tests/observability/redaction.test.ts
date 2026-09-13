import { describe, it, expect } from "vitest";
import { redact, isSensitiveKey, sanitizeString } from "@/lib/logger/redactor";

describe("FairSwap Centralized Redactor & Sanitizer", () => {
  it("detects sensitive key variants case-insensitively", () => {
    expect(isSensitiveKey("password")).toBe(true);
    expect(isSensitiveKey("NewPassword")).toBe(true);
    expect(isSensitiveKey("token_hash")).toBe(true);
    expect(isSensitiveKey("SERVICE_ROLE_KEY")).toBe(true);
    expect(isSensitiveKey("totpSecret")).toBe(true);
    expect(isSensitiveKey("Authorization")).toBe(true);
    expect(isSensitiveKey("set-cookie")).toBe(true);
    expect(isSensitiveKey("apiKey")).toBe(true);
    expect(isSensitiveKey("upi_id")).toBe(true);

    // Non-sensitive keys
    expect(isSensitiveKey("displayName")).toBe(false);
    expect(isSensitiveKey("city")).toBe(false);
    expect(isSensitiveKey("created_at")).toBe(false);
  });

  it("redacts sensitive fields in nested objects and arrays", () => {
    const rawPayload = {
      user: {
        id: "00000000-0000-0000-0000-000000000001",
        email: "user@example.com",
        password: "SuperSecretPassword123!",
        meta: {
          token_hash: "pkce_hash_abc_xyz",
          totpCode: "123456",
        },
      },
      tokens: ["normal_tag", "secret_token_val"],
      headers: {
        authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSJ9.signature",
        cookie: "sb-auth-token=token_value_here",
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sanitized: any = redact(rawPayload);

    expect(sanitized.user.password).toBe("[REDACTED]");
    expect(sanitized.user.meta.token_hash).toBe("[REDACTED]");
    expect(sanitized.user.meta.totpCode).toBe("[REDACTED]");
    expect(sanitized.headers.authorization).toBe("[REDACTED]");
    expect(sanitized.headers.cookie).toBe("[REDACTED]");
    expect(sanitized.user.id).toBe("00000000-0000-0000-0000-000000000001");
  });

  it("redacts JWT patterns and Bearer tokens embedded in free-text strings", () => {
    const jwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4ifQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
    const textWithJwt = `Failed connecting with header Authorization: Bearer ${jwt} during processing`;

    const cleaned = sanitizeString(textWithJwt);
    expect(cleaned).not.toContain(jwt);
    expect(cleaned).toContain("[REDACTED_BEARER]");
  });

  it("safely handles cyclic references without crashing or stack overflowing", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cyclicObj: any = { name: "Root" };
    cyclicObj.self = cyclicObj;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = redact(cyclicObj);
    expect(result.name).toBe("Root");
    expect(result.self).toBe("[CIRCULAR]");
  });

  it("safely handles BigInt and Error instances", () => {
    const err = new Error("Custom system crash");
    const payload = {
      bigValue: BigInt("9007199254740991"),
      systemError: err,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = redact(payload);
    expect(result.bigValue).toBe("9007199254740991n");
    expect(result.systemError.name).toBe("Error");
    expect(result.systemError.message).toBe("Custom system crash");
  });

  it("truncates oversized arrays and strings gracefully", () => {
    const hugeString = "a".repeat(1500);
    const hugeArray = Array.from({ length: 40 }, (_, i) => i);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = redact({ hugeString, hugeArray });
    expect(result.hugeString).toContain("[TRUNCATED 500 chars]");
    expect(result.hugeArray.length).toBe(26); // 25 items + 1 truncation notification
    expect(result.hugeArray[25]).toContain("15 items truncated");
  });
});
