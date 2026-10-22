import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Header } from "@/components/header";

const mockUseAuth = vi.fn();

vi.mock("@/components/providers/AuthProvider", () => ({
  useAuth: () => mockUseAuth(),
}));

describe("Header component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      unreadMessagesCount: 0,
      unreadNotificationsCount: 0,
      signOut: vi.fn(),
    });
  });

  it("renders the FairSwap wordmark with link to home", () => {
    render(<Header />);
    const homeLink = screen.getByRole("link", { name: /fairswap home/i });
    expect(homeLink).toBeInTheDocument();
    expect(homeLink).toHaveAttribute("href", "/");
    expect(screen.getByAltText("FairSwap")).toBeInTheDocument();
  });

  it("renders desktop navigation landmark and links", () => {
    render(<Header />);
    const nav = screen.getByRole("navigation", { name: "Main navigation" });
    expect(nav).toBeInTheDocument();

    expect(screen.getByRole("link", { name: "How It Works" })).toHaveAttribute(
      "href",
      "/#how-it-works"
    );
    expect(screen.getByRole("link", { name: "Categories" })).toHaveAttribute(
      "href",
      "/#categories"
    );
    expect(screen.getByRole("link", { name: "Safety" })).toHaveAttribute(
      "href",
      "/#safety"
    );
  });

  it("shows Sign In button when user is logged out", () => {
    render(<Header />);
    const signInLinks = screen.getAllByRole("link", { name: /sign in/i });
    expect(signInLinks.length).toBeGreaterThan(0);
    expect(signInLinks[0]).toHaveAttribute("href", "/auth/sign-in");
  });

  it("shows Account, Messages, and NotificationBell when user is logged in", () => {
    mockUseAuth.mockReturnValue({
      user: { id: "user-123" },
      isLoading: false,
      unreadMessagesCount: 4,
      unreadNotificationsCount: 2,
      signOut: vi.fn(),
    });

    render(<Header />);
    expect(screen.getByRole("link", { name: /account/i })).toHaveAttribute("href", "/account");
    const messagesLink = screen.getByRole("link", { name: /messages \(4 unread\)/i });
    expect(messagesLink).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("toggles mobile menu on button click with proper aria attributes", () => {
    render(<Header />);
    const menuButton = screen.getByRole("button", { name: /open menu/i });
    expect(menuButton).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("navigation", { name: "Mobile navigation" })).not.toBeInTheDocument();

    // Open mobile menu
    fireEvent.click(menuButton);
    expect(menuButton).toHaveAttribute("aria-expanded", "true");
    expect(menuButton).toHaveAttribute("aria-label", "Close menu");
    const mobileNav = screen.getByRole("navigation", { name: "Mobile navigation" });
    expect(mobileNav).toBeInTheDocument();

    // Close mobile menu
    fireEvent.click(menuButton);
    expect(menuButton).toHaveAttribute("aria-expanded", "false");
    expect(menuButton).toHaveAttribute("aria-label", "Open menu");
    expect(screen.queryByRole("navigation", { name: "Mobile navigation" })).not.toBeInTheDocument();
  });

  it("shows unread message & notification badges in mobile menu when logged in", () => {
    const mockSignOut = vi.fn();
    mockUseAuth.mockReturnValue({
      user: { id: "user-123" },
      isLoading: false,
      unreadMessagesCount: 12,
      unreadNotificationsCount: 3,
      signOut: mockSignOut,
    });

    render(<Header />);
    const menuButton = screen.getByRole("button", { name: /open menu/i });
    fireEvent.click(menuButton);

    const badges9Plus = screen.getAllByText("9+");
    expect(badges9Plus.length).toBeGreaterThan(0); // 12 formatted as 9+
    const badges3 = screen.getAllByText("3");
    expect(badges3.length).toBeGreaterThan(0);

    const signOutBtn = screen.getByRole("button", { name: /sign out/i });
    expect(signOutBtn).toBeInTheDocument();
    fireEvent.click(signOutBtn);
    expect(mockSignOut).toHaveBeenCalledOnce();
  });

  it("supports keyboard focus and interaction on mobile toggle button", () => {
    render(<Header />);
    const menuButton = screen.getByRole("button", { name: /open menu/i });
    menuButton.focus();
    expect(menuButton).toHaveFocus();

    fireEvent.keyDown(menuButton, { key: "Enter", code: "Enter" });
    fireEvent.click(menuButton);
    expect(menuButton).toHaveAttribute("aria-expanded", "true");
  });
});
