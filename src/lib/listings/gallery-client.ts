/**
 * Browser-side batching cache for GET /api/listings/gallery. One request serves every card that asked in the same moment.
 * Entries expire after GALLERY_TTL_MS so a moderation takedown or reorder is picked up on the next hover/focus, failures
 * are never cached, and `invalidateGallery` drops one listing (used when an image 404s).
 */
export const GALLERY_TTL_MS = 45_000;
const BATCH_MAX = 24;

const cache = new Map<string, { ids: string[]; at: number }>();
const waiting = new Map<string, Array<(ids: string[]) => void>>();
let timer: ReturnType<typeof setTimeout> | null = null;

export function isSaveData(): boolean {
  return (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
}

async function flush() {
  timer = null;
  const batch = [...waiting.keys()].slice(0, BATCH_MAX);
  const listeners = new Map(batch.map((id) => [id, waiting.get(id) ?? []]));
  for (const id of batch) waiting.delete(id);
  if (waiting.size) timer = setTimeout(flush, 30);
  let galleries: Record<string, string[]> | null = null;
  try {
    const res = await fetch(`/api/listings/gallery?ids=${batch.join(",")}`, { credentials: "omit", cache: "no-store" });
    if (res.ok) galleries = ((await res.json()) as { galleries?: Record<string, string[]> }).galleries ?? {};
  } catch { /* cards simply keep their cover; nothing is cached so a later hover retries */ }
  const now = Date.now();
  for (const [id, fns] of listeners) {
    const ids = galleries && Array.isArray(galleries[id]) ? galleries[id] : [];
    if (galleries) cache.set(id, { ids, at: now });
    fns.forEach((fn) => fn(ids));
  }
}

/** Resolves to the listing's photo ids (empty when none/unavailable). Never rejects. */
export function requestGallery(listingId: string): Promise<string[]> {
  const hit = cache.get(listingId);
  if (hit && Date.now() - hit.at < GALLERY_TTL_MS) return Promise.resolve(hit.ids);
  cache.delete(listingId);
  return new Promise((resolve) => {
    waiting.set(listingId, [...(waiting.get(listingId) ?? []), resolve]);
    if (!timer) timer = setTimeout(flush, 30);
  });
}

/** Forgets a listing's cached photos, e.g. after one of its images failed to load. */
export function invalidateGallery(listingId: string): void {
  cache.delete(listingId);
}

/** Test hook. */
export function resetGalleryCache(): void {
  cache.clear();
  waiting.clear();
  if (timer) clearTimeout(timer);
  timer = null;
}