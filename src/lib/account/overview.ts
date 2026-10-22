import type { SupabaseClient } from "@supabase/supabase-js";
import type { AccountStatus } from "@/types/account";

export type AccountState = AccountStatus | "unavailable";

export interface AccountOverview {
  userId: string;
  /** Owner-only. Comes from the authenticated session, never from `profiles`. */
  email: string | null;
  displayName: string | null;
  firstName: string | null;
  initial: string;
  city: string | null;
  state: string | null;
  memberSince: string | null;
  accountState: AccountState;
  /** `null` means the count could not be loaded; the UI must omit it rather than show 0. */
  counts: {
    activeListings: number | null;
    pendingReviewListings: number | null;
  };
}

interface OverviewUser {
  id: string;
  email?: string | null;
}

export function deriveFirstName(displayName: string | null | undefined): string | null {
  const first = displayName?.trim().split(/\s+/)[0];
  return first ? first : null;
}

export function deriveInitial(displayName: string | null | undefined): string {
  const first = Array.from(displayName?.trim() ?? "")[0];
  return first ? first.toLocaleUpperCase("en-IN") : "?";
}

/**
 * Loads everything the Account overview needs in a single parallel round trip.
 *
 * Every owner-scoped query filters by the authenticated user's id explicitly. RLS already
 * limits rows, but staff accounts have broader read access (for example moderators can read
 * all listings), so the explicit filter keeps counts personal.
 */
export async function loadAccountOverview(
  supabase: SupabaseClient,
  user: OverviewUser
): Promise<AccountOverview> {
  const [profileResult, accountResult, activeResult, pendingResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, city, state, created_at")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("user_accounts")
      .select("account_status")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("listings")
      .select("id", { count: "exact", head: true })
      .eq("seller_id", user.id)
      .eq("status", "active"),
    supabase
      .from("listings")
      .select("id", { count: "exact", head: true })
      .eq("seller_id", user.id)
      .eq("status", "pending_review"),
  ]);

  const profile = profileResult.error ? null : profileResult.data;
  const account = accountResult.error ? null : accountResult.data;
  const displayName = profile?.display_name ?? null;

  return {
    userId: user.id,
    email: user.email ?? null,
    displayName,
    firstName: deriveFirstName(displayName),
    initial: deriveInitial(displayName ?? user.email),
    city: profile?.city?.trim() || null,
    state: profile?.state?.trim() || null,
    memberSince: profile?.created_at ?? null,
    accountState: (account?.account_status as AccountStatus | undefined) ?? "unavailable",
    counts: {
      activeListings: activeResult.error ? null : (activeResult.count ?? null),
      pendingReviewListings: pendingResult.error ? null : (pendingResult.count ?? null),
    },
  };
}
