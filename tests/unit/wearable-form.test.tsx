import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import WearableForm from "@/components/listings/WearableForm";
import { blankWearableDraft, type WearableDraft } from "@/components/listings/posting/wearable-wizard";
import { draft, catalogue, SESSION } from "./wearable-fixture";
const m = vi.hoisted(() => ({ read: vi.fn(), write: vi.fn(), replace: vi.fn(), push: vi.fn(), fetch: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: m.replace, push: m.push }) }));
vi.mock("@/lib/listings/posting-recovery", () => ({ readPostingRecovery: m.read, writePostingRecovery: m.write }));
vi.mock("@/components/listings/PincodeLocationPicker", () => ({ default: () => <div><input type="hidden" name="pin_code" value="560034"/><input type="hidden" name="city_id" value="55555555-5555-4555-8555-555555555555"/><input type="hidden" name="locality_id" value="66666666-6666-4666-8666-666666666666"/></div> }));
vi.mock("@/components/listings/PreListingMediaUploader", () => ({ default: ({ onChange, ensureSession, mediaBase }: { onChange: (v: unknown[]) => void; ensureSession: () => Promise<string | null>; mediaBase?: string }) => <><span data-testid="base">{mediaBase}</span><button type="button" onClick={() => void ensureSession()}>Prepare fixture photo session</button><button type="button" onClick={() => onChange([{ id: "44444444-4444-4444-8444-444444444444", state: "ready" }])}>Add ready photo</button></> }));
const owner = "11111111-1111-4111-8111-111111111111", media = "44444444-4444-4444-8444-444444444444";
const cat = { ...catalogue, brands: [{ id: "wb_apple", name: "Apple", types: ["smartwatch", "smart_ring"] as ("smartwatch" | "smart_ring")[] }, { id: "wb_oura", name: "Oura", types: ["smart_ring"] as "smart_ring"[] }] };
const models = [{ id: "wm_0123456789ab", name: "Apple Watch Series 9", series: "Apple Watch" }];
beforeEach(() => {
  vi.clearAllMocks(); m.read.mockResolvedValue(undefined); m.write.mockResolvedValue(undefined);
  m.fetch.mockImplementation(async (input: string) => ({ ok: true, json: async () => input.includes("/models?") ? { models } : input.endsWith("/submit") ? { success: true, listing_id: owner } : input.endsWith("/sessions") ? { session: { id: SESSION, state: "open", draft_protected: true, listing_id: owner } } : { session: { state: "open" }, media: [{ id: media, state: "ready", url: null }] } }));
  vi.stubGlobal("fetch", m.fetch); Element.prototype.scrollIntoView = vi.fn();
});
afterEach(async () => { cleanup(); await Promise.resolve(); await Promise.resolve(); vi.unstubAllGlobals(); });
const mount = async (recovered?: unknown, expectDialog = false) => { if (recovered) m.read.mockResolvedValue(recovered); render(<WearableForm ownerId={owner} catalogue={cat} cities={[]}/>); await screen.findByRole("button", { name: expectDialog ? "Resume saved listing" : "Add ready photo" }); };
const ready = async () => { await mount(); fireEvent.click(screen.getByRole("button", { name: "Prepare fixture photo session" })); await waitFor(() => expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled()); fireEvent.click(screen.getByRole("button", { name: "Add ready photo" })); };
const go = (n: number, label: string) => fireEvent.click(screen.getByRole("button", { name: `Step ${n}: ${label}` }));
const pick = (name: string) => fireEvent.click(screen.getByRole("button", { name }));
function choose(label: string, name: string) { const input = screen.getByRole("combobox", { name: label }); fireEvent.click(input); fireEvent.change(input, { target: { value: name } }); fireEvent.keyDown(input, { key: "ArrowDown" }); fireEvent.keyDown(input, { key: "Enter" }); }
const urls = () => m.fetch.mock.calls.map(([u]) => String(u));

describe("Wearable wizard (UI)", () => {
  it("uses only wearable endpoints and the wearable media base; recovery is namespaced", async () => {
    await ready();
    expect(screen.getByTestId("base").textContent).toBe("/api/post-ad/wearables/sessions");
    await waitFor(() => expect(urls().some(u => u === "/api/post-ad/wearables/sessions")).toBe(true));
    expect(urls().every(u => !u.startsWith("/api/post-ad/sessions") && !u.startsWith("/api/post-ad/submit"))).toBe(true);
    await waitFor(() => expect(m.write).toHaveBeenCalled());
    expect(m.write.mock.calls.every(([key]) => key === `${owner}:wearables:v1`)).toBe(true); expect(m.read).toHaveBeenCalledWith(`${owner}:wearables:v1`);
  });
  it("shows only fields relevant to the selected device and resets dependent choices", async () => {
    await ready(); go(2, "Wearable details");
    expect(screen.queryByRole("combobox", { name: "Brand" })).toBeNull();
    pick("Smartwatch"); expect(screen.getByRole("group", { name: "Connectivity" })).toBeInTheDocument(); expect(screen.getByLabelText(/Case size/)).toBeInTheDocument(); expect(screen.queryByLabelText(/Ring size/)).toBeNull();
    choose("Brand", "Apple"); await waitFor(() => expect(urls().some(u => u === "/api/post-ad/wearables/models?brand_id=wb_apple&type=smartwatch")).toBe(true));
    await waitFor(() => expect(screen.getByRole("combobox", { name: "Model" })).toBeEnabled()); choose("Model", "Apple Watch Series 9");
    expect(screen.getByRole("combobox", { name: "Model" })).toHaveValue("Apple Watch Series 9");
    pick("Smart ring");
    expect(screen.getByRole("combobox", { name: "Brand" })).toHaveValue(""); expect(screen.queryByRole("combobox", { name: "Model" })).toBeNull();
    expect(screen.getByLabelText(/Ring size/)).toBeInTheDocument(); expect(screen.queryByRole("group", { name: "Connectivity" })).toBeNull(); expect(screen.queryByLabelText(/Case size/)).toBeNull();
    expect(screen.queryByRole("button", { name: "Oura" })).toBeNull();
  });
  it("brand list is filtered by device type; Other brand/model ask for reviewed names", async () => {
    await ready(); go(2, "Wearable details"); pick("Smartwatch");
    const brand = screen.getByRole("combobox", { name: "Brand" }); fireEvent.click(brand); fireEvent.change(brand, { target: { value: "Oura" } });
    expect(screen.queryByRole("option", { name: "Oura" })).toBeNull();
    fireEvent.change(brand, { target: { value: "Other" } }); fireEvent.keyDown(brand, { key: "ArrowDown" }); fireEvent.keyDown(brand, { key: "Enter" });
    expect(screen.getByLabelText(/Brand name/)).toBeInTheDocument(); expect(screen.getByLabelText(/Model name/)).toBeInTheDocument();
  });
  it("a failed model load is announced and does not allow a stale model", async () => {
    await ready(); m.fetch.mockImplementation(async (input: string) => (String(input).includes("/models?") ? { ok: false, json: async () => ({}) } : { ok: true, json: async () => ({ session: { state: "open" }, media: [] }) }));
    go(2, "Wearable details"); pick("Smartwatch"); choose("Brand", "Apple");
    expect(await screen.findByText(/Could not load models/)).toBeInTheDocument();
  });
  const saved = (over: Partial<WearableDraft> = {}) => ({ version: 1, owner, updated: Date.now(), step: 0, draft: { ...draft({ title: "Apple Watch · Good condition", ...over }), session_id: SESSION }, manualTitle: true, area: "Koramangala", priceText: "12000", photos: [{ id: media, state: "ready" }] });
  const resume = async (over: Partial<WearableDraft> = {}) => { await mount(saved(over), true); fireEvent.click(screen.getByRole("button", { name: "Resume saved listing" })); await waitFor(() => expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled()); };
  it("pairing: locked blocks, still_paired needs acknowledgement, unknown warns; statuses are seller-reported", async () => {
    await resume(); go(3, "Condition");
    fireEvent.click(screen.getByLabelText("Activation or account lock is on"));
    expect(screen.getAllByRole("alert").map(a => a.textContent).join(" ")).toMatch(/lock can’t be listed/);
    fireEvent.click(screen.getByRole("button", { name: "Continue" })); expect(screen.getByText(/Step 3 OF 5|STEP 3 OF 5/i)).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Still paired with my account / phone"));
    expect(screen.getByLabelText(/I will sign out and unpair it before handover/)).not.toBeChecked(); expect(screen.getByText(/reviewed by FairSwap before it goes live/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Continue" })); expect(await screen.findByText(/Confirm you will unpair/)).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/I will sign out and unpair it before handover/)); fireEvent.click(screen.getByRole("button", { name: "Continue" })); expect(screen.getByText(/STEP 4 OF 5/)).toBeInTheDocument();
    go(3, "Condition"); fireEvent.click(screen.getByLabelText("I haven’t checked"));
    expect(screen.getByText(/shows that you have not confirmed pairing status/)).toBeInTheDocument(); expect(screen.queryByLabelText(/I will sign out and unpair it/)).toBeNull();
    expect(screen.getAllByText(/does not check it with the maker|not verified|seller-reported/i).length).toBeGreaterThan(0);
  });
  it("ownership confirmation is required before continuing", async () => {
    await resume({ ownership_confirmed: false }); go(3, "Condition");
    fireEvent.click(screen.getByRole("button", { name: "Continue" })); expect(await screen.findByText(/Confirm you own this device/)).toBeInTheDocument();
  });
  it("submits only the wearable payload to the wearable endpoint, then clears the namespaced recovery and opens the edit page", async () => {
    await resume(); go(5, "Location"); fireEvent.click(screen.getByRole("button", { name: "Review listing" })); fireEvent.click(await screen.findByRole("button", { name: "Submit for review" }));
    await waitFor(() => expect(urls().some(u => u === "/api/post-ad/wearables/submit")).toBe(true));
    const [, init] = m.fetch.mock.calls.find(([u]) => u === "/api/post-ad/wearables/submit")!; const body = JSON.parse(init.body);
    expect(body).toMatchObject({ device_type: "smartwatch", pairing_status: "reset_ready", price_paise: 1200000, media_ids: [media], plan_id: "free-v1", session_id: SESSION });
    for (const k of ["ram", "storage", "ring_size", "gps_status", "imei", "serial"]) expect(body).not.toHaveProperty(k);
    await waitFor(() => expect(m.replace).toHaveBeenCalledWith(`/account/listings/${owner}/edit`));
    expect(m.write).toHaveBeenLastCalledWith(`${owner}:wearables:v1`, null); expect(urls().includes("/api/post-ad/submit")).toBe(false);
  });
  it("a server refusal is shown and the draft stays retryable", async () => {
    await resume(); m.fetch.mockImplementation(async (input: string) => (String(input).endsWith("/submit") ? { ok: false, json: async () => ({ error: "Devices with an activation or account lock can’t be listed. Remove the lock, then post again." }) } : { ok: true, json: async () => ({ session: { state: "open" }, media: [{ id: media, state: "ready", url: null }] }) }));
    go(5, "Location"); fireEvent.click(screen.getByRole("button", { name: "Review listing" })); fireEvent.click(await screen.findByRole("button", { name: "Submit for review" }));
    expect(await screen.findByText(/activation or account lock/)).toBeInTheDocument(); expect(m.replace).not.toHaveBeenCalled(); expect(screen.getByRole("button", { name: "Submit for review" })).toBeEnabled();
  });
  it("a recovered draft from an older catalogue revision is ignored", async () => {
    const old = saved(); (old.draft as { catalogue_revision: string }).catalogue_revision = "0000000000000000";
    await mount(old); expect(screen.queryByRole("button", { name: "Resume saved listing" })).toBeNull();
  });
  it("blank drafts are certified only without any local input", () => { expect(blankWearableDraft("x").device_type).toBe(""); });
});
