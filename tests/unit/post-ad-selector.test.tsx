import React, { type ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type Link from "next/link";
import {
  Armchair, Baby, BookOpen, BriefcaseBusiness, CarFront, House, Laptop, PawPrint,
  Refrigerator, Shapes, Shirt, Smartphone, Wrench,
} from "lucide-react";
import { POST_AD_CATALOGUE, resolveSub, type PostAdCapabilities } from "@/lib/listings/post-ad-category-catalogue";
import {
  MAIN_CATEGORY_ICONS, SUBCATEGORY_ICONS, getMainCategoryIcon, getSubcategoryIcon,
} from "@/components/listings/post-ad-category-icons";
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
const open = (name: string) => fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${name}`) }));

describe("Post Ad category picker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn(() => { throw new Error("Network forbidden in selector test"); }));
  });
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

  it("renders heading, unnumbered prompt, search and categories in order", () => {
    render(<MacroCategorySelector availability={all} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("What would you like to list?");
    expect(screen.getByText("Choose a category to continue.")).toBeVisible();
    expect(screen.queryByText(/Step \d+ of \d+/)).toBeNull();
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

  it("explicitly maps all 13 main categories to distinct appropriate icons", () => {
    const expected = [Smartphone, CarFront, House, Refrigerator, Laptop, Armchair,
      Shirt, Baby, BookOpen, PawPrint, Wrench, BriefcaseBusiness, Shapes];
    expect(Object.keys(MAIN_CATEGORY_ICONS).sort()).toEqual(POST_AD_CATALOGUE.map(m => m.id).sort());
    expect(POST_AD_CATALOGUE.map(m => getMainCategoryIcon(m.id))).toEqual(expected);
    expect(new Set(expected).size).toBe(13);
    const { container } = render(<MacroCategorySelector availability={all} />);
    const icons = container.querySelectorAll('button[aria-controls="post-ad-subcategories"] > svg');
    expect(icons).toHaveLength(13);
    for (const icon of icons) {
      expect(icon).toHaveAttribute('aria-hidden', 'true');
      expect(icon).toHaveClass('h-7', 'w-7', 'text-emerald-600');
    }
  });

  it("explicitly maps every existing subcategory with parent-scoped keys and safe fallbacks", () => {
    expect(Object.keys(SUBCATEGORY_ICONS).sort()).toEqual(POST_AD_CATALOGUE.map(m => m.id).sort());
    for (const main of POST_AD_CATALOGUE) {
      expect(Object.keys(SUBCATEGORY_ICONS[main.id]).sort()).toEqual(main.subs.map(s => s.id).sort());
      for (const sub of main.subs) expect(getSubcategoryIcon(main.id, sub.id)).toBeDefined();
    }
    expect(getMainCategoryIcon('unknown')).toBe(Shapes);
    expect(getSubcategoryIcon('unknown', 'cars')).toBe(Shapes);
    expect(getSubcategoryIcon('mobiles', 'cars')).toBe(Shapes);
    expect(getSubcategoryIcon('vehicles', 'toString')).toBe(Shapes);
    expect(new Set(['two-wheelers', 'bicycles', 'electric-cycles'].map(id => getSubcategoryIcon('vehicles', id))).size).toBe(3);
  });

  it.each(POST_AD_CATALOGUE)("uses the same responsive cards and decorative icons for $id", (main) => {
    const capabilities = caps();
    const { container } = render(<MacroCategorySelector availability={all} capabilities={capabilities} />);
    open(main.label.en);
    expect(screen.getByText('Choose a subcategory to continue.')).toBeVisible();
    expect(container.textContent).not.toMatch(/Step \d+ of \d+/);
    const cards = container.querySelectorAll('#post-ad-subcategories li');
    expect(cards).toHaveLength(main.subs.length);
    cards.forEach((item, index) => {
      expect(item.parentElement).toHaveClass('grid', 'grid-cols-1', 'min-[420px]:grid-cols-2', 'lg:grid-cols-3');
      const card = item.firstElementChild!;
      expect(card).toHaveClass('min-h-11', 'h-full', 'items-start', 'gap-3', 'p-3', 'focus-visible:ring-2');
      const icon = card.querySelector('svg')!;
      expect(icon).toHaveClass('h-6', 'w-6', 'text-emerald-600');
      expect(icon).toHaveAttribute('aria-hidden', 'true');
      const sub = main.subs[index];
      const { readiness, macro } = resolveSub(sub, capabilities);
      const badge = { available: 'Available', 'draft-only': 'Draft only', 'coming-soon': 'Coming soon', unavailable: 'Not available' }[readiness];
      expect(card).toHaveAccessibleName(`${sub.label} ${badge}`);
      expect(card.tagName).toBe(macro ? 'A' : 'BUTTON');
    });
    if (main.id === 'property') {
      expect(screen.getByRole('heading', { name: 'For Rent' })).toBeVisible();
      expect(screen.getByRole('heading', { name: 'For Sale' })).toBeVisible();
    }
  });

  it("puts all six Vehicles choices, including Commercial Vehicles, in the same grid", () => {
    render(<MacroCategorySelector availability={all} />);
    open('Vehicles');
    const commercial = screen.getByRole('button', { name: 'Commercial & Other Vehicles Coming soon' });
    const cars = screen.getByRole('link', { name: 'Cars Draft only' });
    expect(commercial.closest('ul')).toBe(cars.closest('ul'));
    expect(commercial.closest('ul')?.children).toHaveLength(6);
    expect(commercial.className).toBe(screen.getByRole('button', { name: 'Bicycles Coming soon' }).className);
  });

  it("reuses subcategory glyphs in compact search results and retains romanized aliases", () => {
    render(<MacroCategorySelector availability={all} />);
    open('Vehicles');
    const glyph = screen.getByRole('link', { name: 'Motorcycles & Scooters Draft only' }).querySelector('svg')!.innerHTML;
    fireEvent.change(screen.getByLabelText('Search categories'), { target: { value: 'Activa' } });
    const result = screen.getByRole('link', { name: 'Motorcycles & Scooters in Vehicles Draft only' });
    expect(result.querySelector('svg')!.innerHTML).toBe(glyph);
    expect(result.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    fireEvent.change(screen.getByLabelText('Search categories'), { target: { value: 'gaadi' } });
    expect(screen.getByRole('button', { name: 'Vehicles' })).toBeVisible();
    fireEvent.change(screen.getByLabelText('Search categories'), { target: { value: '' } });
    open('Vehicles');
    expect(screen.getByText('Choose a category to continue.')).toBeVisible();
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
