import { NextResponse } from "next/server";
import { getPublicLocalities } from "@/lib/discovery/queries";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const cityId = searchParams.get("city_id");

  if (!cityId) {
    return NextResponse.json([]);
  }

  try {
    const localities = await getPublicLocalities(cityId);
    return NextResponse.json(localities);
  } catch {
    return NextResponse.json([], { status: 500 });
  }
}
