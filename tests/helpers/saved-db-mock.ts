/**
 * In-memory stand-in for the service-role Supabase client, modelling the one schema difference that matters here:
 * FK-named embeds. FairSwapTest has `listings_cover_photo_id_fkey` and `listings_seller_id_fkey -> user_accounts`;
 * FairSwapProd has `fk_listings_cover_photo` and `listings_seller_id_fkey -> auth.users`. A select that names an FK
 * hint the variant lacks returns a PostgREST-style error, exactly like the live databases would.
 */
export type SchemaVariant = "test" | "prod";
type Row = Record<string, unknown>;

export interface MockDb { listings: Row[]; user_accounts: Row[]; listing_media: Row[] }

export function makeServiceMock(db: MockDb, options: { variant: SchemaVariant; visible?: (id: string) => boolean; rpcDelayMs?: number }) {
  const selects: string[] = [];
  const state = { inFlight: 0, maxInFlight: 0, rpcCalls: [] as string[] };

  const hintRejected = (select: string): boolean => {
    if (options.variant === "prod") return /listings_cover_photo_id_fkey|user_accounts!/.test(select); // seller FK targets auth.users there
    return /fk_listings_cover_photo/.test(select);
  };

  const client = {
    from(table: keyof MockDb) {
      return {
        select(select: string) {
          selects.push(`${table}: ${select}`);
          return {
            in(column: string, values: string[]) {
              if (hintRejected(select)) return Promise.resolve({ data: null, error: { code: "PGRST200", message: "Could not find a relationship" } });
              return Promise.resolve({ data: db[table].filter((row) => values.includes(row[column] as string)), error: null });
            },
          };
        },
      };
    },
    async rpc(name: string, args: { listing_id: string }) {
      if (name !== "is_listing_publicly_visible") throw new Error(`unexpected rpc ${name}`);
      state.rpcCalls.push(args.listing_id);
      state.inFlight += 1;
      state.maxInFlight = Math.max(state.maxInFlight, state.inFlight);
      await new Promise((resolve) => setTimeout(resolve, options.rpcDelayMs ?? 1));
      state.inFlight -= 1;
      return { data: (options.visible ?? (() => true))(args.listing_id), error: null };
    },
  };
  return { client, selects, state };
}

export const uuid = (n: number) => `${String(n).padStart(8, "0")}-0000-4000-8000-000000000000`;
const future = () => new Date(Date.now() + 86_400_000).toISOString();

/** A fully public listing with private columns present so tests can prove they never leak. */
export function listingRow(n: number, over: Row = {}): Row {
  return {
    id: uuid(n), slug: `slug-${n}`, title: `Item ${n}`, condition: "good", price_type: "fixed", price_paise: 100000,
    status: "active", expires_at: future(), seller_id: `seller-${n}`, cover_photo_id: `media-${n}`,
    description: "PRIVATE-DESCRIPTION", pin_code: "560001", landmark: "PRIVATE-LANDMARK",
    category: { name: "Furniture", slug: "furniture", id: "c" }, city: { name: "Pune", state: "MH", id: "x" }, locality: { name: "Baner", id: "l" },
    ...over,
  };
}
export const sellerRow = (n: number, status = "active"): Row => ({ user_id: `seller-${n}`, account_status: status, email: "private@example.com" });
export const mediaRow = (n: number, over: Row = {}): Row => ({
  id: `media-${n}`, listing_id: uuid(n), thumbnail_storage_path: "private/thumb.webp", medium_storage_path: "private/medium.webp",
  original_storage_path: "private/ORIGINAL.jpg", width: 100, height: 100, processing_status: "ready", ...over,
});
