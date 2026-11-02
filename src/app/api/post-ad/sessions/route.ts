import { z } from "zod";
import { postingGuard, postingError, sessionRecoveryChoices, sessionCall, readPostingBody } from "@/lib/listings/mobiles/server";
export async function POST(request: Request) {
  try {
    const {client} = await postingGuard(request);
    const {session_id} = z.object({session_id:z.string().uuid()}).strict().parse(JSON.parse(new TextDecoder().decode(await readPostingBody(request,1024))));
    return Response.json(await sessionCall(client,session_id,"create"),{headers:{"Cache-Control":"private, no-store"}});
  } catch(e) { return postingError(e); }
}

/** Owner-scoped metadata only; listing never creates or releases a session. */
export async function GET(request: Request) {
  try {
    const {client} = await postingGuard(request,false);
    return Response.json(await sessionRecoveryChoices(client),{headers:{"Cache-Control":"private, no-store"}});
  } catch(e) { return postingError(e); }
}
/** Explicit confirmation in the UI; the RPC atomically refuses all media history. */
export async function DELETE(request: Request) {
  try {
    const {client} = await postingGuard(request);
    const {session_id} = z.object({session_id:z.string().uuid()}).strict().parse(JSON.parse(new TextDecoder().decode(await readPostingBody(request,1024))));
    return Response.json(await sessionCall(client,session_id,"abandon_empty"),{headers:{"Cache-Control":"private, no-store"}});
  } catch(e) { return postingError(e); }
}
