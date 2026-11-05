import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import PreListingMediaUploader from "@/components/listings/PreListingMediaUploader";
const m = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock("@/lib/listings/posting-recovery", () => ({ compressPostingPhoto: vi.fn() }));
const id = "11111111-1111-4111-8111-111111111111", photo = "44444444-4444-4444-8444-444444444444";
beforeEach(() => { vi.clearAllMocks(); m.fetch.mockResolvedValue({ ok: true, json: async () => ({ success: true }) }); vi.stubGlobal("fetch", m.fetch); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const remove = async (props: Partial<React.ComponentProps<typeof PreListingMediaUploader>> = {}) => {
  render(<PreListingMediaUploader photos={[{ id: photo, state: "ready" }]} onChange={vi.fn()} sessionId={id} disabled={false} onReady={async () => {}} {...props}/>);
  fireEvent.click(screen.getByRole("button", { name: "Remove photo 1" })); await waitFor(() => expect(m.fetch).toHaveBeenCalled());
  return m.fetch.mock.calls[0];
};
describe("shared uploader media base (Mobile Phones regression)", () => {
  it("defaults to the unchanged phone session endpoint", async () => {
    const [url, init] = await remove(); expect(url).toBe(`/api/post-ad/sessions/${id}/media`); expect(init.method).toBe("DELETE");
  });
  it("uses the wearable endpoint only when mediaBase is passed", async () => {
    const [url] = await remove({ mediaBase: "/api/post-ad/wearables/sessions" }); expect(url).toBe(`/api/post-ad/wearables/sessions/${id}/media`);
  });
});
