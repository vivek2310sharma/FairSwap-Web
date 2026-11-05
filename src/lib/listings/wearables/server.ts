import "server-only";
import { wearablesEnabled } from "./enabled";
import { createHash } from "node:crypto";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { postingBaseGuard } from "../posting-base-guard";
import { readPostingBody, sessionSchema, stagedPrefix } from "../mobiles/server";
import { PostingSessionError, sessionErrors, sessionRecoveryChoicesSchema } from "../mobiles/session-errors";
import { DEVICE_TYPES, wearableRpcMessage, type DeviceType, type WearableCatalogue, type WearableModelChoice } from "./contract";
import catalogueJson from "./catalogue.generated.json";

/** Server-only reference data. The full model list is never sent to the client; models are served per brand. */
const reference = catalogueJson as { revision: string; brands: { id: string; name: string; types: DeviceType[] }[]; models: { id: string; brand_id: string; type: DeviceType; series: string; name: string }[] };
export { readPostingBody };

/** Independent of the Mobile Phones / Tablets flags. The database release row must ALSO be enabled. */
export { wearablesEnabled } from "./enabled";

const rpcCatalogue = z.object({ version: z.literal(1), revision: z.string(), listing_category_id: z.string().uuid(), enabled: z.boolean() });
/** Fails closed: flag off, RPC error, DB not enabled, or DB revision differing from the bundled catalogue. */
export async function loadWearableCatalogue(client: SupabaseClient): Promise<WearableCatalogue | null> {
  if (!wearablesEnabled()) return null;
  const result = await client.rpc("wearables_v1_catalogue");
  const parsed = rpcCatalogue.safeParse(result.data);
  if (result.error || !parsed.success || !parsed.data.enabled || parsed.data.revision !== reference.revision) return null;
  return { ...parsed.data, brands: reference.brands };
}
export const catalogueRevision = () => reference.revision;
export const loadWearableBrandsForSearch = (type?: DeviceType) => reference.brands.filter(b => !type || b.types.includes(type)).map(({ id, name }) => ({ id, name }));
export function wearableModelsFor(brandId: string, type: DeviceType): WearableModelChoice[] {
  return reference.models.filter(m => m.brand_id === brandId && m.type === type).map(({ id, name, series }) => ({ id, name, series }));
}
export const isDeviceType = (v: string | null): v is DeviceType => !!v && (DEVICE_TYPES as readonly string[]).includes(v);

export async function wearablePostingGuard(request: Request, mutation = true) {
  if (!wearablesEnabled()) throw new Error("Wearable posting is coming soon.");
  return postingBaseGuard(request, mutation);
}

function sessionRpcError(error: { code?: string; message?: string }) {
  const m = error.message ?? "";
  if (m === "UPLOAD_SESSION_LIMIT") return new PostingSessionError("UPLOAD_SESSION_LIMIT");
  if (m === "UPLOAD_SESSION_EXPIRED" || m === "Upload session expired") return new PostingSessionError("UPLOAD_SESSION_EXPIRED");
  if (m === "UPLOAD_SESSION_PROTECTED") return new PostingSessionError("UPLOAD_SESSION_PROTECTED");
  if (m === "Upload in progress; retry shortly" || m === "Submission is being finalized") return new PostingSessionError("UPLOAD_SESSION_BUSY");
  return new PostingSessionError("UPLOAD_SESSION_UNAVAILABLE"); // includes cross-category and unavailable-category; never echo SQL
}
export async function wearableSession(client: SupabaseClient, session_id: string, operation: string, media_id?: string) {
  const r = await client.rpc("wearable_v1_session", { session_id, operation, media_id: media_id ?? null });
  if (r.error) throw sessionRpcError(r.error);
  const parsed = sessionSchema.safeParse(r.data);
  if (!parsed.success) throw new PostingSessionError("UPLOAD_SESSION_UNAVAILABLE");
  return parsed.data;
}
export async function wearableRecoveryChoices(client: SupabaseClient) {
  const r = await client.rpc("wearable_v1_session", { session_id: null, operation: "list_recovery", media_id: null });
  if (r.error) throw sessionRpcError(r.error);
  const parsed = sessionRecoveryChoicesSchema.safeParse(r.data);
  if (!parsed.success) throw new PostingSessionError("UPLOAD_SESSION_UNAVAILABLE");
  return parsed.data;
}

/** Moves staged, already-sanitized derivatives next to the listing. Re-implemented here: the phone helper is not shared. */
export async function prepareWearableMedia(client: SupabaseClient, user: { id: string }, payload: { session_id: string; media_ids: string[] }) {
  const snapshot = await wearableSession(client, payload.session_id, "prepare");
  if (snapshot.session.state === "submitted") return;
  const service = createServiceRoleClient();
  for (const id of payload.media_ids) {
    const media = snapshot.media.find(m => m.id === id && m.state === "ready");
    if (!media) throw new Error("Photo unavailable");
    for (const name of ["original", "thumb", "medium", "large"]) {
      const source = `${stagedPrefix(user.id, payload.session_id, id, media.attempt)}/${name}.webp`;
      const dest = `${snapshot.session.listing_id}/${id}/${name}.webp`;
      const bucket = service.storage.from(name === "original" ? "listing-originals" : "listing-derivatives");
      const read = await service.storage.from("posting-staged").download(source);
      if (read.error) throw new Error("Photo unavailable");
      const bytes = Buffer.from(await read.data.arrayBuffer());
      const write = await bucket.upload(dest, bytes, { contentType: "image/webp", upsert: false });
      if (write.error) {
        // Lost-response retries accept only byte-identical prepared objects.
        const existing = await bucket.download(dest);
        if (existing.error) throw new Error("Photo preparation failed");
        const hash = (b: Buffer) => createHash("sha256").update(b).digest("hex");
        if (hash(bytes) !== hash(Buffer.from(await existing.data.arrayBuffer()))) throw new Error("Photo conflict");
      }
    }
  }
}

/** Safe error boundary: only known constants/messages cross to the client; never SQL. */
export function wearablePostingError(error: unknown, status = 400) {
  const headers = { "Cache-Control": "private, no-store" };
  if (error instanceof PostingSessionError) return Response.json({ error: error.message, code: error.code }, { status: sessionErrors[error.code].status, headers });
  const raw = error instanceof Error ? error.message : "";
  const mapped = wearableRpcMessage(raw);
  if (mapped) return Response.json({ error: mapped }, { status: 422, headers });
  const message = /^(Wearable posting|Request origin|Posting is temporarily|Sign in|Current policy|An active|Upload in progress)/.test(raw) ? raw : "Could not complete the request. Your saved details are safe; please retry.";
  return Response.json({ error: message }, { status, headers });
}
