import { NextResponse } from "next/server";
import { z } from "zod";
import { getPublicLocalities } from "@/lib/discovery/queries";

const localityQuerySchema = z.object({
  city_id: z.string().uuid("city_id must be a valid UUID"),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const cityId = searchParams.get("city_id");

  const parsed = localityQuerySchema.safeParse({ city_id: cityId });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid or missing city_id parameter", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const localities = await getPublicLocalities(parsed.data.city_id);
    return NextResponse.json(localities, {
      status: 200,
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error("[GET /api/discovery/localities] Error fetching localities:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
