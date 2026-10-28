import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render as rtlRender, screen } from "@testing-library/react";
import { HomeDiscovery } from "@/components/listings/HomeDiscovery";
import { DiscoveryLocationSelector } from "@/components/listings/DiscoveryLocationSelector";
import { discoveryHref, LOCATION_PREFERENCE_KEY } from "@/lib/location/discovery";

function render(ui: React.ReactElement) { const result = rtlRender(ui); document.querySelectorAll("details").forEach(d => { d.open = true; }); return result; }
const push = vi.hoisted(() => vi.fn());
const replace = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace }) }));
const area = { city: "11111111-1111-4111-8111-111111111111", locality: "22222222-2222-4222-8222-222222222222", label: "Koramangala, Bengaluru district, Karnataka" };
const categories = [{ id: "c1", slug: "electronics", name: "Electronics" }];
beforeEach(() => { vi.useFakeTimers(); push.mockReset(); replace.mockReset(); localStorage.clear(); });
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });
async function settle() { await act(async () => { await vi.advanceTimersByTimeAsync(350); }); }
const mockResponse = (items = [area]) => ({ ok: true, json: async () => ({ items }) });

describe("location-aware discovery", () => {
  it("renders one visible H1 with concise search copy and no removed headline or subtitle", () => {
    render(<HomeDiscovery categories={categories} initialArea={area} initialFilters={{}} restoreSaved={false} />);
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1).toHaveTextContent("Find more. Share more. Trust more.");
    expect(h1).not.toHaveClass("sr-only");
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("searchbox", { name: "Search items" })).toHaveAttribute("placeholder", "Phone, bike, sofa...");
    expect(screen.queryByText("Search approved ads")).toBeNull();
    expect(screen.queryByText("Discover pre-loved finds on FairSwap")).toBeNull();
    expect(screen.queryByText("Pre-loved things. A fresh start.")).toBeNull();
  });
  it("submits trimmed keywords and preserves category and location, resetting page", () => {
    render(<HomeDiscovery categories={categories} initialArea={area} initialFilters={{ category: "electronics", page: 7 }} restoreSaved={false} />);
    fireEvent.change(screen.getByRole("searchbox", { name: "Search items" }), { target: { value: "  iPhone 13  " } });
    fireEvent.submit(screen.getByRole("search"));
    const params = new URLSearchParams(push.mock.calls[0][0].split("?")[1]);
    expect(params.get("q")).toBe("iPhone 13");
    expect(params.get("category")).toBe("electronics");
    expect(params.get("city")).toBe(area.city);
    expect(params.get("locality")).toBe(area.locality);
    expect(params.has("page")).toBe(false);
    expect(screen.getByRole("link", { name: "Electronics" })).toHaveAttribute("href", push.mock.calls[0][0]);
  });
  it("submits empty search to canonical /search", () => {
    render(<HomeDiscovery categories={categories} restoreSaved={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    expect(push).toHaveBeenCalledWith("/search");
  });
  it("does not navigate or fetch incomplete PIN entry", async () => {
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    const confirm = vi.fn();
    render(<DiscoveryLocationSelector area={null} onConfirm={confirm} />);
    fireEvent.change(screen.getByLabelText("City, district, area or PIN"), { target: { value: "56003" } });
    await settle();
    expect(fetcher).not.toHaveBeenCalled(); expect(confirm).not.toHaveBeenCalled();
  });
  it("debounces place lookup, confirms only on selection and saves no PIN or coordinates", async () => {
    const fetcher = vi.fn().mockResolvedValue(mockResponse()); vi.stubGlobal("fetch", fetcher);
    const confirm = vi.fn();
    render(<DiscoveryLocationSelector area={null} onConfirm={confirm} />);
    const input = screen.getByLabelText("City, district, area or PIN");
    fireEvent.change(input, { target: { value: "Beng" } });
    fireEvent.change(input, { target: { value: "Bengaluru" } });
    await settle();
    expect(fetcher).toHaveBeenCalledTimes(1); expect(confirm).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: area.label }));
    expect(confirm).toHaveBeenCalledWith(area);
    expect(Object.keys(JSON.parse(localStorage.getItem(LOCATION_PREFERENCE_KEY)!)).sort()).toEqual(["city", "expires", "locality"]);
  });
  it("discards stale suggestions after input changes", async () => {
    let resolve!: (value: unknown) => void;
    vi.stubGlobal("fetch", vi.fn(() => new Promise(r => { resolve = r; })));
    render(<DiscoveryLocationSelector area={null} onConfirm={vi.fn()} />);
    const input = screen.getByLabelText("City, district, area or PIN");
    fireEvent.change(input, { target: { value: "Beng" } }); await settle();
    fireEvent.change(input, { target: { value: "56" } });
    await act(async () => { resolve(mockResponse()); });
    expect(screen.queryByRole("button", { name: area.label })).not.toBeInTheDocument();
  });
  it("clears remembered preference with All India", () => {
    localStorage.setItem(LOCATION_PREFERENCE_KEY, "saved");
    const confirm = vi.fn(); render(<DiscoveryLocationSelector area={area} onConfirm={confirm} />);
    fireEvent.click(screen.getByRole("button", { name: /All India/ }));
    expect(confirm).toHaveBeenCalledWith(null); expect(localStorage.getItem(LOCATION_PREFERENCE_KEY)).toBeNull();
  });
  it("restores only a server-validated saved public area without navigation", async () => {
    localStorage.setItem(LOCATION_PREFERENCE_KEY, JSON.stringify({ city: area.city, locality: area.locality, expires: Date.now() + 10000 }));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse()));
    const restore = vi.fn(), confirm = vi.fn();
    render(<DiscoveryLocationSelector area={null} restoreSaved onRestore={restore} onConfirm={confirm} />);
    await settle(); expect(restore).toHaveBeenCalledWith(area); expect(confirm).not.toHaveBeenCalled();
  });
  it("confirming an area updates the homepage URL so the feed follows; All India clears both params and the saved area", async () => {
    render(<HomeDiscovery categories={categories} initialArea={area} restoreSaved={false} />);
    fireEvent.click(screen.getByRole("button", { name: /All India/ }));
    expect(push).toHaveBeenCalledWith("/", { scroll: false });
    expect(localStorage.getItem(LOCATION_PREFERENCE_KEY)).toBeNull();
  });
  it("restores a saved area once via replace, without a loop, when the URL has no explicit area", async () => {
    localStorage.setItem(LOCATION_PREFERENCE_KEY, JSON.stringify({ city: area.city, locality: area.locality, expires: Date.now() + 10000 }));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse()));
    render(<HomeDiscovery categories={categories} restoreSaved />);
    await settle();
    expect(replace).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith(`/?city=${area.city}&locality=${area.locality}`, { scroll: false });
    expect(push).not.toHaveBeenCalled();
  });
  it("exposes a real focusable location control for #location", () => {
    render(<HomeDiscovery categories={categories} initialArea={area} restoreSaved={false} />);
    const target = document.getElementById("location")!;
    expect(target.tagName).toBe("SUMMARY");
  });
  it("explicit URL area does not read saved preferences", async () => {
    localStorage.setItem(LOCATION_PREFERENCE_KEY, JSON.stringify({ city: area.city, expires: Date.now() + 10000 }));
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    render(<HomeDiscovery categories={categories} initialArea={area} restoreSaved={false} />);
    await settle(); expect(fetcher).not.toHaveBeenCalled();
  });
  it("requests GPS only after a tap and explains permission denial", () => {
    const getCurrentPosition = vi.fn((_success, error) => error({ code: 1 }));
    Object.defineProperty(navigator, "geolocation", { configurable: true, value: { getCurrentPosition } });
    render(<DiscoveryLocationSelector area={null} onConfirm={vi.fn()} />);
    expect(getCurrentPosition).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Use my current location" }));
    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("status")).toHaveTextContent("permission denied");
  });
  it.each([[2, "unavailable"], [3, "timed out"]])("handles device error %s", (code, message) => {
    Object.defineProperty(navigator, "geolocation", { configurable: true, value: { getCurrentPosition: (_s: unknown, e: (v: { code: number }) => void) => e({ code }) } });
    render(<DiscoveryLocationSelector area={null} onConfirm={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Use my current location" }));
    expect(screen.getByRole("status")).toHaveTextContent(message);
  });
  it("widens location without losing other filters", () => {
    const url = discoveryHref({ q: "bike", category: "electronics", condition: "new", price_min: 10, page: 8 }, null);
    expect(url).toBe("/search?q=bike&category=electronics&condition=new&price_min=10");
  });
});