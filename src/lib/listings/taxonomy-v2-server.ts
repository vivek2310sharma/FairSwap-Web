import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { parseTaxonomy } from "./taxonomy-v2";

/** Uses the request's ordinary server client; never a service-role client. */
export async function loadTaxonomy(
  client: SupabaseClient,
  bindings: Readonly<Record<string, string | undefined>> | Promise<Readonly<Record<string, string | undefined>>> = {},
) {
  try {
    const [{ data, error }, resolvedBindings] = await Promise.all([
      client.rpc("get_category_catalogue_v2"), bindings,
    ]);
    return error ? null : parseTaxonomy(data, resolvedBindings);
  } catch {
    return null;
  }
}
