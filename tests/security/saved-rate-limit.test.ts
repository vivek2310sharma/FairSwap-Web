import { describe, it, expect, vi, beforeEach } from "vitest";
import { createAnonymousBudget } from "@/lib/security/anonymous-budget";
import { savedLookupBudget } from "@/lib/favourites/saved-budget";
import { getSavedListingsAction } from "@/app/saved/actions";
import { listingRow, makeServiceMock, mediaRow, sellerRow, uuid } from "../helpers/saved-db-mock";

const hdrs = vi.hoisted(() => ({ ip: "203.0.113.7" as string | null }));
const service = vi.hoisted(() => ({ client: null as unknown }));
vi.mock("next/headers", () => ({ headers: async () => ({ get: (k: string) => (k === "x-forwarded-for" ? hdrs.ip : null) }) }));
vi.mock("@/lib/supabase/service", () => ({ createServiceRoleClient: () => service.client }));

describe("anonymous budget", () => {
  const opts = { windowMs: 1000, maxRequests: 3, maxCost: 10, maxGlobalCost: 15 };

  it("allows up to the request cap, then blocks with a retry hint, then recovers after the window", () => {
    let t = 0;
    const budget = createAnonymousBudget(opts, () => t);
    for (let i = 0; i < 3; i++) expect(budget.check("a")).toEqual({ allowed: true });
    const blocked = budget.check("a");
    expect(blocked.allowed).toBe(false);
    expect(blocked.allowed === false && blocked.retryAfterSeconds).toBeGreaterThanOrEqual(1);
    t = 1001;
    expect(budget.check("a")).toEqual({ allowed: true });
  });

  it("charges by cost, so one big lookup consumes the budget a flood of small ones would", () => {
    const budget = createAnonymousBudget(opts, () => 0);
    expect(budget.check("a", 8).allowed).toBe(true);
    expect(budget.check("a", 3).allowed).toBe(false);
    expect(budget.check("a", 2).allowed).toBe(true);
  });

  it("keeps clients independent but caps the instance total", () => {
    const budget = createAnonymousBudget(opts, () => 0);
    expect(budget.check("a", 8).allowed).toBe(true);
    expect(budget.check("b", 7).allowed).toBe(true); // global now 15
    expect(budget.check("c", 1).allowed).toBe(false); // a fresh client is still refused: global cap
  });

  it("does not grow without bound under many distinct keys", () => {
    const budget = createAnonymousBudget({ ...opts, maxGlobalCost: 1e9, maxRequests: 1e9, maxCost: 1e9 }, () => 0);
    for (let i = 0; i < 20_000; i++) budget.check(`k${i}`);
    expect(budget.check("late").allowed).toBe(true);
  });
});

describe("getSavedListingsAction under repeated anonymous requests", () => {
  beforeEach(() => {
    savedLookupBudget.reset();
    hdrs.ip = "203.0.113.7";
    service.client = makeServiceMock({ listings: [listingRow(1)], user_accounts: [sellerRow(1)], listing_media: [mediaRow(1)] }, { variant: "prod" }).client;
  });

  it("serves normal use, then refuses a flood from one client without touching the database again", async () => {
    const results = [];
    for (let i = 0; i < 20; i++) results.push(await getSavedListingsAction([uuid(1)]));
    expect(results.slice(0, 12).every((r) => r.ok)).toBe(true);
    const refused = results.slice(12);
    expect(refused.every((r) => !r.ok && r.rateLimited === true)).toBe(true);
    expect(refused[0]).toMatchObject({ ok: false, rateLimited: true });
    expect(!refused[0].ok && refused[0].retryAfterSeconds).toBeGreaterThanOrEqual(1);
  });

  it("charges cost by id count: a few 50-id lookups exhaust the budget", async () => {
    const fifty = Array.from({ length: 50 }, (_, i) => uuid(i + 1));
    expect((await getSavedListingsAction(fifty)).ok).toBe(true);
    expect((await getSavedListingsAction(fifty)).ok).toBe(true);
    const third = await getSavedListingsAction(fifty);
    expect(third.ok).toBe(false);
    expect(!third.ok && third.rateLimited).toBe(true);
  });

  it("does not let junk payloads be free", async () => {
    for (let i = 0; i < 12; i++) expect((await getSavedListingsAction("not-an-array")).ok).toBe(false);
    const next = await getSavedListingsAction([uuid(1)]);
    expect(!next.ok && next.rateLimited).toBe(true);
  });

  it("does not share one client's refusal with another", async () => {
    for (let i = 0; i < 13; i++) await getSavedListingsAction([uuid(1)]);
    hdrs.ip = "198.51.100.9";
    expect((await getSavedListingsAction([uuid(1)])).ok).toBe(true);
  });

  it("keeps the 50-id input limit independently of the budget", async () => {
    const result = await getSavedListingsAction(Array.from({ length: 51 }, (_, i) => uuid(i + 1)));
    expect(result.ok).toBe(false);
  });

  it("the budget reset hook is not exposed through the server-action module", async () => {
    const actions = await import("@/app/saved/actions");
    expect(Object.keys(actions)).toEqual(["getSavedListingsAction"]);
  });
});
