import { expect, it, vi } from "vitest";
import { loadSpecialistBindings } from "@/lib/listings/posting-capabilities-server";
import type { SupabaseClient } from "@supabase/supabase-js";
const id = "11111111-1111-4111-8111-111111111111";
const env = { POST_AD_MOBILES_V2_ENABLED: "true", POST_AD_TABLETS_V1_ENABLED: "true", POST_AD_WEARABLES_V1_ENABLED: "true" };
function client(rows: Record<string, unknown>) {
  const from = vi.fn((table: string) => {
    const q = { select: vi.fn(() => q), eq: vi.fn(() => q), maybeSingle: vi.fn(async () => rows[table]) };
    return q;
  });
  return { client: { from } as unknown as SupabaseClient, from };
}
it("loads no release rows with feature flags off", async () => {
  const c = client({}); expect(await loadSpecialistBindings(c.client, {})).toEqual({}); expect(c.from).not.toHaveBeenCalled();
});
it("independently validates release UUIDs and contains errors per family", async () => {
  const c = client({
    posting_category_definitions: { data: { listing_category_id: id, enabled: true }, error: null },
    tablet_release_v1: { data: { category_id: "invalid", enabled: true }, error: null },
    wearable_release_v1: { data: { category_id: id, enabled: true }, error: { message: "denied" } },
  });
  expect(await loadSpecialistBindings(c.client, env)).toEqual({ "specialist:phone": id });
  expect(c.from.mock.calls.map(call => call[0])).toEqual(["posting_category_definitions", "tablet_release_v1", "wearable_release_v1"]);
  expect(c.from.mock.results[0].value.select).toHaveBeenCalledWith("listing_category_id,enabled");
  expect(c.from.mock.results[0].value.eq).toHaveBeenCalledWith("version", 2);
});
it("wearables remain independent of the phone/tablet environment gates", async () => {
  const c = client({ wearable_release_v1: { data: { category_id: id, enabled: true }, error: null } });
  expect(await loadSpecialistBindings(c.client, { POST_AD_WEARABLES_V1_ENABLED: "true" })).toEqual({ "specialist:wearable": id });
  expect(c.from).toHaveBeenCalledTimes(1);
});
it("contains query exceptions and disabled release rows", async () => {
  const c = client({ tablet_release_v1: { data: { category_id: id, enabled: false }, error: null } });
  expect(await loadSpecialistBindings(c.client, env)).toEqual({});
  c.from.mockImplementation(() => { throw Error("offline"); });
  expect(await loadSpecialistBindings(c.client, env)).toEqual({});
});
