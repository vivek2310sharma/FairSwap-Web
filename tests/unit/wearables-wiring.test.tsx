import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { POST_AD_CATALOGUE, resolveSub, type PostAdCapabilities } from "@/lib/listings/post-ad-category-catalogue";
import { SubChoice } from "@/components/listings/PostAdSubcategoryChooser";
import WearableListingDetails from "@/components/listings/WearableListingDetails";
import { searchFiltersSchema } from "@/types/listing";
import { serializeSearchFilters } from "@/lib/navigation/search-context";
import { wearableFacts, wearableCardFacts, type WearableDetails } from "@/lib/listings/wearables/public";

afterEach(cleanup);
const caps = (over: Partial<PostAdCapabilities> = {}): PostAdCapabilities => ({ twoWheelers: "off", cars: "off", property: "off", goodsCategories: [], propertyPaths: [], ...over });
const mobiles = POST_AD_CATALOGUE.find(c => c.id === "mobiles")!, sub = mobiles.subs.find(s => s.id === "wearables")!;

describe("category wiring", () => {
  it("keeps the public label and slug, and routes to a dedicated wearables journey", () => {
    expect(sub.label).toBe("Smartwatches & Wearables"); expect(sub.route).toEqual({ kind: "wearables" });
  });
  it("is available only when the wearable catalogue is ready, independent of phone/tablet/accessory readiness", () => {
    expect(resolveSub(sub, caps({ wearables: true }))).toEqual({ readiness: "available", macro: "goods" });
    expect(resolveSub(sub, caps({ wearables: false, mobilePhones: true })).readiness).toBe("coming-soon");
    expect(resolveSub(sub, caps()).readiness).toBe("coming-soon");
    const phones = mobiles.subs.find(s => s.id === "mobile-phones")!;
    expect(resolveSub(phones, caps({ wearables: true })).readiness).toBe("coming-soon");
  });
  it("links to ?posting=wearables and does not hijack the click when available", () => {
    render(<SubChoice sub={sub} parent={mobiles} actions={{ caps: caps({ wearables: true }), hrefForSection: () => "/account/listings/new?x=1", onChooseSection: () => { throw new Error("must not intercept"); } } as never}/>);
    const link = screen.getByRole("link", { name: /Smartwatches & Wearables/ }); expect(link).toHaveAttribute("href", "/account/listings/new?posting=wearables");
    let prevented = true; link.addEventListener("click", e => { prevented = e.defaultPrevented; e.preventDefault(); }, { once: true }); fireEvent.click(link);
    expect(prevented).toBe(false); // the app handler did not intercept navigation
  });
});

describe("buyer search filters", () => {
  it("accepts only validated wearable values and normalises blanks", () => {
    const ok = searchFiltersSchema.parse({ category: "wearables", wearable_type: "smart_ring", wearable_brand: "wb_oura", wearable_model: "wm_0123456789ab", wearable_transfer_ready: "true", wearable_connectivity: "lte" });
    expect(ok).toMatchObject({ wearable_type: "smart_ring", wearable_brand: "wb_oura", wearable_transfer_ready: "true" });
    expect(searchFiltersSchema.parse({ wearable_type: "", wearable_brand: "", wearable_model: "", wearable_transfer_ready: "", wearable_connectivity: "" })).toMatchObject({ wearable_type: undefined, wearable_brand: undefined });
    for (const bad of [{ wearable_type: "phone" }, { wearable_brand: "oura" }, { wearable_model: "wm_zz" }, { wearable_transfer_ready: "false" }, { wearable_connectivity: "wifi" }]) expect(searchFiltersSchema.safeParse(bad).success, JSON.stringify(bad)).toBe(false);
  });
  it("wearable filters are preserved in the search context", () => {
    expect(serializeSearchFilters(searchFiltersSchema.parse({ category: "wearables", wearable_type: "smartwatch", wearable_brand: "wb_apple" }))).toMatch(/wearable_type=smartwatch.*wearable_brand=wb_apple|wearable_brand=wb_apple.*wearable_type=smartwatch/);
  });
});

const details = (over: Partial<WearableDetails> = {}, d: Partial<WearableDetails["details"]> = {}): WearableDetails => ({
  device_type: "smartwatch", brand_name: "Apple", model_name: "Apple Watch Series 9", other_model: false, pairing_status: "reset_ready", transfer_ready: true,
  details: { condition: "good", case_size_mm: 44, connectivity: "bluetooth", phone_os: ["ios"], screen: "minor_scratches", controls: "working", strap: "good", sensors: "working", charging: "working", battery_mode: "health_percent", battery_health_percent: 91, included: ["charger", "box"], purchase_month: "2024-05", ...d } as never, ...over,
});
describe("buyer detail", () => {
  it("shows structured, seller-reported specs without verification claims", () => {
    render(<WearableListingDetails details={details()}/>);
    expect(screen.getByText(/Wearable details/)).toBeInTheDocument(); expect(screen.getAllByText(/seller-reported/i).length).toBeGreaterThan(0);
    expect(screen.getByText("Apple Apple Watch Series 9")).toBeInTheDocument(); expect(screen.getByText("44 mm")).toBeInTheDocument(); expect(screen.getByText("91% health")).toBeInTheDocument();
    expect(screen.getByText("Original charger, Original box")).toBeInTheDocument(); expect(screen.getByText("iPhone")).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/FairSwap verified|verified by FairSwap|guaranteed/i); expect(screen.queryByRole("note")).toBeNull();
  });
  it.each([["still_paired", /still paired to their account/], ["unknown", /has not confirmed/]] as const)("%s is never presented as transfer-ready", (status, text) => {
    render(<WearableListingDetails details={details({ pairing_status: status, transfer_ready: false })}/>);
    expect(screen.getByRole("note").textContent).toMatch(text); expect(document.body.textContent).not.toMatch(/ready to transfer/);
  });
  it("entered models are labelled; unknown battery is honest; runtime is approximate; rings show size and charging case", () => {
    render(<WearableListingDetails details={details({ other_model: true }, { battery_mode: "not_tested", battery_health_percent: undefined })}/>);
    expect(screen.getByText(/entered by seller/)).toBeInTheDocument(); expect(screen.getByText("Not tested")).toBeInTheDocument();
    cleanup(); const ring = wearableFacts(details({ device_type: "smart_ring", brand_name: "Oura", model_name: "Oura Ring 4" }, { ring_size: "9", included: ["charging_case"], battery_mode: "runtime_hours", battery_runtime_hours: 96, case_size_mm: undefined, connectivity: undefined }));
    expect(ring.find(f => f.field === "ring")?.value).toBe("9"); expect(ring.find(f => f.field === "included")?.value).toBe("Charging case"); expect(ring.find(f => f.field === "battery")?.value).toBe("About 96 hours per charge");
  });
  it("cards show only brand/model, condition, connectivity and pairing caveat", () => {
    expect(wearableCardFacts(details({ pairing_status: "unknown", transfer_ready: false })).map(f => f.field)).toEqual(["model", "condition", "connectivity", "pairing"]);
  });
});
