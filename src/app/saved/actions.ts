"use server";

import { headers } from "next/headers";
import { parseSavedIds } from "@/lib/favourites/ids";
import { getPublicSavedListings } from "@/lib/favourites/public-saved";
import type { SavedListingsResult } from "@/lib/favourites/types";
import { savedLookupBudget } from "@/lib/favourites/saved-budget";

async function clientKey(): Promise<string> {
  try {
    const h = await headers();
    // On Vercel the platform sets these; they are not client-controlled there.
    return h.get("x-real-ip")?.trim() || h.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  } catch {
    return "unknown";
  }
}

/** Public lookup for the device-saved ads page. Only allowlisted public card fields leave the server. */
export async function getSavedListingsAction(ids: unknown): Promise<SavedListingsResult> {
  const parsed = parseSavedIds(ids);
  // Invalid payloads still cost one unit so junk requests cannot be free.
  const verdict = savedLookupBudget.check(await clientKey(), parsed.ok ? Math.max(1, parsed.ids.length) : 1);
  if (!verdict.allowed) {
    return { ok: false, error: "Too many requests. Please wait a minute and try again.", rateLimited: true, retryAfterSeconds: verdict.retryAfterSeconds };
  }
  if (!parsed.ok) return { ok: false, error: parsed.error };
  try {
    return await getPublicSavedListings(parsed.ids);
  } catch {
    return { ok: false, error: "Saved ads could not be loaded right now." };
  }
}

