import { describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";
import HelpPage from "@/app/help/page";
import { HELP_CENTRE_URL } from "@/lib/help-centre";

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

describe("Legacy /help migration", () => {
  it("sends old bookmarks straight to the public English Help Centre", () => {
    HelpPage();
    expect(redirect).toHaveBeenCalledWith(HELP_CENTRE_URL);
  });

  it("uses a fixed HTTPS homepage without query parameters or user data", () => {
    const destination = new URL(HELP_CENTRE_URL);
    expect(destination.origin).toBe("https://help.fairswap.in");
    expect(destination.pathname).toBe("/en");
    expect(destination.search).toBe("");
    expect(destination.hash).toBe("");
  });
});
