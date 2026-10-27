import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AccountRatingList, BuyerSelection, ReviewCard, ReviewWizard, TradeExperience } from "@/components/ratings/RatingUI";
import { ratingsCopy } from "@/lib/ratings/copy";
import { at, envelope, ids, review, trade } from "./ratings-fixtures";
const m = vi.hoisted(() => ({ buyer: vi.fn(), submit: vi.fn(), sell: vi.fn(), page: vi.fn(), refresh: vi.fn(), push: vi.fn(), reply: vi.fn(), report: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: m.refresh, push: m.push }) }));
vi.mock("@/app/account/ratings/actions", () => ({ ratingsBuyerAction: m.buyer, ratingsSubmitAction: m.submit, ratingsSellAction: m.sell, ratingsPageAction: m.page, ratingsReplyAction: m.reply, ratingsReportAction: m.report }));
beforeEach(() => { vi.resetAllMocks(); m.buyer.mockResolvedValue({ data: { trade_id: ids.trade, state: "confirmed" } }); m.submit.mockResolvedValue({ data: ids.review }); });
afterEach(cleanup);
it("does not render the buyer wizard before explicit confirmation; abandonment retains the action", async () => {
  const t = ratingsCopy(); const view = render(<TradeExperience trade={trade} role="buyer" locale="en" />);
  expect(screen.queryByText(t.communication)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: t.confirm }));
  await waitFor(() => expect(screen.getByText(t.communication)).toBeInTheDocument());
  expect(m.buyer).toHaveBeenCalledWith({ trade_id: ids.trade, action: "confirm" });
  view.unmount(); expect(m.submit).not.toHaveBeenCalled(); expect(m.buyer).toHaveBeenCalledTimes(1);
});
it("does not show a wizard after failed confirmation or offer seller confirmation", async () => {
  m.buyer.mockResolvedValue({ error: "unavailable" }); const t = ratingsCopy();
  const view = render(<TradeExperience trade={trade} role="buyer" locale="en" />);
  fireEvent.click(screen.getByRole("button", { name: t.confirm })); await screen.findByRole("alert");
  expect(screen.queryByText(t.communication)).not.toBeInTheDocument(); view.unmount();
  render(<TradeExperience trade={trade} role="seller" locale="en" />);
  expect(screen.queryByRole("button", { name: t.confirm })).not.toBeInTheDocument(); expect(screen.queryByRole("button", { name: t.dispute })).not.toBeInTheDocument();
});
it("disputes require a second explicit action and remove the wizard", async () => {
  const t = ratingsCopy(); m.buyer.mockResolvedValue({ data: { trade_id: ids.trade, state: "disputed" } });
  render(<TradeExperience trade={trade} role="buyer" locale="en" />);
  fireEvent.click(screen.getByRole("button", { name: t.dispute })); expect(m.buyer).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: t.dispute }));
  await waitFor(() => expect(m.buyer).toHaveBeenCalledWith({ trade_id: ids.trade, action: "dispute" }));
  await waitFor(() => expect(screen.queryByRole("button", { name: t.confirm })).not.toBeInTheDocument());
});
it.each(["en", "hi"] as const)("renders accessible required four-face questions and preview in %s", async locale => {
  const t = ratingsCopy(locale); render(<ReviewWizard tradeId={ids.trade} role="buyer" locale={locale} />);
  expect(screen.getAllByRole("radio")).toHaveLength(12);
  expect(screen.getByRole("button", { name: t.preview })).toBeDisabled();
  for (const index of [0, 4, 8]) fireEvent.click(screen.getAllByRole("radio")[index]);
  fireEvent.click(screen.getByRole("button", { name: t.preview }));
  expect(screen.getByText(t.immutable)).toBeInTheDocument(); expect(m.submit).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: t.submit }));
  await waitFor(() => expect(m.submit).toHaveBeenCalledWith({ trade_id: ids.trade, communication: 1, payment_item: 1, meetup: 1, body: "", tags: [] }));
});
it("shows expiry and not-rated records without a synthetic review", () => {
  const t = ratingsCopy(); const view = render(<TradeExperience trade={{ ...trade, deadline: at }} role="buyer" locale="en" />);
  expect(screen.getByText(t.expired)).toBeInTheDocument(); expect(screen.queryByRole("button", { name: t.confirm })).not.toBeInTheDocument(); view.unmount();
  render(<AccountRatingList tab="given" initial={envelope([{ kind: "not_rated", id: ids.trade, at, context: review.context, my_role: "buyer" }])} viewerId={ids.user} locale="en" />);
  expect(screen.getByText(/Not rated/)).toBeInTheDocument(); expect(screen.queryByText("0.0/10")).not.toBeInTheDocument();
});
it("received refuses sealed review content and Given renders own sealed review", () => {
  const view = render(<AccountRatingList tab="received" initial={envelope([review])} viewerId={ids.peer} locale="en" />);
  expect(screen.queryByText(review.body!)).not.toBeInTheDocument(); view.unmount();
  render(<AccountRatingList tab="given" initial={envelope([{ kind: "review", id: ids.review, at, review }])} viewerId={ids.user} locale="en" />);
  expect(screen.getByText(review.body!)).toBeInTheDocument(); expect(screen.getByText("0.0/10")).toBeInTheDocument();
});
it("selects only an actual candidate conversation ID", async () => {
  const t = ratingsCopy(); m.page.mockResolvedValue({ data: envelope([{ id: ids.conversation, buyer_id: ids.peer, display_name: "Real buyer", created_at: at }]) });
  m.sell.mockResolvedValue({ data: { trade_id: ids.trade } }); render(<BuyerSelection listingId={ids.listing} locale="en" />);
  fireEvent.click(screen.getByRole("button", { name: t.selectBuyer }));
  fireEvent.click(await screen.findByRole("radio", { name: "Real buyer" })); fireEvent.click(screen.getByRole("button", { name: t.sold }));
  await waitFor(() => expect(m.sell).toHaveBeenCalledWith({ listing_id: ids.listing, choice: "select", conversation_id: ids.conversation }));
});
it("replies appear only for recipient of a published written review; reports exclude own reviews", () => {
  const t = ratingsCopy(); const published = { ...review, published_at: at }; const view = render(<ReviewCard review={published} viewerId={ids.peer} locale="en" />);
  expect(screen.getByRole("button", { name: t.reply })).toBeInTheDocument(); view.unmount();
  render(<ReviewCard review={published} viewerId={ids.user} locale="en" />);
  expect(screen.queryByRole("button", { name: t.reply })).not.toBeInTheDocument(); expect(screen.queryByRole("button", { name: t.report })).not.toBeInTheDocument();
});
