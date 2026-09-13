"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";

export type CategoryActionResult = {
  error?: string;
  success?: boolean;
  message?: string;
};

export async function manageCategoryAction(
  prevState: CategoryActionResult | null,
  formData: FormData
): Promise<CategoryActionResult> {
  const supabase = await createClient();

  const action = formData.get("action") as string;
  const categoryId = (formData.get("category_id") as string) || null;
  const slug = formData.get("slug") as string;
  const name = formData.get("name") as string;
  const description = (formData.get("description") as string) || null;
  const icon = (formData.get("icon") as string) || null;
  const sortOrder = parseInt((formData.get("sort_order") as string) || "0", 10);
  const isActive = formData.get("is_active") === "true" || formData.get("is_active") === "on";

  logger.info("admin.manage_category_initiated", {
    operation: "admin_manage_category",
    extra: { action, slug, name },
  });

  const { error } = await supabase.rpc("admin_manage_category", {
    action,
    category_id: categoryId,
    slug,
    name,
    description,
    icon,
    sort_order: sortOrder,
    is_active: isActive,
  });

  if (error) {
    logger.warn("admin.manage_category_failed", {
      operation: "admin_manage_category",
      error_code: error.code || "RPC_ERROR",
    });
    return { error: error.message };
  }

  revalidatePath("/admin/categories");
  return { success: true, message: `Category successfully ${action}d.` };
}
