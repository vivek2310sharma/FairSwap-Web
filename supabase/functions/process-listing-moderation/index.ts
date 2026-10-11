// supabase/functions/process-listing-moderation/index.ts
// FairSwap Edge Function: process-listing-moderation
// Triggered by database pg_net webhook on listing_moderation_requests INSERT or scheduled retry runner

import { createClient } from "@supabase/supabase-js";
import {
  handleModerationWorkerRequest,
  WorkerConfigSchema,
} from "../_shared/listing-moderation-worker";

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve(handler: (req: Request) => Promise<Response>): void;
};

export async function processListingModerationHandler(req: Request): Promise<Response> {
  const getEnv = (k: string) => {
    if (typeof Deno !== "undefined" && Deno.env) {
      return Deno.env.get(k);
    }
    return process.env[k];
  };

  const rawEnv = {
    supabaseUrl: getEnv("SUPABASE_URL"),
    supabaseServiceRoleKey: getEnv("SUPABASE_SERVICE_ROLE_KEY"),
    moderationWorkerSecret: getEnv("MODERATION_WORKER_SECRET"),
    batchSize: getEnv("MODERATION_BATCH_SIZE") || "10",
    leaseSeconds: getEnv("MODERATION_LEASE_SECONDS") || "60",
  };

  const parsedConfig = WorkerConfigSchema.safeParse(rawEnv);
  if (!parsedConfig.success) {
    return new Response(
      JSON.stringify({
        error: "Missing or invalid worker configuration",
        details: parsedConfig.error.issues,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const config = parsedConfig.data;
  const supabase = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return handleModerationWorkerRequest(req, config, supabase);
}

if (typeof Deno !== "undefined" && typeof Deno.serve === "function") {
  Deno.serve(processListingModerationHandler);
}
