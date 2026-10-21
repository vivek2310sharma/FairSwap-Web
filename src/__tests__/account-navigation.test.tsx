import { render, screen, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AccountNav } from "@/components/account/AccountNav";
import { HELP_CENTRE_URL } from "@/lib/help-centre";

// Mock next/navigation
const mockUsePathname = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
}));

describe("AccountNav component", () => {
  beforeEach(() => {
    mockUsePathname.mockReset();
  });

  it("renders the account navigation landmark", () => {
    mockUsePathname.mockReturnValue("/account");
    render(<AccountNav />);
    const nav = screen.getByRole("navigation", {
      name: "Account navigation",
    });
    expect(nav).toBeInTheDocument();
  });

  it("renders exactly the six primary navigation items plus Help Centre", () => {
    mockUsePathname.mockReturnValue("/account");
    render(<AccountNav />);

    const expectedLabels = [
      "Overview",
      "My Listings",
      "Favourites",
      "Messages",
      "Notifications",
      "Settings",
    ];

    for (const label of expectedLabels) {
      expect(screen.getByRole("link", { name: new RegExp(label) })).toBeInTheDocument();
    }

    const nav = screen.getByRole("navigation", { name: "Account navigation" });
    const links = within(nav).getAllByRole("link");
    expect(links).toHaveLength(7); // 6 internal destinations + Help Centre
  });

  it("offers public Help Centre link", () => {
    mockUsePathname.mockReturnValue("/account/settings");
    render(<AccountNav />);
    const nav = screen.getByRole("navigation", { name: "Account navigation" });
    const helpLinks = within(nav).getAllByRole("link", { name: "Help Centre" });
    expect(helpLinks).toHaveLength(1);
    expect(helpLinks[0]).toHaveAttribute("href", HELP_CENTRE_URL);
    expect(helpLinks[0]).not.toHaveAttribute("target", "_blank");
  });

  it("does NOT expose policy-review as a navigation item", () => {
    mockUsePathname.mockReturnValue("/account");
    render(<AccountNav />);

    const nav = screen.getByRole("navigation", {
      name: "Account navigation",
    });
    const links = within(nav).getAllByRole("link");
    const hrefs = links.map((link) => link.getAttribute("href"));
    expect(hrefs).not.toContain("/account/policy-review");
  });

  it("links Settings to /account/settings", () => {
    mockUsePathname.mockReturnValue("/account");
    render(<AccountNav />);
    expect(screen.getByRole("link", { name: /Settings/ })).toHaveAttribute(
      "href",
      "/account/settings"
    );
  });

  // --- Active state: exact match for Overview ---

  it("marks Overview as active only on exact /account", () => {
    mockUsePathname.mockReturnValue("/account");
    render(<AccountNav />);
    const overviewLink = screen.getByRole("link", { name: /Overview/ });
    expect(overviewLink).toHaveAttribute("aria-current", "page");
  });

  it("does NOT mark Overview as active on /account/listings", () => {
    mockUsePathname.mockReturnValue("/account/listings");
    render(<AccountNav />);
    const overviewLink = screen.getByRole("link", { name: /Overview/ });
    expect(overviewLink).not.toHaveAttribute("aria-current");
  });

  // --- Active state: Settings ---

  it("marks Settings as active on /account/settings", () => {
    mockUsePathname.mockReturnValue("/account/settings");
    render(<AccountNav />);
    const settingsLink = screen.getByRole("link", { name: /Settings/ });
    expect(settingsLink).toHaveAttribute("aria-current", "page");
  });

  it("marks Settings as active on legacy routes /account/profile, /account/security, and /account/privacy", () => {
    for (const route of ["/account/profile", "/account/security", "/account/privacy"]) {
      mockUsePathname.mockReturnValue(route);
      const { unmount } = render(<AccountNav />);
      const settingsLink = screen.getByRole("link", { name: /Settings/ });
      expect(settingsLink).toHaveAttribute("aria-current", "page");
      unmount();
    }
  });

  // --- Active state: Notifications ---

  it("marks Notifications as active on /account/notifications", () => {
    mockUsePathname.mockReturnValue("/account/notifications");
    render(<AccountNav />);
    const notifLink = screen.getByRole("link", { name: /Notifications/ });
    expect(notifLink).toHaveAttribute("aria-current", "page");
  });

  // --- Accessible semantics ---

  it("uses aria-current='page' for the active item only", () => {
    mockUsePathname.mockReturnValue("/account/settings");
    render(<AccountNav />);

    const nav = screen.getByRole("navigation", {
      name: "Account navigation",
    });
    const links = within(nav).getAllByRole("link");

    const activeLinks = links.filter(
      (link) => link.getAttribute("aria-current") === "page"
    );
    expect(activeLinks).toHaveLength(1);
    expect(activeLinks[0]).toHaveTextContent(/Settings/);
  });
});
