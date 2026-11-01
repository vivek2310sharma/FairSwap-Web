import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GALLERY_TTL_MS, invalidateGallery, requestGallery, resetGalleryCache } from "@/lib/listings/gallery-client";

const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const m = (n: number) => `0000000${n}-0000-4000-8000-000000000000`;
const fetchMock = vi.fn();

const respond = (galleries: Record<string, string[]>) => fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ galleries }) });
const flush = async () => { await vi.advanceTimersByTimeAsync(40); };

beforeEach(() => {
  vi.useFakeTimers();
  resetGalleryCache();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("gallery client cache", () => {
  it("batches cards asking in the same moment into one no-store request", async () => {
    respond({ [A]: [m(1), m(2)], [B]: [m(3), m(4)] });
    const a = requestGallery(A); const b = requestGallery(B);
    await flush();
    expect(await a).toEqual([m(1), m(2)]); expect(await b).toEqual([m(3), m(4)]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain(`ids=${A},${B}`);
    expect(init).toMatchObject({ cache: "no-store", credentials: "omit" });
  });

  it("serves repeat requests from memory within the TTL", async () => {
    respond({ [A]: [m(1), m(2)] });
    const first = requestGallery(A); await flush(); await first;
    await vi.advanceTimersByTimeAsync(GALLERY_TTL_MS - 1000);
    expect(await requestGallery(A)).toEqual([m(1), m(2)]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("expires entries after the TTL so a takedown shows up on the next hover", async () => {
    respond({ [A]: [m(1), m(2)] });
    const first = requestGallery(A); await flush(); await first;
    await vi.advanceTimersByTimeAsync(GALLERY_TTL_MS + 1);
    respond({ [A]: [] }); // moderated meanwhile: the server no longer returns it
    const again = requestGallery(A); await flush();
    expect(await again).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("invalidateGallery forces a refetch", async () => {
    respond({ [A]: [m(1), m(2)] });
    const first = requestGallery(A); await flush(); await first;
    invalidateGallery(A);
    respond({ [A]: [m(1), m(2), m(3)] });
    const again = requestGallery(A); await flush();
    expect(await again).toEqual([m(1), m(2), m(3)]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("never caches failures (network error, 429, 5xx): the next hover retries", async () => {
    fetchMock.mockRejectedValueOnce(new Error("offline"));
    const a = requestGallery(A); await flush();
    expect(await a).toEqual([]);
    fetchMock.mockResolvedValueOnce({ ok: false, status: 429, json: async () => ({}) });
    const b = requestGallery(A); await flush();
    expect(await b).toEqual([]);
    respond({ [A]: [m(1), m(2)] });
    const c = requestGallery(A); await flush();
    expect(await c).toEqual([m(1), m(2)]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("splits more than 24 pending ids across requests", async () => {
    const ids = Array.from({ length: 30 }, (_, i) => `${String(i).padStart(8, "0")}-0000-4000-8000-000000000000`);
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ galleries: {} }) });
    const all = ids.map((id) => requestGallery(id));
    await flush(); await flush();
    await Promise.all(all);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect((fetchMock.mock.calls[0][0] as string).split("ids=")[1].split(",")).toHaveLength(24);
  });
});