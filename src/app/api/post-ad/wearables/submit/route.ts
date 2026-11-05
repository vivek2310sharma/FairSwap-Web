import { phoneRiskSignals } from "@/lib/listings/mobiles/contract";
import { wearableSchema, wearableScanText } from "@/lib/listings/wearables/contract";
import { catalogueRevision, loadWearableCatalogue, prepareWearableMedia, readPostingBody, wearablePostingError, wearablePostingGuard } from "@/lib/listings/wearables/server";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    if (Number(request.headers.get("content-length") ?? 0) > 24000) return Response.json({ error: "Request too large" }, { status: 413 });
    const { client, user } = await wearablePostingGuard(request);
    const parsed = wearableSchema.safeParse(JSON.parse(new TextDecoder().decode(await readPostingBody(request, 24000))));
    if (!parsed.success) return Response.json({ error: "Check the highlighted fields.", issues: parsed.error.issues.map(i => ({ field: String(i.path[0]), message: i.message })) }, { status: 422 });
    const payload = parsed.data;
    if (!await loadWearableCatalogue(client)) throw new Error("Wearable posting is coming soon.");
    if (payload.catalogue_revision !== catalogueRevision()) return Response.json({ error: "The device list was updated. Reload this page and choose your device again." }, { status: 409 });
    if (phoneRiskSignals(wearableScanText(payload as unknown as Record<string, unknown>), payload.model_id === null).filter(s => s !== "other_model").length) return Response.json({ error: "Remove contact numbers, payment IDs, payment links and advance or courier fee requests. Use FairSwap chat and pickup." }, { status: 422 });
    await prepareWearableMedia(client, user, payload);
    const result = await client.rpc("submit_wearable_v1", { payload });
    if (result.error) throw new Error(result.error.message);
    if (result.data?.success !== true) throw new Error("Submission unavailable");
    return Response.json({ success: true, listing_id: result.data.listing_id }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (e) { return wearablePostingError(e); }
}
