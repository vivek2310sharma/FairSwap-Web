import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { extractOtpFromEmail } from "../helpers/extract-otp";

const root = process.cwd();
const readTemplate = (name: string) =>
  readFileSync(path.join(root, "supabase", "templates", name), "utf8");
const parse = (html: string) => new DOMParser().parseFromString(html, "text/html");

const signupHtml = readTemplate("confirm_email.html");
const otpHtml = readTemplate("magic_link.html");
const config = readFileSync(path.join(root, "supabase", "config.toml"), "utf8");

describe("Supabase Auth email templates (#126, #111)", () => {
  it("keeps signup email confirmation tied to the existing secure callback", () => {
    const doc = parse(signupHtml);
    const href = doc.getElementById("confirm-email-link")?.getAttribute("href");

    expect(href).toBe(
      "{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=signup&next=/account"
    );
    expect(signupHtml.match(/{{ \.TokenHash }}/g)).toHaveLength(1);
    expect(signupHtml).not.toContain("{{ .Token }}");
  });

  it("renders exactly one Supabase 6-digit OTP placeholder, not a magic login link", () => {
    const doc = parse(otpHtml);
    expect(doc.getElementById("otp-token")?.textContent?.trim()).toBe("{{ .Token }}");
    expect(doc.getElementById("otp-token")?.getAttribute("data-testid")).toBe("otp-token");
    expect(otpHtml.match(/{{ \.Token }}/g)).toHaveLength(1);
    expect(otpHtml).not.toContain("{{ .TokenHash }}");
    expect(doc.querySelector("a[href*='token_hash']")).toBeNull();
  });

  it("remains compatible with the existing Mailpit OTP parser and excludes CSS hex matches", () => {
    const rendered = otpHtml.replace("{{ .Token }}", "849201");
    expect(extractOtpFromEmail({ html: rendered })).toBe("849201");
  });

  it.each([
    ["signup", signupHtml],
    ["one-time code", otpHtml],
  ])("keeps the %s message accessible and email-client friendly", (_name, html) => {
    const doc = parse(html);
    expect(doc.documentElement.lang).toBe("en");
    expect(doc.querySelector('meta[name="viewport"]')).not.toBeNull();
    expect(doc.querySelector('meta[name="x-apple-disable-message-reformatting"]')).not.toBeNull();
    expect(doc.querySelectorAll('table[role="presentation"]').length).toBeGreaterThan(1);
    expect(doc.querySelectorAll("table:not([role='presentation'])").length).toBe(0);
    expect(doc.querySelectorAll("script, form, iframe, img").length).toBe(0);
    expect(html).toContain("10 minutes");
    expect(html).toContain("FairSwap");
    expect(html).toContain("#047857");
  });

  it("keeps OTP expiration, configured length, email copy, and JWT lifetime consistent", () => {
    expect(config).toMatch(/^otp_length = 6$/m);
    expect(config).toMatch(/^otp_expiry = 600$/m);
    expect(config).toMatch(/^jwt_expiry = 3600$/m);
    expect(config).toContain('content_path = "./supabase/templates/confirm_email.html"');
    expect(config).toContain('content_path = "./supabase/templates/magic_link.html"');
    expect(signupHtml).toContain("10 minutes");
    expect(otpHtml).toContain("10 minutes");
    expect(otpHtml).not.toContain("60 minutes");
  });
});
