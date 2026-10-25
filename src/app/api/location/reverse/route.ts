import { NextRequest, NextResponse } from "next/server";
import { coordinatesSchema, reverseGeocodeArea } from "@/lib/location/reverse-geocode";

export async function POST(request: NextRequest) {
  const headers = { "Cache-Control": "no-store" };
  const fail = (message: string, status: number) => NextResponse.json({ message }, { status, headers });
  // Browser-only same-origin POST: coordinates never enter our URLs, logs or persistence.
  if (request.headers.get("origin") !== request.nextUrl.origin) return fail("Invalid origin", 403);
  if (!request.headers.get("content-type")?.startsWith("application/json")) return fail("Invalid request", 415);
  const key = process.env.GOOGLE_GEOCODING_API_KEY;
  if (!key) return fail("Current location is unavailable. Enter a city, district, area or PIN instead.", 503);
  try {
    const body = await request.text();
    if (body.length > 256) return fail("Invalid request", 400);
    const parsed = coordinatesSchema.safeParse(JSON.parse(body));
    if (!parsed.success) return fail("Invalid coordinates", 400);
    const items = await reverseGeocodeArea(parsed.data, key);
    return NextResponse.json({ items, message: items.length
      ? "Confirm a public area. Results cover the selected area, not a distance from your device."
      : "This location is not supported. Enter a city, district, area or PIN instead." }, { headers });
  } catch {
    return fail("Could not resolve your location. Please use manual location search.", 502);
  }
}
