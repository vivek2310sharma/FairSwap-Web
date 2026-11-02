import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import SearchCombobox from "@/components/listings/posting/SearchCombobox";
import { generatedPhoneTitle, blankPhoneDraft, phoneRecoverySchema, validatePhoneStep, validatePhoneWizard, reachablePhoneStep } from "@/components/listings/posting/mobile-wizard";
import AccountChrome from "@/components/account/AccountChrome";
const m = vi.hoisted(() => ({ path: "/account/listings/new" }));
vi.mock("next/navigation", () => ({ usePathname: () => m.path }));
vi.mock("@/components/header", () => ({ Header: () => <header>Usual header</header> }));
vi.mock("@/components/account/AccountNav", () => ({ AccountNav: () => <nav>Usual account navigation</nav> }));
afterEach(cleanup);
describe("Posting controls and navigation", () => {
    it("uses committed options with keyboard, Escape, aliases and pointer selection", () => { const change = vi.fn(); Element.prototype.scrollIntoView = vi.fn(); render(<SearchCombobox id="brand" label="Brand" options={[{ id: "a", name: "Apple", aliases: ["iPhone"] }, { id: "s", name: "Samsung" }]} value="a" onChange={change}/>); const input = screen.getByRole("combobox"); fireEvent.change(input, { target: { value: "iPhone" } }); expect(screen.getByRole("option", { name: "Apple" })).toBeVisible(); fireEvent.keyDown(input, { key: "ArrowDown" }); expect(input.getAttribute("aria-activedescendant")).toBe(screen.getByRole("option").id); fireEvent.keyDown(input, { key: "Enter" }); expect(change).toHaveBeenCalledWith("a"); fireEvent.change(input, { target: { value: "Invalid text" } }); fireEvent.keyDown(input, { key: "Escape" }); expect(input).toHaveValue("Apple"); expect(change).toHaveBeenCalledTimes(1); fireEvent.click(input); fireEvent.pointerDown(screen.getByRole("option", { name: "Samsung" })); fireEvent.click(screen.getByRole("option", { name: "Samsung" })); expect(change).toHaveBeenLastCalledWith("s"); });
    it("has genuinely empty defaults and no duplicate brand prefixes", () => { expect(blankPhoneDraft()).toMatchObject({ storage: "", condition: "", brand_id: "", model_id: "", ram: "" }); expect(generatedPhoneTitle("OnePlus", "OnePlus 11", "128 GB", "good")).toBe("OnePlus 11 · 128 GB · Good condition"); expect(generatedPhoneTitle("Apple", "iPhone 15", "", "good")).toBe("Apple iPhone 15 · Good condition"); expect(generatedPhoneTitle("Apple", "", "", "")).toBe(""); });
    it("reads old recovery step as zero without changing the version", () => { const record = { version: 2, owner: "11111111-1111-4111-8111-111111111111", updated: Date.now(), draft: { ...blankPhoneDraft(), session_id: "11111111-1111-4111-8111-111111111111" }, manualTitle: false, area: "", priceText: "", photos: [] }; expect(phoneRecoverySchema.parse(record).step).toBe(0); expect(phoneRecoverySchema.safeParse({ ...record, step: 6 }).success).toBe(false); });
    it.each(["/account/listings/new", "/account/listings/new/details"])("uses compact approved brand chrome only on %s", path => { m.path = path; render(<AccountChrome ratingsAvailable={false}/>); expect(screen.getByRole("img", { name: "FairSwap" })).toHaveAttribute("src", expect.stringContaining("FairSwap_Web_Logo_Transparent.png")); expect(screen.queryByText("Usual account navigation")).toBeNull(); });
    it.each(["/account/listings", "/account/settings", "/account/listings/newspaper"])("retains ordinary navigation on %s", path => { m.path = path; render(<AccountChrome ratingsAvailable={false}/>); expect(screen.getByText("Usual header")).toBeVisible(); expect(screen.getByText("Usual account navigation")).toBeVisible(); });
});

// Independent gates must still report cross-field requirements when an earlier enum is blank.
it("derives access and completion from required values and media readiness", () => {
 const id="11111111-1111-4111-8111-111111111111";
 const catalogue={brands:[{id}],models:[{id,brand_id:id,other:false}]} as unknown as import("@/lib/listings/mobiles/contract").MobileCatalogue;
 const valid={...blankPhoneDraft(),session_id:id,brand_id:id,model_id:id,storage:"128 GB" as const,condition:"good" as const,title:"My phone",description:"Used with care.",price_paise:100,pin_code:"560034",city_id:id,locality_id:id,media_ids:[id]};
 const check=(value=valid,photos=[{state:"ready"}],price="1")=>validatePhoneWizard(value,catalogue,photos,price);
 expect(check().parsed.success).toBe(true); expect(reachablePhoneStep(check().issues)).toBe(5);
 expect(reachablePhoneStep(check(valid,[]).issues)).toBe(0);
 expect(reachablePhoneStep(check(valid,[{state:"failed"}]).issues)).toBe(0);
 expect(reachablePhoneStep(check({...valid,storage:"" as never}).issues)).toBe(1);
 expect(reachablePhoneStep(check({...valid,description:""}).issues)).toBe(2);
 expect(reachablePhoneStep(check({...valid,included:["Under warranty"],warranty_until:""}).issues)).toBe(2);
 expect(reachablePhoneStep(check({...valid,price_paise:0},[{state:"ready"}],"0").issues)).toBe(3);
 expect(check({...valid,trade:"giveaway",price_paise:0},[{state:"ready"}],"").issues).toEqual([]);
 expect(reachablePhoneStep(check({...valid,pin_code:"000000"}).issues)).toBe(4);
 expect(check({...valid,condition:"" as never,included:["Under warranty"]}).issues.map(i=>i.field)).toContain("warranty_until");
});

it("Continue validates only current fields, while Review retains full Zod validation", () => {
 const id="11111111-1111-4111-8111-111111111111";
 const catalogue={brands:[{id}],models:[{id,brand_id:id,other:false}]} as unknown as import("@/lib/listings/mobiles/contract").MobileCatalogue;
 const blank={...blankPhoneDraft(),session_id:id};
 expect(validatePhoneStep(0,blank,catalogue,[],"").map(i=>i.field)).toEqual(["media_ids"]);
 const withPhoto={...blank,media_ids:[id]}; const photos=[{state:"ready"}];
 expect(validatePhoneStep(0,withPhoto,catalogue,photos,"")).toEqual([]);
 expect(validatePhoneStep(1,withPhoto,catalogue,photos,"").map(i=>i.field)).toEqual(["brand_id","model_id","storage"]);
 const details={...withPhoto,brand_id:id,model_id:id,storage:"128 GB" as const};
 expect(validatePhoneStep(1,details,catalogue,photos,"")).toEqual([]);
 const condition={...details,condition:"good" as const,title:"My phone",description:"Used with care."};
 expect(validatePhoneStep(2,condition,catalogue,photos,"")).toEqual([]);
 expect(validatePhoneStep(2,{...condition,included:["Under warranty"]},catalogue,photos,"").map(i=>i.field)).toEqual(["warranty_until"]);
 expect(validatePhoneStep(3,condition,catalogue,photos,"0").map(i=>i.field)).toEqual(["price_paise"]);
 expect(validatePhoneStep(3,{...condition,trade:"giveaway"},catalogue,photos,"")).toEqual([]);
 expect(validatePhoneStep(4,condition,catalogue,photos,"").map(i=>i.field)).toEqual(["pin_code","city_id","locality_id"]);
 expect(validatePhoneWizard(condition,catalogue,photos,"").parsed.success).toBe(false);
});

it("blank preparation rejects every meaningful local draft, including no-photo fields and pending media",async()=>{
 const {canPrepareBlankSession}=await import("@/components/listings/posting/session-preparation");const blank=blankPhoneDraft();
 expect(canPrepareBlankSession(blank,[],"",false,"")).toBe(true);
 for(const changes of [{title:"Saved title"},{description:"unfinished"},{brand_id:"chosen"},{pin_code:"560034"},{trade:"giveaway" as const},{storage:"128 GB" as const},{media_ids:["saved-id"]}]) expect(canPrepareBlankSession({...blank,...changes},[],"",false,"")).toBe(false);
 expect(canPrepareBlankSession(blank,[{state:"pending"}],"",false,"")).toBe(false);expect(canPrepareBlankSession(blank,[],"1",false,"")).toBe(false);
 expect(canPrepareBlankSession(blank,[],"",true,"")).toBe(false);expect(canPrepareBlankSession(blank,[],"",false,"Saved area")).toBe(false);
});
