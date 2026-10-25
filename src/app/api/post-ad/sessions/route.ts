import { z } from "zod";
import { postingGuard, postingError, sessionCall, readPostingBody } from "@/lib/listings/mobiles/server";
export async function POST(request: Request) {
  try {
    const {client} = await postingGuard(request);
    const {session_id} = z.object({session_id:z.string().uuid()}).strict().parse(JSON.parse(new TextDecoder().decode(await readPostingBody(request,1024))));
    return Response.json(await sessionCall(client,session_id,"create"),{headers:{"Cache-Control":"private, no-store"}});
  } catch(e) { return postingError(e); }
}
