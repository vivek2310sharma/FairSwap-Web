import { NextResponse } from "next/server";
import { z } from "zod";
import { getLocalityPage } from "@/lib/discovery/locality-page";

const localityQuerySchema = z.object({
  city_id: z.string().uuid("city_id must be a valid UUID"),
  offset: z.coerce.number().int().min(0).max(1000000),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const cityId = searchParams.get("city_id");

  const parsed = localityQuerySchema.safeParse({ city_id: cityId, offset: searchParams.get("offset") ?? 0 });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid or missing city_id parameter", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const page = await getLocalityPage(parsed.data.city_id, parsed.data.offset, request.signal);
    return NextResponse.json(page.items, {
      status: 200,
      headers: {
        "Cache-Control": "private, max-age=300",
        ...(page.nextOffset !== null ? { "X-Next-Offset": String(page.nextOffset) } : {}),
      },
    });
  } catch {
    return NextResponse.json({ error: "Unable to load areas. Please retry." }, {
      status: 503, headers: { "Cache-Control": "no-store" },
    });
  }
}
