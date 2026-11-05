import { z } from "zod";
import { DEVICE_TYPES } from "@/lib/listings/wearables/contract";
import { loadWearableCatalogue, wearableModelsFor, wearablePostingError, wearablePostingGuard } from "@/lib/listings/wearables/server";
const query = z.object({ brand_id: z.string().regex(/^wb_[a-z0-9-]+$/), type: z.enum(DEVICE_TYPES) }).strict();
/** One brand + type at a time (never the full catalogue). */
export async function GET(request: Request) {
  try {
    const { client } = await wearablePostingGuard(request, false);
    if (!await loadWearableCatalogue(client)) throw new Error("Wearable posting is coming soon.");
    const url = new URL(request.url);
    const q = query.parse(Object.fromEntries(url.searchParams));
    return Response.json({ models: wearableModelsFor(q.brand_id, q.type) }, { headers: { "Cache-Control": "private, max-age=60" } });
  } catch (e) { return wearablePostingError(e); }
}
