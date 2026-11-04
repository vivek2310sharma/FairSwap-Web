import "server-only";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentPolicyAcceptance } from "@/lib/compliance/policy-acceptance";
import { isSellerWriteMaintenanceEnabled } from "@/lib/maintenance/seller-writes";

/**
 * Common posting guard with NO category feature flag. Same order and messages as the Mobile Phones
 * `postingGuard` (origin, maintenance, auth, policy, active account); category readiness is checked by the caller.
 * Kept separate so wearables does not depend on POST_AD_MOBILES_V2_ENABLED. A parity unit test pins the order.
 */
export async function postingBaseGuard(request: Request, mutation = true) {
  if (mutation) {
    if (request.headers.get("origin") !== new URL(request.url).origin) throw new Error("Request origin rejected.");
    if (isSellerWriteMaintenanceEnabled()) throw new Error("Posting is temporarily unavailable.");
  }
  const client = await createClient();
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) throw new Error("Sign in to continue.");
  const policy = await requireCurrentPolicyAcceptance(client);
  if (!policy.allowed) throw new Error("Current policy acceptance is required.");
  const account = await client.from("user_accounts").select("account_status").eq("user_id", user.id).maybeSingle();
  if (account.error || account.data?.account_status !== "active") throw new Error("An active account is required.");
  return { client, user };
}
