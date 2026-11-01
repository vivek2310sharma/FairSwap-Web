import { NextRequest, NextResponse } from "next/server";
import { galleryBudget, getPublicGalleries, parseGalleryIds } from "@/lib/listings/public-gallery";

const NO_STORE = { "Cache-Control": "no-store" };

function clientKey(request: NextRequest): string {
  // On Vercel the platform sets these; they are not client-controlled there.
  return request.headers.get("x-real-ip")?.trim() || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

/**
 * GET /api/listings/gallery?ids=<uuid>,<uuid>... (at most 24)
 *
 * Public, called lazily: desktop cards on first hover/keyboard focus, touch cards once on screen. Never cached by shared
 * caches or the browser (`no-store`) so a moderation takedown is reflected on the next call. Returns `{ galleries: { [listingId]: mediaId[] } }`
 * for publicly visible listings with 2+ ready photos. Media ids only: no storage paths, URLs or listing data.
 */
export async function GET(request: NextRequest) {
  const parsed = parseGalleryIds(request.nextUrl.searchParams.get("ids"));
  const verdict = galleryBudget.check(clientKey(request), parsed.ok ? parsed.ids.length : 1);
  if (!verdict.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: { ...NO_STORE, "Retry-After": String(verdict.retryAfterSeconds) } });
  }
  if (!parsed.ok) return NextResponse.json({ error: "Invalid ids" }, { status: 400, headers: NO_STORE });
  try {
    const galleries = await getPublicGalleries(parsed.ids);
    return NextResponse.json({ galleries }, { headers: NO_STORE });
  } catch {
    return NextResponse.json({ error: "Unavailable" }, { status: 503, headers: NO_STORE });
  }
}