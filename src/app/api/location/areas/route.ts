import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { areasForPincode, findPublicAreas, resolvePublicArea } from "@/lib/location/public-areas";

const inputSchema = z.union([
  z.object({ city: z.string().uuid(), locality: z.string().uuid().optional() }).strict(),
  z.object({ q: z.string().trim().min(2).max(80).regex(/^[\p{L}\p{M}\p{N}\s.'’()-]+$/u) }).strict(),
]);
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  if (Array.from(params.keys()).some(k => params.getAll(k).length > 1)) return NextResponse.json({ message: "Invalid location" }, { status: 400 });
  const parsed = inputSchema.safeParse(Object.fromEntries(params));
  const headers = { "Cache-Control": "no-store" };
  if (!parsed.success) return NextResponse.json({ message: "Enter a place name or six-digit PIN." }, { status: 400, headers });
  try {
    const input = parsed.data;
    if ("city" in input) {
      const area = await resolvePublicArea(input.city, input.locality);
      return NextResponse.json({ items: area ? [area] : [] }, { headers });
    }
    if (/^\d+$/.test(input.q)) {
      if (!/^[1-9]\d{5}$/.test(input.q)) return NextResponse.json({ items: [], message: "Enter a valid six-digit Indian PIN." }, { headers });
      return NextResponse.json({ items: await areasForPincode(input.q), message: "Choose a public area. District results cover the whole district; these are not exact-PIN results." }, { headers });
    }
    return NextResponse.json({ items: await findPublicAreas(input.q, request.signal) }, { headers });
  } catch {
    return NextResponse.json({ message: "Location search unavailable. Please retry." }, { status: 503, headers });
  }
}
