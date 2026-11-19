import { z } from "zod";
import { readPostingBody } from "@/lib/listings/mobiles/server";
import { postingBaseGuard } from "@/lib/listings/posting-base-guard";
import { goodsSlug, uuid } from "@/lib/listings/ordinary-goods/contract";
import { goodsError, goodsHeaders, goodsSession } from "@/lib/listings/ordinary-goods/server";

type Context = { params: Promise<{ slug: string }> };
export async function POST(request: Request, context: Context) {
  try {
    const { client } = await postingBaseGuard(request);
    const slug = goodsSlug.parse((await context.params).slug);
    const { session_id } = z.object({ session_id: uuid }).strict().parse(
      JSON.parse(new TextDecoder().decode(await readPostingBody(request, 1024))),
    );
    return Response.json(await goodsSession(client, slug, session_id, "create"), { headers: goodsHeaders });
  } catch (error) { return goodsError(error); }
}
