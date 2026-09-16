import { describe, it, expect } from "vitest";
import { sanitizeRedirectPath } from "@/lib/security/redirect";

describe("sanitizeRedirectPath", () => {
  it("allows safe internal paths", () => {
    expect(sanitizeRedirectPath("/account")).toBe("/account");
    expect(sanitizeRedirectPath("/admin/moderation")).toBe("/admin/moderation");
    expect(sanitizeRedirectPath("/listings/bike-123")).toBe("/listings/bike-123");
    expect(sanitizeRedirectPath("/account/support?status=open#thread")).toBe(
      "/account/support?status=open#thread"
    );
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
