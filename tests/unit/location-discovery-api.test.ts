import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/location/areas/route";
import { POST } from "@/app/api/location/reverse/route";
import { reverseGeocodeArea } from "@/lib/location/reverse-geocode";
import { areasForPincode, findPublicAreas, resolvePublicArea } from "@/lib/location/public-areas";
vi.mock("@/lib/location/public-areas", () => ({ areasForPincode: vi.fn(), findPublicAreas: vi.fn(), resolvePublicArea: vi.fn() }));
const area = { city: "11111111-1111-4111-8111-111111111111", label: "Bengaluru district, Karnataka" };
beforeEach(() => { vi.clearAllMocks(); vi.stubEnv("GOOGLE_GEOCODING_API_KEY", "test-key"); });
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
const get = (q: string) => GET(new NextRequest(`https://fairswap.in/api/location/areas?${q}`));
const post = (body: unknown, origin = "https://fairswap.in") => POST(new NextRequest("https://fairswap.in/api/location/reverse", {
  method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(body),
}));
const coords = { latitude: 12.9, longitude: 77.6 };
const component = (type: string, longText: string, shortText?: string) => ({ types: [type], longText, shortText });
const providerResponse = (components: unknown[]) => ({ ok: true, json: async () => ({ results: [{ addressComponents: components }] }) });

describe("public location API boundaries", () => {
  it.each(["q=56003", "q=000000", "q=x", "q=%25", "q=a&q=b", "city=not-a-uuid", "q=Beng&extra=1"])('rejects invalid or incomplete input %s without querying reference data', async query => {
    const response = await get(query);
    expect([200, 400]).toContain(response.status);
    expect(areasForPincode).not.toHaveBeenCalled(); expect(findPublicAreas).not.toHaveBeenCalled();
  });
  it("reuses PIN resolution and explains broader district scope", async () => {
    vi.mocked(areasForPincode).mockResolvedValue([area]);
    const response = await get("q=560034");
    expect(areasForPincode).toHaveBeenCalledWith("560034");
    expect(await response.json()).toMatchObject({ items: [area], message: expect.stringContaining("not exact-PIN") });
  });
  it("uses bounded name suggestions", async () => {
    vi.mocked(findPublicAreas).mockResolvedValue([area]);
    const response = await get("q=Bengaluru");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ items: [area] });
  });
  it("validates saved public IDs and never silently widens unknown ones", async () => {
    vi.mocked(resolvePublicArea).mockResolvedValue(null);
    expect(await (await get(`city=${area.city}`)).json()).toEqual({ items: [] });
  });
  it("reports reference provider failures", async () => {
    vi.mocked(findPublicAreas).mockRejectedValue(new Error("database details"));
    const response = await get("q=Bengaluru");
    expect(response.status).toBe(503); expect(JSON.stringify(await response.json())).not.toContain("database details");
  });
  it("requires same-origin POST and configured server credential", async () => {
    expect((await post(coords, "https://evil.example")).status).toBe(403);
    vi.stubEnv("GOOGLE_GEOCODING_API_KEY", "");
    expect((await post(coords)).status).toBe(503);
  });
  it.each([{ latitude: 100, longitude: 77 }, { latitude: 1, longitude: 2, extra: true }, {}])("validates coordinates", async value => {
    expect((await post(value)).status).toBe(400);
  });
  it("maps Indian postal reference areas and returns neither coordinates nor provider addresses", async () => {
    const fetcher = vi.fn().mockResolvedValue(providerResponse([component("country", "India", "IN"), component("postal_code", "560034")]));
    vi.stubGlobal("fetch", fetcher); vi.mocked(areasForPincode).mockResolvedValue([area]);
    const response = await post(coords);
    const payload = await response.json();
    expect(payload.items).toEqual([area]); expect(payload).not.toHaveProperty("latitude");
    expect(fetcher.mock.calls[0][1]).toMatchObject({ cache: "no-store", headers: { "X-Goog-Api-Key": "test-key" } });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
  it("does not map foreign postal codes into India", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(providerResponse([component("country", "US", "US"), component("postal_code", "560034")])));
    expect(await reverseGeocodeArea(coords, "test-key")).toEqual([]);
    expect(areasForPincode).not.toHaveBeenCalled();
  });
  it("only maps exact district and state, never a partial metro-name match", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(providerResponse([component("country", "India", "IN"), component("administrative_area_level_2", "Bengaluru"), component("administrative_area_level_1", "Karnataka")])));
    vi.mocked(findPublicAreas).mockResolvedValue([{ ...area, label: "Bengaluru Rural district, Karnataka" }]);
    expect(await reverseGeocodeArea(coords, "test-key")).toEqual([]);
    vi.mocked(findPublicAreas).mockResolvedValue([area]);
    expect(await reverseGeocodeArea(coords, "test-key")).toEqual([area]);
  });
  it("redacts upstream failures", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("coordinates and key must stay private")));
    const response = await post(coords);
    expect(response.status).toBe(502); expect(JSON.stringify(await response.json())).not.toContain("key must");
  });
});
