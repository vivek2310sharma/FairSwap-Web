import { NextResponse } from "next/server";
import { NO_STORE_HEADERS, validateSameOrigin } from "@/lib/idv/server-helpers";
import { startLab } from "@/lib/idv/digilocker-lab";

export const runtime = "nodejs";

// STAGE-ONLY DigiLocker Identity Lab start. Cookie-authenticated, same-origin only.
export async function POST(req: Request) {
  if (!validateSameOrigin(req)) {
    return NextResponse.json({ error: "CROSS_ORIGIN_REQUEST_REJECTED" }, { status: 403, headers: NO_STORE_HEADERS });
  }
  return startLab();
}
