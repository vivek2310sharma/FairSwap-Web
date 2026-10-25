import "server-only";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { lookupPincodeServer } from "./pincode";
import type { PublicArea } from "./discovery";

const districtSchema = z.object({ id: z.string().uuid(), name: z.string(), state: z.string() });
const localitySchema = z.object({
  id: z.string().uuid(), city_id: z.string().uuid(), name: z.string(), cities: districtSchema,
});
const districtArea = (c: z.infer<typeof districtSchema>): PublicArea => ({
  city: c.id, label: `${c.name} district, ${c.state}`,
});
const localityArea = (l: z.infer<typeof localitySchema>): PublicArea => ({
  city: l.city_id, locality: l.id, label: `${l.name}, ${l.cities.name} district, ${l.cities.state}`,
});
const unique = (items: PublicArea[]) => Array.from(new Map(items.map(a => [`${a.city}:${a.locality || ""}`, a])).values()).slice(0, 24);

/** Only public reference tables, under the caller's RLS. Never query listing private locations. */
export async function findPublicAreas(query: string, signal?: AbortSignal): Promise<PublicArea[]> {
  const client = await createClient();
  const pattern = `%${query.replace(/[\\%_]/g, "\\$&")}%`;
  const districts = client.from("cities").select("id,name,state").eq("is_active", true)
    .ilike("name", pattern).order("name").order("id").limit(8);
  const localities = client.from("localities").select("id,city_id,name,cities!inner(id,name,state)")
    .eq("is_active", true).eq("cities.is_active", true)
    .ilike("name", pattern).order("name").order("id").limit(16);
  const [d, l] = await Promise.all([signal ? districts.abortSignal(signal) : districts, signal ? localities.abortSignal(signal) : localities]);
  const ds = z.array(districtSchema).safeParse(d.data);
  const ls = z.array(localitySchema).safeParse(l.data);
  if (d.error || l.error || !ds.success || !ls.success) throw new Error("Area lookup unavailable");
  return unique([...ds.data.map(districtArea), ...ls.data.map(localityArea)]);
}

export async function resolvePublicArea(city: string, locality?: string): Promise<PublicArea | null> {
  const client = await createClient();
  if (locality) {
    const { data, error } = await client.from("localities").select("id,city_id,name,cities!inner(id,name,state)")
      .eq("id", locality).eq("city_id", city).eq("is_active", true).eq("cities.is_active", true).maybeSingle();
    const parsed = localitySchema.safeParse(data);
    if (error) throw new Error("Area lookup unavailable");
    return parsed.success ? localityArea(parsed.data) : null;
  }
  const { data, error } = await client.from("cities").select("id,name,state").eq("id", city).eq("is_active", true).maybeSingle();
  if (error) throw new Error("Area lookup unavailable");
  const parsed = districtSchema.safeParse(data);
  return parsed.success ? districtArea(parsed.data) : null;
}

const pinResultSchema = z.object({
  success: z.literal(true), state: z.string(),
  districts: z.array(z.object({ name: z.string(), city_id: z.string().uuid().nullable() })),
  localities: z.array(z.object({ id: z.string().uuid(), city_id: z.string().uuid(), name: z.string(), district: z.string(), state: z.string() })),
});
export async function areasForPincode(pin: string): Promise<PublicArea[]> {
  const result = pinResultSchema.safeParse(await lookupPincodeServer(pin));
  if (!result.success) return [];
  const { districts, localities } = result.data;
  // Revalidate active references and parent relationships; cap work as well as payload.
  const candidates = unique([
    ...districts.filter(d => d.city_id).map(d => ({ city: d.city_id!, label: d.name })),
    ...localities.map(l => ({ city: l.city_id, locality: l.id, label: l.name })),
  ]);
  const resolved = await Promise.all(candidates.map(a => resolvePublicArea(a.city, a.locality)));
  return resolved.filter((a): a is PublicArea => a !== null);
}
