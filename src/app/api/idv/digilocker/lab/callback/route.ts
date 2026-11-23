import type { NextRequest } from "next/server";
import { handleLabCallback } from "@/lib/idv/digilocker-lab";

export const runtime = "nodejs";

// Registered redirect URI of the SEPARATE Identity Lab Authpartner. Independent of /api/idv/digilocker/callback.
export async function GET(req: NextRequest) {
  return handleLabCallback(req);
}
