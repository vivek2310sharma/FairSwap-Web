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

  it("renders the account navigation landmark on child routes", () => {
    mockUsePathname.mockReturnValue("/account/listings");
    render(<AccountNav />);
    const nav = screen.getByRole("navigation", {
      name: "Account navigation",
    });
    expect(nav).toBeInTheDocument();
  });

  it("renders exactly the six primary navigation items without Help Centre", () => {
    mockUsePathname.mockReturnValue("/account/listings");
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
    expect(links).toHaveLength(6);
    expect(screen.queryByRole("link", { name: /Help Centre/i })).toBeNull();
  });

  it("does NOT expose policy-review as a navigation item", () => {
    mockUsePathname.mockReturnValue("/account/listings");
    render(<AccountNav />);

    const nav = screen.getByRole("navigation", {
      name: "Account navigation",
    });
    const links = within(nav).getAllByRole("link");
    const hrefs = links.map((link) => link.getAttribute("href"));
    expect(hrefs).not.toContain("/account/policy-review");
  });

  it("links Settings to /account/settings", () => {
    mockUsePathname.mockReturnValue("/account/listings");
    render(<AccountNav />);
    expect(screen.getByRole("link", { name: /Settings/ })).toHaveAttribute(
      "href",
      "/account/settings"
    );
  });

  // --- Active state: exact match for Overview ---

  // --- ACC-01: the overview is itself the section menu, so the tab strip is hidden there ---

  it("renders nothing on the /account overview (no duplicate navigation)", () => {
    for (const route of ["/account", "/account/"]) {
      mockUsePathname.mockReturnValue(route);
      const { container, unmount } = render(<AccountNav />);
      expect(container).toBeEmptyDOMElement();
      expect(screen.queryByRole("navigation", { name: "Account navigation" })).toBeNull();
      unmount();
    }
  });

  it("stays visible on every child route, including support and the scam report flow", () => {
    const children = [
      "/account/listings",
      "/account/favourites",
      "/account/messages",
      "/account/notifications",
      "/account/settings",
      "/account/profile",
      "/account/privacy",
      "/account/support",
      "/account/support/report-scam",
      "/account/support/9b2f6f1e-0000-4000-8000-000000000000",
    ];
    for (const route of children) {
      mockUsePathname.mockReturnValue(route);
      const { unmount } = render(<AccountNav />);
      expect(screen.getByRole("navigation", { name: "Account navigation" }), route).toBeInTheDocument();
      unmount();
    }
  });

  it("is hidden below 640px (HDR-01 bottom nav replaces it) and shown from sm upwards", () => {
    mockUsePathname.mockReturnValue("/account/listings");
    render(<AccountNav />);
    const nav = screen.getByRole("navigation", { name: "Account navigation" });
    expect(nav.className).toContain("hidden");
    expect(nav.className).toContain("sm:block");
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

  // --- Active state: My Listings nested routes ---

  it("marks My Listings as active on /account/listings/new and /account/listings/123/edit", () => {
    for (const route of ["/account/listings/new", "/account/listings/item-123/edit"]) {
      mockUsePathname.mockReturnValue(route);
      const { unmount } = render(<AccountNav />);
      const listingsLink = screen.getByRole("link", { name: /My Listings/ });
      expect(listingsLink).toHaveAttribute("aria-current", "page");
      unmount();
    }
  });

  // --- Active state: Messages nested routes ---

  it("marks Messages as active on /account/messages/chat-123", () => {
    mockUsePathname.mockReturnValue("/account/messages/chat-123");
    render(<AccountNav />);
    const messagesLink = screen.getByRole("link", { name: /Messages/ });
    expect(messagesLink).toHaveAttribute("aria-current", "page");
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
