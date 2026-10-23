import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { ListingStatus } from "@/types/listing";
import { logger } from "@/lib/logger";

export const MY_ADS_TAB_KEYS = [
  "all",
  "active",
  "pending_review",
  "draft",
  "rejected",
  "paused",
  "expired",
  "sold",
] as const;

export type MyAdsTabKey = (typeof MY_ADS_TAB_KEYS)[number];

export const myAdsTabSchema = z.enum(MY_ADS_TAB_KEYS).catch("all");

export interface MyAdsStatusTabMeta {
  key: MyAdsTabKey;
  label: string;
  statuses: ListingStatus[] | null; // null means all seller statuses
}

export const MY_ADS_TABS: MyAdsStatusTabMeta[] = [
  { key: "all", label: "All", statuses: null },
  { key: "active", label: "Active", statuses: ["active", "reserved"] },
  { key: "pending_review", label: "Under review", statuses: ["pending_review"] },
  { key: "draft", label: "Drafts", statuses: ["draft"] },
  { key: "rejected", label: "Needs action", statuses: ["rejected"] },
  { key: "paused", label: "Paused", statuses: ["paused"] },
  { key: "expired", label: "Expired", statuses: ["expired"] },
  { key: "sold", label: "Sold", statuses: ["sold"] },
];

export type MyListingCounts = Record<MyAdsTabKey, number>;

export const DEFAULT_MY_LISTING_COUNTS: MyListingCounts = {
  all: 0,
  active: 0,
  pending_review: 0,
  draft: 0,
  rejected: 0,
  paused: 0,
  expired: 0,
  sold: 0,
};

export function parseMyAdsTab(rawTab?: string | string[] | null): MyAdsTabKey {
  const value = Array.isArray(rawTab) ? rawTab[0] : rawTab;
  return myAdsTabSchema.parse(value ?? "all");
}

export function getStatusesForTab(tabKey: MyAdsTabKey): ListingStatus[] | null {
  const tab = MY_ADS_TABS.find((t) => t.key === tabKey);
  return tab?.statuses ?? null;
}

export async function fetchMyListingCounts(
  supabase: SupabaseClient<Database>,
  sellerId: string
): Promise<MyListingCounts | null> {
  try {
    const { data, error } = await supabase.rpc("get_my_listing_counts");
    const parsed = z.object(Object.fromEntries(MY_ADS_TAB_KEYS.map(key => [key, z.number().int().nonnegative().safe()]))).safeParse(data);
    if (!error && parsed.success) {
      const counts = parsed.data as MyListingCounts;
      const grouped = MY_ADS_TAB_KEYS.filter(key => key !== "all").reduce((sum, key) => sum + counts[key], 0);
      if (counts.all >= grouped) return counts;
    }

    if (error) {
      logger.warn("my_ads.rpc_counts_fallback", {
        details: {
          error_code: error.code,
          error_message: error.message,
          seller_id: sellerId,
        },
      });
    }
  } catch (err) {
    logger.warn("my_ads.rpc_counts_exception", {
      details: {
        error: err instanceof Error ? err.message : String(err),
        seller_id: sellerId,
      },
    });
  }

  // Exact HEAD counts avoid the Data API row cap and remain owner-scoped.
  try {
    const entries = await Promise.all(MY_ADS_TABS.map(async tab => {
      let query = supabase.from("listings").select("id", { count: "exact", head: true }).eq("seller_id", sellerId);
      if (tab.statuses) query = query.in("status", tab.statuses);
      const { count, error } = await query;
      if (error || count === null || !Number.isSafeInteger(count) || count < 0) throw new Error("Listing counts unavailable");
      return [tab.key, count] as const;
    }));
    return Object.fromEntries(entries) as MyListingCounts;
  } catch (error) {
    logger.error("my_ads.fallback_counts_failed", error);
    return null;
  }
}

export function parseMyAdsPage(rawPage?: string | string[]): number {
  const value = Array.isArray(rawPage) ? rawPage[0] : rawPage;
  if (!value || !/^[1-9]\d*$/.test(value)) return 1;
  const page = Number(value);
  return Number.isSafeInteger(page) && page <= 214748364 ? page : 1;
}
