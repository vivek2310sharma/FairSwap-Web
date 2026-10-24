import { render, screen, within, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import TradesPage from "@/app/account/trades/page";
import { getAccountCopy } from "@/lib/account/copy";

const mocks = vi.hoisted(() => ({ getUser: vi.fn(), from: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: mocks.getUser }, from: mocks.from }) }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(url); } }));

afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  mocks.getUser.mockResolvedValue({ data: { user: { id: "test-user" } }, error: null });
});

const page = (tab?: string | string[]) => TradesPage({ searchParams: Promise.resolve({ tab }) });

describe("My trades Coming Soon page", () => {
  it.each([
    { data: { user: null }, error: null },
    { data: { user: { id: "test-user" } }, error: new Error("Unavailable") },
  ])("redirects missing or failed authentication", async (result) => {
    mocks.getUser.mockResolvedValue(result);
    await expect(page()).rejects.toThrow("/auth/sign-in?next=/account/trades");
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it.each([undefined, "sold", "invalid", ["bought", "sold"]])("defaults safely to Sold for %s", async (tab) => {
    render(await page(tab));
    expect(screen.getByRole("heading", { level: 1, name: "My trades" })).toBeInTheDocument();
    expect(screen.getByText("Coming soon")).toBeInTheDocument();
    expect(screen.getByText("Your history of sales and purchases confirmed on FairSwap.")).toBeInTheDocument();
    expect(screen.getByText(/Trade confirmation has not launched yet/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Your completed sales will appear here" })).toBeInTheDocument();
    expect(screen.getByText("Once a buyer confirms a transaction, its record will appear in this section.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sold" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Bought" })).not.toHaveAttribute("aria-current");
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("provides navigation links that switch between Sold and Bought", async () => {
    const { unmount } = render(await page());
    const nav = within(screen.getByRole("navigation", { name: "Trade history sections" }));
    const boughtHref = nav.getByRole("link", { name: "Bought" }).getAttribute("href")!;
    expect(boughtHref).toBe("/account/trades?tab=bought");
    expect(nav.getByRole("link", { name: "Sold" })).toHaveAttribute("href", "/account/trades?tab=sold");
    unmount();
    render(await page(new URL(boughtHref, "http://localhost").searchParams.get("tab")!));
    expect(screen.getByRole("link", { name: "Bought" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Sold" })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("heading", { name: "Your completed purchases will appear here" })).toBeInTheDocument();
    expect(screen.getByText("Once you and a seller confirm a transaction, its record will appear in this section.")).toBeInTheDocument();
    expect(screen.queryByRole("button")).toBeNull();
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("supplies complete English and Hindi trade copy", () => {
    for (const locale of ["en", "hi"] as const) {
      const copy = getAccountCopy(locale);
      expect(Object.values(copy.trades)).toHaveLength(10);
      for (const value of Object.values(copy.trades)) expect(value.trim()).not.toBe("");
      expect(copy.tiles.trades.title).toBe(copy.trades.title);
    }
    expect(getAccountCopy("hi").trades.sold).toBe("बेची गई");
    expect(getAccountCopy("hi").trades.bought).toBe("खरीदी गई");
  });
});
