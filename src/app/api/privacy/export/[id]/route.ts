import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const supabase = await createClient();
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError || !userData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  logger.info("privacy.export_download_requested", {
    operation: "GET /api/privacy/export/[id]",
    extra: { request_id: id, user_id: userData.user.id },
  });

  const { data, error } = await supabase.rpc("admin_fulfill_data_export", {
    request_id: id,
  });

  if (error) {
    logger.warn("privacy.export_download_failed", {
      operation: "GET /api/privacy/export/[id]",
      error_code: error.code || "RPC_ERROR",
      extra: { request_id: id },
    });
    return NextResponse.json(
      { error: error.message || "Failed to generate privacy export" },
      { status: 403 }
    );
  }

  const response = NextResponse.json(data);
  response.headers.set("Cache-Control", "private, no-store, must-revalidate");
  response.headers.set(
    "Content-Disposition",
    `attachment; filename="fairswap-data-export-${id}.json"`
  );

  return response;
}
