import React, { type ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
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
    const { href, children, className } = props;
    return <a href={String(href)} className={className}>{children}</a>;
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

const names = ["Goods", "Vehicles", "Property"];
const descriptions = [
  "Phones, electronics, furniture, appliances, fashion and kids' items.",
  "Bikes and scooters, cars, bicycles and vehicle accessories.",
  "Homes for sale or rent, PGs and rooms, shops and offices.",
];

// Synthetic presentation fixtures; they are not production readiness claims.
function fixture(mask: number): MacroCategoryAvailability {
  return {
    goods: mask & 1 ? { available: true } : { available: false, reason: "Goods fixture unavailable." },
    vehicles: mask & 2 ? { available: true } : { available: false, reason: "Vehicles fixture unavailable." },
    property: mask & 4 ? { available: true } : { available: false, reason: "Property fixture unavailable." },
  };
}

describe("Isolated Post Ad selector", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn(() => { throw new Error("Network forbidden in selector test"); }));
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it.each([0, 1, 2, 3, 4, 5, 6, 7])("renders explicit availability mask %i", (mask) => {
    const availability = fixture(mask);
    const { container } = render(<MacroCategorySelector availability={availability} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("What would you like to list?");
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual(names);
    const cards = screen.getAllByRole("listitem");
    const macros = ["goods", "vehicles", "property"] as const;
    macros.forEach((macro, index) => {
      const card = within(cards[index]);
      expect(card.getByText(descriptions[index])).toBeVisible();
      const state = availability[macro];
      if (state.available) {
        const link = card.getByRole("link", { name: `${names[index]} ${descriptions[index]}` });
        expect(link).toHaveAttribute("href", `/account/listings/new?macro=${macro}`);
        expect(link.className).toContain("focus-visible:ring-2");
      } else {
        expect(card.queryByRole("link")).toBeNull();
        expect(cards[index].querySelector("[href]")).toBeNull();
        expect(card.getByText(`Unavailable: ${state.reason}`)).toBeVisible();
      }
    });
    expect(container.querySelectorAll("svg")).toHaveLength(3);
    container.querySelectorAll("svg").forEach((icon) => expect(icon).toHaveAttribute("aria-hidden", "true"));
    for (const [props] of mocks.link.mock.calls) expect(props.prefetch).toBe(false);
    expect(mocks.link).toHaveBeenCalledTimes(macros.filter((m) => availability[m].available).length);
    expect(mocks.database).not.toHaveBeenCalled();
    expect(mocks.auth).not.toHaveBeenCalled();
    expect(mocks.action).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
    expect(screen.getByRole("list").className).toContain("grid-cols-1");
    expect(screen.getByRole("list").className).toContain("md:grid-cols-3");
  });
});
