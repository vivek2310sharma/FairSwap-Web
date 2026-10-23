import { beforeEach, describe, expect, it, vi } from "vitest";
import { getLocalityPage } from "@/lib/discovery/locality-page";

const { from, range, eq, order, select } = vi.hoisted(() => ({
  from: vi.fn(), range: vi.fn(), eq: vi.fn(), order: vi.fn(), select: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ from }) }));

describe("SRCH-04 bounded RLS locality retrieval", () => {
  const cityId = "11111111-1111-1111-1111-111111111111";
  beforeEach(() => {
    vi.clearAllMocks();
    const query = { select, eq, order, range };
    from.mockReturnValue(query); select.mockReturnValue(query);
    eq.mockReturnValue(query); order.mockReturnValue(query);
  });

  it("retrieves all 1205 options when the server caps each page at 37 rows", async () => {
    const rows = Array.from({ length: 1205 }, (_, i) => ({ id: String(i), city_id: cityId, name: `Area ${i}` }));
    range.mockImplementation(async (start: number, end: number) => ({
      data: rows.slice(start, Math.min(end + 1, start + 37)), error: null, count: rows.length,
    }));
    const retrieved = [];
    let offset: number | null = 0;
    while (offset !== null) {
      const page = await getLocalityPage(cityId, offset);
      retrieved.push(...page.items);
      offset = page.nextOffset;
    }
    expect(retrieved).toEqual(rows);
    expect(range).toHaveBeenCalledTimes(33);
    expect(range.mock.calls.every(([start, end]) => end - start === 99)).toBe(true);
    expect(select).toHaveBeenCalledWith("id, city_id, name", { count: "exact" });
    expect(eq).toHaveBeenCalledWith("city_id", cityId);
    expect(eq).toHaveBeenCalledWith("is_active", true);
    expect(order.mock.calls.slice(0, 2)).toEqual([["name", { ascending: true }], ["id", { ascending: true }]]);
  });

  it("returns a genuine empty district", async () => {
    range.mockResolvedValue({ data: [], error: null, count: 0 });
    expect(await getLocalityPage(cityId, 0)).toEqual({ items: [], nextOffset: null });
  });

  it.each([
    { data: null, error: { message: "backend failure" }, count: null },
    { data: [], error: null, count: null },
    { data: [], error: null, count: 2 },
    { data: [{ id: "x", city_id: "wrong-district", name: "Area" }], error: null, count: 1 },
  ])("fails instead of claiming completeness on an invalid backend result %#", async (result) => {
    range.mockResolvedValue(result);
    await expect(getLocalityPage(cityId, 0)).rejects.toThrow("Unable to load areas");
  });
});
