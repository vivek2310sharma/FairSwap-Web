import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { PublicRatings, PublicSummary } from "@/components/ratings/PublicRatings";
import { ids } from "./ratings-fixtures";
const m = vi.hoisted(() => ({ enabled: vi.fn(), summary: vi.fn(), reviews: vi.fn() }));
vi.mock("@/lib/ratings/server", () => ({ publicRatingsEnabled: m.enabled, publicSummary: m.summary, publicReviews: m.reviews }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: async () => ({ data: { user: null } }) } }) }));
beforeEach(() => { vi.clearAllMocks(); m.enabled.mockReturnValue(true); });
afterEach(cleanup);
it("new users see no rating rather than 0/10", async () => {
  m.summary.mockResolvedValue({ data: { user_id: ids.user, score: null, published_review_count: 0, completed_trades: 0 } });
  render(await PublicSummary({ userId: ids.user })); expect(screen.getByText("No ratings yet")).toBeInTheDocument(); expect(screen.queryByText("0.0/10")).not.toBeInTheDocument();
});
it("earned zero is rendered as a numeric score", async () => {
  m.summary.mockResolvedValue({ data: { user_id: ids.user, score: 0, published_review_count: 3, completed_trades: 3 } });
  render(await PublicSummary({ userId: ids.user })); expect(screen.getByText("0.0/10")).toBeInTheDocument();
});
it("disabled public reputation performs no read and renders nothing", async () => {
  m.enabled.mockReturnValue(false); expect(await PublicSummary({ userId: ids.user })).toBeNull(); expect(m.summary).not.toHaveBeenCalled();
});
it("unavailable backend does not invent an empty reputation", async () => {
  m.summary.mockResolvedValue({ error: "unavailable" }); render(await PublicSummary({ userId: ids.user }));
  expect(screen.getByText(/unavailable/)).toBeInTheDocument(); expect(screen.queryByText("No ratings yet")).not.toBeInTheDocument();
});

it("public ratings retain English pagination without language controls or query parameters", async () => {
  m.summary.mockResolvedValue({ data: { user_id: ids.user, score: null, published_review_count: 0, completed_trades: 0 } });
  m.reviews.mockResolvedValue({ data: { items: [], next_cursor: { before_at: "2026-10-26T10:00:00Z", before_id: ids.review } } });
  const page = await PublicRatings({ userId: ids.user });
  // Render the synchronous children; the async summary is covered separately above.
  render(<div>{page.props.children.slice(1)}</div>);
  expect(screen.queryByRole("navigation", { name: "Language" })).toBeNull();
  const more = screen.getByRole("link", { name: "Load more" });
  expect(more).toHaveAttribute("href", `?tab=ratings&before_at=2026-10-26T10%3A00%3A00Z&before_id=${ids.review}`);
});
