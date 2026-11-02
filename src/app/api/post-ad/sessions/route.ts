import { z } from "zod";
import { postingGuard, postingError, acquireDraftSession, prepareEmptySession, sessionRecoveryChoices, sessionCall, readPostingBody } from "@/lib/listings/mobiles/server";
export async function POST(request: Request) {
  try {
    const {client,user} = await postingGuard(request);
    const {session_id,operation} = z.object({session_id:z.string().uuid(),operation:z.enum(["create","create_empty","claim_draft","acquire_draft"]).default("create")}).strict().parse(JSON.parse(new TextDecoder().decode(await readPostingBody(request,1024))));
    return Response.json(operation==="acquire_draft"?await acquireDraftSession(client,user.id,session_id):operation==="create_empty"?await prepareEmptySession(client,user.id,session_id):await sessionCall(client,session_id,operation),{headers:{"Cache-Control":"private, no-store"}});
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
