import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/monitoring/resend/route";
import { logger } from "@/lib/logger";

const RAW_SECRET = Buffer.from("0123456789abcdef0123456789abcdef", "utf8");
const WEBHOOK_SECRET = `whsec_${RAW_SECRET.toString("base64")}`;

function signedRequest(
  event: Record<string, unknown>,
  options?: {
    timestamp?: number;
    messageId?: string;
    signatureOverride?: string;
  }
) {
  const rawBody = JSON.stringify(event);
  const timestamp = options?.timestamp ?? Math.floor(Date.now() / 1000);
  const messageId = options?.messageId ?? "msg_fairswap_test_123456";
  const digest = createHmac("sha256", RAW_SECRET)
    .update(`${messageId}.${timestamp}.${rawBody}`, "utf8")
    .digest("base64");

  return new NextRequest("https://staging.example.test/api/monitoring/resend", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "svix-id": messageId,
      "svix-timestamp": String(timestamp),
      "svix-signature": options?.signatureOverride ?? `v1,${digest}`,
    },
    body: rawBody,
  });
}

function baseEvent(type: string) {
  return {
    type,
    created_at: "2026-09-19T12:34:56.000Z",
    data: {
      email_id: "email_provider_123",
      from: "FairSwap <no-reply@auth.fairswap.in>",
      to: ["private-user@example.com"],
      subject: "Reset your FairSwap Password",
      bounce: {
        type: "Permanent",
        subType: "General",
        message: "Private provider error text that must not reach the alert sink",
      },
    },
  };
}

describe("Resend monitoring webhook", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubEnv("RESEND_WEBHOOK_SECRET", WEBHOOK_SECRET);
    vi.stubEnv("OPERATIONS_ALERT_WEBHOOK_URL", "https://alerts.example.test/fairswap");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects an invalid signature before parsing/processing the event", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const response = await POST(
      signedRequest(baseEvent("email.bounced"), {
        signatureOverride: "v1,AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
      })
    );

    expect(response.status).toBe(401);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("rejects replayed/stale signed requests", async () => {
    const oldTimestamp = Math.floor(Date.now() / 1000) - 601;

    const response = await POST(
      signedRequest(baseEvent("email.bounced"), {
        timestamp: oldTimestamp,
      })
    );

    expect(response.status).toBe(401);
  });

  it("accepts non-actionable provider events without paging the operator", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const response = await POST(signedRequest(baseEvent("email.delivered")));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ received: true, actionable: false });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("sends a sanitized operational alert for a signed bounce event", async () => {
    const errorSpy = vi.spyOn(logger, "error");
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("ok", { status: 200 }));

    const response = await POST(signedRequest(baseEvent("email.bounced")));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ received: true, actionable: true, alerted: true });
    expect(errorSpy).toHaveBeenCalledWith(
      "email.delivery_issue",
      undefined,
      expect.objectContaining({
        details: expect.objectContaining({
          provider: "resend",
          event_type: "email.bounced",
          email_id: "email_provider_123",
        }),
      })
    );

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [, init] = fetchSpy.mock.calls[0];
    const alertBody = String(init?.body);

    expect(alertBody).toContain("email.bounced");
    expect(alertBody).toContain("email_provider_123");
    expect(alertBody).not.toContain("private-user@example.com");
    expect(alertBody).not.toContain("Reset your FairSwap Password");
    expect(alertBody).not.toContain("Private provider error text");
  });

  it("returns 503 for actionable events when the alert sink is not configured", async () => {
    vi.stubEnv("OPERATIONS_ALERT_WEBHOOK_URL", "");

    const response = await POST(signedRequest(baseEvent("email.failed")));
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toEqual({ received: true, actionable: true, alerted: false });
  });

  it("returns 503 when the external alert sink rejects the alert so Resend can retry", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("temporary failure", { status: 500 })
    );

    const response = await POST(signedRequest(baseEvent("email.complained")));

    expect(response.status).toBe(503);
  });

  it("rejects oversized payloads before signature processing", async () => {
    const payload = "A".repeat(70 * 1024);
    const response = await POST(
      new NextRequest("https://staging.example.test/api/monitoring/resend", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "content-length": String(Buffer.byteLength(payload)),
        },
        body: payload,
      })
    );

    expect(response.status).toBe(413);
  });
});
