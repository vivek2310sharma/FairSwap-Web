import { describe, it, expect } from "vitest";
import {
  isValidCorrelationId,
  resolveCorrelationId,
  sanitizeUpstreamRequestId,
  formatUserReference,
} from "@/lib/logger/correlation";
import { proxy } from "@/proxy";
import { NextRequest } from "next/server";

describe("FairSwap Correlation ID Validation & Server-Owned Trust Boundary", () => {
  it("validates well-formed UUIDs and safe alphanumeric patterns", () => {
    const validUuid = "123e4567-e89b-12d3-a456-426614174000";
    const validAlphanumeric = "req_trace_prod_us_east_1_987654321";
    expect(isValidCorrelationId(validUuid)).toBe(true);
    expect(isValidCorrelationId(validAlphanumeric)).toBe(true);

    expect(isValidCorrelationId("short")).toBe(false);
    expect(isValidCorrelationId("a".repeat(128))).toBe(false);
    expect(isValidCorrelationId("<script>")).toBe(false);
  });

  it("replaces syntactically valid attacker-supplied UUID with fresh FairSwap-generated correlation ID", () => {
    const attackerUuid = "123e4567-e89b-12d3-a456-426614174000";

    // Server-owned boundary invariant: ordinary external callers are NOT trusted issuers
    const authoritativeId = resolveCorrelationId(attackerUuid);

    expect(isValidCorrelationId(authoritativeId)).toBe(true);
    expect(authoritativeId).not.toBe(attackerUuid);

    // Upstream ID is preserved separately as untrusted diagnostic metadata
    const upstreamId = sanitizeUpstreamRequestId(attackerUuid);
    expect(upstreamId).toBe(attackerUuid);
  });

  it("ensures repeated caller-supplied IDs do not force multiple requests to share the same authoritative correlation ID", () => {
    const fixedCallerId = "11111111-2222-3333-4444-555555555555";

    const id1 = resolveCorrelationId(fixedCallerId);
    const id2 = resolveCorrelationId(fixedCallerId);
    const id3 = resolveCorrelationId(fixedCallerId);

    expect(id1).not.toBe(fixedCallerId);
    expect(id2).not.toBe(fixedCallerId);
    expect(id3).not.toBe(fixedCallerId);

    // Each request receives its own unique server-generated ID
    expect(id1).not.toBe(id2);
    expect(id2).not.toBe(id3);
    expect(id1).not.toBe(id3);
  });

  it("generates a valid new correlation ID when headers are missing or undefined", () => {
    const idNull = resolveCorrelationId(null);
    const idUndefined = resolveCorrelationId(undefined);
    const idEmpty = resolveCorrelationId("");

    expect(isValidCorrelationId(idNull)).toBe(true);
    expect(isValidCorrelationId(idUndefined)).toBe(true);
    expect(isValidCorrelationId(idEmpty)).toBe(true);

    expect(idNull).not.toBe(idUndefined);
  });

  it("rejects malformed and oversized incoming IDs and generates valid replacements", () => {
    const malformed = [
      "<script>alert(1)</script>",
      "'; DROP TABLE audit_logs; --",
      "short",
      "x".repeat(200),
      "invalid spaces in id",
      "../path/traversal",
    ];

    for (const candidate of malformed) {
      expect(isValidCorrelationId(candidate)).toBe(false);
      expect(sanitizeUpstreamRequestId(candidate)).toBeUndefined();

      const serverId = resolveCorrelationId(candidate);
      expect(isValidCorrelationId(serverId)).toBe(true);
      expect(serverId).not.toBe(candidate);
    }
  });

  it("only adopts upstream ID when explicitly configured as trusted infrastructure", () => {
    const trustedPlatformId = "123e4567-e89b-12d3-a456-426614174000";

    // Without explicit trusted infrastructure flag: replaced
    const untrustedResult = resolveCorrelationId(trustedPlatformId);
    expect(untrustedResult).not.toBe(trustedPlatformId);

    // With explicit trusted infrastructure flag: preserved
    const trustedResult = resolveCorrelationId(trustedPlatformId, { isTrustedInfrastructure: true });
    expect(trustedResult).toBe(trustedPlatformId);
  });

  it("verifies proxy response and downstream propagation use the server-owned ID", async () => {
    const attackerControlledId = "99999999-8888-7777-6666-555555555555";

    const req = new NextRequest("http://localhost:3000/auth/sign-in", {
      headers: {
        "x-request-id": attackerControlledId,
      },
    });

    const res = await proxy(req);

    // The authoritative response header MUST NOT be the attacker's supplied ID
    const responseCorrelationId = res.headers.get("x-request-id");
    expect(responseCorrelationId).toBeDefined();
    expect(responseCorrelationId).not.toBe(attackerControlledId);
    expect(isValidCorrelationId(responseCorrelationId!)).toBe(true);

    // Subsequent request with the same attacker header gets a distinct server ID
    const req2 = new NextRequest("http://localhost:3000/auth/sign-in", {
      headers: {
        "x-request-id": attackerControlledId,
      },
    });
    const res2 = await proxy(req2);
    const responseCorrelationId2 = res2.headers.get("x-request-id");
    expect(responseCorrelationId2).not.toBe(responseCorrelationId);
    expect(responseCorrelationId2).not.toBe(attackerControlledId);
  });

  it("formats user references with ref_ prefix and bounded length", () => {
    const ref = formatUserReference("c7a8b9e0-1234-5678-9abc-def012345678");
    expect(ref).toBe("ref_c7a8b9e0");
    expect(ref.length).toBe(12); // "ref_" (4) + 8 chars
  });
});
