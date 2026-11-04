// Fail-closed retirement of the listings this E2E run created on FairSwapTest.
// Authorised operations only: seller-RLS reads, then the AAL2 moderator's own `moderate_listing_reviewed(... 'remove')`.
// No service-role key, no publication-guard bypass, no deletes. Only rows owned by the test seller whose exact title the run
// registered are ever touched; anything else is refused. Pure and dependency-injected so it is unit-testable.

/** Statuses from which a listing is not publicly discoverable (a retired listing may also already be one of these). */
export const NON_PUBLIC = Object.freeze(["removed", "rejected", "sold", "expired", "draft"]);
export const REMOVAL_REASON = "Automated Wearables V1 Test E2E cleanup";

export class CleanupError extends Error {
  constructor(code, detail, result) {
    super(`CLEANUP_FAILED ${code}: ${detail}`);
    this.code = code;
    this.result = result;
  }
}

/**
 * @typedef {{id:string, seller_id:string, status:string, title:string, revision:number, slug?:string|null}} Row
 * @typedef {object} Ports
 * @property {(q:{ids:string[], titles:string[]}) => Promise<Row[]>} readOwn   seller-RLS read of own rows by id or exact title
 * @property {() => Promise<void>} ensureModeratorAal2                        genuine TOTP step-up when needed
 * @property {(row:Row) => Promise<{error:unknown}>} remove                    moderate_listing_reviewed(..., 'remove', ...)
 * @property {(rows:Row[]) => Promise<string[]>} discoverable                  ids still reachable by buyer/anonymous users
 * @property {(ms:number) => Promise<void>} sleep
 */

/**
 * @param {{sellerId:string, ids:string[], titles:string[]}} target
 * @param {Ports} ports
 * @param {{verifyAttempts?:number, verifyDelayMs?:number}} [opts]
 */
export async function retireListings({ sellerId, ids, titles }, ports, { verifyAttempts = 6, verifyDelayMs = 5000 } = {}) {
  const result = { requested: ids.length, retired: [], alreadyInactive: [], failed: [], stillDiscoverable: [] };
  const fail = (code, detail) => { throw new CleanupError(code, detail, result); };
  if (!sellerId) fail("NO_SELLER", "seller identity unavailable");
  if (ids.length === 0 && titles.length === 0) return result; // nothing was created

  const load = async () => {
    const rows = await ports.readOwn({ ids, titles });
    const byId = new Map(rows.map(r => [r.id, r]));
    for (const row of byId.values()) {
      // Defence in depth: never act on a row that is not provably this run's own test data.
      if (row.seller_id !== sellerId || !titles.includes(row.title)) fail("FOREIGN_ROW", row.id);
    }
    for (const id of ids) if (!byId.has(id)) fail("UNREADABLE_LISTING", id); // a registered listing we cannot see cannot be verified
    // Every registered title must resolve to a row we can see and retire. A title with no matching row (e.g. a lost submit
    // response) is unresolved: we cannot prove nothing was published, so cleanup must not be marked verified.
    const unresolved = titles.filter(t => ![...byId.values()].some(r => r.title === t));
    if (unresolved.length) fail("UNRESOLVED_TITLE", `${unresolved.length} registered title(s) matched no listing`);
    return [...byId.values()];
  };

  let rows = await load();
  let aal2 = false;
  for (const first of rows) {
    if (NON_PUBLIC.includes(first.status)) { result.alreadyInactive.push(first.id); continue; }
    if (!aal2) { await ports.ensureModeratorAal2(); aal2 = true; }
    let row = first, error = null;
    for (let attempt = 0; attempt < 2; attempt++) { // one retry covers a revision/status conflict
      ({ error } = await ports.remove(row));
      if (!error) break;
      const fresh = (await ports.readOwn({ ids: [row.id], titles: [] }))[0];
      if (!fresh || fresh.seller_id !== sellerId || !titles.includes(fresh.title)) break;
      if (NON_PUBLIC.includes(fresh.status)) { error = null; break; }
      row = fresh;
    }
    if (error) result.failed.push({ id: first.id, reason: "REMOVE_REFUSED" }); else result.retired.push(first.id);
  }
  if (result.failed.length) fail("REMOVE_FAILED", result.failed.map(f => f.id).join(","));

  rows = await load();
  const notRetired = rows.filter(r => !NON_PUBLIC.includes(r.status));
  if (notRetired.length) fail("NOT_RETIRED", notRetired.map(r => `${r.id}:${r.status}`).join(","));

  let leaked = [];
  for (let attempt = 0; attempt < verifyAttempts; attempt++) {
    leaked = await ports.discoverable(rows);
    if (leaked.length === 0) return result;
    await ports.sleep(verifyDelayMs);
  }
  result.stillDiscoverable = leaked;
  return fail("STILL_DISCOVERABLE", leaked.join(","));
}

/**
 * Scans EVERY page of a paginated search for the given ids. Fails closed (UNSCANNED_PAGES) if the page count is missing/invalid
 * or exceeds `maxPages`, so a capped scan can never be mistaken for proof of non-discoverability.
 * @param {(page:number) => Promise<{items:{id:string}[], total_pages?:unknown}>} fetchPage
 * @param {Set<string>} wanted
 * @returns {Promise<Set<string>>} ids found
 */
export async function scanSearchPages(fetchPage, wanted, maxPages = 100) {
  const leaked = new Set();
  let totalPages = 0;
  for (let page = 1; page <= maxPages; page++) {
    const result = await fetchPage(page);
    for (const item of result.items ?? []) if (wanted.has(item.id)) leaked.add(item.id);
    if (!Number.isInteger(result.total_pages) || result.total_pages < 0) throw new CleanupError("UNSCANNED_PAGES", "total_pages missing or invalid");
    totalPages = result.total_pages;
    if (page >= totalPages) return leaked;
  }
  throw new CleanupError("UNSCANNED_PAGES", `${totalPages} pages exceed the ${maxPages}-page scan cap`);
}
