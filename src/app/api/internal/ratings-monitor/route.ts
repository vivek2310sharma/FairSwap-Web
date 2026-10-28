import { authorizedRatingsMonitor, monitorRatingsOperations } from "@/lib/monitoring/ratings-operations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const headers = { "Cache-Control": "private, no-store" };
  if (!authorizedRatingsMonitor(request)) return Response.json({ error: "Unauthorized" }, { status: 401, headers });
  try {
    const alerts = await monitorRatingsOperations();
    return Response.json({ ok: true, alerts }, { headers });
  } catch {
    // The external scheduler must alarm on non-2xx or missing monitor heartbeats.
    return Response.json({ error: "Ratings monitor unavailable" }, { status: 503, headers });
  }
}
