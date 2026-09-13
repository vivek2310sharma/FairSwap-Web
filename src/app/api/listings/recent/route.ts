import { NextResponse } from "next/server";
import { searchPublicListings } from "@/lib/discovery/queries";

export async function GET() {
  const result = await searchPublicListings({ sort: "newest", page: 1 });
  return NextResponse.json(result);
}
