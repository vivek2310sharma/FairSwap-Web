import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import MobilePhoneForm from "@/components/listings/MobilePhoneForm";
import type { MobileCatalogue } from "@/lib/listings/mobiles/contract";
import { blankPhoneDraft } from "@/components/listings/posting/mobile-wizard";
const m = vi.hoisted(() => ({ read: vi.fn(), write: vi.fn(), replace: vi.fn(), push: vi.fn(), fetch: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: m.replace, push: m.push }) }));
vi.mock("@/lib/listings/posting-recovery", () => ({ readPostingRecovery: m.read, writePostingRecovery: m.write }));
vi.mock("@/components/listings/PincodeLocationPicker", () => ({ default: () => <div><input type="hidden" name="pin_code" value="560034"/><input type="hidden" name="city_id" value="55555555-5555-4555-8555-555555555555"/><input type="hidden" name="locality_id" value="66666666-6666-4666-8666-666666666666"/></div> }));
vi.mock("@/components/listings/PreListingMediaUploader", () => ({ default: ({ onChange }: {
        onChange: (v: unknown[]) => void;
    }) => <button type="button" onClick={() => onChange([{ id: "44444444-4444-4444-8444-444444444444", state: "ready" }])}>Add ready photo</button> }));
const owner = "11111111-1111-4111-8111-111111111111", brand = "22222222-2222-4222-8222-222222222222", model = "33333333-3333-4333-8333-333333333333";
const catalogue: MobileCatalogue = { version: 2, revision: "fixture-v2", listing_category_id: owner, enabled: true, selection: { category: "mobiles", subcategory: "mobile-phones", version: 2 }, brands: [{ id: brand, name: "Apple", aliases: ["iPhone"], sort_order: 1 }], models: [{ id: model, brand_id: brand, name: "iPhone 15", aliases: [], sort_order: 1, older_group: false, other: false }] };
beforeEach(() => { vi.clearAllMocks(); m.read.mockResolvedValue(undefined); m.write.mockResolvedValue(undefined); m.fetch.mockImplementation(async (input: string) => ({ ok: true, json: async () => input === "/api/post-ad/submit" ? { success: true, listing_id: owner } : { session: { state: "open" }, media: [] } })); vi.stubGlobal("fetch", m.fetch); Element.prototype.scrollIntoView = vi.fn(); });
afterEach(async() => { cleanup(); await Promise.resolve();await Promise.resolve();vi.unstubAllGlobals(); });
async function ready(maintenance = false) { render(<MobilePhoneForm ownerId={owner} catalogue={catalogue} cities={[]} maintenance={maintenance}/>); await screen.findByRole("button", { name: "Add ready photo" }); }
const step = (name: string) => fireEvent.click(screen.getByRole("button", { name: /^\d /.test(name) ? `Step ${name[0]}: ${name.slice(2)}` : name }));
function choose(label: string, name: string) { const input = screen.getByRole("combobox", { name: label }); fireEvent.click(input); fireEvent.change(input, { target: { value: name } }); fireEvent.keyDown(input, { key: "ArrowDown" }); fireEvent.keyDown(input, { key: "Enter" }); }
function fill() { fireEvent.click(screen.getByRole("button", { name: "Add ready photo" })); step("2 Phone details"); choose("Brand", "Apple"); choose("Model", "iPhone 15"); fireEvent.change(screen.getByLabelText("Storage"), { target: { value: "128 GB" } }); step("3 Condition"); step("Good condition"); fireEvent.change(screen.getByLabelText("Description"), { target: { value: "Used carefully. Battery health 90%." } }); step("4 Price"); fireEvent.change(screen.getByLabelText("Price (₹)"), { target: { value: "25000" } }); }
const submitCalls = () => m.fetch.mock.calls.filter(([url]) => url === "/api/post-ad/submit");
function recovered() { return { version: 2, owner, updated: Date.now(), step: 5, draft: { ...blankPhoneDraft(), session_id: owner, brand_id: brand, model_id: model, storage: "128 GB", condition: "good", title: "Saved title" }, manualTitle: true, area: "Koramangala", priceText: "24500", photos: [{ id: model, state: "ready" }] }; }
describe("Production phone wizard", () => {
    it("blocks blank Photos jumps and Continue, then validates details with focus", async () => {
        await ready();
        const active = screen.getByRole("button", {name:"Step 1: Photos"}); active.focus();
        vi.mocked(Element.prototype.scrollIntoView).mockClear();
        for (let repeat=0;repeat<3;repeat++) for (const name of ["2 Phone details","3 Condition","4 Price","5 Location"]) {
            const locked=screen.getByRole("button", {name:`Step ${name[0]}: ${name.slice(2)}`});
            expect(locked).toBeDisabled(); locked.focus(); fireEvent.click(locked);
            fireEvent.keyDown(locked,{key:"Enter"}); fireEvent.keyDown(locked,{key:" "});
            expect(active).toHaveFocus(); expect(screen.queryAllByRole("alert")).toHaveLength(0);
        }
        expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
        expect(screen.getByRole("button", {name:"Step 1: Photos"})).toHaveAttribute("data-complete", "false");
        step("Continue"); expect(submitCalls()).toHaveLength(0); expect(screen.getAllByRole("alert")).toHaveLength(1); expect(document.getElementById("mobile-media_ids")).toHaveFocus();
        step("Add ready photo"); step("Continue");
        expect(screen.getByRole("combobox", {name:"Brand"})).toHaveValue("");
        step("Continue"); expect(screen.getByRole("combobox", {name:"Brand"})).toHaveFocus(); expect(screen.getAllByRole("alert")).toHaveLength(3); expect(screen.queryByText("Check the highlighted details")).toBeNull(); expect(screen.queryByText("Choose the condition that best fits.")).toBeNull();
        expect(screen.getByRole("button", {name:"Step 2: Phone details"})).toHaveAttribute("data-complete", "false");
        expect(screen.getByRole("button", {name:"Step 1: Photos"})).toHaveAttribute("data-complete", "true");
    });
    it("does not initialize or overwrite a pending recovery before explicit Resume", async () => { m.read.mockResolvedValue(recovered()); render(<MobilePhoneForm ownerId={owner} catalogue={catalogue} cities={[]}/>); await screen.findByRole("button", { name: "Resume saved listing" }); await act(async () => { await new Promise(r => setTimeout(r, 400)); }); expect(m.write).not.toHaveBeenCalled(); expect(m.fetch).not.toHaveBeenCalled(); step("Resume saved listing"); await waitFor(() => expect(screen.getByLabelText("Price (₹)")).toHaveValue("24500")); await waitFor(() => expect(m.write).toHaveBeenCalledWith(owner, expect.objectContaining({ step: 0, photos: [{ id: model, state: "ready", blob: undefined }] }))); expect(JSON.parse(m.fetch.mock.calls[0][1].body).session_id).toBe(owner); expect(screen.getByRole("button", {name:"Step 1: Photos"})).toHaveAttribute("aria-current", "step"); step("5 Location"); expect(screen.queryByRole("alert")).toBeNull(); step("Continue"); step("Continue"); step("Continue"); expect(screen.getByLabelText("Description")).toHaveFocus(); expect(screen.getAllByRole("alert")).toHaveLength(1); });
    it("Start fresh creates a different session with no recovered values", async () => { m.read.mockResolvedValue(recovered()); render(<MobilePhoneForm ownerId={owner} catalogue={catalogue} cities={[]}/>); await screen.findByRole("button", { name: "Start fresh" }); step("Start fresh"); await screen.findByRole("button", { name: "Add ready photo" }); expect(JSON.parse(m.fetch.mock.calls[0][1].body).session_id).not.toBe(owner); step("4 Price"); expect(screen.getByLabelText("Price (₹)")).toHaveValue(""); });
    it("ignores stale or other-owner recovery", async () => { m.read.mockResolvedValue({ ...recovered(), owner: brand }); await ready(); expect(screen.queryByText("Resume saved listing")).toBeNull(); expect(m.read).toHaveBeenCalledWith(owner); });
    it("retries initialization once with the same session", async () => { let finish!: () => void; const pending = new Promise<void>(r => { finish = r; }); let attempts = 0; m.fetch.mockImplementation(async (url: string) => { if (url === "/api/post-ad/sessions") {
        if (++attempts === 1)
            return { ok: false, json: async () => ({ error: "Session unavailable." }) };
        await pending;
    } return { ok: true, json: async () => ({ session: { state: "open" }, media: [] }) }; }); render(<MobilePhoneForm ownerId={owner} catalogue={catalogue} cities={[]}/>); const retry = await screen.findByRole("button", { name: "Retry photo upload" }); fireEvent.click(retry); fireEvent.click(retry); const requests = m.fetch.mock.calls.filter(([url]) => url === "/api/post-ad/sessions"); expect(requests).toHaveLength(2); expect(requests[0][1].body).toBe(requests[1][1].body); finish(); await screen.findByRole("button", { name: "Add ready photo" }); });
    it("keeps manual title and offers automatic reset", async () => { await ready(); fill(); step("3 Condition"); expect(screen.getByLabelText("Title")).toHaveValue("Apple iPhone 15 · 128 GB · Good condition"); fireEvent.change(screen.getByLabelText("Title"), { target: { value: "My carefully used phone" } }); step("Like new"); expect(screen.getByLabelText("Title")).toHaveValue("My carefully used phone"); step("Use automatically generated title"); expect(screen.getByLabelText("Title")).toHaveValue("Apple iPhone 15 · 128 GB · Like new"); });
    it("blocks review when photos are missing and focuses the photo group", async () => { await ready(); step("Continue"); expect(screen.getByRole("alert")).toHaveTextContent(/photo/i); expect(document.getElementById("mobile-media_ids")).toHaveFocus(); expect(submitCalls()).toHaveLength(0); });
    it("submits giveaway only from final review and displays one preview", async () => { await ready(); fill(); step("Give away"); step("5 Location"); step("Review listing"); expect(screen.getAllByRole("complementary", { name: "Buyer preview" })).toHaveLength(1); expect(screen.getByRole("radio")).toBeChecked(); expect(submitCalls()).toHaveLength(0); step("Submit for review"); await waitFor(() => expect(m.replace).toHaveBeenCalledWith(`/account/listings/${owner}/edit`)); expect(JSON.parse(submitCalls()[0][1].body)).toMatchObject({ trade: "giveaway", price_paise: 0, negotiable: false, plan_id: "free-v1" }); await act(async () => { await new Promise(r => setTimeout(r, 450)); }); expect(m.write.mock.calls.at(-1)).toEqual([owner, null]); });
    it("keeps the session and recovery after a rejected submission", async () => { await ready(); fill(); step("5 Location"); step("Review listing"); m.fetch.mockImplementation(async (url: string) => ({ ok: url !== "/api/post-ad/submit", json: async () => url === "/api/post-ad/submit" ? { error: "Submission unavailable" } : { session: { state: "open" }, media: [] } })); step("Submit for review"); await screen.findByText("Submission unavailable"); expect(m.replace).not.toHaveBeenCalled(); expect(m.write.mock.calls.some(([, v]) => v === null)).toBe(false); });
    it("maintenance prevents progression and submission", async () => { await ready(true); expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled(); expect(screen.getByRole("alert")).toHaveTextContent(/temporarily|maintenance|pause/i); expect(submitCalls()).toHaveLength(0); });
 it("preserves edits when router or catalogue references change for the same account",async()=>{
  const view=render(<MobilePhoneForm ownerId={owner} catalogue={catalogue} cities={[]}/>);
  await screen.findByRole("button",{name:"Add ready photo"});step("Add ready photo");step("2 Phone details");choose("Brand","Apple");choose("Model","iPhone 15");
  view.rerender(<MobilePhoneForm ownerId={owner} catalogue={{...catalogue,revision:"new-reference"}} cities={[]}/>);
  expect(screen.getByRole("combobox",{name:"Model"})).toHaveValue("iPhone 15");expect(m.fetch.mock.calls.filter(([url])=>url==="/api/post-ad/sessions")).toHaveLength(1);
 });

 it("flushes the latest edits on route exit without waiting for the autosave timer",async()=>{
  const view=render(<MobilePhoneForm ownerId={owner} catalogue={catalogue} cities={[]}/>);await screen.findByRole("button",{name:"Add ready photo"});fill();fireEvent.change(screen.getByLabelText("Price (₹)"),{target:{value:"12345"}});view.unmount();await waitFor(()=>expect(m.write).toHaveBeenCalledWith(owner,expect.objectContaining({step:3,priceText:"12345"})));
 });
 it("never flushes a pending recovered draft on unmount",async()=>{
  m.read.mockResolvedValue(recovered());const view=render(<MobilePhoneForm ownerId={owner} catalogue={catalogue} cities={[]}/>);await screen.findByRole("button",{name:"Resume saved listing"});view.unmount();await Promise.resolve();expect(m.write).not.toHaveBeenCalled();expect(m.fetch).not.toHaveBeenCalled();
 });

});

it("invalidating earlier details removes completion and blocks later links while Back remains usable", async () => {
 await ready(); fill(); step("2 Phone details"); choose("Brand","Apple");
 expect(screen.getByRole("button",{name:"Step 2: Phone details"})).toHaveAttribute("data-complete","false");
 step("5 Location"); expect(screen.queryByRole("alert")).toBeNull(); expect(screen.getByRole("button",{name:"Step 5: Location"})).toBeDisabled(); step("Continue"); expect(screen.getByRole("combobox",{name:"Model"})).toHaveFocus();
 step("Back"); expect(screen.getByRole("button",{name:"Step 1: Photos"})).toHaveAttribute("aria-current","step");
 expect(submitCalls()).toHaveLength(0);
});

it("Review/Submit returns to the earliest invalid step with only its inline errors", async () => {
 await ready(); fill(); step("5 Location"); step("Review listing");
 m.fetch.mockImplementation(async (url:string) => ({ok:true,json:async()=>({session:{state:"open"},media:url.endsWith("/media")?[{id:"44444444-4444-4444-8444-444444444444",state:"removed",url:null}]:[]})}));
 fireEvent.focus(window);
 await waitFor(()=>expect(screen.getByRole("button",{name:"Step 1: Photos"})).toHaveAttribute("data-complete","false"));
 step("Submit for review");
 expect(document.getElementById("mobile-media_ids")).toHaveFocus();
 expect(screen.getAllByRole("alert")).toHaveLength(1);
 expect(screen.getByRole("alert")).toHaveTextContent(/photo/i);
 expect(screen.queryByText("Check the highlighted details")).toBeNull();
 expect(submitCalls()).toHaveLength(0);
});
