import "server-only";
import { z } from "zod";
import { areasForPincode, findPublicAreas } from "./public-areas";
import type { PublicArea } from "./discovery";

export const coordinatesSchema = z.object({
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
}).strict();
const responseSchema = z.object({ results: z.array(z.object({
  addressComponents: z.array(z.object({ longText: z.string(), shortText: z.string().optional(), types: z.array(z.string()) })),
})).max(100) });

export async function reverseGeocodeArea(coordinates: z.infer<typeof coordinatesSchema>, key: string): Promise<PublicArea[]> {
  const url = new URL("https://geocode.googleapis.com/v4/geocode/location");
  url.searchParams.set("location.latitude", String(coordinates.latitude));
  url.searchParams.set("location.longitude", String(coordinates.longitude));
  url.searchParams.set("languageCode", "en");
  const response = await fetch(url, {
    headers: { "X-Goog-Api-Key": key, "X-Goog-FieldMask": "results.addressComponents" },
    cache: "no-store", signal: AbortSignal.timeout(7000),
  });
  if (!response.ok) throw new Error("Geocoder unavailable");
  const parsed = responseSchema.safeParse(await response.json());
  if (!parsed.success) throw new Error("Invalid geocoder response");
  const indian = parsed.data.results.filter(r => r.addressComponents.some(c => c.types.includes("country") && c.shortText === "IN"));
  const pins = [...new Set(indian.flatMap(r => r.addressComponents.filter(c => c.types.includes("postal_code") && /^[1-9]\d{5}$/.test(c.longText)).map(c => c.longText)))].slice(0, 3);
  const areas = (await Promise.all(pins.map(areasForPincode))).flat();
  if (areas.length) return [...new Map(areas.map(a => [`${a.city}:${a.locality || ""}`, a])).values()].slice(0, 24);
  // Conservative fallback: exact administrative district AND state only. Never guess metro boundaries.
  for (const result of indian.slice(0, 3)) {
    const district = result.addressComponents.find(c => c.types.includes("administrative_area_level_2"))?.longText;
    const state = result.addressComponents.find(c => c.types.includes("administrative_area_level_1"))?.longText;
    if (!district || !state || district.length > 80) continue;
    const matches = await findPublicAreas(district);
    const exact = matches.filter(a => !a.locality && a.label.toLowerCase() === `${district} district, ${state}`.toLowerCase());
    if (exact.length) return exact;
  }
  return [];
}
