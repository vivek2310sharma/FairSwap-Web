// FairSwap Issue #118: Test-only NON-DELIVERING S1 email outbox capture.
// Never deploy to FairSwapProd. No Resend credentials, SMTP, or external sink.
// The entrypoint refuses incorrect project ref, missing approval, and expiry.
import { createClient } from "@supabase/supabase-js";
import {
  handleS1CaptureRequest,
  S1CaptureConfigSchema,
} from "../_shared/email-outbox-s1-capture";

declare const Deno: {
  env: { get(key: string): string | undefined };
  serve(handler: (req: Request) => Promise<Response>): void;
};

if (typeof Deno !== "undefined" && typeof Deno.serve === "function") {
  Deno.serve(async (req: Request) => {
    const raw = {
      supabaseUrl: Deno.env.get("SUPABASE_URL"),
      supabaseServiceRoleKey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
      emailWorkerSecret: Deno.env.get("EMAIL_WORKER_SECRET"),
      approval: Deno.env.get("S1_CAPTURE_APPROVAL"),
      runId: Deno.env.get("S1_CAPTURE_RUN_ID"),
      expiresAtUtc: Deno.env.get("S1_CAPTURE_EXPIRES_AT_UTC"),
      approvedListingIds: (Deno.env.get("S1_CAPTURE_LISTING_IDS") ?? "").split(","),
      approvedStaffRecipientId: Deno.env.get("S1_CAPTURE_STAFF_RECIPIENT_ID"),
    };
    const parsed = S1CaptureConfigSchema.safeParse(raw);
    if (!parsed.success) {
      return new Response(JSON.stringify({
        error: "S1 Test-only capture not authorized for this project/window",
      }), { status: 503, headers: { "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      parsed.data.supabaseUrl,
      parsed.data.supabaseServiceRoleKey,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    return handleS1CaptureRequest(req, parsed.data, supabase);
  });
}
