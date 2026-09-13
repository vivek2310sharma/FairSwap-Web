import { describe, it, expect, vi } from "vitest";
import { onRequestError } from "@/instrumentation";
import { logger } from "@/lib/logger";
import { formatUserReference } from "@/lib/logger/correlation";

describe("Next.js 16 Instrumentation / onRequestError", () => {
  it("captures error.digest, request_id, and strips query strings from path", async () => {
    const errorSpy = vi.spyOn(logger, "error");

    const mockError = new Error("Simulated RSC render error") as Error & { digest?: string };
    mockError.digest = "2349018234";

    const mockRequest = {
      path: "/auth/callback?token_hash=sensitive_pkce_hash_12345&type=magiclink",
      method: "GET",
      headers: {
        "x-request-id": "11111111-2222-3333-4444-555555555555",
        "user-agent": "Mozilla/5.0 FairSwapTest",
        "authorization": "Bearer secret_token_should_be_ignored",
        "cookie": "sb-auth-token=super_secret_cookie",
      },
    };

    const mockContext = {
      routerKind: "App Router" as const,
      routePath: "/auth/callback",
      routeType: "render" as const,
      renderSource: "react-server-components" as const,
    };

    await onRequestError(mockError, mockRequest, mockContext);

    expect(errorSpy).toHaveBeenCalled();
    const [event, err, context] = errorSpy.mock.calls[0];

    expect(event).toBe("nextjs.server_error");
    expect(err).toBe(mockError);
    expect(context?.request_id).not.toBe("11111111-2222-3333-4444-555555555555");
    expect(context?.upstream_request_id).toBe("11111111-2222-3333-4444-555555555555");
    expect(context?.error_digest).toBe("2349018234");
    expect(context?.route).toBe("/auth/callback");
    expect(context?.route).not.toContain("token_hash");
    expect(context?.route).not.toContain("sensitive_pkce_hash_12345");

    // Verify user-facing reference correlates to error.digest
    const userFacingReference = formatUserReference(mockError.digest);
    expect(userFacingReference).toBe("ref_23490182");
    expect(mockError.digest.startsWith(userFacingReference.replace("ref_", ""))).toBe(true);

    // Verify raw headers were NOT blindly serialized
    const extra = context?.extra as Record<string, unknown>;
    const headers = extra?.headers as Record<string, string>;
    expect(headers).toBeDefined();
    expect(headers["user-agent"]).toBe("Mozilla/5.0 FairSwapTest");
    expect(headers["authorization"]).toBeUndefined();
    expect(headers["cookie"]).toBeUndefined();
  });

  it("handles errors missing error.digest gracefully", async () => {
    const errorSpy = vi.spyOn(logger, "error");

    const simpleError = new Error("Standard route handler error");

    const mockRequest = {
      path: "/api/test",
      method: "POST",
      headers: {},
    };

    const mockContext = {
      routerKind: "App Router" as const,
      routePath: "/api/test",
      routeType: "route" as const,
    };

    await onRequestError(simpleError, mockRequest, mockContext);

    expect(errorSpy).toHaveBeenCalled();
    const [, , context] = errorSpy.mock.calls[0];
    expect(context?.error_digest).toBeUndefined();
    expect(context?.request_id).toBeDefined(); // generated fallback
    expect(context?.route).toBe("/api/test");
  });
});
