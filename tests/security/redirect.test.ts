import { describe, it, expect } from "vitest";
import { sanitizeRedirectPath } from "@/lib/security/redirect";

describe("sanitizeRedirectPath", () => {
  it("allows safe internal paths", () => {
    expect(sanitizeRedirectPath("/account")).toBe("/account");
    expect(sanitizeRedirectPath("/admin/moderation")).toBe("/account");
    expect(sanitizeRedirectPath("/listings/bike-123")).toBe("/listings/bike-123");
    expect(sanitizeRedirectPath("/account/support?status=open#thread")).toBe(
      "/account/support?status=open#thread"
    );
  });

  it("does not navigate authentication or compliance actions into the retired Web Admin", () => {
    expect(sanitizeRedirectPath("/admin")).toBe("/account");
    expect(sanitizeRedirectPath("/admin/users?status=active", "/fallback")).toBe(
      "/fallback"
    );
    expect(sanitizeRedirectPath("/administrator")).toBe("/administrator");
  });

  it("uses custom fallback when provided", () => {
    expect(sanitizeRedirectPath(null, "/fallback")).toBe("/fallback");
    expect(sanitizeRedirectPath("", "/fallback")).toBe("/fallback");
    expect(sanitizeRedirectPath("   ", "/fallback")).toBe("/fallback");
    expect(sanitizeRedirectPath("invalid", "/custom")).toBe("/custom");
  });

  it("rejects absolute external URLs", () => {
    expect(sanitizeRedirectPath("https://evil.com")).toBe("/account");
    expect(sanitizeRedirectPath("http://evil.com")).toBe("/account");
    expect(sanitizeRedirectPath("ftp://evil.com")).toBe("/account");
    expect(sanitizeRedirectPath("//evil.com")).toBe("/account");
    expect(sanitizeRedirectPath("///evil.com")).toBe("/account");
  });

  it("rejects backslash-based normalization bypasses", () => {
    expect(sanitizeRedirectPath("/\\evil.com")).toBe("/account");
    expect(sanitizeRedirectPath("/\\\\evil.com")).toBe("/account");
    expect(sanitizeRedirectPath("\\\\evil.com")).toBe("/account");
    expect(sanitizeRedirectPath("/account\\evil.com")).toBe("/account");
    expect(sanitizeRedirectPath("/account/..\\evil.com")).toBe("/account");
  });

  it("rejects URL-encoded bypasses", () => {
    expect(sanitizeRedirectPath("/%5Cevil.com")).toBe("/account");
    expect(sanitizeRedirectPath("/%2F%2Fevil.com")).toBe("/account");
    expect(sanitizeRedirectPath("/%2Fevil.com")).toBe("/account");
  });

  it("rejects script and data schemes", () => {
    expect(sanitizeRedirectPath("javascript:alert(1)")).toBe("/account");
    expect(sanitizeRedirectPath("data:text/html,<script>alert(1)</script>")).toBe("/account");
    expect(sanitizeRedirectPath("vbscript:msgbox(1)")).toBe("/account");
  });

  it("rejects CRLF and header injection attempts", () => {
    expect(sanitizeRedirectPath("/account\r\nSet-Cookie:evil=1")).toBe("/account");
    expect(sanitizeRedirectPath("/account\nLocation:evil.com")).toBe("/account");
    expect(sanitizeRedirectPath("/account\0evil")).toBe("/account");
  });
});

describe("A0 safe nested Post Ad returns", () => {
  it.each(["macro=goods", "macro=vehicles", "macro=property", "macro=goods&macro=goods", "macro=goods&macro=vehicles"])(
    "preserves %s without collapsing repeated macro keys", (query) => {
      const next = sanitizeRedirectPath(`/account/listings/new?${query}`);
      const signInQuery = new URLSearchParams({ next });
      const decodedNext = new URL(`/auth/sign-in?${signInQuery}`, "https://fairswap.example").searchParams.get("next");
      expect(decodedNext).toBe(`/account/listings/new?${query}`);
      expect(sanitizeRedirectPath(decodedNext)).toBe(next);
    }
  );

  it.each(["https://evil.example", "//evil.example", "/%2Fevil.example", "/%5Cevil.example", "/account%0D%0ALocation:evil", "/account%00", "/account%09"])(
    "still rejects unsafe nested return %j", (value) => {
      const encoded = new URLSearchParams({ next: value });
      expect(sanitizeRedirectPath(encoded.get("next"))).toBe("/account");
    }
  );
});
