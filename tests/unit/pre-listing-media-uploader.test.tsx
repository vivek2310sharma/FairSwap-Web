import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import PreListingMediaUploader, { type PostingPhoto } from "@/components/listings/PreListingMediaUploader";
const m = vi.hoisted(() => ({ compress: vi.fn(), fetch: vi.fn() }));
vi.mock("@/lib/listings/posting-recovery", () => ({ compressPostingPhoto: m.compress }));
const id = "11111111-1111-4111-8111-111111111111";
function Host() { const [photos, setPhotos] = React.useState<PostingPhoto[]>([]); return <PreListingMediaUploader photos={photos} onChange={setPhotos} sessionId={id} disabled={false} onReady={async () => { }}/>; }
beforeEach(() => { vi.clearAllMocks(); m.compress.mockResolvedValue(new Blob(["sanitized"], { type: "image/webp" })); vi.stubGlobal("fetch", m.fetch); vi.stubGlobal("URL", class extends URL {
    static createObjectURL = vi.fn(() => "blob:fixture");
    static revokeObjectURL = vi.fn();
}); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
describe("Production media uploader", () => {
    it("retains the compressed blob and media ID through failure/retry and successful deletion", async () => { m.fetch.mockResolvedValueOnce({ ok: false, json: async () => ({ error: "Temporary failure" }) }).mockResolvedValueOnce({ ok: true, json: async () => ({}) }).mockResolvedValueOnce({ ok: true }); render(<Host />); fireEvent.change(screen.getByLabelText("Choose photo files"), { target: { files: [new File(["image"], "phone.png", { type: "image/png" })] } }); await screen.findByText(/Ready to upload$/); fireEvent.click(screen.getByRole("button", { name: "Upload / retry photos" })); await screen.findByText("Temporary failure"); const first = m.fetch.mock.calls[0][1].body as FormData; expect(first.get("file")).toBeInstanceOf(Blob); fireEvent.click(screen.getByRole("button", { name: "Upload / retry photos" })); await screen.findByText("Cover · Ready"); const second = m.fetch.mock.calls[1][1].body as FormData; expect(second.get("media_id")).toBe(first.get("media_id")); expect((second.get("file") as File).type).toBe("image/webp"); fireEvent.click(screen.getByRole("button", { name: "Remove photo 1" })); await waitFor(() => expect(screen.queryByText("Cover · Ready")).toBeNull()); expect(m.fetch.mock.calls[2][1].method).toBe("DELETE"); });
    it("rejects more than eight files before compression or upload", async () => { render(<Host />); fireEvent.change(screen.getByLabelText("Choose photo files"), { target: { files: Array.from({ length: 9 }, () => new File(["x"], "x.png", { type: "image/png" })) } }); expect(await screen.findByRole("alert")).toHaveTextContent("at most 8"); expect(m.compress).not.toHaveBeenCalled(); expect(m.fetch).not.toHaveBeenCalled(); });
    it("does not remove a photo locally when deletion fails", async () => { m.fetch.mockResolvedValue({ ok: false }); render(<PreListingMediaUploader photos={[{ id, state: "ready" }]} onChange={vi.fn()} sessionId={id} disabled={false} onReady={async () => { }}/>); fireEvent.click(screen.getByRole("button", { name: "Remove photo 1" })); expect(await screen.findByRole("alert")).toHaveTextContent("Could not remove"); expect(screen.getByText("Cover · Ready")).toBeVisible(); });
});

it("keeps selection local and retains the same blob/id when session allocation fails",async()=>{
 const ensure=vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(id);
 function LazyHost(){const [photos,setPhotos]=React.useState<PostingPhoto[]>([]);return <PreListingMediaUploader photos={photos} onChange={setPhotos} sessionId={id} disabled={false} ensureSession={ensure} onReady={async()=>{}}/>;}
 m.fetch.mockResolvedValue({ok:true,json:async()=>({})});render(<LazyHost/>);
 fireEvent.change(screen.getByLabelText("Choose photo files"),{target:{files:[new File(["image"],"phone.png",{type:"image/png"})]}});await screen.findByText("Cover · Ready to upload");
 expect(ensure).not.toHaveBeenCalled();expect(m.fetch).not.toHaveBeenCalled();fireEvent.click(screen.getByRole("button",{name:"Upload / retry photos"}));await waitFor(()=>expect(ensure).toHaveBeenCalledOnce());
 expect(m.fetch).not.toHaveBeenCalled();expect(screen.getByText("Cover · Ready to upload")).toBeVisible();
 fireEvent.click(screen.getByRole("button",{name:"Upload / retry photos"}));await screen.findByText("Cover · Ready");expect(m.fetch).toHaveBeenCalledOnce();
});
it("removes an unallocated pending photo locally without a session or media request",async()=>{
 render(<Host/>);fireEvent.change(screen.getByLabelText("Choose photo files"),{target:{files:[new File(["image"],"phone.png",{type:"image/png"})]}});await screen.findByText("Cover · Ready to upload");
 fireEvent.click(screen.getByRole("button",{name:"Remove photo 1"}));expect(screen.queryByText("Cover · Ready to upload")).toBeNull();expect(m.fetch).not.toHaveBeenCalled();
});

it("Add photos starts preparation only on explicit activation without awaiting the file chooser",()=>{
 const prepare=vi.fn(()=>new Promise<void>(()=>{}));render(<PreListingMediaUploader photos={[]} onChange={vi.fn()} sessionId={id} disabled={false} onReady={async()=>{}} onPrepareSession={prepare}/>);
 const picker=vi.spyOn(screen.getByLabelText("Choose photo files"),"click");expect(prepare).not.toHaveBeenCalled();fireEvent.click(screen.getByRole("button",{name:"Add photos"}));expect(prepare).toHaveBeenCalledOnce();expect(picker).toHaveBeenCalledOnce();expect(m.fetch).not.toHaveBeenCalled();
});
