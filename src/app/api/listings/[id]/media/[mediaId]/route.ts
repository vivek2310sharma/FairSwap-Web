import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; mediaId: string }> }
) {
  const { id: listingId, mediaId } = await params;

  // 1. Authenticate the caller
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Verify listing ownership and fetch media record
  const { data: media, error: mediaError } = await supabase
    .from("listing_media")
    .select("id, listing_id, original_storage_path, thumbnail_storage_path, medium_storage_path, large_storage_path, listings!inner(seller_id, status)")
    .eq("id", mediaId)
    .eq("listing_id", listingId)
    .single();

  if (mediaError || !media) {
    return NextResponse.json({ error: "Media not found" }, { status: 404 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const listingSellerId = (media as any).listings?.seller_id;
  if (listingSellerId !== user.id) {
    return NextResponse.json({ error: "Forbidden: Not listing owner" }, { status: 403 });
  }

  const serviceClient = createServiceRoleClient();

  // 3. Delete original + derivative objects from Supabase Storage API
  const objectsToDeleteFromDerivatives: string[] = [];
  if (media.thumbnail_storage_path) objectsToDeleteFromDerivatives.push(media.thumbnail_storage_path);
  if (media.medium_storage_path) objectsToDeleteFromDerivatives.push(media.medium_storage_path);
  if (media.large_storage_path) objectsToDeleteFromDerivatives.push(media.large_storage_path);

  if (media.original_storage_path) {
    await serviceClient.storage.from("listing-originals").remove([media.original_storage_path]);
  }

  if (objectsToDeleteFromDerivatives.length > 0) {
    await serviceClient.storage.from("listing-derivatives").remove(objectsToDeleteFromDerivatives);
  }

  // 4. Server-controlled DB deletion via service-role RPC (triggers material re-review and cover reset)
  const { data: rpcResult, error: rpcError } = await serviceClient.rpc("delete_listing_media_internal", {
    listing_id: listingId,
    media_id: mediaId,
  });

  if (rpcError) {
    return NextResponse.json({ error: rpcError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, result: rpcResult }, { status: 200 });
}
