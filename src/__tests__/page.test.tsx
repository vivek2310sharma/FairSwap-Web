import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import HomePage from "@/app/page";

// These isolated page tests do not mount RootLayout's AuthProvider.
vi.mock("@/components/providers/AuthProvider", () => ({
  useAuth: () => ({ user: null, isLoading: false, unreadMessagesCount: 0,
    unreadNotificationsCount: 0, refreshUnreadCounts: vi.fn(), signOut: vi.fn() }),
}));

vi.mock("@/lib/discovery/queries", () => ({
  getPublicCategories: vi.fn(async () => [
    { id: "1", slug: "electronics", name: "Electronics" },
    { id: "2", slug: "furniture", name: "Furniture" },
    { id: "3", slug: "books", name: "Books" },
  ]),
}));
vi.mock("@/lib/location/public-areas", () => ({ resolvePublicArea: vi.fn() }));
vi.mock("@/components/listings/RecentListingsSection", () => ({ RecentListingsSection: () => null }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

describe("HomePage component", () => {
  it("renders main landmark and main heading", async () => {
    render(await HomePage());
    expect(screen.getByRole("main")).toBeInTheDocument();
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent("Exchange. Share. Discover.");
  });

  it("includes the homepage-only first-paint gate script ahead of the page content", async () => {
    const { container } = render(await HomePage());
    const script = container.querySelector("script");
    expect(script?.textContent).toContain("data-fs-intro");
    expect(script!.compareDocumentPosition(screen.getByRole("main")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("does not render the obsolete development foundation notice", async () => {
    render(await HomePage());
    expect(screen.queryByText("Development Foundation")).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Accounts, ads, and communication are not connected yet/i)
    ).not.toBeInTheDocument();
  });

  it("renders one compact safety reminder", async () => {
    render(await HomePage());
    expect(
      screen.getByText(/Stay safe on FairSwap/)
    ).toBeInTheDocument();
  });

  it("renders the How It Works section with 3 core steps and updated Exchange text", async () => {
    render(await HomePage());
    expect(
      screen.getByRole("heading", { level: 2, name: /how it works/i })
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Browse" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Connect" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Exchange" })).toBeInTheDocument();
    expect(
      screen.getByText("Meet in a public place, inspect the item, and agree on payment directly.")
    ).toBeInTheDocument();
  });

  it("renders the Browse Categories preview section", async () => {
    render(await HomePage());
    expect(
      screen.getByRole("heading", { level: 2, name: /browse categories/i })
    ).toBeInTheDocument();
    expect(screen.getByText("Electronics")).toBeInTheDocument();
    expect(screen.getByText("Furniture")).toBeInTheDocument();
    expect(screen.getByText("Books")).toBeInTheDocument();
  });

  it("does not claim verified ads and keeps inspect-before-payment advice", async () => {
    render(await HomePage());
    expect(screen.queryByText(/verified ads|verified advertisements/i)).not.toBeInTheDocument();
    expect(
      screen.getByText(/inspect before paying/i)
    ).toBeInTheDocument();
  });
});
