"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";

export type ReportActionResult = {
  error?: string;
  success?: boolean;
  reportId?: string;
  message?: string;
};

export async function createReportAction(
  targetType: "listing" | "user" | "message",
  targetId: string,
  reason: string,
  details?: string
): Promise<ReportActionResult> {
  const cleanReason = reason.trim();
  if (!cleanReason || cleanReason.length < 3) {
    return { error: "Please provide a reason (at least 3 characters)." };
  }

  const supabase = await createClient();

  logger.info("reporting.create_report_initiated", {
    operation: "createReportAction",
    extra: { target_type: targetType, target_id: targetId },
  });

  const { data, error } = await supabase.rpc("create_report", {
    target_type: targetType,
    target_id: targetId,
    reason: cleanReason,
    details: details?.trim() || null,
  });

  if (error) {
    logger.warn("reporting.create_report_failed", {
      operation: "createReportAction",
      error_code: error.code || "RPC_ERROR",
    });
    return { error: error.message };
  }

  revalidatePath("/account");
  return { success: true, reportId: data as string, message: "Report submitted successfully." };
}
