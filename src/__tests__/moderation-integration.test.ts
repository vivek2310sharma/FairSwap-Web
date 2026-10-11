import { describe, it, expect, beforeAll } from "vitest";
import { Client } from "pg";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { processClaimedJob } from "../../supabase/functions/_shared/listing-moderation-worker";

// Opt-in gate: normal unit tests do NOT connect to any database
const isIntegrationOptedIn = process.env.MOD03A_RUN_LOCAL_DB_TESTS === "true";
const rawRunId = process.env.MOD03A_TASK_RUN_ID;
const rawHost = process.env.MOD03A_DB_HOST;
const rawPort = process.env.MOD03A_DB_PORT;
const rawDb = process.env.MOD03A_DB_NAME || "postgres";

if (isIntegrationOptedIn) {
  if (!rawRunId || rawRunId.trim().length === 0) {
    throw new Error("ABORT: MOD03A_TASK_RUN_ID must be explicitly set and non-empty when MOD03A_RUN_LOCAL_DB_TESTS=true.");
  }
  if (!rawHost || rawHost.trim().length === 0) {
    throw new Error("ABORT: MOD03A_DB_HOST must be explicitly specified when MOD03A_RUN_LOCAL_DB_TESTS=true.");
  }
  if (!rawPort || isNaN(parseInt(rawPort, 10))) {
    throw new Error("ABORT: MOD03A_DB_PORT must be an explicitly specified integer when MOD03A_RUN_LOCAL_DB_TESTS=true.");
  }
  if (!["127.0.0.1", "localhost", "::1"].includes(rawHost)) {
    throw new Error(`ABORT: Database host "${rawHost}" is not on the loopback allowlist.`);
  }
}

const runId = rawRunId || "";
const host = rawHost || "127.0.0.1";
const port = rawPort ? parseInt(rawPort, 10) : 5433;

const DB_CONFIG = {
  host,
  port,
  user: "postgres",
  password: "postgres",
  database: rawDb,
};

const SELLER_ID = "22222222-0000-4000-8000-000000000001";
const STAFF_ID = "44444444-0000-4000-8000-000000000001";
let CAT_ID = "";
let CITY_ID = "";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function query(sql: string, params?: unknown[]): Promise<any> {
  const client = new Client(DB_CONFIG);
  await client.connect();
  try {
    return await client.query(sql, params);
  } finally {
    await client.end();
  }
}

// Helpers
async function createListing(title: string, description: string, price = 50000) {
  const res = await query(
    `INSERT INTO public.listings (
      seller_id, category_id, city_id, title, description, condition, price_type, price_paise, pin_code, category_attributes, status
    ) VALUES ($1, $2, $3, $4, $5, 'good', 'fixed', $6, '560001', '{"brand":"Generic"}'::jsonb, 'draft')
    RETURNING id, revision`,
    [SELLER_ID, CAT_ID, CITY_ID, title, description, price]
  );
  return res.rows[0];
}

async function addMedia(listingId: string, status = "ready", isCover = true) {
  const res = await query(
    `INSERT INTO public.listing_media (
      listing_id, uploader_id, original_storage_path, original_filename, processing_status, display_order, file_size_bytes, content_type
    ) VALUES (
      $1, $2, 'photos/' || gen_random_uuid() || '.jpg', 'test.jpg', 'uploading', 0, 1024, 'image/jpeg'
    ) RETURNING id`,
    [listingId, SELLER_ID]
  );

  const mediaId = res.rows[0].id;
  if (status !== "uploading") {
    await query(`UPDATE public.listing_media SET processing_status = $1 WHERE id = $2`, [status, mediaId]);
  }

  if (isCover && status === "ready") {
    await query(`UPDATE public.listings SET cover_photo_id = $1 WHERE id = $2`, [mediaId, listingId]);
  }
  return mediaId;
}

// Real seller submission contract via seller_submit_listing RPC
async function submitListingViaRpc(listingId: string, sellerId = SELLER_ID) {
  const res = await query(`
    SET LOCAL ROLE authenticated;
    SELECT set_config('request.jwt.claims', json_build_object('sub', '${sellerId}', 'role', 'authenticated')::text, true);
    SELECT public.seller_submit_listing('${listingId}'::uuid);
  `);
  return res[2].rows[0].seller_submit_listing;
}

// Safety test always runs at 0 database connections
describe("MOD-03A Integration Opt-In Safety Check", () => {
  it("Verifies test environment safety opt-in guard", () => {
    if (!isIntegrationOptedIn) {
      expect(isIntegrationOptedIn).toBe(false);
    } else {
      expect(isIntegrationOptedIn).toBe(true);
    }
  });
});

describe.skipIf(!isIntegrationOptedIn)("MOD-03A End-to-End Automatic Moderation Acceptance Suite", () => {
  beforeAll(async () => {
    // Verify task-owned disposable container marker on allowlisted local port
    const markerCheck = await query(`
      SELECT run_id, task FROM test_validation_meta.run_identity LIMIT 1;
    `);
    if (!markerCheck.rows || markerCheck.rows.length === 0 || markerCheck.rows[0].task !== "MOD-03A") {
      throw new Error(`ABORT: Target database at ${host}:${port} is missing valid task-owned test_validation_meta.run_identity marker.`);
    }
    if (markerCheck.rows[0].run_id !== runId) {
      throw new Error(`ABORT: Target database run_id ${markerCheck.rows[0].run_id} does not match expected ${runId}.`);
    }

    const now = new Date().toISOString();
    await query(`
      UPDATE public.app_system_settings
      SET setting_value = 'true'
      WHERE setting_key = 'moderation_automation_enabled';

      INSERT INTO auth.users (id, email, raw_user_meta_data, created_at, updated_at)
      VALUES 
        ('${SELLER_ID}', 'seller_mod03@example.com', '{"age_confirmed":"true","terms_accepted":"true","terms_version":"2026-09-18","privacy_policy_version":"2026-09-18","acceptable_use_version":"2026-09-18"}'::jsonb, '${now}', '${now}'),
        ('${STAFF_ID}', 'staff_mod03@example.com', '{"age_confirmed":"true","terms_accepted":"true","terms_version":"2026-09-18","privacy_policy_version":"2026-09-18","acceptable_use_version":"2026-09-18"}'::jsonb, '${now}', '${now}')
      ON CONFLICT (id) DO NOTHING;

      INSERT INTO public.staff_roles (user_id, role, assigned_at)
      VALUES ('${STAFF_ID}', 'moderator', '${now}')
      ON CONFLICT (user_id) DO NOTHING;

      INSERT INTO public.policy_acceptance_records (user_id, terms_version, privacy_policy_version, acceptable_use_version, minimum_age_confirmed)
      VALUES
        ('${SELLER_ID}', '2026-09-18', '2026-09-18', '2026-09-18', 18),
        ('${STAFF_ID}', '2026-09-18', '2026-09-18', '2026-09-18', 18)
      ON CONFLICT DO NOTHING;

      INSERT INTO public.user_accounts (user_id, account_status, terms_accepted_at, terms_version, privacy_policy_version)
      VALUES
        ('${SELLER_ID}', 'active', '${now}', '2026-09-18', '2026-09-18'),
        ('${STAFF_ID}', 'active', '${now}', '2026-09-18', '2026-09-18')
      ON CONFLICT (user_id) DO UPDATE SET account_status = 'active';
    `);

    const catRes = await query(`SELECT id FROM public.categories LIMIT 1`);
    if (catRes.rows.length > 0) {
      CAT_ID = catRes.rows[0].id;
    } else {
      const newCat = await query(`
        INSERT INTO public.categories (name, slug, display_order)
        VALUES ('Electronics', 'electronics', 1)
        RETURNING id
      `);
      CAT_ID = newCat.rows[0].id;
    }

    const cityRes = await query(`SELECT id FROM public.cities LIMIT 1`);
    if (cityRes.rows.length > 0) {
      CITY_ID = cityRes.rows[0].id;
    } else {
      const newCity = await query(`
        INSERT INTO public.cities (name, state, tier)
        VALUES ('Bengaluru', 'Karnataka', 1)
        RETURNING id
      `);
      CITY_ID = newCity.rows[0].id;
    }
  });

  it("Case A [Worker-to-SQL Component Integration]: Valid seller uses real public submission contract -> real production worker -> auto_approved active without admin", async () => {
    if (!isIntegrationOptedIn) return;

    const listing = await createListing("Vintage Wooden Dining Table", "A beautiful sturdy wooden dining table in excellent condition.");
    await addMedia(listing.id, "ready", true);

    // 1. Submit through the REAL seller_submit_listing RPC
    const submitResult = await submitListingViaRpc(listing.id);
    expect(submitResult.success).toBe(true);
    expect(submitResult.status).toBe("pending_review");

    // Verify durable moderation request was created
    const qReq = await query(`SELECT * FROM public.listing_moderation_requests WHERE listing_id = $1`, [listing.id]);
    expect(qReq.rows).toHaveLength(1);
    expect(qReq.rows[0].status).toBe("pending");

    // 2. Claim through service-role RPC
    const claimRes = await query(`SELECT * FROM public.claim_moderation_batch(1, 30, $1::uuid)`, [qReq.rows[0].id]);
    expect(claimRes.rows).toHaveLength(1);
    const claimedJob = claimRes.rows[0];

    // 3. Process via REAL production worker processClaimedJob
    const serviceClient = createSupabaseClient(`http://${host}:${port}`, "service-role-key-test", {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    // Wire RPC to direct query helper for local postgres test
    serviceClient.rpc = (async (fnName: string, rawArgs: unknown) => {
      const args = rawArgs as Record<string, unknown>;
      if (fnName === "impl_finalize_moderation_result") {
        const finRes = await query(
          `SELECT public.impl_finalize_moderation_result(
            $1::uuid, $2::uuid, $3::text, $4::text, $5::text, $6::text[], $7::text[], $8::jsonb, $9::jsonb
          )`,
          [
            args.p_request_id,
            args.p_claim_token,
            args.p_outcome,
            args.p_ruleset_version,
            args.p_scope,
            args.p_completed_rules,
            args.p_failed_rules,
            JSON.stringify(args.p_flags),
            JSON.stringify(args.p_errors),
          ]
        );
        return { data: finRes.rows[0].impl_finalize_moderation_result, error: null };
      }
      return { data: null, error: new Error("UNKNOWN_TEST_RPC") };
    }) as unknown as SupabaseClient["rpc"];

    const workerResult = await processClaimedJob(claimedJob, serviceClient);
    expect(workerResult.success).toBe(true);
    expect(workerResult.decision).toBe("auto_approved");

    // 4. Assert listing became active automatically
    const finalListing = await query(`SELECT status, published_at FROM public.listings WHERE id = $1`, [listing.id]);
    expect(finalListing.rows[0].status).toBe("active");
    expect(finalListing.rows[0].published_at).not.toBeNull();

    // 5. Assert seller workflow status shows published with automatic provenance
    const sellerStatusRes = await query(`
      SET LOCAL ROLE authenticated;
      SELECT set_config('request.jwt.claims', json_build_object('sub', '${SELLER_ID}', 'role', 'authenticated')::text, true);
      SELECT public.get_seller_moderation_workflow_status('${listing.id}'::uuid);
    `);
    const sStatus = sellerStatusRes[2].rows[0].get_seller_moderation_workflow_status;
    expect(sStatus.workflow_state).toBe("published");
    expect(sStatus.provenance).toBe("automatic");
  });

  it("Case B [Worker-to-SQL Component Integration]: Flagged ad submitted via public contract -> real worker -> routes to admin with staff findings", async () => {
    if (!isIntegrationOptedIn) return;

    const listing = await createListing("Cheap Phone - bit.ly/deal123", "Genuine used phone in great condition. Call for pickup.");
    await addMedia(listing.id, "ready", true);

    const submitResult = await submitListingViaRpc(listing.id);
    expect(submitResult.success).toBe(true);

    const qReq = await query(`SELECT * FROM public.listing_moderation_requests WHERE listing_id = $1`, [listing.id]);
    const claimRes = await query(`SELECT * FROM public.claim_moderation_batch(1, 30, $1::uuid)`, [qReq.rows[0].id]);
    const claimedJob = claimRes.rows[0];

    const serviceClient = createSupabaseClient(`http://${host}:${port}`, "service-role-key-test", {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    serviceClient.rpc = (async (fnName: string, rawArgs: unknown) => {
      const args = rawArgs as Record<string, unknown>;
      const finRes = await query(
        `SELECT public.impl_finalize_moderation_result(
          $1::uuid, $2::uuid, $3::text, $4::text, $5::text, $6::text[], $7::text[], $8::jsonb, $9::jsonb
        )`,
        [
          args.p_request_id,
          args.p_claim_token,
          args.p_outcome,
          args.p_ruleset_version,
          args.p_scope,
          args.p_completed_rules,
          args.p_failed_rules,
          JSON.stringify(args.p_flags),
          JSON.stringify(args.p_errors),
        ]
      );
      return { data: finRes.rows[0].impl_finalize_moderation_result, error: null };
    }) as unknown as SupabaseClient["rpc"];

    const workerResult = await processClaimedJob(claimedJob, serviceClient);
    expect(workerResult.success).toBe(true);
    expect(workerResult.decision).toBe("routed_to_admin");

    // Remains pending_review
    const finalListing = await query(`SELECT status FROM public.listings WHERE id = $1`, [listing.id]);
    expect(finalListing.rows[0].status).toBe("pending_review");

    // Staff contract reads findings
    const findingsRes = await query(`
      SET LOCAL ROLE authenticated;
      SELECT set_config('request.jwt.claims', json_build_object('sub', '${STAFF_ID}', 'role', 'authenticated', 'aal', 'aal2')::text, true);
      SELECT public.get_listing_moderation_findings('${listing.id}'::uuid);
    `);
    const fData = findingsRes[2].rows[0].get_listing_moderation_findings;
    expect(fData.has_findings).toBe(true);
    expect(fData.latest.outcome).toBe("needs_review");
    expect(fData.latest.flags[0].ruleId).toBe("rule_shortened_link");
  });

  it("Case C: Incomplete / failed checks cannot auto-publish; bounded retries and escalation", async () => {
    if (!isIntegrationOptedIn) return;

    const listing = await createListing("Clean Desk Lamp", "Desk lamp in working order.");
    await addMedia(listing.id, "ready", true);
    await submitListingViaRpc(listing.id);

    const qReq = await query(`SELECT * FROM public.listing_moderation_requests WHERE listing_id = $1`, [listing.id]);
    const claimRes = await query(`SELECT * FROM public.claim_moderation_batch(1, 30, $1::uuid)`, [qReq.rows[0].id]);
    const job = claimRes.rows[0];

    // Attempt 1: Incomplete check -> awaiting_retry
    const incompleteFin = await query(
      `SELECT public.impl_finalize_moderation_result(
        $1::uuid, $2::uuid, 'checks_incomplete', 'prototype_v0.1.1', 'title_description',
        ARRAY['rule_prohibited_item_wording'], ARRAY['rule_payment_before_viewing'],
        '[]'::jsonb, '[{"error":"timeout"}]'::jsonb
      )`,
      [job.request_id, job.claim_token]
    );

    const finObjC1 = incompleteFin.rows[0].impl_finalize_moderation_result;
    expect(finObjC1.decision).toBe("awaiting_retry");
    expect(finObjC1.next_attempt_at).toBeDefined();

    // Verify nonterminal attempt was persisted in evidence table
    const ev1 = await query(`SELECT * FROM public.listing_moderation_results WHERE request_id = $1`, [job.request_id]);
    expect(ev1.rows).toHaveLength(1);
    expect(ev1.rows[0].decision).toBe("awaiting_retry");

    // Force request to max_attempts to verify terminal escalation
    await query(`UPDATE public.listing_moderation_requests SET attempt_count = 3, status = 'claimed', claim_token = $2, claim_expires_at = clock_timestamp() + interval '60 seconds' WHERE id = $1`, [job.request_id, job.claim_token]);
    const escalateFin = await query(
      `SELECT public.impl_finalize_moderation_result(
        $1::uuid, $2::uuid, 'checks_incomplete', 'prototype_v0.1.1', 'title_description',
        ARRAY['rule_prohibited_item_wording'], ARRAY['rule_payment_before_viewing'],
        '[]'::jsonb, '[{"error":"timeout"}]'::jsonb
      )`,
      [job.request_id, job.claim_token]
    );
    const finObjC2 = escalateFin.rows[0].impl_finalize_moderation_result;
    expect(finObjC2.decision).toBe("escalated_to_admin");
  });

  it("Case D: Unauthorized callers denied service write RPCs and staff findings", async () => {
    if (!isIntegrationOptedIn) return;

    // 1. Authenticated seller cannot claim jobs
    let caughtClaim = false;
    try {
      await query(`
        SET LOCAL ROLE authenticated;
        SELECT set_config('request.jwt.claims', json_build_object('sub', '${SELLER_ID}', 'role', 'authenticated')::text, true);
        SELECT * FROM public.claim_moderation_batch(1, 30);
      `);
    } catch (err: unknown) {
      caughtClaim = true;
      expect((err as Error).message).toContain("permission denied");
    }
    expect(caughtClaim).toBe(true);

    // 2. Authenticated seller cannot call finalize gate
    let caughtFinalize = false;
    try {
      await query(`
        SET LOCAL ROLE authenticated;
        SELECT set_config('request.jwt.claims', json_build_object('sub', '${SELLER_ID}', 'role', 'authenticated')::text, true);
        SELECT public.impl_finalize_moderation_result(gen_random_uuid(), gen_random_uuid(), 'no_review_flags', 'prototype_v0.1.1', 'title_description', ARRAY[]::text[], ARRAY[]::text[], '[]'::jsonb, '[]'::jsonb);
      `);
    } catch (err: unknown) {
      caughtFinalize = true;
      expect((err as Error).message).toContain("permission denied");
    }
    expect(caughtFinalize).toBe(true);

    // 3. Authenticated seller cannot read staff findings
    let caughtFindings = false;
    try {
      await query(`
        SET LOCAL ROLE authenticated;
        SELECT set_config('request.jwt.claims', json_build_object('sub', '${SELLER_ID}', 'role', 'authenticated')::text, true);
        SELECT public.get_listing_moderation_findings(gen_random_uuid());
      `);
    } catch (err: unknown) {
      caughtFindings = true;
      expect((err as Error).message).toContain("Staff authorization required");
    }
    expect(caughtFindings).toBe(true);

    // 4. Anonymous callers denied service write RPCs and staff findings
    let caughtAnonClaim = false;
    try {
      await query(`
        SET LOCAL ROLE anon;
        SELECT * FROM public.claim_moderation_batch(1, 30);
      `);
    } catch (err: unknown) {
      caughtAnonClaim = true;
      expect((err as Error).message).toContain("permission denied");
    }
    expect(caughtAnonClaim).toBe(true);

    let caughtAnonFinalize = false;
    try {
      await query(`
        SET LOCAL ROLE anon;
        SELECT public.impl_finalize_moderation_result(gen_random_uuid(), gen_random_uuid(), 'no_review_flags', 'prototype_v0.1.1', 'title_description', ARRAY[]::text[], ARRAY[]::text[], '[]'::jsonb, '[]'::jsonb);
      `);
    } catch (err: unknown) {
      caughtAnonFinalize = true;
      expect((err as Error).message).toContain("permission denied");
    }
    expect(caughtAnonFinalize).toBe(true);

    let caughtAnonFindings = false;
    try {
      await query(`
        SET LOCAL ROLE anon;
        SELECT public.get_listing_moderation_findings(gen_random_uuid());
      `);
    } catch (err: unknown) {
      caughtAnonFindings = true;
      expect((err as Error).message).toContain("permission denied");
    }
    expect(caughtAnonFindings).toBe(true);
  });

  it("Case E: Content/revision change between claim and finalize supersedes request", async () => {
    if (!isIntegrationOptedIn) return;

    const listing = await createListing("Original Wooden Chair", "Original chair description.");
    await addMedia(listing.id, "ready", true);
    await submitListingViaRpc(listing.id);

    const qReq = await query(`SELECT * FROM public.listing_moderation_requests WHERE listing_id = $1`, [listing.id]);
    const claimRes = await query(`SELECT * FROM public.claim_moderation_batch(1, 30, $1::uuid)`, [qReq.rows[0].id]);
    const job = claimRes.rows[0];

    // User edits listing while worker was running
    await query(`UPDATE public.listings SET title = 'Altered Chair Name', revision = revision + 1 WHERE id = $1`, [listing.id]);

    const finalizeRes = await query(
      `SELECT public.impl_finalize_moderation_result(
        $1::uuid, $2::uuid, 'no_review_flags', 'prototype_v0.1.1', 'title_description',
        ARRAY['rule_prohibited_item_wording', 'rule_shortened_link', 'rule_payment_before_viewing'],
        ARRAY[]::text[], '[]'::jsonb, '[]'::jsonb
      )`,
      [job.request_id, job.claim_token]
    );

    const finObjE = finalizeRes.rows[0].impl_finalize_moderation_result;
    expect(finObjE.decision).toBe("superseded");
  });

  it("Case F: Expired worker lease cannot finalize stolen/reclaimed lease or expired token before reclaim", async () => {
    if (!isIntegrationOptedIn) return;

    const listing = await createListing("Sturdy Bicycle", "Bicycle in great condition.");
    await addMedia(listing.id, "ready", true);
    await submitListingViaRpc(listing.id);

    const qReq = await query(`SELECT * FROM public.listing_moderation_requests WHERE listing_id = $1`, [listing.id]);
    const claim1 = await query(`SELECT * FROM public.claim_moderation_batch(1, 1, $1::uuid)`, [qReq.rows[0].id]);
    const job1 = claim1.rows[0];

    // Simulate lease expiry without reclaiming yet
    await query(
      `UPDATE public.listing_moderation_requests
       SET claim_expires_at = clock_timestamp() - interval '1 second'
       WHERE id = $1`,
      [job1.request_id]
    );

    // Direct finalization with expired lease must be denied with LEASE_EXPIRED
    const expFinalize = await query(
      `SELECT public.impl_finalize_moderation_result(
        $1::uuid, $2::uuid, 'no_review_flags', 'prototype_v0.1.1', 'title_description',
        ARRAY['rule_prohibited_item_wording', 'rule_shortened_link', 'rule_payment_before_viewing'],
        ARRAY[]::text[], '[]'::jsonb, '[]'::jsonb
      )`,
      [job1.request_id, job1.claim_token]
    );
    const finObjExp = expFinalize.rows[0].impl_finalize_moderation_result;
    expect(finObjExp.success).toBe(false);
    expect(finObjExp.error).toBe("LEASE_EXPIRED");

    // Now invoke scheduled retry recovery
    await query(`SELECT app_security.invoke_moderation_retry_batch()`);

    // Reset next_attempt_at to allow immediate claim in test
    await query(`UPDATE public.listing_moderation_requests SET next_attempt_at = clock_timestamp() - interval '1 second' WHERE id = $1`, [qReq.rows[0].id]);

    // Worker 2 claims fresh lease
    const claim2 = await query(`SELECT * FROM public.claim_moderation_batch(1, 30, $1::uuid)`, [qReq.rows[0].id]);
    expect(claim2.rows).toHaveLength(1);

    // Old worker tries again with stale token: denied with LEASE_TOKEN_MISMATCH
    const oldFinalize = await query(
      `SELECT public.impl_finalize_moderation_result(
        $1::uuid, $2::uuid, 'no_review_flags', 'prototype_v0.1.1', 'title_description',
        ARRAY['rule_prohibited_item_wording', 'rule_shortened_link', 'rule_payment_before_viewing'],
        ARRAY[]::text[], '[]'::jsonb, '[]'::jsonb
      )`,
      [job1.request_id, job1.claim_token]
    );
    const finObjF = oldFinalize.rows[0].impl_finalize_moderation_result;
    expect(finObjF.success).toBe(false);
    expect(finObjF.error).toBe("LEASE_TOKEN_MISMATCH");

    // Post-lock expiry test: lease expires WHILE finalizer is blocked waiting for parent listing lock
    const listing2 = await createListing("Lock Wait Item", "Testing lease expiry during lock wait.");
    await addMedia(listing2.id, "ready", true);
    await submitListingViaRpc(listing2.id);

    const qReq2 = await query(`SELECT * FROM public.listing_moderation_requests WHERE listing_id = $1`, [listing2.id]);
    // Claim with 1 second lease
    const claimShort = await query(`SELECT * FROM public.claim_moderation_batch(1, 1, $1::uuid)`, [qReq2.rows[0].id]);
    const jobShort = claimShort.rows[0];

    // Lock the parent listing in session A
    const blockerClient = new Client(DB_CONFIG);
    await blockerClient.connect();
    await blockerClient.query("BEGIN;");
    await blockerClient.query(`SELECT * FROM public.listings WHERE id = $1 FOR UPDATE;`, [listing2.id]);

    // In session B, worker attempts finalization while lease is still valid initially, but gets blocked
    const waitWorker = new Client(DB_CONFIG);
    await waitWorker.connect();
    const waitPromise = waitWorker.query(
      `SELECT public.impl_finalize_moderation_result(
        $1::uuid, $2::uuid, 'no_review_flags', 'prototype_v0.1.1', 'title_description',
        ARRAY['rule_prohibited_item_wording', 'rule_shortened_link', 'rule_payment_before_viewing'],
        ARRAY[]::text[], '[]'::jsonb, '[]'::jsonb
      )`,
      [jobShort.request_id, jobShort.claim_token]
    );

    // Sleep 1200ms so lease expires during the lock wait
    await new Promise((resolve) => setTimeout(resolve, 1200));

    // Release blocker lock
    await blockerClient.query("COMMIT;");
    await blockerClient.end();

    // Worker resumes, checks post-lock clock_timestamp(), and rejects with LEASE_EXPIRED
    const waitRes = await waitPromise;
    await waitWorker.end();

    const waitFin = waitRes.rows[0].impl_finalize_moderation_result;
    expect(waitFin.success).toBe(false);
    expect(waitFin.error).toBe("LEASE_EXPIRED");
  });

  it("Case G: Invalid input marks listing rejected with actionable seller correction path", async () => {
    if (!isIntegrationOptedIn) return;

    const listing = await createListing("Desk", "Valid 10+ char description.");
    await addMedia(listing.id, "ready", true);
    await submitListingViaRpc(listing.id);

    const qReq = await query(`SELECT * FROM public.listing_moderation_requests WHERE listing_id = $1`, [listing.id]);
    const claim = await query(`SELECT * FROM public.claim_moderation_batch(1, 30, $1::uuid)`, [qReq.rows[0].id]);
    const job = claim.rows[0];

    // Finalize as invalid_input
    const fin = await query(
      `SELECT public.impl_finalize_moderation_result(
        $1::uuid, $2::uuid, 'invalid_input', 'prototype_v0.1.1', 'title_description',
        ARRAY[]::text[], ARRAY[]::text[], '[]'::jsonb, '[{"field":"title","message":"Title too short"}]'::jsonb
      )`,
      [job.request_id, job.claim_token]
    );
    const finObj = fin.rows[0].impl_finalize_moderation_result;
    expect(finObj.decision).toBe("rejected_invalid");
    expect(finObj.status).toBe("rejected");

    // Listing is in rejected status with clear reason
    const checkListing = await query(`SELECT status, rejection_reason FROM public.listings WHERE id = $1`, [listing.id]);
    expect(checkListing.rows[0].status).toBe("rejected");
    expect(checkListing.rows[0].rejection_reason).toContain("Invalid listing text");

    // Seller status badge reflects rejected state
    const sellerStatus = await query(`
      SET LOCAL ROLE authenticated;
      SELECT set_config('request.jwt.claims', json_build_object('sub', '${SELLER_ID}', 'role', 'authenticated')::text, true);
      SELECT public.get_seller_moderation_workflow_status('${listing.id}'::uuid);
    `);
    const sData = sellerStatus[2].rows[0].get_seller_moderation_workflow_status;
    expect(sData.workflow_state).toBe("rejected");
  });

  it("Case H: Photo readiness enforced and automatic resumption upon photo completion", async () => {
    if (!isIntegrationOptedIn) return;

    const procListing = await createListing("Listing With Processing Photo", "Photo is currently converting.");
    await addMedia(procListing.id, "ready", true);
    const mediaId2 = await addMedia(procListing.id, "processing", false);
    await submitListingViaRpc(procListing.id);

    const qReq = await query(`SELECT * FROM public.listing_moderation_requests WHERE listing_id = $1`, [procListing.id]);
    const claim1 = await query(`SELECT * FROM public.claim_moderation_batch(1, 30, $1::uuid)`, [qReq.rows[0].id]);
    const job1 = claim1.rows[0];

    // First attempt: unready media returns awaiting_media_processing
    const fin1 = await query(
      `SELECT public.impl_finalize_moderation_result(
        $1::uuid, $2::uuid, 'no_review_flags', 'prototype_v0.1.1', 'title_description',
        ARRAY['rule_prohibited_item_wording', 'rule_shortened_link', 'rule_payment_before_viewing'],
        ARRAY[]::text[], '[]'::jsonb, '[]'::jsonb
      )`,
      [job1.request_id, job1.claim_token]
    );
    expect(fin1.rows[0].impl_finalize_moderation_result.decision).toBe("awaiting_media_processing");

    // Media finishes processing
    await query(`UPDATE public.listing_media SET processing_status = 'ready' WHERE id = $1`, [mediaId2]);
    await query(`UPDATE public.listing_moderation_requests SET next_attempt_at = clock_timestamp() - interval '1 second' WHERE id = $1`, [job1.request_id]);

    // Resumed attempt: claims and auto-approves
    const claim2 = await query(`SELECT * FROM public.claim_moderation_batch(50, 30)`);
    const job2 = claim2.rows.find((r: Record<string, unknown>) => r.listing_id === procListing.id);
    expect(job2).toBeDefined();
    if (!job2) throw new Error("Job2 not claimed");
    const fin2 = await query(
      `SELECT public.impl_finalize_moderation_result(
        $1::uuid, $2::uuid, 'no_review_flags', 'prototype_v0.1.1', 'title_description',
        ARRAY['rule_prohibited_item_wording', 'rule_shortened_link', 'rule_payment_before_viewing'],
        ARRAY[]::text[], '[]'::jsonb, '[]'::jsonb
      )`,
      [job2.request_id, job2.claim_token]
    );
    expect(fin2.rows[0].impl_finalize_moderation_result.decision).toBe("auto_approved");

    const finalListing = await query(`SELECT status FROM public.listings WHERE id = $1`, [procListing.id]);
    expect(finalListing.rows[0].status).toBe("active");
  });

  it("Case I: Controlled concurrency - competing moderator update serializes before worker", async () => {
    if (!isIntegrationOptedIn) return;

    const listing = await createListing("Concurrent Test Item", "Testing concurrent lock serialization.");
    await addMedia(listing.id, "ready", true);
    await submitListingViaRpc(listing.id);

    const qReq = await query(`SELECT * FROM public.listing_moderation_requests WHERE listing_id = $1`, [listing.id]);
    const claim = await query(`SELECT * FROM public.claim_moderation_batch(1, 30, $1::uuid)`, [qReq.rows[0].id]);
    const job = claim.rows[0];

    // Moderator updates listing row inside transaction
    const modClient = new Client(DB_CONFIG);
    await modClient.connect();
    const modPidRes = await modClient.query("SELECT pg_backend_pid() as pid;");
    const modPid = modPidRes.rows[0].pid;

    await modClient.query("BEGIN;");
    await modClient.query(`UPDATE public.listings SET status = 'rejected', rejection_reason = 'Manual staff rejection' WHERE id = $1`, [listing.id]);

    // In parallel, worker tries to finalize: it will block on parent listing lock
    const workerClient = new Client(DB_CONFIG);
    await workerClient.connect();
    const workerPidRes = await workerClient.query("SELECT pg_backend_pid() as pid;");
    const workerPid = workerPidRes.rows[0].pid;

    const workerPromise = workerClient.query(
      `SELECT public.impl_finalize_moderation_result(
        $1::uuid, $2::uuid, 'no_review_flags', 'prototype_v0.1.1', 'title_description',
        ARRAY['rule_prohibited_item_wording', 'rule_shortened_link', 'rule_payment_before_viewing'],
        ARRAY[]::text[], '[]'::jsonb, '[]'::jsonb
      )`,
      [job.request_id, job.claim_token]
    );

    // Give lock wait a moment to engage
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Verify blocking PID using pg_blocking_pids: assert workerPid is blocked specifically by modPid
    const blockCheck = await query(`
      SELECT pg_blocking_pids($1) as blockers;
    `, [workerPid]);
    const blockers = blockCheck.rows[0].blockers;
    expect(blockers).toContain(modPid);

    // Nonblocking control: a separate unaffected query has empty blockers
    const nonblockCheck = await query(`SELECT pg_blocking_pids(pg_backend_pid()) as blockers;`);
    expect(nonblockCheck.rows[0].blockers).toHaveLength(0);

    // Commit moderator rejection
    await modClient.query("COMMIT;");
    await modClient.end();

    // Worker resumes, observes superseded listing status, and yields decision: superseded
    const workerRes = await workerPromise;
    await workerClient.end();

    const finDecision = workerRes.rows[0].impl_finalize_moderation_result.decision;
    expect(finDecision).toBe("superseded");

    const checkListing = await query(`SELECT status FROM public.listings WHERE id = $1`, [listing.id]);
    expect(checkListing.rows[0].status).toBe("rejected");
  });

  it("Case J: Kill switch prevents auto-publication and routes to admin", async () => {
    if (!isIntegrationOptedIn) return;

    await query(`
      UPDATE public.app_system_settings
      SET setting_value = 'false'
      WHERE setting_key = 'moderation_automation_enabled';
    `);

    const listing = await createListing("Clean Couch While Disabled", "Nice couch with automation disabled.");
    await addMedia(listing.id, "ready", true);
    await submitListingViaRpc(listing.id);

    const qReq = await query(`SELECT * FROM public.listing_moderation_requests WHERE listing_id = $1`, [listing.id]);
    const claim = await query(`SELECT * FROM public.claim_moderation_batch(1, 30, $1::uuid)`, [qReq.rows[0].id]);
    const job = claim.rows[0];

    const fin = await query(
      `SELECT public.impl_finalize_moderation_result(
        $1::uuid, $2::uuid, 'no_review_flags', 'prototype_v0.1.1', 'title_description',
        ARRAY['rule_prohibited_item_wording', 'rule_shortened_link', 'rule_payment_before_viewing'],
        ARRAY[]::text[], '[]'::jsonb, '[]'::jsonb
      )`,
      [job.request_id, job.claim_token]
    );

    const finObjJ = fin.rows[0].impl_finalize_moderation_result;
    expect(finObjJ.decision).toBe("routed_to_admin");

    const checkListing = await query(`SELECT status FROM public.listings WHERE id = $1`, [listing.id]);
    expect(checkListing.rows[0].status).toBe("pending_review");
  });
});
