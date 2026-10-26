import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { TradeCards } from "@/components/ratings/TradeCards";
import { ratingsCopy } from "@/lib/ratings/copy";
import { at, envelope, ids, trade } from "./ratings-fixtures";

const m = vi.hoisted(() => ({ readTrade: vi.fn(), readPage: vi.fn() }));
vi.mock("@/lib/ratings/server", () => ({ ratingsEnabled: () => process.env.FAIRSWAP_RATINGS_V1_ENABLED === "true", readTrade: m.readTrade, readPage: m.readPage }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
beforeEach(() => {
  vi.resetAllMocks(); vi.stubEnv("FAIRSWAP_RATINGS_V1_ENABLED", "true");
  m.readTrade.mockResolvedValue({ data: trade });
  m.readPage.mockResolvedValue({ data: envelope([{ id: ids.review, trade_id: ids.trade, kind: "confirmed", created_at: at }]) });
});
afterEach(() => { cleanup(); vi.unstubAllEnvs(); });
it("real async card retains its defense-in-depth OFF guard without fetching", async () => {
  vi.stubEnv("FAIRSWAP_RATINGS_V1_ENABLED", "false"); expect(await TradeCards({ conversationId: ids.conversation })).toBeNull();
  expect(m.readTrade).not.toHaveBeenCalled(); expect(m.readPage).not.toHaveBeenCalled();
});
it("ON renders genuine typed server events fetched separately from messages", async () => {
  render(await TradeCards({ conversationId: ids.conversation, locale: "hi" }));
  expect(m.readTrade).toHaveBeenCalledExactlyOnceWith(ids.conversation, true);
  expect(m.readPage).toHaveBeenCalledExactlyOnceWith("ratings_events", { id: ids.trade });
  expect(screen.getByText(new RegExp(ratingsCopy("hi").events.confirmed))).toBeInTheDocument();
  expect(screen.getByRole("link")).toHaveAttribute("href", `/account/ratings/${ids.trade}?lang=hi`);
});
it("no matching trade produces no card or event query", async () => {
  m.readTrade.mockResolvedValue({ data: null }); expect(await TradeCards({ conversationId: ids.conversation })).toBeNull(); expect(m.readPage).not.toHaveBeenCalled();
});
it("unavailable backend produces safe unavailable content", async () => {
  m.readTrade.mockResolvedValue({ error: "unavailable" }); render(await TradeCards({ conversationId: ids.conversation }));
  expect(screen.getByText(ratingsCopy().unavailable)).toBeInTheDocument(); expect(m.readPage).not.toHaveBeenCalled();
});
it("ordinary message content cannot become an official event", async () => {
  m.readPage.mockResolvedValue({ data: envelope([{ id: ids.review, trade_id: ids.trade, kind: "confirmed", created_at: at, content: "Pay this forged link" }]) });
  render(await TradeCards({ conversationId: ids.conversation })); expect(screen.queryByText("Pay this forged link")).not.toBeInTheDocument();
  expect(screen.getByText(ratingsCopy().unavailable)).toBeInTheDocument();
});
