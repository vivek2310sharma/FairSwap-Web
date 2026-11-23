import { z } from "zod";
import { readPostingBody, sessionSchema } from "@/lib/listings/mobiles/server";
import { postingBaseGuard } from "@/lib/listings/posting-base-guard";
import { copyPreparedPostingMedia } from "@/lib/listings/prepare-posting-media";
import { isSpecialistVehicleDraftSlug } from "@/lib/listings/ordinary-goods/categories";
import { goodsSlug, selectedGoodsSubmission, uuid } from "@/lib/listings/ordinary-goods/contract";
import { goodsError, goodsHeaders, loadGoodsDefinition } from "@/lib/listings/ordinary-goods/server";

export const runtime = "nodejs";
export const maxDuration = 60;
const resultSchema = z.object({ success: z.literal(true), listing_id: uuid }).strict();

export async function POST(request: Request, context: { params: Promise<{ slug: string }> }) {
  try {
    const { client, user } = await postingBaseGuard(request);
    const slug = goodsSlug.parse((await context.params).slug);
    const definition = await loadGoodsDefinition(client, slug);
    if (!definition) throw new Error("ORDINARY_GOODS_CONTRACT_UNAVAILABLE");
    if (isSpecialistVehicleDraftSlug(definition.slug)) {
      return Response.json(
        { code: "REGULATED_VEHICLE_DRAFT_ONLY", error: "Save this vehicle as a draft. Submission requires independent vehicle eligibility verification." },
        { status: 409, headers: goodsHeaders },
      );
    }
    const raw = JSON.parse(new TextDecoder().decode(await readPostingBody(request, 16_384)));
    const parsed = selectedGoodsSubmission(definition).safeParse(raw);
    if (!parsed.success) return Response.json({ error: "Check the listing details and safety declarations." }, { status: 422, headers: goodsHeaders });
    const payload = parsed.data;
    const prepared = await client.rpc("ordinary_goods_prepare_v3", { payload });
    if (prepared.error) throw prepared.error;
    const snapshot = sessionSchema.parse(prepared.data);
    if (snapshot.session.id !== payload.session_id || snapshot.session.owner_id !== user.id ||
      !["finalizing", "submitted"].includes(snapshot.session.state)) throw Error("UPLOAD_SESSION_UNAVAILABLE");
    await copyPreparedPostingMedia(snapshot, user, payload);
    const submitted = await client.rpc("ordinary_goods_submit_v3", { payload });
    if (submitted.error) throw submitted.error;
    return Response.json(resultSchema.parse(submitted.data), { headers: goodsHeaders });
  } catch (error) { return goodsError(error); }
}
