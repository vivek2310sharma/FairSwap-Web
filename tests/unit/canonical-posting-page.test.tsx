import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import NewListingPage from "@/app/account/listings/new/page";
import { parseTaxonomy } from "@/lib/listings/taxonomy-v2";
import fixture from "./taxonomy-v2-fixture.json";
const m = vi.hoisted(() => ({
  bindings: vi.fn(), taxonomy: vi.fn(), locations: vi.fn(), phone: vi.fn(), tablet: vi.fn(), wearable: vi.fn(), verify: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: "owner" } } }) } }) }));
vi.mock("@/lib/idv/gate-server", () => ({ needsIdentityVerification: m.verify }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw Error(`REDIRECT:${url}`); } }));
vi.mock("@/lib/listings/posting-capabilities-server", () => ({ loadSpecialistBindings: m.bindings }));
vi.mock("@/lib/listings/taxonomy-v2-server", () => ({ loadTaxonomy: m.taxonomy }));
vi.mock("@/lib/listings/post-ad-locations", () => ({ loadPostAdLocations: m.locations }));
vi.mock("@/lib/listings/mobiles/server", () => ({ loadMobileCatalogue: m.phone }));
vi.mock("@/lib/listings/tablets/server", () => ({ loadTabletCatalogue: m.tablet }));
vi.mock("@/lib/listings/wearables/server", () => ({ loadWearableCatalogue: m.wearable }));
vi.mock("@/components/listings/MobilePhoneForm", () => ({ default: () => <div>Phone wizard</div> }));
vi.mock("@/components/listings/TabletForm", () => ({ default: () => <div>Tablet wizard</div> }));
vi.mock("@/components/listings/WearableForm", () => ({ default: () => <div>Wearable wizard</div> }));
const bindings = Object.fromEntries(fixture.nodes.filter(node => node.posting_enabled).map(node => [node.posting_flow, node.id]));
beforeEach(() => {
  vi.clearAllMocks(); m.verify.mockResolvedValue(false);
  m.bindings.mockResolvedValue(bindings); m.taxonomy.mockResolvedValue(parseTaxonomy(fixture, bindings));
  m.locations.mockResolvedValue({ status: "ready", cities: [] });
  m.phone.mockResolvedValue({ listing_category_id: bindings["specialist:phone"] });
  m.tablet.mockResolvedValue({ listing_category_id: bindings["specialist:tablet"] });
  m.wearable.mockResolvedValue({ listing_category_id: bindings["specialist:wearable"] });
});
afterEach(cleanup);
it("loads no specialist catalogues or location data on the chooser", async () => {
  render(await NewListingPage({ searchParams: Promise.resolve({}) }));
  expect(screen.getByRole("heading", { name: "What would you like to list?" })).toBeVisible();
  expect(m.phone).not.toHaveBeenCalled(); expect(m.tablet).not.toHaveBeenCalled(); expect(m.wearable).not.toHaveBeenCalled(); expect(m.locations).not.toHaveBeenCalled();
  expect(screen.queryByText(/Existing posting/)).toBeNull();
});
it.each([
  ["mobile-phones", "Phone wizard", "phone"], ["tablets", "Tablet wizard", "tablet"], ["wearables", "Wearable wizard", "wearable"],
] as const)("directly populates %s without another category prompt", async (category, text, key) => {
  render(await NewListingPage({ searchParams: Promise.resolve({ category }) }));
  expect(screen.getByText(text)).toBeVisible();
  expect(screen.queryByText("What would you like to list?")).toBeNull();
  for (const other of ["phone", "tablet", "wearable"] as const) expect(m[other]).toHaveBeenCalledTimes(other === key ? 1 : 0);
});
it("fails closed if the selected catalogue UUID differs from the verified binding", async () => {
  m.phone.mockResolvedValue({ listing_category_id: bindings["specialist:tablet"] });
  render(await NewListingPage({ searchParams: Promise.resolve({ category: "mobile-phones" }) }));
  expect(screen.queryByText("Phone wizard")).toBeNull();
  expect(screen.getByRole("heading", { name: /isn’t available/ })).toBeVisible();
  expect(m.locations).not.toHaveBeenCalled();
});
it.each(["v2-dogs", "v2-other-items", "v2-baby-gear-car-seats", "v2-electric-cycles-low-speed-evs", "v2-houses-apartments"])("does not render an unverified contract for %s", async category => {
  render(await NewListingPage({ searchParams: Promise.resolve({ category }) }));
  expect(screen.getByRole("heading", { name: /isn’t available/ })).toBeVisible();
  expect(m.phone).not.toHaveBeenCalled(); expect(m.locations).not.toHaveBeenCalled();
});
