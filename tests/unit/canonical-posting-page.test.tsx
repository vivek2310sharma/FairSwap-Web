import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import NewListingPage from "@/app/account/listings/new/page";
import { parseTaxonomy } from "@/lib/listings/taxonomy-v2";
import fixture from "./taxonomy-v2-fixture.json";
import { carsV1 } from "@/lib/listings/cars/contract";
import { twoWheelerV1 } from "@/lib/listings/two-wheeler/contract";
import { propertyV1 } from "@/lib/listings/property/contract";
const m = vi.hoisted(() => ({
  bindings: vi.fn(), taxonomy: vi.fn(), locations: vi.fn(), phone: vi.fn(), tablet: vi.fn(), wearable: vi.fn(), verify: vi.fn(),
  submission: vi.fn(), carsEnabled: vi.fn(), twoEnabled: vi.fn(), propertyEnabled: vi.fn(), vehicleRefs: vi.fn(), propertyRefs: vi.fn(), goodsRefs: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: "owner" } } }) } }) }));
vi.mock("@/lib/idv/gate-server", () => ({ needsIdentityVerification: m.verify }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw Error(`REDIRECT:${url}`); } }));
vi.mock("@/lib/listings/posting-capabilities-server", () => ({ loadSpecialistBindings: m.bindings }));
vi.mock("@/lib/listings/test-runtime", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/listings/test-runtime")>()),
  isVerifiedSubmissionTestEnvironment: m.submission,
}));
vi.mock("@/lib/listings/two-wheeler/server", () => ({
  isCarsEnabled: m.carsEnabled, isTwoWheelerEnabled: m.twoEnabled, loadVehicleReferences: m.vehicleRefs,
}));
vi.mock("@/lib/listings/property/server", () => ({
  isPropertyEnabled: m.propertyEnabled, loadPropertyReferences: m.propertyRefs,
}));
vi.mock("@/lib/listings/post-ad-server", () => ({ loadGoodsReferences: m.goodsRefs }));
vi.mock("@/components/listings/GoodsPostAdEntry", () => ({
  default: ({ canonicalCategory }: {canonicalCategory?:string}) => <div>Family wizard: {canonicalCategory}</div>,
}));
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
  m.submission.mockReturnValue(false); m.carsEnabled.mockReturnValue(false);
  m.twoEnabled.mockReturnValue(false); m.propertyEnabled.mockReturnValue(false);
  m.goodsRefs.mockResolvedValue({ status: "ready", categories: [], attributes: [], cities: [] });
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

it.each(["v2-cars","v2-motorcycles-scooters","v2-houses-apartments","v2-pg-hostels-guest-houses","v2-flatmates-shared-rooms"])(
  "routes %s through an approved specialist contract", async category => {
    const data = structuredClone(fixture);
    for (const node of data.nodes) if (node.slug === category) { node.status = "live"; node.posting_enabled = true; }
    m.taxonomy.mockResolvedValue(parseTaxonomy(data, bindings));
    m.submission.mockReturnValue(true); m.carsEnabled.mockReturnValue(true);
    m.twoEnabled.mockReturnValue(true); m.propertyEnabled.mockReturnValue(true);
    const make = (path: {path:string[];fields:string[]}, family?: "cars") => ({
      id:"11111111-1111-4111-8111-111111111111", name:"Existing contract",
      path:path.path, fields:path.fields, is_active:true, new_listing_enabled:true,
      version_id:"22222222-2222-4222-8222-222222222222", ...(family ? {family} : {}),
    });
    m.vehicleRefs.mockImplementation(async (_client:unknown, _saved:unknown, family:string) => ({
      categories:[make(family === "cars" ? carsV1.paths[0] : twoWheelerV1.paths[0],
        family === "cars" ? "cars" : undefined)], states:[],
    }));
    m.propertyRefs.mockResolvedValue({categories:propertyV1.paths.map(path=>make(path))});
    m.locations.mockResolvedValue({status:"ready",cities:[{id:"33333333-3333-4333-8333-333333333333",name:"Test city"}]});
    render(await NewListingPage({searchParams:Promise.resolve({category})}));
    expect(screen.getByText("Family wizard: " + category)).toBeVisible();
  }
);

it("fails closed for family choices when verified Test submission is off", async () => {
  const data=structuredClone(fixture);
  const node=data.nodes.find(n=>n.slug==="v2-cars")!;
  node.status="live";node.posting_enabled=true;
  m.taxonomy.mockResolvedValue(parseTaxonomy(data, bindings));
  render(await NewListingPage({searchParams:Promise.resolve({category:"v2-cars"})}));
  expect(screen.getByRole("heading",{name:/isn’t available/})).toBeVisible();
  expect(m.vehicleRefs).not.toHaveBeenCalled();
  expect(m.goodsRefs).not.toHaveBeenCalled();
});
