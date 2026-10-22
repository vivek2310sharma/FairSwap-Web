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
): Promise<MyListingCounts> {
  try {
    const { data, error } = await supabase.rpc("get_my_listing_counts");
    if (!error && data && typeof data === "object") {
      const counts = { ...DEFAULT_MY_LISTING_COUNTS };
      for (const key of MY_ADS_TAB_KEYS) {
        if (key in data) {
          const rawVal = (data as Record<string, unknown>)[key];
          counts[key] = typeof rawVal === "number" ? rawVal : Number(rawVal) || 0;
        }
      }
      return counts;
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

  // Direct DB count query fallback for test environments or RPC-absent states
  const { data: rawListings, error: fallbackError } = await supabase
    .from("listings")
    .select("status")
    .eq("seller_id", sellerId);

  if (fallbackError) {
    logger.error("my_ads.fallback_counts_failed", fallbackError, {
      details: { seller_id: sellerId },
    });
    return { ...DEFAULT_MY_LISTING_COUNTS };
  }

  const counts: MyListingCounts = { ...DEFAULT_MY_LISTING_COUNTS };
  if (rawListings) {
    counts.all = rawListings.length;
    for (const item of rawListings) {
      const status = item.status as ListingStatus;
      if (status === "active" || status === "reserved") {
        counts.active += 1;
      }
      if (status === "pending_review") counts.pending_review += 1;
      if (status === "draft") counts.draft += 1;
      if (status === "rejected") counts.rejected += 1;
      if (status === "paused") counts.paused += 1;
      if (status === "expired") counts.expired += 1;
      if (status === "sold") counts.sold += 1;
    }
  }

  return counts;
}
