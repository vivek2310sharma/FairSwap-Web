import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Header } from "@/components/header";

const navState = vi.hoisted(() => ({ pathname: "/" as string | null }));
vi.mock("next/navigation", () => ({
  usePathname: () => navState.pathname,
}));

describe("Header component", () => {
  beforeEach(() => {
    navState.pathname = "/";
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

  it("supports keyboard focus and interaction on mobile toggle button", () => {
    render(<Header />);
    const menuButton = screen.getByRole("button", { name: /open menu/i });
    menuButton.focus();
    expect(menuButton).toHaveFocus();

    // Native HTML button fires click on Enter/Space
    fireEvent.keyDown(menuButton, { key: "Enter", code: "Enter" });
    fireEvent.click(menuButton);
    expect(menuButton).toHaveAttribute("aria-expanded", "true");
  });

  describe("ACC-01 account controls", () => {
    it("keeps the unauthenticated header working with the generic Account link", () => {
      render(<Header />);
      const account = screen.getByRole("link", { name: "Account" });
      expect(account).toHaveAttribute("href", "/account");
      expect(account.className).toContain("border-border");
      expect(account).not.toHaveAttribute("aria-current");
    });

    it("shows the signed-in avatar initial and first name in place of the generic pill", () => {
      render(<Header viewer={{ firstName: "Asha", initial: "A" }} />);
      const account = screen.getByRole("link", { name: "Account (Asha)" });
      expect(account).toHaveAttribute("href", "/account");
      expect(account).toHaveTextContent("Asha");
      expect(account).toHaveTextContent("A");
      expect(screen.queryByRole("link", { name: "Account" })).toBeNull();
    });

    it("falls back to the generic label when the first name is unknown", () => {
      render(<Header viewer={{ firstName: null, initial: "?" }} />);
      expect(screen.getByRole("link", { name: /Account/ })).toHaveTextContent("Account");
    });

    it("marks the Account link with an active underline and aria-current on account routes", () => {
      navState.pathname = "/account";
      const { unmount } = render(<Header viewer={{ firstName: "Asha", initial: "A" }} />);
      const onHub = screen.getByRole("link", { name: "Account (Asha)" });
      expect(onHub).toHaveAttribute("aria-current", "page");
      expect(onHub.className).toContain("border-action-600");
      unmount();

      navState.pathname = "/account/listings";
      const { unmount: unmountChild } = render(<Header viewer={{ firstName: "Asha", initial: "A" }} />);
      const onChild = screen.getByRole("link", { name: "Account (Asha)" });
      expect(onChild).not.toHaveAttribute("aria-current");
      expect(onChild.className).toContain("border-action-600");
      unmountChild();

      navState.pathname = "/search";
      render(<Header viewer={{ firstName: "Asha", initial: "A" }} />);
      const elsewhere = screen.getByRole("link", { name: "Account (Asha)" });
      expect(elsewhere.className).toContain("border-transparent");
    });

    it("keeps Favourites as an accessible icon-only link without a duplicate text label", () => {
      render(<Header />);
      const favourites = screen.getAllByRole("link", { name: "Favourites" });
      expect(favourites).toHaveLength(1);
      expect(favourites[0]).toHaveAttribute("href", "/account/favourites");
      expect(favourites[0].textContent?.trim()).toBe("");

      const mainNav = screen.getByRole("navigation", { name: "Main navigation" });
      expect(mainNav).not.toHaveTextContent(/Favourites/);
    });

    it("preserves Chats, Notifications and the Post Ad button", () => {
      render(<Header />);
      expect(screen.getByRole("link", { name: "Messages" })).toHaveAttribute("href", "/account/messages");
      expect(screen.getByRole("button", { name: /Notifications/ })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /Post Ad/ })).toHaveAttribute(
        "href",
        "/account/listings/new"
      );
    });

    it("still offers Saved Favourites and My Account in the mobile menu", () => {
      render(<Header viewer={{ firstName: "Asha", initial: "A" }} />);
      fireEvent.click(screen.getByRole("button", { name: /open menu/i }));
      const mobileNav = screen.getByRole("navigation", { name: "Mobile navigation" });
      expect(mobileNav).toHaveTextContent("Saved Favourites");
      expect(mobileNav).toHaveTextContent("My Account");
    });
  });
});
