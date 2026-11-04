// Focused tests for the Wearables E2E teardown and its evidence gate. Run: node --test e2e/wearables/cleanup.selftest.mjs
// Named *.selftest.mjs so neither the repository Playwright config nor Vitest collects it.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { CleanupError, NON_PUBLIC, REMOVAL_REASON, retireListings, scanSearchPages } from "./cleanup.mjs";
import { STEPS } from "./contract.mjs";
import { buildReceipt } from "./write-evidence.mjs";

const SELLER = "seller-1";
const row = (id, status, extra = {}) => ({ id, seller_id: SELLER, status, title: `Wearable check ${id}`, revision: 3, slug: null, ...extra });

/** In-memory stand-in for the database + authorised operations, recording every call. */
function world(initial, opts = {}) {
  const db = new Map(initial.map(r => [r.id, { ...r }]));
  const calls = { remove: [], aal2: 0, sleeps: 0, reads: 0 };
  let leakPolls = opts.leakPolls ?? 0;
  const ports = {
    readOwn: async ({ ids, titles }) => { calls.reads++; return [...db.values()].filter(r => ids.includes(r.id) || (r.seller_id === SELLER && titles.includes(r.title))).map(r => ({ ...r })); },
    ensureModeratorAal2: async () => { calls.aal2++; },
    remove: async r => {
      calls.remove.push({ id: r.id, revision: r.revision, status: r.status });
      if (opts.refuse?.includes(r.id)) return { error: { message: "denied" } };
      if (opts.conflictOnce?.has(r.id)) { opts.conflictOnce.delete(r.id); db.get(r.id).revision += 1; return { error: { message: "MODERATION_REVIEW_CONFLICT" } }; }
      if (db.get(r.id).revision !== r.revision) return { error: { message: "MODERATION_REVIEW_CONFLICT" } };
      if (!opts.noopRemove) db.get(r.id).status = "removed";
      return { error: null };
    },
    discoverable: async rows => (opts.alwaysLeak ? rows.map(r => r.id) : leakPolls-- > 0 ? rows.map(r => r.id) : []),
    sleep: async () => { calls.sleeps++; },
  };
  return { db, calls, ports };
}
const target = (ids, titles) => ({ sellerId: SELLER, ids, titles: titles ?? ids.map(i => `Wearable check ${i}`) });

test("nothing created: no-op, no moderator step-up", async () => {
  const w = world([]);
  const r = await retireListings({ sellerId: SELLER, ids: [], titles: [] }, w.ports);
  assert.equal(r.requested, 0); assert.equal(w.calls.aal2, 0); assert.equal(w.calls.remove.length, 0);
});

test("retires the approved sample and the held listing with reviewed revision/status, one AAL2 step-up", async () => {
  const w = world([row("A", "active"), row("B", "pending_review")]);
  const r = await retireListings(target(["A", "B"]), w.ports);
  assert.deepEqual(r.retired.sort(), ["A", "B"]); assert.equal(w.calls.aal2, 1);
  assert.deepEqual(w.calls.remove, [{ id: "A", revision: 3, status: "active" }, { id: "B", revision: 3, status: "pending_review" }]);
  assert.ok(NON_PUBLIC.includes(w.db.get("A").status) && NON_PUBLIC.includes(w.db.get("B").status));
  assert.match(REMOVAL_REASON, /E2E cleanup/);
});

test("already non-public listings are left alone and need no moderator step-up", async () => {
  const w = world([row("A", "removed"), row("B", "rejected")]);
  const r = await retireListings(target(["A", "B"]), w.ports);
  assert.equal(r.alreadyInactive.length, 2); assert.equal(w.calls.aal2, 0); assert.equal(w.calls.remove.length, 0);
});

test("never acts on a row that is not this run's own test data", async () => {
  for (const foreign of [row("X", "active", { seller_id: "someone-else" }), row("Y", "active", { title: "Real customer phone" })]) {
    const w = world([foreign]);
    await assert.rejects(retireListings({ sellerId: SELLER, ids: [foreign.id], titles: ["Wearable check Y", "Wearable check X"] }, w.ports), e => e instanceof CleanupError && e.code === "FOREIGN_ROW");
    assert.equal(w.calls.remove.length, 0);
  }
});

test("a registered listing that cannot be read fails closed", async () => {
  const w = world([]);
  await assert.rejects(retireListings(target(["A"]), w.ports), e => e.code === "UNREADABLE_LISTING");
});

test("a lost submit response is still cleaned up through its registered title", async () => {
  const w = world([row("A", "pending_review")]);
  const r = await retireListings({ sellerId: SELLER, ids: [], titles: ["Wearable check A"] }, w.ports);
  assert.deepEqual(r.retired, ["A"]);
});

test("REGRESSION: an unresolved title-only registration fails closed instead of verifying", async () => {
  const w = world([]); // submit response lost and no row visible: cannot prove nothing was published
  await assert.rejects(retireListings({ sellerId: SELLER, ids: [], titles: ["Wearable check GHOST"] }, w.ports), e => e instanceof CleanupError && e.code === "UNRESOLVED_TITLE");
  assert.equal(w.calls.remove.length, 0);
  // Also when other listings resolve fine: one unmatched title is enough to refuse verification.
  const w2 = world([row("A", "active")]);
  await assert.rejects(retireListings({ sellerId: SELLER, ids: ["A"], titles: ["Wearable check A", "Wearable check GHOST"] }, w2.ports), e => e.code === "UNRESOLVED_TITLE");
  assert.equal(w2.calls.remove.length, 0);
});

test("a refused removal fails the cleanup (and therefore the run)", async () => {
  const w = world([row("A", "active"), row("B", "active")], { refuse: ["A"] });
  await assert.rejects(retireListings(target(["A", "B"]), w.ports), e => e.code === "REMOVE_FAILED" && e.result.failed[0].id === "A");
  assert.equal(w.db.get("B").status, "removed"); // others are still retired before failing
});

test("a revision conflict is retried once against the fresh row", async () => {
  const w = world([row("A", "active")], { conflictOnce: new Set(["A"]) });
  const r = await retireListings(target(["A"]), w.ports);
  assert.deepEqual(r.retired, ["A"]); assert.deepEqual(w.calls.remove.map(c => c.revision), [3, 4]);
});

test("a removal that did not change status is detected", async () => {
  const w = world([row("A", "active")], { noopRemove: true });
  await assert.rejects(retireListings(target(["A"]), w.ports), e => e.code === "NOT_RETIRED");
});

test("discoverability is polled and cleanup passes once the listing disappears", async () => {
  const w = world([row("A", "active")], { leakPolls: 2 });
  await retireListings(target(["A"]), w.ports, { verifyAttempts: 5, verifyDelayMs: 1 });
  assert.equal(w.calls.sleeps, 2);
});

test("a listing that stays publicly discoverable fails the cleanup", async () => {
  const w = world([row("A", "active")], { alwaysLeak: true });
  await assert.rejects(retireListings(target(["A"]), w.ports, { verifyAttempts: 3, verifyDelayMs: 1 }), e => e.code === "STILL_DISCOVERABLE" && e.result.stillDiscoverable[0] === "A");
  assert.equal(w.calls.sleeps, 3);
});

// ---- Pagination: every result page must be scanned, or PASS is refused ------------------------------------
const pager = (totalPages, hitsOnPage = {}, extra = {}) => { const seen = []; return { seen, fetchPage: async page => { seen.push(page); return { items: (hitsOnPage[page] ?? []).map(id => ({ id })), total_pages: totalPages, ...extra }; } }; };

test("REGRESSION: a leaked listing on a late page is found (all pages scanned)", async () => {
  const p = pager(25, { 25: ["A"] });
  assert.deepEqual([...await scanSearchPages(p.fetchPage, new Set(["A"]))], ["A"]);
  assert.equal(p.seen.length, 25);
});

test("REGRESSION: a capped scan with unscanned pages remaining refuses instead of passing", async () => {
  const p = pager(101);
  await assert.rejects(scanSearchPages(p.fetchPage, new Set(["A"])), e => e instanceof CleanupError && e.code === "UNSCANNED_PAGES");
  await assert.rejects(scanSearchPages(pager(11).fetchPage, new Set(["A"]), 10), e => e.code === "UNSCANNED_PAGES");
  assert.deepEqual([...await scanSearchPages(pager(10).fetchPage, new Set(["A"]), 10)], []); // exactly at the cap is complete
});

test("REGRESSION: a missing or invalid page count refuses; an empty result set is complete", async () => {
  for (const bad of [undefined, null, "3", -1, 1.5]) await assert.rejects(scanSearchPages(async () => ({ items: [], total_pages: bad }), new Set(["A"])), e => e.code === "UNSCANNED_PAGES");
  assert.deepEqual([...await scanSearchPages(pager(0).fetchPage, new Set(["A"]))], []);
});

test("REGRESSION: an incomplete discoverability scan fails the whole cleanup (no verified state)", async () => {
  const w = world([row("A", "active")]);
  w.ports.discoverable = async rows => [...await scanSearchPages(pager(500).fetchPage, new Set(rows.map(r => r.id)))];
  await assert.rejects(retireListings(target(["A"]), w.ports, { verifyAttempts: 3, verifyDelayMs: 1 }), e => e.code === "UNSCANNED_PAGES");
});

// ---- Evidence gate: an unsuccessful cleanup can never produce PASS evidence -------------------------------
const runner = "a".repeat(40);
const preflight = { runnerSha: runner, deployedWebSha: runner, webFlagEnabledInProduction: false, testActivationRunId: "7777", runId: "9001" };
const steps = cleanup => ({ steps: Object.fromEntries(STEPS.map(s => [s, true])), webFlagEnabledInTest: true, ...(cleanup ? { cleanup } : {}), notes: {} });
const green = { stats: { expected: 8, unexpected: 0, flaky: 0, skipped: 0 }, errors: [] };
const build = (s, results = green) => buildReceipt({ preflight, steps: s, results, generatedAt: "2026-11-04T00:00:00.000Z" });

test("receipt requires verified cleanup and an error-free Playwright report; schema unchanged", () => {
  const ok = build(steps({ verified: true, retired: 2, alreadyInactive: 0 }));
  assert.ok(ok.receipt);
  assert.deepEqual(Object.keys(ok.receipt.steps), [...STEPS]); // still exactly the six Backend steps
  assert.equal("cleanup" in ok.receipt, false);
  assert.equal(build(steps()).error, "cleanup-not-verified");
  assert.equal(build(steps({ verified: false, retired: 0, alreadyInactive: 0, error: "STILL_DISCOVERABLE" })).error, "cleanup-not-verified");
  assert.equal(build(steps({ verified: true, retired: 1, alreadyInactive: 0 }), { ...green, errors: [{ message: "afterAll failed" }] }).error, "playwright-errors");
  assert.equal(build(steps({ verified: true, retired: 1, alreadyInactive: 0 }), { stats: green.stats }).error, "playwright-errors");
});

test("CLI writes no evidence files when cleanup failed, and writes them when it succeeded", () => {
  const cli = fileURLToPath(new URL("./write-evidence.mjs", import.meta.url));
  const dir = mkdtempSync(join(tmpdir(), "wearables-cleanup-"));
  const run = () => { try { execFileSync("node", [cli], { env: { ...process.env, E2E_EVIDENCE_DIR: dir }, stdio: "pipe" }); return 0; } catch (e) { return e.status; } };
  writeFileSync(join(dir, "preflight.json"), JSON.stringify(preflight)); writeFileSync(join(dir, "results.json"), JSON.stringify(green));
  writeFileSync(join(dir, "steps.json"), JSON.stringify(steps({ verified: false, retired: 0, alreadyInactive: 0, error: "REMOVE_FAILED" })));
  assert.equal(run(), 1); assert.deepEqual(readdirSync(dir).sort(), ["preflight.json", "results.json", "steps.json"]);
  writeFileSync(join(dir, "steps.json"), JSON.stringify(steps({ verified: true, retired: 2, alreadyInactive: 0 })));
  assert.equal(run(), 0); assert.ok(readdirSync(dir).includes("wearables-v1-e2e-test.json") && readdirSync(dir).includes("SHA256SUMS_e2e"));
});
