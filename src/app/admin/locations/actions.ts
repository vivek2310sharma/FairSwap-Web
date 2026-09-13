"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";

export type LocationActionResult = {
  error?: string;
  success?: boolean;
  message?: string;
};

export async function manageLocationAction(
  prevState: LocationActionResult | null,
  formData: FormData
): Promise<LocationActionResult> {
  const supabase = await createClient();

  const action = formData.get("action") as string;
  const cityId = (formData.get("city_id") as string) || undefined;
  const localityId = (formData.get("locality_id") as string) || undefined;
  const name = (formData.get("name") as string) || undefined;
  const state = (formData.get("state") as string) || undefined;
  const slug = (formData.get("slug") as string) || undefined;
  const isActive = formData.get("is_active") === "true" || formData.get("is_active") === "on";

  logger.info("admin.manage_location_initiated", {
    operation: "admin_manage_location",
    extra: { action, city_id: cityId, locality_id: localityId, name },
  });

  const { error } = await supabase.rpc("admin_manage_location", {
    action,
    city_id: cityId,
    locality_id: localityId,
    name,
    state,
    slug,
    is_active: isActive,
  });

  if (error) {
    logger.warn("admin.manage_location_failed", {
      operation: "admin_manage_location",
      error_code: error.code || "RPC_ERROR",
    });
    return { error: error.message };
  }

  revalidatePath("/admin/locations");
  return { success: true, message: `Location action '${action}' completed successfully.` };
}
