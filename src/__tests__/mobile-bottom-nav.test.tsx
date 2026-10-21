import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import {
  MobileBottomNav,
  shouldShowBottomNav,
  isRouteActive,
} from "@/components/navigation/MobileBottomNav";

const mockUsePathname = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
}));

describe("MobileBottomNav visibility rules (shouldShowBottomNav)", () => {
  it("shows navigation on ordinary browsing and account pages", () => {
    expect(shouldShowBottomNav("/")).toBe(true);
    expect(shouldShowBottomNav("/search")).toBe(true);
    expect(shouldShowBottomNav("/search/category/electronics")).toBe(true);
    expect(shouldShowBottomNav("/listings/iphone-13-mumbai")).toBe(true);
    expect(shouldShowBottomNav("/account/messages")).toBe(true);
    expect(shouldShowBottomNav("/account")).toBe(true);
    expect(shouldShowBottomNav("/account/favourites")).toBe(true);
    expect(shouldShowBottomNav("/account/listings")).toBe(true);
    expect(shouldShowBottomNav("/account/profile")).toBe(true);
    expect(shouldShowBottomNav("/safety")).toBe(true);
    expect(shouldShowBottomNav("/terms")).toBe(true);
  });

  it("hides navigation on auth screens", () => {
    expect(shouldShowBottomNav("/auth/sign-in")).toBe(false);
    expect(shouldShowBottomNav("/auth/sign-up")).toBe(false);
    expect(shouldShowBottomNav("/auth/forgot-password")).toBe(false);
    expect(shouldShowBottomNav("/auth/reset-password")).toBe(false);
    expect(shouldShowBottomNav("/auth/callback")).toBe(false);
  });

  it("hides navigation on listing creation and edit flows", () => {
    expect(shouldShowBottomNav("/account/listings/new")).toBe(false);
    expect(shouldShowBottomNav("/account/listings/123/edit")).toBe(false);
    expect(shouldShowBottomNav("/account/listings/car/edit")).toBe(false);
  });

  it("hides navigation on individual chat conversation threads", () => {
    expect(shouldShowBottomNav("/account/messages/conv-12345")).toBe(false);
    expect(shouldShowBottomNav("/account/messages/xyz/details")).toBe(false);
  });

  it("hides navigation on policy review compliance screens", () => {
    expect(shouldShowBottomNav("/account/policy-review")).toBe(false);
  });
});

describe("MobileBottomNav route active matching (isRouteActive)", () => {
  it("matches Home route correctly", () => {
    expect(isRouteActive("/", "/")).toBe(true);
    expect(isRouteActive("/", "/search")).toBe(false);
    expect(isRouteActive("/", "/account")).toBe(false);
  });

  it("matches Search route and nested subpages", () => {
    expect(isRouteActive("/search", "/search")).toBe(true);
    expect(isRouteActive("/search", "/search/electronics")).toBe(true);
    expect(isRouteActive("/search", "/")).toBe(false);
  });

  it("matches Chats route and inbox subpages", () => {
    expect(isRouteActive("/account/messages", "/account/messages")).toBe(true);
    expect(isRouteActive("/account/messages", "/account/messages/inbox")).toBe(true);
    expect(isRouteActive("/account/messages", "/account")).toBe(false);
  });

  it("matches Account route for account pages excluding messages and listing creation", () => {
    expect(isRouteActive("/account", "/account")).toBe(true);
    expect(isRouteActive("/account", "/account/favourites")).toBe(true);
    expect(isRouteActive("/account", "/account/listings")).toBe(true);
    expect(isRouteActive("/account", "/account/profile")).toBe(true);
  });

  it("does not match Account route when on messages or listings/new", () => {
    expect(isRouteActive("/account", "/account/messages")).toBe(false);
    expect(isRouteActive("/account", "/account/listings/new")).toBe(false);
  });
});

describe("MobileBottomNav Component", () => {
  it("renders 5 navigation items on the homepage with Home active", () => {
    mockUsePathname.mockReturnValue("/");
    render(<MobileBottomNav />);

    const nav = screen.getByRole("navigation", { name: "Mobile bottom navigation" });
    expect(nav).toBeInTheDocument();

    const homeLink = screen.getByRole("link", { name: "Home" });
    const searchLink = screen.getByRole("link", { name: "Search" });
    const sellLink = screen.getByRole("aria-label" in screen ? "link" : "link", { name: /Sell/i });
    const chatsLink = screen.getByRole("link", { name: "Chats" });
    const accountLink = screen.getByRole("link", { name: "Account" });

    expect(homeLink).toHaveAttribute("href", "/");
    expect(homeLink).toHaveAttribute("aria-current", "page");

    expect(searchLink).toHaveAttribute("href", "/search");
    expect(searchLink).not.toHaveAttribute("aria-current");

    expect(sellLink).toHaveAttribute("href", "/account/listings/new");
    expect(chatsLink).toHaveAttribute("href", "/account/messages");
    expect(accountLink).toHaveAttribute("href", "/account");
  });

  it("highlights Search when on /search", () => {
    mockUsePathname.mockReturnValue("/search");
    render(<MobileBottomNav />);

    const searchLink = screen.getByRole("link", { name: "Search" });
    expect(searchLink).toHaveAttribute("aria-current", "page");

    const homeLink = screen.getByRole("link", { name: "Home" });
    expect(homeLink).not.toHaveAttribute("aria-current");
  });

  it("highlights Chats when on /account/messages", () => {
    mockUsePathname.mockReturnValue("/account/messages");
    render(<MobileBottomNav />);

    const chatsLink = screen.getByRole("link", { name: "Chats" });
    expect(chatsLink).toHaveAttribute("aria-current", "page");

    const accountLink = screen.getByRole("link", { name: "Account" });
    expect(accountLink).not.toHaveAttribute("aria-current");
  });

  it("highlights Account when on /account/favourites", () => {
    mockUsePathname.mockReturnValue("/account/favourites");
    render(<MobileBottomNav />);

    const accountLink = screen.getByRole("link", { name: "Account" });
    expect(accountLink).toHaveAttribute("aria-current", "page");

    const chatsLink = screen.getByRole("link", { name: "Chats" });
    expect(chatsLink).not.toHaveAttribute("aria-current");
  });

  it("returns null on auth routes", () => {
    mockUsePathname.mockReturnValue("/auth/sign-in");
    const { container } = render(<MobileBottomNav />);
    expect(container).toBeEmptyDOMElement();
  });

  it("returns null on listing creation route", () => {
    mockUsePathname.mockReturnValue("/account/listings/new");
    const { container } = render(<MobileBottomNav />);
    expect(container).toBeEmptyDOMElement();
  });

  it("returns null on individual chat conversation route", () => {
    mockUsePathname.mockReturnValue("/account/messages/conv-123");
    const { container } = render(<MobileBottomNav />);
    expect(container).toBeEmptyDOMElement();
  });
});
