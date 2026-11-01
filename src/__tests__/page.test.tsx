import { fireEvent, render, screen } from "@testing-library/react";
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
const resolvePublicArea = vi.hoisted(() => vi.fn());
vi.mock("@/lib/location/public-areas", () => ({ resolvePublicArea }));
vi.mock("@/components/listings/RecentListingsSection", () => ({
  RecentListingsSection: ({ area }: { area?: { city: string } | null }) => <section data-testid="fresh-finds" data-city={area?.city ?? ""} />,
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => "/" }));

describe("HomePage component", () => {
  it("renders main landmark and main heading", async () => {
    render(await HomePage());
    expect(screen.getByRole("main")).toBeInTheDocument();
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent("Good things, closer to you.");
  });

  it("places Fresh Finds before the safety band and defaults the feed to All India", async () => {
    render(await HomePage());
    const feed = screen.getByTestId("fresh-finds");
    expect(feed).toHaveAttribute("data-city", "");
    const safety = document.getElementById("safety")!;
    expect(feed.compareDocumentPosition(safety) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("passes only a validated public area from the URL to the feed", async () => {
    const city = "11111111-1111-4111-8111-111111111111";
    resolvePublicArea.mockResolvedValueOnce({ city, label: "Bengaluru" });
    render(await HomePage({ searchParams: Promise.resolve({ city }) }));
    expect(resolvePublicArea).toHaveBeenCalledWith(city, undefined);
    expect(screen.getByTestId("fresh-finds")).toHaveAttribute("data-city", city);
  });

  it("falls back to All India for an invalid or unresolvable area", async () => {
    resolvePublicArea.mockRejectedValueOnce(new Error("unknown"));
    render(await HomePage({ searchParams: Promise.resolve({ city: "11111111-1111-4111-8111-111111111111" }) }));
    expect(screen.getByTestId("fresh-finds")).toHaveAttribute("data-city", "");
    render(await HomePage({ searchParams: Promise.resolve({ city: "not-a-uuid" }) }));
    expect(screen.getAllByTestId("fresh-finds")[1]).toHaveAttribute("data-city", "");
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

  it("renders the four-step How It Works story with approved mascots and no payment-handling claim", async () => {
    render(await HomePage());
    expect(screen.getByRole("heading", { level: 2, name: /how it works/i })).toBeInTheDocument();
    const story = document.getElementById("how-it-works")!;
    for (const step of ["Browse", "Connect", "Inspect", "Exchange"]) {
      expect(story.textContent).toContain(step);
    }
    expect(screen.getByText("Meet in a public place and check the item in person before you pay.")).toBeInTheDocument();
    expect(story.textContent).toContain("FairSwap does not handle payments");
    expect(screen.getByTestId("story-art").querySelector("img")?.getAttribute("src")).toMatch(/laptop-720w/);
  });

  it("shows the approved mascots in the hero and an India-specific expandable safety panel", async () => {
    render(await HomePage());
    expect(screen.getByTestId("mascots-wide").querySelector("img[src*='man-hero']")).toBeTruthy();
    expect(screen.getByTestId("mascots-wide").querySelector("img[src*='woman-hero']")).toBeTruthy();
    const army = screen.getByRole("button", { name: /army officer/i });
    expect(army).toHaveAttribute("aria-expanded", "false");
  });

  it("renders the Explore categories rail", async () => {
    render(await HomePage());
    expect(
      screen.getByRole("heading", { level: 2, name: /explore categories/i })
    ).toBeInTheDocument();
    expect(screen.getByText("Electronics")).toBeInTheDocument();
    expect(screen.getByText("Furniture")).toBeInTheDocument();
    // "books" has no curated photo: not a featured shortcut, but still in the full directory.
    expect(screen.queryByRole("link", { name: "Books" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "View all categories" }));
    expect(screen.getByRole("link", { name: "Books" })).toBeInTheDocument();
  });

  it("does not claim verified ads and keeps inspect-before-payment advice", async () => {
    render(await HomePage());
    expect(screen.queryByText(/verified ads|verified advertisements/i)).not.toBeInTheDocument();
    expect(screen.getByText("Meet in a public place")).toBeInTheDocument();
    expect(screen.getByText("Inspect before paying")).toBeInTheDocument();
    expect(screen.getByText("Avoid advance UPI payments")).toBeInTheDocument();
    expect(screen.queryByText(/pre-loved|second life|second hand/i)).not.toBeInTheDocument();
  });
});
