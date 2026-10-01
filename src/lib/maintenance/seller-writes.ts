import { z } from "zod";

const maintenanceEnvSchema = z.enum(["true", "false"]).optional();

export const SELLER_WRITE_MAINTENANCE_MESSAGE =
  "Listing creation and editing are temporarily paused while we upgrade location reference data. Active listings and buyer messages remain accessible. Please try again shortly.";

/**
 * Checks whether seller listing writes (creation, draft updates, and submission)
 * are temporarily disabled for reference data maintenance.
 *
 * Requirements:
 * - server-only module semantics
 * - Reads MAINTENANCE_SELLER_WRITES (never NEXT_PUBLIC_*)
 * - Fail-safe default: false (maintenance disabled if absent or invalid)
 * - Validates configuration with Zod
 */
export function isSellerWriteMaintenanceEnabled(): boolean {
  const raw = process.env.MAINTENANCE_SELLER_WRITES;
  if (!raw) {
    return false;
  }

  const parsed = maintenanceEnvSchema.safeParse(raw.trim().toLowerCase());
  if (!parsed.success) {
    return false;
  }

  return parsed.data === "true";
}
