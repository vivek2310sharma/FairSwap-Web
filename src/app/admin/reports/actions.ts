"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";

export type AdminReportActionResult = {
  error?: string;
  success?: boolean;
  message?: string;
  data?: unknown;
};

export async function resolveReportAction(
  reportId: string,
  newStatus: "investigating" | "resolved" | "dismissed",
  resolutionNotes?: string
): Promise<AdminReportActionResult> {
  const supabase = await createClient();

  logger.info("admin.resolve_report_initiated", {
    operation: "resolveReportAction",
    extra: { report_id: reportId, new_status: newStatus },
  });

  const { error } = await supabase.rpc("admin_resolve_report", {
    report_id: reportId,
    new_status: newStatus,
    resolution_notes: resolutionNotes?.trim() || null,
  });

  if (error) {
    logger.warn("admin.resolve_report_failed", {
      operation: "resolveReportAction",
      error_code: error.code || "RPC_ERROR",
    });
    return { error: error.message };
  }

  revalidatePath("/admin/reports");
  revalidatePath(`/admin/reports/${reportId}`);
  return { success: true, message: `Report marked as ${newStatus}.` };
}

export async function getReportEvidenceAction(
  reportId: string
): Promise<AdminReportActionResult> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("admin_get_report_evidence", {
    report_id: reportId,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true, data };
}
