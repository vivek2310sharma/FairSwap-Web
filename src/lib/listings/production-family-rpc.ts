import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '@/types/database';

/**
 * Forward-only, proposed Production RPC contract (not installed yet).
 * Scoped here rather than editing the generated database type ahead of its migration.
 * Never use client-side service credentials or bypass backend authorization.
 *
 * Backend must implement BOTH RPCs with authenticated-owner checks, RLS,
 * expected-revision/locking, status guards and category-version validation
 * before the production flags are set. The type assertion adds NO privileges.
 */
type ProductionFamilyPublic = Omit<Database['public'], 'Functions'> & {
  Functions: Database['public']['Functions'] & {
    get_seller_production_submission_status: {
      Args: { listing_id: string };
      Returns: Json;
    };
    seller_submit_family_listing: {
      Args: { listing_id: string; expected_revision: number };
      Returns: Json;
    };
  };
};

type ProductionFamilyDatabase = Omit<Database, 'public'> & {
  public: ProductionFamilyPublic;
};

export function productionFamilyRpcClient(
  client: SupabaseClient<Database>
): SupabaseClient<ProductionFamilyDatabase> {
  return client as unknown as SupabaseClient<ProductionFamilyDatabase>;
}
