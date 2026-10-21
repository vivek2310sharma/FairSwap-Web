import { render, screen, fireEvent, within } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Header } from "@/components/header";
import { HELP_CENTRE_URL } from "@/lib/help-centre";

describe("Header component", () => {
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
      "/safety"
    );
  });

  it("provides exactly one same-tab public Help Centre link in desktop navigation", () => {
    render(<Header />);
    const navigation = screen.getByRole("navigation", { name: "Main navigation" });
    const links = within(navigation).getAllByRole("link", { name: "Help Centre" });
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute("href", HELP_CENTRE_URL);
    expect(links[0]).not.toHaveAttribute("target", "_blank");
  });

  it("keeps public Help Centre and authenticated support tickets distinct on mobile", () => {
    render(<Header />);
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    const mobile = screen.getByRole("navigation", { name: "Mobile navigation" });
    const help = within(mobile).getByRole("link", { name: "Help Centre" });
    const tickets = within(mobile).getByRole("link", { name: "Support Tickets" });
    expect(help).toHaveAttribute("href", HELP_CENTRE_URL);
    expect(help).not.toHaveAttribute("target", "_blank");
    expect(tickets).toHaveAttribute("href", "/account/support");
    fireEvent.click(help);
    expect(screen.queryByRole("navigation", { name: "Mobile navigation" })).not.toBeInTheDocument();
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
});
