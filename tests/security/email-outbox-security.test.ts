// @vitest-environment node
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import fs from "fs";
import path from "path";

describe("GitHub Issue #83 Listing Email Notifications & Security Invariants", () => {
  let db: PGlite;

  const adminUserId = "00000000-0000-0000-0000-000000000010";
  const moderatorUserId = "00000000-0000-0000-0000-000000000011";
  const suspendedModUserId = "00000000-0000-0000-0000-000000000012";
  const supportUserId = "00000000-0000-0000-0000-000000000013";
  const editorUserId = "00000000-0000-0000-0000-000000000014";

  const sellerUserId = "00000000-0000-0000-0000-000000000020";
  const sellerOptOutUserId = "00000000-0000-0000-0000-000000000021";
  const staffSellerUserId = "00000000-0000-0000-0000-000000000022";

  let cityId: string;
  let localityId: string;
  let categoryId: string;

  beforeAll(async () => {
    db = new PGlite();

    // 1. Bootstrap standard platform roles and auth schemas
    await db.exec(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role NOLOGIN; END IF;
      END $$;

      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
          CREATE PUBLICATION supabase_realtime;
        END IF;
      END $$;

      CREATE SCHEMA IF NOT EXISTS auth;
      CREATE TABLE IF NOT EXISTS auth.users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        email text,
        raw_user_meta_data jsonb DEFAULT '{}'::jsonb,
        created_at timestamptz DEFAULT clock_timestamp()
      );
      CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS $$ SELECT null::uuid $$ LANGUAGE sql STABLE;
      CREATE OR REPLACE FUNCTION auth.role() RETURNS text AS $$ SELECT 'anon'::text $$ LANGUAGE sql STABLE;
      CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb AS $$ SELECT '{}'::jsonb $$ LANGUAGE sql STABLE;

      CREATE SCHEMA IF NOT EXISTS storage;
      CREATE TABLE IF NOT EXISTS storage.buckets (
        id text PRIMARY KEY,
        name text NOT NULL,
        owner uuid,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now(),
        public boolean DEFAULT false,
        avif_autodetection boolean DEFAULT false,
        file_size_limit bigint,
        allowed_mime_types text[]
      );
      CREATE TABLE IF NOT EXISTS storage.objects (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        bucket_id text REFERENCES storage.buckets(id),
        name text,
        owner uuid,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now(),
        last_accessed_at timestamptz DEFAULT now(),
        metadata jsonb,
        path_tokens text[] GENERATED ALWAYS AS (string_to_array(name, '/')) STORED
      );

      -- Mock net, vault, and cron schemas for PGlite test environment
      CREATE SCHEMA IF NOT EXISTS net;
      CREATE OR REPLACE FUNCTION net.http_post(url text, headers jsonb, body jsonb) RETURNS bigint AS $$ SELECT 1::bigint; $$ LANGUAGE sql;

      CREATE SCHEMA IF NOT EXISTS vault;
      CREATE TABLE IF NOT EXISTS vault.decrypted_secrets (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name text UNIQUE,
        decrypted_secret text
      );

      CREATE SCHEMA IF NOT EXISTS cron;
      CREATE TABLE IF NOT EXISTS cron.job (
        jobid bigint PRIMARY KEY,
        schedule text,
        command text,
        nodename text,
        nodeport integer,
        database text,
        username text,
        active boolean,
        jobname text UNIQUE
      );
      CREATE OR REPLACE FUNCTION cron.schedule(jobname text, schedule text, command text) RETURNS bigint AS $$
        INSERT INTO cron.job (jobid, schedule, command, active, jobname) VALUES (1, schedule, command, true, jobname)
        ON CONFLICT (jobname) DO UPDATE SET schedule = EXCLUDED.schedule, command = EXCLUDED.command;
        SELECT 1::bigint;
      $$ LANGUAGE sql;
      CREATE OR REPLACE FUNCTION cron.unschedule(jobname text) RETURNS boolean AS $$
        DELETE FROM cron.job WHERE jobname = $1;
        SELECT true;
      $$ LANGUAGE sql;
    `);

    // 2. Apply all migrations from 1 through 24 in order
    const migDir = path.resolve(process.cwd(), "supabase", "migrations");
    const migrationFiles = fs
      .readdirSync(migDir)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    for (const file of migrationFiles) {
      if (file.includes("24_email_outbox_runtime_extensions")) {
        // PGlite runs purely in WebAssembly/Node and lacks native extension control files
        // for pg_net, pg_cron, and supabase_vault. Migration 24 tests are verified at the source
        // contract level below and against hosted Supabase (FairSwapTest).
        continue;
      }
      const sql = fs.readFileSync(path.join(migDir, file), "utf8");
      await db.exec(sql);
    }

    // 3. Seed users into auth.users (triggers will initialize user_accounts and profiles)
    const validMeta = JSON.stringify({
      display_name: "Test User",
      terms_accepted: "true",
      terms_version: "2026-09-18",
      privacy_policy_version: "2026-09-18",
      acceptable_use_version: "2026-09-18",
      age_confirmed: "true",
    });

    await db.exec(`
      INSERT INTO auth.users (id, email, raw_user_meta_data)
      VALUES 
        ('${adminUserId}', 'admin@fairswap.local', '${validMeta}'::jsonb),
        ('${moderatorUserId}', 'mod@fairswap.local', '${validMeta}'::jsonb),
        ('${suspendedModUserId}', 'suspended_mod@fairswap.local', '${validMeta}'::jsonb),
        ('${supportUserId}', 'support@fairswap.local', '${validMeta}'::jsonb),
        ('${editorUserId}', 'editor@fairswap.local', '${validMeta}'::jsonb),
        ('${sellerUserId}', 'seller@fairswap.local', '${validMeta}'::jsonb),
        ('${sellerOptOutUserId}', 'optout@fairswap.local', '${validMeta}'::jsonb),
        ('${staffSellerUserId}', 'staffseller@fairswap.local', '${validMeta}'::jsonb);

      -- Assign staff roles
      INSERT INTO public.staff_roles (user_id, role)
      VALUES 
        ('${adminUserId}', 'administrator'),
        ('${moderatorUserId}', 'moderator'),
        ('${suspendedModUserId}', 'moderator'),
        ('${supportUserId}', 'support_agent'),
        ('${editorUserId}', 'content_editor'),
        ('${staffSellerUserId}', 'administrator');

      -- Set account status for suspended moderator
      UPDATE public.user_accounts
      SET account_status = 'suspended'
      WHERE user_id = '${suspendedModUserId}';

      -- Set notification preferences for opted-out seller
      UPDATE public.user_accounts
      SET notification_preferences = '{"email_notifications": false}'::jsonb
      WHERE user_id = '${sellerOptOutUserId}';

      -- Query reference city, locality, and category
      SELECT id FROM public.cities LIMIT 1;
    `);

    const cityRes = await db.query<any>("SELECT id FROM public.cities LIMIT 1;");
    cityId = cityRes.rows[0].id;

    const locRes = await db.query<any>(`SELECT id FROM public.localities WHERE city_id = '${cityId}' LIMIT 1;`);
    localityId = locRes.rows[0].id;

    const catRes = await db.query<any>("SELECT id FROM public.categories LIMIT 1;");
    categoryId = catRes.rows[0].id;
  });

  it("verifies email_outbox schema, enums, RLS, and constraints exist", async () => {
    const tableRes = await db.query<any>(`
      SELECT c.relname, c.relrowsecurity
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = 'email_outbox';
    `);
    expect(tableRes.rows.length).toBe(1);
    expect(tableRes.rows[0].relrowsecurity).toBe(true);

    const enumRes = await db.query<any>(`
      SELECT typname FROM pg_type WHERE typname IN ('email_outbox_event_type', 'email_outbox_status');
    `);
    const enumNames = enumRes.rows.map((r: any) => r.typname);
    expect(enumNames).toContain("email_outbox_event_type");
    expect(enumNames).toContain("email_outbox_status");

    // Check unique constraint
    const constraintRes = await db.query<any>(`
      SELECT conname FROM pg_constraint WHERE conname = 'uq_email_outbox_transition_event_recipient';
    `);
    expect(constraintRes.rows.length).toBe(1);
  });

  it("enqueues listing_submitted_for_review only for active approvers, excluding self, support, and editor", async () => {
    // 1. Seller creates a draft listing
    const insertRes = await db.query<any>(`
      INSERT INTO public.listings (
        seller_id,
        category_id,
        city_id,
        locality_id,
        title,
        description,
        price_paise,
        condition,
        price_type
      ) VALUES (
        '${sellerUserId}',
        '${categoryId}',
        '${cityId}',
        '${localityId}',
        'Vintage Wooden Bookshelf',
        'Sturdy teak wood bookshelf in good condition.',
        450000,
        'good',
        'negotiable'
      ) RETURNING id, slug;
    `);
    const listingId = insertRes.rows[0].id;

    // Verify draft creation did NOT generate any email_outbox entries
    const draftOutbox = await db.query<any>(`
      SELECT * FROM public.email_outbox WHERE listing_id = '${listingId}';
    `);
    expect(draftOutbox.rows.length).toBe(0);

    // 2. Seller transitions listing to pending_review
    await db.query(`
      UPDATE public.listings
      SET status = 'pending_review'
      WHERE id = '${listingId}';
    `);

    // 3. Inspect email_outbox
    const outboxRes = await db.query<any>(`
      SELECT * FROM public.email_outbox WHERE listing_id = '${listingId}' ORDER BY recipient_user_id;
    `);

    // Expected recipients: adminUserId, moderatorUserId, staffSellerUserId (3 active approvers).
    // Excluded:
    // - suspendedModUserId (inactive)
    // - supportUserId (role not administrator/moderator)
    // - editorUserId (role not administrator/moderator)
    // - sellerUserId (is the seller)
    expect(outboxRes.rows.length).toBe(3);

    const recipientIds = outboxRes.rows.map((r: any) => r.recipient_user_id);
    expect(recipientIds).toContain(adminUserId);
    expect(recipientIds).toContain(moderatorUserId);
    expect(recipientIds).toContain(staffSellerUserId);
    expect(recipientIds).not.toContain(suspendedModUserId);
    expect(recipientIds).not.toContain(supportUserId);
    expect(recipientIds).not.toContain(editorUserId);
    expect(recipientIds).not.toContain(sellerUserId);

    const job = outboxRes.rows[0];
    expect(job.event_type).toBe("listing_submitted_for_review");
    expect(job.status).toBe("pending");
    expect(job.payload.listing_title).toBe("Vintage Wooden Bookshelf");
    expect(job.payload.link_path).toBe(`/admin/listings/${listingId}`);
    expect(job.payload.revision).toBe(1);
  });

  it("prohibits notifying an approver about their own listing (self-review protection)", async () => {
    // Staff seller creates a draft listing
    const insertRes = await db.query<any>(`
      INSERT INTO public.listings (
        seller_id,
        category_id,
        city_id,
        locality_id,
        title,
        description,
        price_paise,
        condition,
        price_type
      ) VALUES (
        '${staffSellerUserId}',
        '${categoryId}',
        '${cityId}',
        '${localityId}',
        'Staff Member Selling Phone',
        'Slightly used phone.',
        1500000,
        'like_new',
        'fixed'
      ) RETURNING id;
    `);
    const listingId = insertRes.rows[0].id;

    // Transition to pending_review
    await db.query(`
      UPDATE public.listings
      SET status = 'pending_review'
      WHERE id = '${listingId}';
    `);

    const outboxRes = await db.query<any>(`
      SELECT * FROM public.email_outbox WHERE listing_id = '${listingId}';
    `);

    const recipientIds = outboxRes.rows.map((r: any) => r.recipient_user_id);
    // staffSellerUserId is an administrator, but must NOT receive an email about their own listing
    expect(recipientIds).not.toContain(staffSellerUserId);
    expect(recipientIds).toContain(adminUserId);
    expect(recipientIds).toContain(moderatorUserId);
    expect(outboxRes.rows.length).toBe(2);
  });

  it("enqueues listing_approved for the seller when listing is approved", async () => {
    // 1. Create draft
    const insertRes = await db.query<any>(`
      INSERT INTO public.listings (
        seller_id,
        category_id,
        city_id,
        locality_id,
        title,
        description,
        price_paise,
        condition,
        price_type
      ) VALUES (
        '${sellerUserId}',
        '${categoryId}',
        '${cityId}',
        '${localityId}',
        'Approved Motorcycle Helmet',
        'DOT approved helmet.',
        250000,
        'new',
        'fixed'
      ) RETURNING id, slug;
    `);
    const listingId = insertRes.rows[0].id;
    const listingSlug = insertRes.rows[0].slug;

    // 2. Submit for review: draft -> pending_review
    await db.query(`
      UPDATE public.listings
      SET status = 'pending_review'
      WHERE id = '${listingId}';
    `);

    // 3. Moderator approves the listing: pending_review -> active
    await db.query(`
      UPDATE public.listings
      SET status = 'active'
      WHERE id = '${listingId}';
    `);

    const approvedOutbox = await db.query<any>(`
      SELECT * FROM public.email_outbox
      WHERE listing_id = '${listingId}' AND event_type = 'listing_approved';
    `);

    expect(approvedOutbox.rows.length).toBe(1);
    const job = approvedOutbox.rows[0];
    expect(job.recipient_user_id).toBe(sellerUserId);
    expect(job.payload.listing_title).toBe("Approved Motorcycle Helmet");
    expect(job.payload.link_path).toBe(`/listings/${listingSlug}`);
  });

  it("respects notification_preferences.email_notifications = false on approval", async () => {
    // 1. Create draft for opted-out seller
    const insertRes = await db.query<any>(`
      INSERT INTO public.listings (
        seller_id,
        category_id,
        city_id,
        locality_id,
        title,
        description,
        price_paise,
        condition,
        price_type
      ) VALUES (
        '${sellerOptOutUserId}',
        '${categoryId}',
        '${cityId}',
        '${localityId}',
        'Silent Seller Guitar',
        'Acoustic guitar.',
        300000,
        'good',
        'fixed'
      ) RETURNING id;
    `);
    const listingId = insertRes.rows[0].id;

    // 2. Submit for review: draft -> pending_review
    await db.query(`
      UPDATE public.listings
      SET status = 'pending_review'
      WHERE id = '${listingId}';
    `);

    // 3. Approve listing: pending_review -> active
    await db.query(`
      UPDATE public.listings
      SET status = 'active'
      WHERE id = '${listingId}';
    `);

    const approvedOutbox = await db.query<any>(`
      SELECT * FROM public.email_outbox
      WHERE listing_id = '${listingId}' AND event_type = 'listing_approved';
    `);

    // Opted out seller should NOT receive approval email
    expect(approvedOutbox.rows.length).toBe(0);
  });

  it("enqueues listing_rejected with moderation reason preserved in payload", async () => {
    // 1. Create draft
    const insertRes = await db.query<any>(`
      INSERT INTO public.listings (
        seller_id,
        category_id,
        city_id,
        locality_id,
        title,
        description,
        price_paise,
        condition,
        price_type
      ) VALUES (
        '${sellerUserId}',
        '${categoryId}',
        '${cityId}',
        '${localityId}',
        'Unapproved Counterfeit Shoes',
        'Brand new replica sneakers.',
        120000,
        'new',
        'fixed'
      ) RETURNING id;
    `);
    const listingId = insertRes.rows[0].id;

    // 2. Submit for review: draft -> pending_review
    await db.query(`
      UPDATE public.listings
      SET status = 'pending_review'
      WHERE id = '${listingId}';
    `);

    // 3. Moderator rejects listing with explicit rejection reason: pending_review -> rejected
    await db.query(`
      UPDATE public.listings
      SET status = 'rejected',
          rejection_reason = 'Counterfeit and replica goods are strictly prohibited under FairSwap terms.'
      WHERE id = '${listingId}';
    `);

    const rejectedOutbox = await db.query<any>(`
      SELECT * FROM public.email_outbox
      WHERE listing_id = '${listingId}' AND event_type = 'listing_rejected';
    `);

    expect(rejectedOutbox.rows.length).toBe(1);
    const job = rejectedOutbox.rows[0];
    expect(job.recipient_user_id).toBe(sellerUserId);
    expect(job.payload.listing_title).toBe("Unapproved Counterfeit Shoes");
    expect(job.payload.rejection_reason).toBe(
      "Counterfeit and replica goods are strictly prohibited under FairSwap terms."
    );
    expect(job.payload.link_path).toBe(`/account/listings/${listingId}/edit`);
  });

  it("respects notification_preferences.email_notifications = false on rejection", async () => {
    // 1. Create draft
    const insertRes = await db.query<any>(`
      INSERT INTO public.listings (
        seller_id,
        category_id,
        city_id,
        locality_id,
        title,
        description,
        price_paise,
        condition,
        price_type
      ) VALUES (
        '${sellerOptOutUserId}',
        '${categoryId}',
        '${cityId}',
        '${localityId}',
        'Opted Out Rejected Listing',
        'Some listing.',
        10000,
        'poor',
        'fixed'
      ) RETURNING id;
    `);
    const listingId = insertRes.rows[0].id;

    // 2. Submit for review: draft -> pending_review
    await db.query(`
      UPDATE public.listings
      SET status = 'pending_review'
      WHERE id = '${listingId}';
    `);

    // 3. Reject listing
    await db.query(`
      UPDATE public.listings
      SET status = 'rejected',
          rejection_reason = 'Image quality is too low.'
      WHERE id = '${listingId}';
    `);

    const rejectedOutbox = await db.query<any>(`
      SELECT * FROM public.email_outbox
      WHERE listing_id = '${listingId}' AND event_type = 'listing_rejected';
    `);

    expect(rejectedOutbox.rows.length).toBe(0);
  });

  it("verifies idempotency uniqueness constraint prevents duplicate outbox jobs", async () => {
    // Find an existing outbox job
    const existing = await db.query<any>(`SELECT * FROM public.email_outbox LIMIT 1;`);
    const row = existing.rows[0];
    expect(row).toBeDefined();

    // Attempt direct insert of duplicate transition_id + event_type + recipient_user_id
    await expect(
      db.query(`
        INSERT INTO public.email_outbox (
          event_type,
          recipient_user_id,
          listing_id,
          transition_id,
          payload
        ) VALUES (
          '${row.event_type}',
          '${row.recipient_user_id}',
          '${row.listing_id}',
          '${row.transition_id}',
          '{"listing_title":"Duplicate Attempt"}'::jsonb
        );
      `)
    ).rejects.toThrow(/uq_email_outbox_transition_event_recipient/);
  });

  it("strictly enforces RLS: anon and authenticated cannot read or query email_outbox", async () => {
    // 1. As anon
    await db.exec(`
      RESET ROLE;
      CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS $$ SELECT null::uuid $$ LANGUAGE sql STABLE;
      CREATE OR REPLACE FUNCTION auth.role() RETURNS text AS $$ SELECT 'anon'::text $$ LANGUAGE sql STABLE;
      SET ROLE anon;
    `);

    await expect(db.query("SELECT * FROM public.email_outbox;")).rejects.toThrow(/permission denied/);

    // 2. As authenticated
    await db.exec(`
      RESET ROLE;
      CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS $$ SELECT '${sellerUserId}'::uuid $$ LANGUAGE sql STABLE;
      CREATE OR REPLACE FUNCTION auth.role() RETURNS text AS $$ SELECT 'authenticated'::text $$ LANGUAGE sql STABLE;
      SET ROLE authenticated;
    `);

    await expect(db.query("SELECT * FROM public.email_outbox;")).rejects.toThrow(/permission denied/);

    await db.exec("RESET ROLE;");
  });

  it("strictly enforces routine ACLs: authenticated users cannot execute worker RPCs", async () => {
    await db.exec(`
      RESET ROLE;
      CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS $$ SELECT '${sellerUserId}'::uuid $$ LANGUAGE sql STABLE;
      CREATE OR REPLACE FUNCTION auth.role() RETURNS text AS $$ SELECT 'authenticated'::text $$ LANGUAGE sql STABLE;
      SET ROLE authenticated;
    `);

    const fakeToken = "11111111-1111-1111-1111-111111111111";

    await expect(
      db.query(`SELECT public.claim_email_outbox_batch(10, '${fakeToken}'::uuid);`)
    ).rejects.toThrow(/permission denied/);

    await expect(
      db.query(`SELECT public.claim_email_outbox_job_by_id('${fakeToken}'::uuid, '${fakeToken}'::uuid);`)
    ).rejects.toThrow(/permission denied/);

    await expect(
      db.query(`SELECT public.complete_email_outbox_job('${fakeToken}'::uuid, '${fakeToken}'::uuid, 'msg_123');`)
    ).rejects.toThrow(/permission denied/);

    await expect(
      db.query(
        `SELECT public.fail_email_outbox_job('${fakeToken}'::uuid, '${fakeToken}'::uuid, 'ERR', 500, 'failed', false);`
      )
    ).rejects.toThrow(/permission denied/);

    // Also assert private app_security implementations cannot be executed by authenticated users
    await expect(
      db.query(`SELECT app_security.impl_claim_email_outbox_batch(10, '${fakeToken}'::uuid);`)
    ).rejects.toThrow(/permission denied/);

    await expect(
      db.query(`SELECT app_security.impl_claim_email_outbox_job_by_id('${fakeToken}'::uuid, '${fakeToken}'::uuid);`)
    ).rejects.toThrow(/permission denied/);

    await expect(
      db.query(`SELECT app_security.impl_complete_email_outbox_job('${fakeToken}'::uuid, '${fakeToken}'::uuid, 'msg_123');`)
    ).rejects.toThrow(/permission denied/);

    await expect(
      db.query(
        `SELECT app_security.impl_fail_email_outbox_job('${fakeToken}'::uuid, '${fakeToken}'::uuid, 'ERR', 500, 'failed', false);`
      )
    ).rejects.toThrow(/permission denied/);

    await db.exec("RESET ROLE;");
  });

  it("enforces two-layer routine privilege model: app_security is SECURITY DEFINER, public wrappers are SECURITY INVOKER", async () => {
    await db.exec("RESET ROLE;");

    // 1. Verify app_security.impl_* are SECURITY DEFINER (prosecdef = true)
    const privateDefiners = await db.query<any>(`
      SELECT p.proname, p.prosecdef
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'app_security'
        AND p.proname IN (
          'impl_claim_email_outbox_batch',
          'impl_claim_email_outbox_job_by_id',
          'impl_complete_email_outbox_job',
          'impl_fail_email_outbox_job'
        );
    `);
    expect(privateDefiners.rows.length).toBe(4);
    for (const row of privateDefiners.rows) {
      expect(row.prosecdef).toBe(true);
    }

    // 2. Verify public.* wrappers are NOT SECURITY DEFINER (prosecdef = false, SECURITY INVOKER)
    const publicInvokers = await db.query<any>(`
      SELECT p.proname, p.prosecdef
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.proname IN (
          'claim_email_outbox_batch',
          'claim_email_outbox_job_by_id',
          'complete_email_outbox_job',
          'fail_email_outbox_job'
        );
    `);
    expect(publicInvokers.rows.length).toBe(4);
    for (const row of publicInvokers.rows) {
      expect(row.prosecdef).toBe(false);
    }
  });

  it("allows service_role to claim jobs atomically, complete, and fail with backoff", async () => {
    await db.exec(`
      RESET ROLE;
      CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS $$ SELECT null::uuid $$ LANGUAGE sql STABLE;
      CREATE OR REPLACE FUNCTION auth.role() RETURNS text AS $$ SELECT 'service_role'::text $$ LANGUAGE sql STABLE;
      SET ROLE service_role;
    `);

    const workerLockToken = "22222222-2222-2222-2222-222222222222";

    // 1. Claim batch
    const claimRes = await db.query<any>(`
      SELECT * FROM public.claim_email_outbox_batch(5, '${workerLockToken}'::uuid);
    `);
    expect(claimRes.rows.length).toBeGreaterThan(0);
    const claimedJob = claimRes.rows[0];
    expect(claimedJob.status).toBe("processing");
    expect(claimedJob.lock_token).toBe(workerLockToken);
    expect(claimedJob.attempt_count).toBeGreaterThanOrEqual(1);

    // 2. Complete job 1
    const completeRes = await db.query<any>(`
      SELECT public.complete_email_outbox_job('${claimedJob.id}'::uuid, '${workerLockToken}'::uuid, 'resend_msg_test_abc123') AS success;
    `);
    expect(completeRes.rows[0].success).toBe(true);

    const verifiedSent = await db.query<any>(`
      SELECT * FROM public.email_outbox WHERE id = '${claimedJob.id}';
    `);
    expect(verifiedSent.rows[0].status).toBe("sent");
    expect(verifiedSent.rows[0].provider_message_id).toBe("resend_msg_test_abc123");
    expect(verifiedSent.rows[0].sent_at).not.toBeNull();
    expect(verifiedSent.rows[0].lock_token).toBeNull();

    // 3. Test retry on second job (if available)
    if (claimRes.rows.length > 1) {
      const secondJob = claimRes.rows[1];
      const failRes = await db.query<any>(`
        SELECT public.fail_email_outbox_job(
          '${secondJob.id}'::uuid,
          '${workerLockToken}'::uuid,
          'RATE_LIMITED',
          429,
          'Too many requests',
          false,
          5,
          60
        ) AS success;
      `);
      expect(failRes.rows[0].success).toBe(true);

      const verifiedRetry = await db.query<any>(`
        SELECT * FROM public.email_outbox WHERE id = '${secondJob.id}';
      `);
      expect(verifiedRetry.rows[0].status).toBe("retry");
      expect(verifiedRetry.rows[0].last_error_code).toBe("RATE_LIMITED");
      expect(verifiedRetry.rows[0].last_error_status).toBe(429);
      expect(verifiedRetry.rows[0].lock_token).toBeNull();
    }

    await db.exec("RESET ROLE;");
  });

  it("recovers stale processing leases locked for more than stale timeout", async () => {
    await db.exec("RESET ROLE;");

    // Manually create a job stuck in processing with an old locked_at
    const insertStuck = await db.query<any>(`
      INSERT INTO public.email_outbox (
        event_type,
        recipient_user_id,
        listing_id,
        transition_id,
        payload,
        status,
        locked_at,
        lock_token,
        attempt_count
      )
      SELECT 
        'listing_approved',
        '${sellerUserId}',
        l.id,
        t.id,
        '{"listing_title":"Stuck Job"}'::jsonb,
        'processing',
        clock_timestamp() - interval '15 minutes',
        '99999999-9999-9999-9999-999999999999'::uuid,
        1
      FROM public.listings l
      JOIN public.listing_status_transitions t ON t.listing_id = l.id
      LIMIT 1
      RETURNING id;
    `);
    expect(insertStuck.rows.length).toBe(1);
    const stuckJobId = insertStuck.rows[0].id;

    // New worker claims by ID with 10-minute timeout (600 seconds)
    const newWorkerToken = "33333333-3333-3333-3333-333333333333";
    const reclaimRes = await db.query<any>(`
      SELECT * FROM public.claim_email_outbox_job_by_id(
        '${stuckJobId}'::uuid,
        '${newWorkerToken}'::uuid,
        600
      );
    `);

    expect(reclaimRes.rows.length).toBe(1);
    expect(reclaimRes.rows[0].id).toBe(stuckJobId);
    expect(reclaimRes.rows[0].status).toBe("processing");
    expect(reclaimRes.rows[0].lock_token).toBe(newWorkerToken);
    expect(reclaimRes.rows[0].attempt_count).toBe(2);
  });

  it("never allows malformed notification_preferences to throw or roll back listing moderation", async () => {
    await db.exec("RESET ROLE;");

    // 1. Verify seller updates permitted notification_preferences column under authenticated-user permission model
    await db.exec(`
      RESET ROLE;
      CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS $$ SELECT '${sellerUserId}'::uuid $$ LANGUAGE sql STABLE;
      CREATE OR REPLACE FUNCTION auth.role() RETURNS text AS $$ SELECT 'authenticated'::text $$ LANGUAGE sql STABLE;
      SET ROLE authenticated;
    `);

    // Verify unpermitted column update is rejected under authenticated role
    await expect(
      db.query(`
        UPDATE public.user_accounts
        SET account_status = 'suspended'
        WHERE user_id = '${sellerUserId}';
      `)
    ).rejects.toThrow(/permission denied/);

    // Permitted column update (notification_preferences) succeeds under authenticated role with malformed value
    await db.query(`
      UPDATE public.user_accounts
      SET notification_preferences = '{"email_notifications": "not_a_boolean_value"}'::jsonb
      WHERE user_id = '${sellerUserId}';
    `);

    await db.exec("RESET ROLE;");

    // 2. Create listing
    const insertRes = await db.query<any>(`
      INSERT INTO public.listings (
        seller_id,
        category_id,
        city_id,
        locality_id,
        title,
        description,
        price_paise,
        condition,
        price_type
      ) VALUES (
        '${sellerUserId}',
        '${categoryId}',
        '${cityId}',
        '${localityId}',
        'Malformed Pref Listing',
        'Testing malformed pref',
        50000,
        'good',
        'fixed'
      ) RETURNING id;
    `);
    const listingId = insertRes.rows[0].id;

    // Submit: draft -> pending_review
    await db.query(`UPDATE public.listings SET status = 'pending_review' WHERE id = '${listingId}';`);

    // 3. Approve: pending_review -> active
    // This MUST succeed without throwing, and privacy-safe behavior means no email is enqueued
    await expect(
      db.query(`
        UPDATE public.listings
        SET status = 'active'
        WHERE id = '${listingId}';
      `)
    ).resolves.toBeDefined();

    const activeListing = await db.query<any>(`
      SELECT status FROM public.listings WHERE id = '${listingId}';
    `);
    expect(activeListing.rows[0].status).toBe("active");

    const outboxJobs = await db.query<any>(`
      SELECT * FROM public.email_outbox
      WHERE listing_id = '${listingId}' AND event_type = 'listing_approved';
    `);
    // Privacy-safe behavior: malformed preference does not enqueue email
    expect(outboxJobs.rows.length).toBe(0);

    // 4. Test rejection with another malformed preference (numeric) under authenticated role
    await db.exec(`
      RESET ROLE;
      CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS $$ SELECT '${sellerUserId}'::uuid $$ LANGUAGE sql STABLE;
      CREATE OR REPLACE FUNCTION auth.role() RETURNS text AS $$ SELECT 'authenticated'::text $$ LANGUAGE sql STABLE;
      SET ROLE authenticated;
    `);

    await db.query(`
      UPDATE public.user_accounts
      SET notification_preferences = '{"email_notifications": 12345}'::jsonb
      WHERE user_id = '${sellerUserId}';
    `);

    await db.exec("RESET ROLE;");

    const insertRes2 = await db.query<any>(`
      INSERT INTO public.listings (
        seller_id,
        category_id,
        city_id,
        locality_id,
        title,
        description,
        price_paise,
        condition,
        price_type
      ) VALUES (
        '${sellerUserId}',
        '${categoryId}',
        '${cityId}',
        '${localityId}',
        'Malformed Pref Listing 2',
        'Testing numeric pref',
        50000,
        'good',
        'fixed'
      ) RETURNING id;
    `);
    const listingId2 = insertRes2.rows[0].id;
    await db.query(`UPDATE public.listings SET status = 'pending_review' WHERE id = '${listingId2}';`);

    // Reject: pending_review -> rejected
    await expect(
      db.query(`
        UPDATE public.listings
        SET status = 'rejected',
            rejection_reason = 'Testing malformed rejection'
        WHERE id = '${listingId2}';
      `)
    ).resolves.toBeDefined();

    const rejectedListing = await db.query<any>(`
      SELECT status FROM public.listings WHERE id = '${listingId2}';
    `);
    expect(rejectedListing.rows[0].status).toBe("rejected");

    // Reset seller preferences back to standard boolean under authenticated role
    await db.exec(`
      RESET ROLE;
      CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS $$ SELECT '${sellerUserId}'::uuid $$ LANGUAGE sql STABLE;
      CREATE OR REPLACE FUNCTION auth.role() RETURNS text AS $$ SELECT 'authenticated'::text $$ LANGUAGE sql STABLE;
      SET ROLE authenticated;
    `);

    await db.query(`
      UPDATE public.user_accounts
      SET notification_preferences = '{"email_notifications": true}'::jsonb
      WHERE user_id = '${sellerUserId}';
    `);

    await db.exec("RESET ROLE;");
  });

  it("enforces retry timing on by-ID claims (cannot claim before next_attempt_at)", async () => {
    await db.exec("RESET ROLE;");

    // Create draft listing
    const listRes = await db.query<any>(`
      INSERT INTO public.listings (
        seller_id,
        category_id,
        city_id,
        locality_id,
        title,
        description,
        price_paise,
        condition,
        price_type
      ) VALUES (
        '${sellerUserId}',
        '${categoryId}',
        '${cityId}',
        '${localityId}',
        'Retry Timing Test Listing',
        'Description',
        25000,
        'good',
        'fixed'
      ) RETURNING id;
    `);
    const listingId = listRes.rows[0].id;

    // Submit -> Approve triggers transition and outbox row
    await db.query(`UPDATE public.listings SET status = 'pending_review' WHERE id = '${listingId}';`);
    await db.query(`UPDATE public.listings SET status = 'active' WHERE id = '${listingId}';`);

    const outboxRow = await db.query<any>(`
      SELECT id FROM public.email_outbox
      WHERE listing_id = '${listingId}' AND event_type = 'listing_approved';
    `);
    expect(outboxRow.rows.length).toBe(1);
    const futureJobId = outboxRow.rows[0].id;

    // Set row into 'retry' with next_attempt_at in the future (+1 hour)
    await db.query(`
      UPDATE public.email_outbox
      SET status = 'retry',
          attempt_count = 1,
          next_attempt_at = clock_timestamp() + interval '1 hour'
      WHERE id = '${futureJobId}';
    `);

    const token = "44444444-4444-4444-4444-444444444444";

    // 1. Attempt claim while next_attempt_at is in the future -> MUST return 0 rows
    const claimFutureRes = await db.query<any>(`
      SELECT * FROM public.claim_email_outbox_job_by_id('${futureJobId}'::uuid, '${token}'::uuid, 600);
    `);
    expect(claimFutureRes.rows.length).toBe(0);

    // Verify row status remains 'retry'
    const statusCheck = await db.query<any>(`
      SELECT status, attempt_count FROM public.email_outbox WHERE id = '${futureJobId}';
    `);
    expect(statusCheck.rows[0].status).toBe("retry");
    expect(statusCheck.rows[0].attempt_count).toBe(1);

    // 2. Move next_attempt_at into the past (elapsed delay)
    await db.query(`
      UPDATE public.email_outbox
      SET next_attempt_at = clock_timestamp() - interval '5 seconds'
      WHERE id = '${futureJobId}';
    `);

    // 3. Attempt claim now -> MUST succeed
    const claimPastRes = await db.query<any>(`
      SELECT * FROM public.claim_email_outbox_job_by_id('${futureJobId}'::uuid, '${token}'::uuid, 600);
    `);
    expect(claimPastRes.rows.length).toBe(1);
    expect(claimPastRes.rows[0].status).toBe("processing");
    expect(claimPastRes.rows[0].attempt_count).toBe(2);
  });

  it("enforces max_attempts limit on stale recovery to prevent unbounded attempts", async () => {
    await db.exec("RESET ROLE;");

    // Create draft listing
    const listRes = await db.query<any>(`
      INSERT INTO public.listings (
        seller_id,
        category_id,
        city_id,
        locality_id,
        title,
        description,
        price_paise,
        condition,
        price_type
      ) VALUES (
        '${sellerUserId}',
        '${categoryId}',
        '${cityId}',
        '${localityId}',
        'Max Attempts Test Listing',
        'Description',
        35000,
        'good',
        'fixed'
      ) RETURNING id;
    `);
    const listingId = listRes.rows[0].id;

    // Submit -> Approve triggers transition and outbox row
    await db.query(`UPDATE public.listings SET status = 'pending_review' WHERE id = '${listingId}';`);
    await db.query(`UPDATE public.listings SET status = 'active' WHERE id = '${listingId}';`);

    const outboxRow = await db.query<any>(`
      SELECT id FROM public.email_outbox
      WHERE listing_id = '${listingId}' AND event_type = 'listing_approved';
    `);
    expect(outboxRow.rows.length).toBe(1);
    const exhaustedJobId = outboxRow.rows[0].id;

    // Simulate job that repeatedly crashed and reached 5 attempts while stale in processing
    await db.query(`
      UPDATE public.email_outbox
      SET status = 'processing',
          locked_at = clock_timestamp() - interval '20 minutes',
          lock_token = '55555555-5555-5555-5555-555555555555'::uuid,
          attempt_count = 5
      WHERE id = '${exhaustedJobId}';
    `);

    const token = "66666666-6666-6666-6666-666666666666";

    // Attempt claim by ID -> MUST return 0 rows
    const claimRes = await db.query<any>(`
      SELECT * FROM public.claim_email_outbox_job_by_id('${exhaustedJobId}'::uuid, '${token}'::uuid, 600);
    `);
    expect(claimRes.rows.length).toBe(0);

    // Verify job transitioned to dead_letter with attempt_count capped at 5
    const verifyJob = await db.query<any>(`
      SELECT status, attempt_count, last_error_code FROM public.email_outbox WHERE id = '${exhaustedJobId}';
    `);
    expect(verifyJob.rows[0].status).toBe("dead_letter");
    expect(verifyJob.rows[0].attempt_count).toBe(5);
    expect(verifyJob.rows[0].last_error_code).toBe("MAX_ATTEMPTS_EXCEEDED_IN_PROCESSING");
  });

  describe("Migration 23 - Dispatch and Scheduler Runtime Security Invariants", () => {
    it("attaches immediate-dispatch trigger trg_email_outbox_immediate_dispatch to public.email_outbox", async () => {
      const triggerRes = await db.query<any>(`
        SELECT tgname, tgenabled, tgtype
        FROM pg_trigger
        WHERE tgname = 'trg_email_outbox_immediate_dispatch'
          AND tgrelid = 'public.email_outbox'::regclass;
      `);
      expect(triggerRes.rows.length).toBe(1);
      expect(triggerRes.rows[0].tgname).toBe("trg_email_outbox_immediate_dispatch");
    });

    it("verifies dispatch functions reside in app_security with SECURITY DEFINER and empty search_path", async () => {
      const funcRes = await db.query<any>(`
        SELECT 
          p.proname,
          p.prosecdef,
          p.proconfig,
          n.nspname
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'app_security'
          AND p.proname IN ('trg_fn_notify_email_outbox_worker', 'invoke_email_outbox_retry_batch')
        ORDER BY p.proname;
      `);
      expect(funcRes.rows.length).toBe(2);
      for (const row of funcRes.rows) {
        expect(row.prosecdef).toBe(true);
        expect(row.proconfig.some((c: string) => c.startsWith("search_path="))).toBe(true);
      }
    });

    it("ensures anon and authenticated roles have zero execute privileges on runtime dispatch functions", async () => {
      const aclRes = await db.query<any>(`
        SELECT 
          p.proname,
          has_function_privilege('anon', p.oid, 'EXECUTE') as anon_exec,
          has_function_privilege('authenticated', p.oid, 'EXECUTE') as auth_exec
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'app_security'
          AND p.proname IN ('trg_fn_notify_email_outbox_worker', 'invoke_email_outbox_retry_batch');
      `);
      expect(aclRes.rows.length).toBe(2);
      for (const row of aclRes.rows) {
        expect(row.anon_exec).toBe(false);
        expect(row.auth_exec).toBe(false);
      }
    });

    it("ensures no public RPC surface was created for internal dispatch functions", async () => {
      const publicRpc = await db.query<any>(`
        SELECT p.proname
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND (p.proname LIKE '%email_outbox%dispatch%' OR p.proname LIKE '%retry_batch%');
      `);
      expect(publicRpc.rows.length).toBe(0);
    });

    it("verifies cron job process-email-outbox-retries is scheduled with clean command shape", async () => {
      const cronRes = await db.query<any>(`
        SELECT jobname, schedule, command
        FROM cron.job
        WHERE jobname = 'process-email-outbox-retries';
      `);
      expect(cronRes.rows.length).toBe(1);
      expect(cronRes.rows[0].schedule).toBe("*/5 * * * *");
      expect(cronRes.rows[0].command).toBe("SELECT app_security.invoke_email_outbox_retry_batch();");
      // Explicitly verifies no secrets or URLs are stored in cron command
      expect(cronRes.rows[0].command).not.toContain("http");
      expect(cronRes.rows[0].command).not.toContain("secret");
    });

    it("verifies immediate dispatch failure isolation: trigger exception never aborts listing transitions", async () => {
      // Temporarily mock net.http_post to raise an exception
      await db.query(`
        CREATE OR REPLACE FUNCTION net.http_post(url text, headers jsonb, body jsonb) 
        RETURNS bigint AS $$ 
        BEGIN 
          RAISE EXCEPTION 'Simulated pg_net network failure'; 
        END; 
        $$ LANGUAGE plpgsql;
      `);

      // Create and transition a listing
      const listRes = await db.query<any>(`
        INSERT INTO public.listings (
          seller_id, category_id, city_id, locality_id, title, description,
          price_paise, condition, price_type, status, slug
        ) VALUES (
          '${sellerUserId}', '${categoryId}', '${cityId}', '${localityId}',
          'Fault Isolation Test Listing', 'Description', 25000, 'good', 'fixed',
          'draft', 'fault-isolation-test-listing'
        ) RETURNING id;
      `);
      const listingId = listRes.rows[0].id;

      // Submit listing for moderation -> inserts listing_status_transitions -> triggers email_outbox insert
      // -> triggers trg_email_outbox_immediate_dispatch which calls failing net.http_post
      await expect(
        db.query(`UPDATE public.listings SET status = 'pending_review' WHERE id = '${listingId}';`)
      ).resolves.not.toThrow();

      // Verify the authoritative listing transition and email_outbox row were COMMITTED
      const listingCheck = await db.query<any>(`SELECT status FROM public.listings WHERE id = '${listingId}';`);
      expect(listingCheck.rows[0].status).toBe("pending_review");

      const outboxCheck = await db.query<any>(`
        SELECT status, event_type FROM public.email_outbox WHERE listing_id = '${listingId}';
      `);
      expect(outboxCheck.rows.length).toBeGreaterThanOrEqual(1);
      expect(outboxCheck.rows.every((r: any) => r.event_type === "listing_submitted_for_review")).toBe(true);
      expect(outboxCheck.rows.every((r: any) => r.status === "pending")).toBe(true);

      // Restore working net.http_post mock
      await db.query(`
        CREATE OR REPLACE FUNCTION net.http_post(url text, headers jsonb, body jsonb) 
        RETURNS bigint AS $$ SELECT 1::bigint; $$ LANGUAGE sql;
      `);
    });

    it("documents explicitly runtime limitations in PGlite", () => {
      // PGlite runs purely in WebAssembly/Node and cannot run the native background
      // pg_cron daemon or make live external network requests via pg_net.
      // Full runtime end-to-end dispatch is verified against hosted Supabase (FairSwapTest).
      expect(true).toBe(true);
    });
  });

  describe("Migration 24 - Runtime Extensions & Scheduler Convergence Contract", () => {
    it("declares canonical CREATE EXTENSION statements for pg_net, pg_cron, and supabase_vault in Migration 24", () => {
      const migPath = path.resolve(
        process.cwd(),
        "supabase",
        "migrations",
        "20260926000024_email_outbox_runtime_extensions.sql"
      );
      const sql = fs.readFileSync(migPath, "utf8");

      expect(sql).toContain("CREATE EXTENSION IF NOT EXISTS pg_net;");
      expect(sql).toContain("CREATE EXTENSION IF NOT EXISTS pg_cron;");
      expect(sql).toContain("CREATE EXTENSION IF NOT EXISTS supabase_vault CASCADE;");
      expect(sql).toContain("net.http_post");
      expect(sql).toContain("cron.schedule");
      expect(sql).toContain("cron.unschedule");
      expect(sql).toContain("vault.decrypted_secrets");
      expect(sql).toContain("vault.create_secret");
    });

    it("ensures Migration 24 contains zero project URLs or plaintext secrets", () => {
      const migPath = path.resolve(
        process.cwd(),
        "supabase",
        "migrations",
        "20260926000024_email_outbox_runtime_extensions.sql"
      );
      const sql = fs.readFileSync(migPath, "utf8");

      expect(sql).not.toContain("wpppxlnbzqynvhpeuavd");
      expect(sql).not.toContain("kriuhwppxgxsyyrbjsau");
      expect(sql).not.toContain("https://");
      expect(sql).not.toContain("re_");
      expect(sql).not.toContain("bearer");
    });

    it("verifies canonical scheduler job definition in cron.job contains only internal function invocation", async () => {
      const cronRes = await db.query<any>(`
        SELECT jobname, schedule, command
        FROM cron.job
        WHERE jobname = 'process-email-outbox-retries';
      `);
      expect(cronRes.rows.length).toBe(1);
      expect(cronRes.rows[0].schedule).toBe("*/5 * * * *");
      expect(cronRes.rows[0].command).toBe("SELECT app_security.invoke_email_outbox_retry_batch();");
      expect(cronRes.rows[0].command).not.toContain("http");
      expect(cronRes.rows[0].command).not.toContain("secret");
    });

    it("verifies retry batch function app_security.invoke_email_outbox_retry_batch remains internal and inaccessible to anon/authenticated", async () => {
      const aclRes = await db.query<any>(`
        SELECT 
          p.proname,
          p.prosecdef,
          p.proconfig,
          has_function_privilege('anon', p.oid, 'EXECUTE') as anon_exec,
          has_function_privilege('authenticated', p.oid, 'EXECUTE') as auth_exec
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'app_security'
          AND p.proname = 'invoke_email_outbox_retry_batch';
      `);
      expect(aclRes.rows.length).toBe(1);
      expect(aclRes.rows[0].prosecdef).toBe(true);
      expect(aclRes.rows[0].proconfig.some((c: string) => c.startsWith("search_path="))).toBe(true);
      expect(aclRes.rows[0].anon_exec).toBe(false);
      expect(aclRes.rows[0].auth_exec).toBe(false);
    });

    it("explicitly records that PGlite cannot execute native pg_net, pg_cron, or Vault workers", () => {
      // PGlite runs purely in WebAssembly/Node and lacks native extension control files
      // for pg_net, pg_cron, and supabase_vault.
      // Full runtime end-to-end dispatch and native extension operations are verified against hosted Supabase (FairSwapTest).
      expect(true).toBe(true);
    });
  });
});
