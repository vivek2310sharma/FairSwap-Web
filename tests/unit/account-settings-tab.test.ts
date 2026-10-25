import { describe, it, expect } from "vitest";
import { resolveSettingsTab } from "@/lib/account/settings-tabs";

describe("resolveSettingsTab legacy Settings tab links", () => {
  it("redirects the old profile tab to My Profile", () => {
    expect(resolveSettingsTab("profile")).toEqual({ kind: "redirect", href: "/account/profile" });
    expect(resolveSettingsTab(" PROFILE ")).toEqual({ kind: "redirect", href: "/account/profile" });
  });

  it("redirects the old privacy tab to Privacy & your data", () => {
    expect(resolveSettingsTab("privacy")).toEqual({ kind: "redirect", href: "/account/privacy" });
    expect(resolveSettingsTab("Privacy")).toEqual({ kind: "redirect", href: "/account/privacy" });
  });

  it("keeps security, missing and unknown tabs on Settings", () => {
    expect(resolveSettingsTab("security")).toEqual({ kind: "settings" });
    expect(resolveSettingsTab(undefined)).toEqual({ kind: "settings" });
    expect(resolveSettingsTab("")).toEqual({ kind: "settings" });
    expect(resolveSettingsTab("https://evil.example")).toEqual({ kind: "settings" });
  });

  it("uses the first value of repeated parameters", () => {
    expect(resolveSettingsTab(["privacy", "profile"])).toEqual({ kind: "redirect", href: "/account/privacy" });
    expect(resolveSettingsTab(["unknown", "profile"])).toEqual({ kind: "settings" });
  });
});
