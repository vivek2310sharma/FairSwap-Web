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
  emptyLabel: string;
  statuses: ListingStatus[] | null; // null means all seller statuses
}

export const MY_ADS_TABS: MyAdsStatusTabMeta[] = [
  { key: "all", label: "All", emptyLabel: "No listings yet", statuses: null },
  { key: "active", label: "Active", emptyLabel: "No active listings", statuses: ["active", "reserved"] },
  { key: "pending_review", label: "Under review", emptyLabel: "No listings under review", statuses: ["pending_review"] },
  { key: "draft", label: "Drafts", emptyLabel: "No draft listings", statuses: ["draft"] },
  { key: "rejected", label: "Needs action", emptyLabel: "No listings needing action", statuses: ["rejected"] },
  { key: "paused", label: "Paused", emptyLabel: "No paused listings", statuses: ["paused"] },
  { key: "expired", label: "Expired", emptyLabel: "No expired listings", statuses: ["expired"] },
  { key: "sold", label: "Sold", emptyLabel: "No sold listings", statuses: ["sold"] },
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
  // No RPC is called until a separately reviewed Backend contract exists.
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

// At 10 rows per page, bound reads to the first 10,000 seller listings.
export const MY_ADS_MAX_PAGE = 1000;

export function parseMyAdsPage(rawPage?: string | string[]): number {
  const value = Array.isArray(rawPage) ? rawPage[0] : rawPage;
  if (!value || !/^[1-9]\d*$/.test(value)) return 1;
  const page = Number(value);
  return Number.isSafeInteger(page) && page <= MY_ADS_MAX_PAGE ? page : 1;
}
