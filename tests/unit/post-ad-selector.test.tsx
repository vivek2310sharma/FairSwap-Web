import React, { type ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type Link from "next/link";
import MacroCategorySelector, {
  type MacroCategoryAvailability,
} from "@/components/listings/MacroCategorySelector";

const mocks = vi.hoisted(() => ({
  link: vi.fn(),
  database: vi.fn(() => { throw new Error("Database forbidden in isolated selector"); }),
  action: vi.fn(() => { throw new Error("Listing action forbidden in isolated selector"); }),
  auth: vi.fn(() => { throw new Error("Auth forbidden in isolated selector"); }),
}));

vi.mock("next/link", () => ({
  default: (props: ComponentProps<typeof Link>) => {
    mocks.link(props);
    const { href, children, className, onClick } = props;
    return <a href={String(href)} className={className} onClick={onClick}>{children}</a>;
  },
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.database }));
vi.mock("@/lib/supabase/client", () => ({ createClient: mocks.database }));
vi.mock("@/app/account/listings/actions", () => ({
  createDraftListingAction: mocks.action,
  updateListingAction: mocks.action,
  submitListingAction: mocks.action,
}));
vi.mock("@supabase/ssr", () => ({
  createBrowserClient: mocks.auth,
  createServerClient: mocks.auth,
}));

const names = [
  "Mobiles & Tablets", "Vehicles", "Property", "Home Electronics & Appliances", "Computers & Cameras",
  "Furniture & Home", "Fashion", "Books, Sports & Hobbies", "Pets", "Services", "Jobs",
];
const on = { available: true } as const;
const off = { available: false, reason: "fixture" } as const;
const all: MacroCategoryAvailability = { goods: on, vehicles: on, property: on };
const none: MacroCategoryAvailability = { goods: off, vehicles: off, property: off };
const open = (name: string) => fireEvent.click(screen.getByRole("button", { name: new RegExp(name) }));

describe("Post Ad category picker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn(() => { throw new Error("Network forbidden in selector test"); }));
  });
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

  it("renders heading, step text, search and 11 categories in order", () => {
    render(<MacroCategorySelector availability={all} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("What would you like to list?");
    expect(screen.getByText("Step 1 of 3 · Choose a category")).toBeVisible();
    expect(screen.getByPlaceholderText("e.g. iPhone 13, Activa, fridge, sofa")).toBeVisible();
    expect(screen.getAllByRole("listitem").map((li) => li.querySelector("button span.font-semibold")?.textContent)).toEqual(names);
    expect(screen.getByText(/never need to enter a UPI PIN/)).toBeVisible();
    expect(mocks.database).not.toHaveBeenCalled();
    expect(mocks.action).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("links supported subcategories to the existing macro route only", () => {
    render(<MacroCategorySelector availability={all} />);
    open("Mobiles & Tablets");
    expect(screen.getByRole("link", { name: /Mobile Phones/ })).toHaveAttribute("href", "/account/listings/new?macro=goods");
    open("Vehicles");
    expect(screen.getByRole("link", { name: /Cars/ })).toHaveAttribute("href", "/account/listings/new?macro=vehicles");
    expect(screen.getByRole("button", { name: /Commercial & Other Vehicles/ })).toBeVisible();
    expect(screen.getByText("RC and ownership verification — Coming soon.")).toBeVisible();
    expect(screen.getByText("FairSwap does not currently verify vehicle ownership documents.")).toBeVisible();
    for (const [props] of mocks.link.mock.calls) expect(props.prefetch).toBe(false);
  });

  it("derives per-family vehicle readiness independently", () => {
    render(<MacroCategorySelector availability={all} capabilities={{ goods: true, twoWheelers: "off", cars: "draft", property: "off", propertyCategoryLabels: [] }} />);
    open("Vehicles");
    expect(screen.getByRole("link", { name: /Cars.*Draft only/ })).toBeVisible();
    expect(screen.queryByRole("link", { name: /Motorcycles/ })).toBeNull();
  });

  it("keeps Property sale, Jobs, Fashion and live animals non-navigable", () => {
    render(<MacroCategorySelector availability={all} />);
    open("Property");
    expect(screen.getByRole("link", { name: /PG & Guest Houses/ })).toBeVisible();
    expect(screen.getAllByRole("button", { name: /Houses & Apartments/ })).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: /Houses & Apartments/ }));
    expect(screen.getByText("We're working on bringing this category to FairSwap.")).toBeVisible();
    open("Jobs");
    expect(screen.getByText("We're working on bringing this category to FairSwap.")).toBeVisible();
    open("Pets");
    expect(screen.queryByRole("link")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Dogs/ }));
    expect(screen.getByText("Live-animal listings are not available on FairSwap.")).toBeVisible();
    open("Fashion");
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("offers no links when nothing is available", () => {
    render(<MacroCategorySelector availability={none} />);
    for (const n of ["Mobiles & Tablets", "Vehicles", "Property"]) { open(n); expect(screen.queryByRole("link")).toBeNull(); }
  });

  it.each([
    ["Activa", /Motorcycles & Scooters/], ["Royal Enfield", /Motorcycles & Scooters/], ["fridge", /Refrigerators/],
    ["iphone", /Mobile Phones/], ["laptop", /Computers & Laptops/], ["pg", /PG & Guest Houses/], ["washing machine", /Washing Machines/],
  ])("search %s finds its category", (q, match) => {
    render(<MacroCategorySelector availability={all} />);
    fireEvent.change(screen.getByLabelText("Search categories"), { target: { value: q } });
    expect(screen.getByRole("link", { name: match })).toBeVisible();
  });

  it("search respects availability and shows a no-results state", () => {
    render(<MacroCategorySelector availability={none} />);
    const input = screen.getByLabelText("Search categories");
    fireEvent.change(input, { target: { value: "activa" } });
    expect(screen.queryByRole("link")).toBeNull();
    fireEvent.change(input, { target: { value: "zzzzqq" } });
    expect(screen.getByRole("status")).toHaveTextContent("No categories match");
  });

  it("calls onChooseSection instead of navigating", () => {
    const choose = vi.fn();
    render(<MacroCategorySelector availability={all} onChooseSection={choose} />);
    open("Mobiles & Tablets");
    fireEvent.click(screen.getByRole("link", { name: /Tablets/ }));
    expect(choose).toHaveBeenCalledWith("goods");
  });
});