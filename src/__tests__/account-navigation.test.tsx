import { render, screen, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AccountNav } from "@/components/account/AccountNav";

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

  it("renders all expected navigation sections", () => {
    mockUsePathname.mockReturnValue("/account");
    render(<AccountNav />);

    const expectedLabels = [
      "Overview",
      "My Listings",
      "Favourites",
      "Messages",
      "Notifications",
      "Profile",
      "Security",
      "Privacy",
      "Support",
    ];

    for (const label of expectedLabels) {
      expect(screen.getByRole("link", { name: new RegExp(label) })).toBeInTheDocument();
    }
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

  it("links Overview to /account", () => {
    mockUsePathname.mockReturnValue("/account");
    render(<AccountNav />);
    expect(screen.getByRole("link", { name: /Overview/ })).toHaveAttribute(
      "href",
      "/account"
    );
  });

  it("links My Listings to /account/listings", () => {
    mockUsePathname.mockReturnValue("/account");
    render(<AccountNav />);
    expect(
      screen.getByRole("link", { name: /My Listings/ })
    ).toHaveAttribute("href", "/account/listings");
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

  it("does NOT mark Overview as active on /account/profile", () => {
    mockUsePathname.mockReturnValue("/account/profile");
    render(<AccountNav />);
    const overviewLink = screen.getByRole("link", { name: /Overview/ });
    expect(overviewLink).not.toHaveAttribute("aria-current");
  });

  // --- Active state: Profile ---

  it("marks Profile as active on /account/profile", () => {
    mockUsePathname.mockReturnValue("/account/profile");
    render(<AccountNav />);
    const profileLink = screen.getByRole("link", { name: /Profile/ });
    expect(profileLink).toHaveAttribute("aria-current", "page");
  });

  // --- Active state: Security ---

  it("marks Security as active on /account/security", () => {
    mockUsePathname.mockReturnValue("/account/security");
    render(<AccountNav />);
    const securityLink = screen.getByRole("link", { name: /Security/ });
    expect(securityLink).toHaveAttribute("aria-current", "page");
  });

  // --- Active state: nested listing pages highlight My Listings ---

  it("marks My Listings as active on /account/listings/new", () => {
    mockUsePathname.mockReturnValue("/account/listings/new");
    render(<AccountNav />);
    const listingsLink = screen.getByRole("link", { name: /My Listings/ });
    expect(listingsLink).toHaveAttribute("aria-current", "page");
  });

  it("marks My Listings as active on /account/listings/some-id/edit", () => {
    mockUsePathname.mockReturnValue("/account/listings/some-id/edit");
    render(<AccountNav />);
    const listingsLink = screen.getByRole("link", { name: /My Listings/ });
    expect(listingsLink).toHaveAttribute("aria-current", "page");
  });

  // --- Active state: nested message pages highlight Messages ---

  it("marks Messages as active on /account/messages/some-id", () => {
    mockUsePathname.mockReturnValue("/account/messages/some-id");
    render(<AccountNav />);
    const messagesLink = screen.getByRole("link", { name: /Messages/ });
    expect(messagesLink).toHaveAttribute("aria-current", "page");
  });

  // --- Accessible semantics ---

  it("uses aria-current='page' for the active item only", () => {
    mockUsePathname.mockReturnValue("/account/security");
    render(<AccountNav />);

    const nav = screen.getByRole("navigation", {
      name: "Account navigation",
    });
    const links = within(nav).getAllByRole("link");

    const activeLinks = links.filter(
      (link) => link.getAttribute("aria-current") === "page"
    );
    expect(activeLinks).toHaveLength(1);
    expect(activeLinks[0]).toHaveTextContent(/Security/);
  });

  it("non-active links do not have aria-current", () => {
    mockUsePathname.mockReturnValue("/account/security");
    render(<AccountNav />);

    const overviewLink = screen.getByRole("link", { name: /Overview/ });
    expect(overviewLink).not.toHaveAttribute("aria-current");

    const profileLink = screen.getByRole("link", { name: /Profile/ });
    expect(profileLink).not.toHaveAttribute("aria-current");
  });

  // --- Close Account control (Issue #72) ---

  describe("Close Account control", () => {
    it("renders the close account control linking to '/'", () => {
      mockUsePathname.mockReturnValue("/account");
      render(<AccountNav />);

      const closeControl = screen.getByRole("link", { name: "Close account" });
      expect(closeControl).toBeInTheDocument();
      expect(closeControl).toHaveAttribute("href", "/");
    });

    it("has accessible name and tooltip title", () => {
      mockUsePathname.mockReturnValue("/account");
      render(<AccountNav />);

      const closeControl = screen.getByRole("link", { name: "Close account" });
      expect(closeControl).toHaveAttribute("aria-label", "Close account");
      expect(closeControl).toHaveAttribute("title", "Close account");
    });

    it("sits outside the Account navigation landmark", () => {
      mockUsePathname.mockReturnValue("/account");
      render(<AccountNav />);

      const nav = screen.getByRole("navigation", {
        name: "Account navigation",
      });
      const linksInsideNav = within(nav).getAllByRole("link");
      const closeLinkInsideNav = within(nav).queryByRole("link", {
        name: "Close account",
      });

      expect(closeLinkInsideNav).toBeNull();
      // Ensure all links inside nav are account section links
      expect(linksInsideNav.map((l) => l.getAttribute("href"))).not.toContain("/");
    });

    it("is not treated as active when on account routes", () => {
      mockUsePathname.mockReturnValue("/account");
      render(<AccountNav />);

      const closeControl = screen.getByRole("link", { name: "Close account" });
      expect(closeControl).not.toHaveAttribute("aria-current");
    });

    it("is not treated as active even when pathname is '/'", () => {
      mockUsePathname.mockReturnValue("/");
      render(<AccountNav />);

      const closeControl = screen.getByRole("link", { name: "Close account" });
      expect(closeControl).not.toHaveAttribute("aria-current");
    });
  });
});
