import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { parseTaxonomy } from "./taxonomy-v2";

/** Uses the request's ordinary server client; never a service-role client. */
export async function loadTaxonomy(
  client: SupabaseClient,
  bindings: Readonly<Record<string, string | undefined>> = {},
) {
  try {
    const { data, error } = await client.rpc("get_category_catalogue_v2");
    return error ? null : parseTaxonomy(data, bindings);
  } catch {
    return null;
  }
}
