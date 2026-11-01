import { describe, it, expect, vi, beforeEach } from "vitest";
import { syncGuestFavouritesAction } from "@/app/account/favourites/actions";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const C = "33333333-3333-4333-8333-333333333333";

const getUser = vi.fn();
const rpc = vi.fn();
const from = vi.fn();
let policyCurrent = true;
let visible: Record<string, boolean> = {};
let existing: string[] = [];
const upsert = vi.fn();
const inSpy = vi.fn();
const eqUser = vi.fn();

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn(async () => ({ auth: { getUser }, rpc, from })) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
  policyCurrent = true;
  visible = { [A]: true, [B]: true, [C]: false };
  existing = [];
  getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
  rpc.mockImplementation(async (name: string, args?: { listing_id?: string }) => {
    if (name === "has_current_policy_acceptance") return { data: policyCurrent, error: null };
    if (name === "is_listing_publicly_visible") return { data: visible[args!.listing_id!] === true, error: null };
    throw new Error(`unexpected rpc ${name}`);
  });
  upsert.mockResolvedValue({ error: null });
  from.mockImplementation(() => ({
    select: () => ({
      eq: (...a: unknown[]) => { eqUser(...a); return { in: (_c: string, ids: string[]) => { inSpy(ids); return Promise.resolve({ data: existing.filter((id) => ids.includes(id)).map((listing_id) => ({ listing_id })), error: null }); } }; },
    }),
    upsert,
  }));
});

describe("syncGuestFavouritesAction", () => {
  it("rejects signed-out callers before touching favourites", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    const result = await syncGuestFavouritesAction([A]);
    expect(result.success).toBe(false);
    expect(from).not.toHaveBeenCalled();
  });

  it("requires current policy acceptance and never reads or writes favourites otherwise", async () => {
    policyCurrent = false;
    const result = await syncGuestFavouritesAction([A]);
    expect(result.success).toBe(false);
    expect(result.requiresPolicyReview).toBe(true);
    expect(from).not.toHaveBeenCalled();
  });

  it("validates untrusted input with zod: non-arrays, bad uuids and more than 50 ids are refused", async () => {
    for (const bad of ["x", null, { 0: A }, ["not-a-uuid"], Array.from({ length: 51 }, (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`)]) {
      const result = await syncGuestFavouritesAction(bad);
      expect(result.success).toBe(false);
    }
    expect(upsert).not.toHaveBeenCalled();
  });

  it("accepts exactly 50 ids", async () => {
    const ids = Array.from({ length: 50 }, (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`);
    visible = Object.fromEntries(ids.map((id) => [id, true]));
    const result = await syncGuestFavouritesAction(ids);
    expect(result.success).toBe(true);
    expect(result.added).toBe(50);
  });

  it("de-duplicates, skips non-public listings and reports only the caller's own ids back", async () => {
    const result = await syncGuestFavouritesAction([A, A.toUpperCase(), C]);
    expect(result).toMatchObject({ success: true, added: 1, alreadySaved: 0, skipped: 1, syncedIds: [A], skippedIds: [C] });
    expect(upsert).toHaveBeenCalledTimes(1);
    expect(upsert.mock.calls[0][0]).toEqual([{ user_id: "user-1", listing_id: A }]);
    expect(upsert.mock.calls[0][1]).toMatchObject({ ignoreDuplicates: true });
  });

  it("is idempotent: a repeat sync adds nothing and keeps existing favourites", async () => {
    existing = [A, B];
    const result = await syncGuestFavouritesAction([A, B]);
    expect(result).toMatchObject({ success: true, added: 0, alreadySaved: 2, skipped: 0 });
    expect(upsert).not.toHaveBeenCalled();
  });

  it("always scopes writes to the authenticated user, never an id from the client", async () => {
    await syncGuestFavouritesAction([A, B]);
    expect(eqUser).toHaveBeenCalledWith("user_id", "user-1");
    for (const row of upsert.mock.calls[0][0]) expect(row.user_id).toBe("user-1");
  });

  it("surfaces a database error without claiming success, so the client keeps the device saves", async () => {
    upsert.mockResolvedValue({ error: { message: "rls" } });
    const result = await syncGuestFavouritesAction([A]);
    expect(result.success).toBe(false);
    expect(result.syncedIds).toBeUndefined();
  });
});
