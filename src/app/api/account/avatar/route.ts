import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { requireCurrentPolicyAcceptance } from "@/lib/compliance/policy-acceptance";
import { logger } from "@/lib/logger";
import {
  AVATAR_BUCKET,
  AVATAR_MAX_INPUT_BYTES,
  AvatarProcessingError,
  buildAvatarPath,
  processAvatarImage,
} from "@/lib/profile/avatar";

export const runtime = "nodejs";

type AvatarRpc = { success?: boolean; error?: string; previous_path?: string | null; avatar_url?: string };

const NO_STORE = { "Cache-Control": "no-store" };

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

function rpcFailure(error: string | undefined) {
  switch (error) {
    case "AVATAR_CONFLICT":
      return json({ error: "Your photo changed in another session. Please try again.", code: error }, 409);
    case "ACCOUNT_RESTRICTED":
    case "FORBIDDEN":
      return json({ error: "Your account status does not allow profile changes right now.", code: error }, 403);
    default:
      return json({ error: "We could not update your photo. Please try again.", code: error ?? "AVATAR_FAILED" }, 500);
  }
}

type AuthResult =
  | { ok: false; response: Response }
  | { ok: true; userId: string; currentPath: string | null };

async function authenticate(): Promise<AuthResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { ok: false, response: json({ error: "Please sign in to continue." }, 401) };

  const guard = await requireCurrentPolicyAcceptance(supabase, "/account/profile");
  if (!guard.allowed) {
    return {
      ok: false,
      response: json(
        { error: guard.error, requiresPolicyReview: guard.requiresPolicyReview, redirectTo: guard.redirectTo },
        403
      ),
    };
  }

  // Own row is readable under RLS; this is the CAS key for the privileged update.
  const { data: profile } = await supabase
    .from("profiles")
    .select("avatar_path")
    .eq("id", data.user.id)
    .maybeSingle();

  return { ok: true, userId: data.user.id, currentPath: (profile?.avatar_path as string | null | undefined) ?? null };
}

async function removeObject(path: string | null | undefined, userId: string) {
  // Defence in depth: only ever delete objects inside the verified user's own folder.
  if (!path || !path.startsWith(`${userId}/`)) return;
  try {
    const service = createServiceRoleClient();
    const { error } = await service.storage.from(AVATAR_BUCKET).remove([path]);
    if (error) {
      logger.warn("account.avatar_cleanup_failed", { operation: "avatar.removeObject", error_code: "STORAGE_REMOVE" });
    }
  } catch {
    logger.warn("account.avatar_cleanup_failed", { operation: "avatar.removeObject", error_code: "EXCEPTION" });
  }
}

export async function POST(request: Request): Promise<Response> {
  const auth = await authenticate();
  if (!auth.ok) return auth.response;
  const { userId, currentPath } = auth;

  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > AVATAR_MAX_INPUT_BYTES + 64 * 1024) {
    return json({ error: "Image must be 5 MB or smaller." }, 413);
  }

  let file: File | null = null;
  try {
    const form = await request.formData();
    const entry = form.get("file");
    file = entry instanceof File ? entry : null;
  } catch {
    return json({ error: "Invalid upload." }, 400);
  }
  if (!file) return json({ error: "Choose an image to upload." }, 400);
  if (file.size > AVATAR_MAX_INPUT_BYTES) return json({ error: "Image must be 5 MB or smaller." }, 413);

  let webp: Buffer;
  try {
    webp = await processAvatarImage(Buffer.from(await file.arrayBuffer()));
  } catch (err) {
    if (err instanceof AvatarProcessingError) {
      return json({ error: err.message, code: err.code }, err.code === "TOO_LARGE" ? 413 : 400);
    }
    return json({ error: "This image could not be processed." }, 400);
  }

  const service = createServiceRoleClient();
  const newPath = buildAvatarPath(userId);

  const { error: uploadError } = await service.storage.from(AVATAR_BUCKET).upload(newPath, webp, {
    contentType: "image/webp",
    upsert: false,
    cacheControl: "31536000",
  });
  if (uploadError) {
    logger.error("account.avatar_upload_failed", { operation: "avatar.POST", error_code: "STORAGE_UPLOAD" });
    return json({ error: "We could not upload your photo. Please try again." }, 500);
  }

  const publicUrl = service.storage.from(AVATAR_BUCKET).getPublicUrl(newPath).data.publicUrl;

  const { data, error } = await service.rpc("service_set_profile_avatar", {
    p_user_id: userId,
    p_old_path: currentPath,
    p_new_path: newPath,
    p_public_url: publicUrl,
  });
  const result = data as AvatarRpc | null;

  if (error || !result?.success) {
    // Roll back the just-uploaded object so a failed/raced update leaves no orphan.
    await removeObject(newPath, userId);
    logger.warn("account.avatar_set_failed", {
      operation: "avatar.POST",
      error_code: result?.error ?? error?.code ?? "RPC_ERROR",
    });
    return rpcFailure(result?.error);
  }

  await removeObject(result.previous_path, userId);
  return json({ success: true, avatarUrl: result.avatar_url ?? publicUrl });
}

export async function DELETE(): Promise<Response> {
  const auth = await authenticate();
  if (!auth.ok) return auth.response;
  const { userId, currentPath } = auth;

  if (!currentPath) return json({ success: true, avatarUrl: null });

  const service = createServiceRoleClient();
  const { data, error } = await service.rpc("service_clear_profile_avatar", {
    p_user_id: userId,
    p_old_path: currentPath,
  });
  const result = data as AvatarRpc | null;
  if (error || !result?.success) return rpcFailure(result?.error);

  await removeObject(result.previous_path, userId);
  return json({ success: true, avatarUrl: null });
}
