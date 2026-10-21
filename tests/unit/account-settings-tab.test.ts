import { describe, it, expect } from "vitest";
import { parseTab } from "@/app/account/settings/page";

describe("parseTab utility for Settings Hub", () => {
  it("defaults missing query parameters to 'profile'", () => {
    expect(parseTab(undefined)).toBe("profile");
    expect(parseTab("")).toBe("profile");
  });

  it("parses valid single tab parameters", () => {
    expect(parseTab("profile")).toBe("profile");
    expect(parseTab("security")).toBe("security");
    expect(parseTab("privacy")).toBe("privacy");
    expect(parseTab("SECURITY")).toBe("security");
    expect(parseTab(" Privacy ")).toBe("privacy");
  });

  it("safely falls back to 'profile' for invalid or unexpected tab values", () => {
    expect(parseTab("invalid_tab")).toBe("profile");
    expect(parseTab("admin")).toBe("profile");
    expect(parseTab("<script>")).toBe("profile");
  });

  it("handles array/repeated query parameters by picking the first value", () => {
    expect(parseTab(["security", "privacy"])).toBe("security");
    expect(parseTab(["privacy", "profile"])).toBe("privacy");
    expect(parseTab(["unknown", "security"])).toBe("profile");
  });
});
