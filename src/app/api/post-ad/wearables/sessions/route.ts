import { z } from "zod";
import { sessionRecoveryChoicesSchema } from "@/lib/listings/mobiles/session-errors";
import { loadWearableCatalogue, readPostingBody, wearablePostingError, wearablePostingGuard, wearableRecoveryChoices, wearableSession } from "@/lib/listings/wearables/server";
const headers = { "Cache-Control": "private, no-store" };
const uuid = z.string().uuid();
const body = (request: Request) => readPostingBody(request, 1024).then(b => JSON.parse(new TextDecoder().decode(b)));
export async function POST(request: Request) {
  try {
    const { client } = await wearablePostingGuard(request);
    if (!await loadWearableCatalogue(client)) throw new Error("Wearable posting is coming soon.");
    const v = z.object({ session_id: uuid, operation: z.enum(["create", "create_empty", "claim_draft", "acquire_draft"]).default("create") }).strict().parse(await body(request));
    return Response.json(await wearableSession(client, v.session_id, v.operation), { headers });
  } catch (e) { return wearablePostingError(e); }
}
/** Owner-scoped recovery metadata (wearable-bound sessions only). */
export async function GET(request: Request) {
  try {
    const { client } = await wearablePostingGuard(request, false);
    return Response.json(sessionRecoveryChoicesSchema.parse(await wearableRecoveryChoices(client)), { headers });
  } catch (e) { return wearablePostingError(e); }
}
export async function DELETE(request: Request) {
  try {
    const { client } = await wearablePostingGuard(request);
    const v = z.object({ session_id: uuid }).strict().parse(await body(request));
    return Response.json(await wearableSession(client, v.session_id, "abandon_empty"), { headers });
  } catch (e) { return wearablePostingError(e); }
}
