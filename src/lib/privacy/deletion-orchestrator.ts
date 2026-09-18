/**
 * Account Deletion Server-Side Orchestrator
 * FairSwap Milestone 1.5
 *
 * Coordinates atomic database anonymization, Storage cleanup,
 * and Supabase Auth identity deletion.
 */

import { createServiceRoleClient } from "@/lib/supabase/service";
import { logger } from "@/lib/logger";

export interface DeletionResult {
  success: boolean;
  error?: string;
  requestId: string;
}

export async function orchestrateAccountDeletion(requestId: string): Promise<DeletionResult> {
  const serviceClient = createServiceRoleClient();

  logger.info("privacy.deletion_orchestration_started", {
    operation: "orchestrateAccountDeletion",
    extra: { request_id: requestId },
  });

  try {
    // Check request state for safe retryability
    const { data: reqRow } = await serviceClient
      .from("privacy_requests")
      .select("id, status, user_id")
      .eq("id", requestId)
      .single();

    if (!reqRow) {
      return { success: false, error: "Privacy request not found", requestId };
    }

    if (reqRow.status === "resolved") {
      logger.info("privacy.deletion_already_resolved", {
        operation: "orchestrateAccountDeletion",
        extra: { request_id: requestId },
      });
      return { success: true, requestId };
    }

    let userId = reqRow.user_id;

    // Phase 1: Begin Account Deletion (Database Atomic Anonymization)
    if (userId) {
      const { data: beginData, error: beginError } = await serviceClient.rpc(
        "admin_begin_account_deletion",
        { request_id: requestId }
      );

      if (beginError) {
        logger.error("privacy.deletion_begin_failed", {
          operation: "orchestrateAccountDeletion",
          error_code: beginError.code || "RPC_ERROR",
          extra: { request_id: requestId },
        });
        return { success: false, error: beginError.message, requestId };
      }

      userId = (beginData as { user_id?: string })?.user_id || userId;
    }

    if (userId) {
      // Phase 2: Storage Cleanup (Remove draft or private media attached to user's listings)
      try {
        const { data: mediaRows, error: mediaError } = await serviceClient
          .from("listing_media")
          .select("original_storage_path, thumbnail_storage_path, medium_storage_path, large_storage_path")
          .eq("uploader_id", userId);

        if (mediaError) {
          logger.error("privacy.deletion_media_query_failed", {
            operation: "orchestrateAccountDeletion",
            error_code: mediaError.code || "DB_ERROR",
            extra: { request_id: requestId, user_id: userId },
          });
          return {
            success: false,
            error: `Failed to query user media for cleanup: ${mediaError.message}`,
            requestId,
          };
        }

        if (mediaRows && mediaRows.length > 0) {
          const originalPaths = mediaRows
            .map((m) => m.original_storage_path)
            .filter(Boolean) as string[];
          const derivativePaths = mediaRows
            .flatMap((m) => [m.thumbnail_storage_path, m.medium_storage_path, m.large_storage_path])
            .filter(Boolean) as string[];

          if (originalPaths.length > 0) {
            const { error: origError } = await serviceClient.storage
              .from("listing-originals")
              .remove(originalPaths);
            if (origError) {
              logger.error("privacy.deletion_storage_orig_cleanup_failed", {
                operation: "orchestrateAccountDeletion",
                error_code: (origError as { message?: string; name?: string })?.name || "STORAGE_ERROR",
                extra: { request_id: requestId, user_id: userId, error: origError.message },
              });
              return {
                success: false,
                error: `Storage cleanup failed for original media: ${origError.message}`,
                requestId,
              };
            }
          }

          if (derivativePaths.length > 0) {
            const { error: derivError } = await serviceClient.storage
              .from("listing-derivatives")
              .remove(derivativePaths);
            if (derivError) {
              logger.error("privacy.deletion_storage_deriv_cleanup_failed", {
                operation: "orchestrateAccountDeletion",
                error_code: (derivError as { message?: string; name?: string })?.name || "STORAGE_ERROR",
                extra: { request_id: requestId, user_id: userId, error: derivError.message },
              });
              return {
                success: false,
                error: `Storage cleanup failed for derivative media: ${derivError.message}`,
                requestId,
              };
            }
          }
        }
      } catch (storageErr) {
        const errorMsg = (storageErr as Error)?.message || "Storage cleanup exception";
        logger.error("privacy.deletion_storage_cleanup_failed", {
          operation: "orchestrateAccountDeletion",
          extra: { request_id: requestId, user_id: userId, error: errorMsg },
        });
        return {
          success: false,
          error: `Storage cleanup failed: ${errorMsg}`,
          requestId,
        };
      }

      // Phase 3: Supabase Auth Identity Deletion
      const { error: authDeleteError } = await serviceClient.auth.admin.deleteUser(userId);
      if (authDeleteError) {
        // If user is already gone (e.g. in a retry scenario), proceed safely
        if (!authDeleteError.message?.toLowerCase().includes("not found")) {
          logger.error("privacy.deletion_auth_delete_failed", {
            operation: "orchestrateAccountDeletion",
            error_code: authDeleteError.code || "AUTH_DELETE_ERROR",
            extra: { request_id: requestId },
          });
          return {
            success: false,
            error: `Auth identity deletion failed: ${authDeleteError.message}`,
            requestId,
          };
        }
      }
    }

    // Phase 4: Finalize Account Deletion
    const { error: finalizeError } = await serviceClient.rpc(
      "admin_finalize_account_deletion",
      { request_id: requestId }
    );

    if (finalizeError) {
      logger.error("privacy.deletion_finalize_failed", {
        operation: "orchestrateAccountDeletion",
        error_code: finalizeError.code || "RPC_ERROR",
        extra: { request_id: requestId },
      });
      return { success: false, error: finalizeError.message, requestId };
    }

    logger.info("privacy.deletion_orchestration_completed", {
      operation: "orchestrateAccountDeletion",
      extra: { request_id: requestId },
    });

    return { success: true, requestId };
  } catch (err) {
    const errorMsg = (err as Error)?.message || "Unknown error during account deletion orchestration";
    logger.error("privacy.deletion_orchestration_exception", {
      operation: "orchestrateAccountDeletion",
      error_code: (err as Error)?.name || "EXCEPTION",
      extra: { request_id: requestId },
    });
    return { success: false, error: errorMsg, requestId };
  }
}
