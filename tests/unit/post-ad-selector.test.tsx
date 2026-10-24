import React, { type ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type Link from "next/link";
import { POST_AD_CATALOGUE, type PostAdCapabilities } from "@/lib/listings/post-ad-category-catalogue";
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
  "Furniture & Home", "Fashion", "Kids & Baby", "Books, Sports & Hobbies", "Pets", "Services", "Jobs", "Other / Everything Else",
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

  it("renders heading, step text, search and categories in order", () => {
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

  it("presents every category and subcategory in English only", () => {
    const { container } = render(<MacroCategorySelector availability={all} />);
    expect(container.textContent).not.toMatch(/[\u0900-\u097f]/);
    for (const category of POST_AD_CATALOGUE) {
      open(category.label.en);
      expect(screen.getByRole('heading', { level: 2, name: category.label.en })).toBeVisible();
      expect(container.textContent).not.toMatch(/[\u0900-\u097f]/);
      expect(container.querySelector('[lang="hi"]')).toBeNull();
    }
  });

  const caps = (o: Partial<PostAdCapabilities> = {}): PostAdCapabilities => ({
    goodsCategories: ["electronics", "home-appliances", "furniture", "books", "hobbies"],
    twoWheelers: "live", cars: "live", property: "live", propertyPaths: [], ...o,
  });

  it("offers only explicit general Goods continuations, never unsupported leaves, and keeps Bicycles non-actionable", () => {
    render(<MacroCategorySelector availability={all} capabilities={caps()} />);
    open("Mobiles & Tablets");
    expect(screen.getByRole("link", { name: /General Electronics/ })).toHaveAttribute("href", "/account/listings/new?macro=goods");
    for (const leaf of [/^Mobile Phones/, /^Mobile Accessories/, /^Tablets/]) {
      expect(screen.queryByRole("link", { name: leaf })).toBeNull();
      expect(screen.getByRole("button", { name: leaf })).toHaveTextContent("Coming soon");
    }
    open("Home Electronics & Appliances");
    expect(screen.queryByRole("link", { name: /Refrigerators/ })).toBeNull();
    expect(screen.getByRole("link", { name: /General Home Appliances/ })).toBeVisible();
    open("Books, Sports & Hobbies");
    expect(screen.getByRole("link", { name: /^Books/ })).toBeVisible();
    open("Vehicles");
    expect(screen.getByRole("link", { name: /Cars/ })).toHaveAttribute("href", "/account/listings/new?macro=vehicles");
    expect(screen.queryByRole("link", { name: /Bicycles/ })).toBeNull();
    expect(screen.getByRole("button", { name: /Bicycles.*Coming soon/ })).toBeVisible();
    expect(screen.getByRole("button", { name: /Commercial & Other Vehicles/ })).toBeVisible();
    expect(screen.getByText("RC and ownership verification — Coming soon.")).toBeVisible();
    expect(screen.getByText("FairSwap does not currently verify vehicle ownership documents.")).toBeVisible();
    for (const [props] of mocks.link.mock.calls) expect(props.prefetch).toBe(false);
  });

  it("requires the exact Goods category to be loaded", () => {
    render(<MacroCategorySelector availability={all} capabilities={caps({ goodsCategories: ["books"] })} />);
    open("Mobiles & Tablets");
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("derives Cars and Two-Wheeler states independently", () => {
    render(<MacroCategorySelector availability={all} capabilities={caps({ twoWheelers: "off", cars: "draft" })} />);
    open("Vehicles");
    expect(screen.getByRole("link", { name: /Cars.*Draft only/ })).toBeVisible();
    expect(screen.queryByRole("link", { name: /Motorcycles/ })).toBeNull();
    cleanup();
    render(<MacroCategorySelector availability={all} capabilities={caps({ twoWheelers: "live", cars: "off" })} />);
    open("Vehicles");
    expect(screen.getByRole("link", { name: /Motorcycles & Scooters/ })).toBeVisible();
    expect(screen.queryByRole("link", { name: /Cars/ })).toBeNull();
  });

  it("maps Property subcategories by exact contract path only", () => {
    render(<MacroCategorySelector availability={all} capabilities={caps({ propertyPaths: ["PG & Co-living/Boys PG", "Residential for Rent/Single Room"] })} />);
    open("Property");
    expect(screen.getByRole("link", { name: /PG & Guest Houses/ })).toBeVisible();
    expect(screen.queryByRole("link", { name: /Flatmates/ })).toBeNull();
    expect(screen.queryByRole("link", { name: /Houses & Apartments/ })).toBeNull();
    expect(screen.queryByRole("link", { name: /Shops & Offices|Land & Plots/ })).toBeNull();
  });

  it("labels draft-only Property and keeps sale, Jobs, Fashion and live animals non-navigable", () => {
    render(<MacroCategorySelector availability={all} capabilities={caps({ property: "draft", propertyPaths: ["PG & Co-living/Hostels"] })} />);
    open("Property");
    expect(screen.getByRole("link", { name: /PG & Guest Houses.*Draft only/ })).toBeVisible();
    fireEvent.click(screen.getAllByRole("button", { name: /Houses & Apartments/ })[0]);
    expect(screen.getByText("We're working on bringing this category to FairSwap.")).toBeVisible();
    open("Jobs");
    expect(screen.getByText("We're working on bringing this category to FairSwap.")).toBeVisible();
    open("Pets");
    expect(screen.queryByRole("link")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Dogs/ }));
    expect(screen.getByText("Live-animal ads are not available on FairSwap.")).toBeVisible();
    open("Fashion");
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("offers no links when nothing is available", () => {
    render(<MacroCategorySelector availability={none} />);
    for (const n of ["Mobiles & Tablets", "Vehicles", "Property"]) { open(n); expect(screen.queryByRole("link")).toBeNull(); }
  });

  it("opens enabled Fashion Goods without URL category preselection", () => {
    render(<MacroCategorySelector availability={all} capabilities={caps({ goodsCategories: ['fashion-men'] })} />);
    open('Fashion');
    expect(screen.getByRole('link', { name: /^Men/ })).toHaveAttribute('href', '/account/listings/new?macro=goods');
    expect(screen.queryByText('पुरुष')).toBeNull();
    expect(screen.queryByText(/it is not preselected from this screen/)).toBeNull();
    expect(screen.queryByRole('link', { name: /^Women/ })).toBeNull();
  });

  it("shows car-seat and fallback safeguards without actionable posting links", () => {
    render(<MacroCategorySelector availability={all} capabilities={caps()} />);
    open('Kids & Baby');
    fireEvent.click(screen.getByRole('button', { name: /^Car Seats/ }));
    expect(screen.getByRole('status')).toHaveTextContent('crash-damaged');
    expect(screen.getByRole('status')).toHaveTextContent('recalled');
    expect(screen.getByRole('status')).toHaveTextContent('missing parts');
    expect(screen.queryByRole('link', { name: /^Car Seats/ })).toBeNull();
    open('Other / Everything Else');
    fireEvent.click(screen.getByRole('button', { name: /^Other Items/ }));
    expect(screen.getByRole('status')).toHaveTextContent('staff reclassification');
    expect(screen.queryByRole('link')).toBeNull();
  });

  it.each([
    ["Activa", /Motorcycles & Scooters/], ["Royal Enfield", /Motorcycles & Scooters/], ["fridge", /General Home Appliances/],
    ["iphone", /General Electronics/], ["laptop", /General Electronics/], ["pg", /PG & Guest Houses/], ["washing machine", /General Home Appliances/],
  ])("search %s offers an actionable category", (q, match) => {
    render(<MacroCategorySelector availability={all} />);
    fireEvent.change(screen.getByLabelText("Search categories"), { target: { value: q } });
    expect(screen.getAllByRole("link", { name: match })[0]).toBeVisible();
  });

  it("search keeps unsupported leaves Coming soon", () => {
    render(<MacroCategorySelector availability={all} />);
    fireEvent.change(screen.getByLabelText("Search categories"), { target: { value: "fridge" } });
    expect(screen.queryByRole("link", { name: /Refrigerators/ })).toBeNull();
    expect(screen.getByRole("button", { name: /Refrigerators.*Coming soon/ })).toBeVisible();
  });

  it.each([
    ['पुरुष', /^Men/, 'fashion-men'],
    ['इन्वर्टर', /^Power Backup & Solar/, 'power-backup-solar'],
  ])("Hindi search %s retains matching and navigation with English-only results", (query, name, key) => {
    const { container } = render(<MacroCategorySelector availability={all} capabilities={caps({ goodsCategories: [key] })} />);
    fireEvent.change(screen.getByLabelText('Search categories'), { target: { value: query } });
    expect(screen.getByRole('link', { name })).toHaveAttribute('href', '/account/listings/new?macro=goods');
    expect(container.textContent).not.toMatch(/[\u0900-\u097f]/);
    expect(container.querySelector('[lang="hi"]')).toBeNull();
  });

  it("Hindi search preserves unavailable choices with English-only labels", () => {
    const { container } = render(<MacroCategorySelector availability={all} />);
    fireEvent.change(screen.getByLabelText('Search categories'), { target: { value: 'गोदाम' } });
    expect(screen.getAllByRole('button', { name: /^Godowns & Warehouses.*Coming soon/ })).toHaveLength(2);
    expect(screen.queryByRole('link', { name: /Godowns & Warehouses/ })).toBeNull();
    expect(container.textContent).not.toMatch(/[\u0900-\u097f]/);
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
    fireEvent.click(screen.getByRole("link", { name: /General Electronics/ }));
    expect(choose).toHaveBeenCalledWith("goods");
  });
});
