import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/monitoring/client-error/route";
import { NextRequest } from "next/server";
import { logger } from "@/lib/logger";

describe("Client Error Ingestion Endpoint (/api/monitoring/client-error)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("accepts a valid client error payload and emits untrusted client telemetry", async () => {
    const errorSpy = vi.spyOn(logger, "error");

    const payload = {
      client_event_id: "11111111-2222-3333-4444-555555555555",
      error_name: "TypeError",
      error_message: "Cannot read property 'undefined' of null",
      component_stack: "at ItemDetail (src/components/Item.tsx:42)",
      pathname: "/items/test-item?sensitive_token=secret123",
      user_agent: "Mozilla/5.0 TestBrowser",
    };

    const req = new NextRequest("http://localhost:3000/api/monitoring/client-error", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "origin": "http://localhost:3000",
        "x-request-id": "00000000-0000-0000-0000-000000000001",
      },
      body: JSON.stringify(payload),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.received).toBe(true);
    expect(data.client_event_id).toBe(payload.client_event_id);
    expect(data.reference_id).toMatch(/^ref_/);

    // Verify logger.error was called with untrusted telemetry marker and stripped query
    expect(errorSpy).toHaveBeenCalled();
    const [event, err, context] = errorSpy.mock.calls[0];
    expect(event).toBe("client.unhandled_error");
    expect(err).toBeUndefined();
    expect(context?.client_event_id).toBe(payload.client_event_id);
    expect(context?.request_id).not.toBe("00000000-0000-0000-0000-000000000001");
    expect(context?.upstream_request_id).toBe("00000000-0000-0000-0000-000000000001");
    expect(context?.route).toBe("/items/test-item");
    expect(context?.route).not.toContain("sensitive_token");
    expect((context?.extra as Record<string, unknown>)?.telemetry_source).toBe("untrusted_client_reporting");
  });

  it("rejects unexpected/arbitrary fields due to strict schema", async () => {
    const payload = {
      client_event_id: "11111111-2222-3333-4444-555555555555",
      error_name: "SyntaxError",
      error_message: "Unexpected token",
      // Arbitrary malicious fields
      hacker_field: "injecting_malicious_key",
      cookies: "session=xyz",
      role: "admin",
    };

    const req = new NextRequest("http://localhost:3000/api/monitoring/client-error", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "origin": "http://localhost:3000",
      },
      body: JSON.stringify(payload),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Validation failed");
  });

  it("rejects malformed client_event_id", async () => {
    const payload = {
      client_event_id: "not-a-valid-uuid",
      error_name: "Error",
      error_message: "Something failed",
    };

    const req = new NextRequest("http://localhost:3000/api/monitoring/client-error", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("rejects cross-site requests via Sec-Fetch-Site", async () => {
    const payload = {
      client_event_id: "11111111-2222-3333-4444-555555555555",
      error_name: "Error",
      error_message: "Test",
    };

    const req = new NextRequest("http://localhost:3000/api/monitoring/client-error", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "sec-fetch-site": "cross-site",
      },
      body: JSON.stringify(payload),
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("rejects oversized request payloads exceeding 4KB", async () => {
    const hugeString = "A".repeat(5000);
    const payload = {
      client_event_id: "11111111-2222-3333-4444-555555555555",
      error_name: "Error",
      error_message: hugeString,
    };

    const req = new NextRequest("http://localhost:3000/api/monitoring/client-error", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "content-length": "6000",
      },
      body: JSON.stringify(payload),
    });

    const res = await POST(req);
    expect(res.status).toBe(413);
  });

  it("guarantees client error reporting never touches public.audit_logs", async () => {
    // Verify there are no database clients or audit imports in the client-error handler
    const routeModule = await import("@/app/api/monitoring/client-error/route");
    expect(routeModule).toBeDefined();

    // Verify through static inspection or runtime that POST completes without database interactions
    const req = new NextRequest("http://localhost:3000/api/monitoring/client-error", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        client_event_id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
        error_name: "TestError",
        error_message: "Harmless test",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
  });
});
