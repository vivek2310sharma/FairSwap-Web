// @vitest-environment node
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import fs from "fs";
import path from "path";
import { LEGAL_POLICY } from "../../src/lib/compliance/legal-policy";

describe("Issue #46 Pilot Policy Re-acceptance & Security Guardrails (Migration 21)", () => {
  let db: PGlite;
  const pilotUserId = "00000000-0000-0000-0000-000000000001";
  const pilotUser2Id = "00000000-0000-0000-0000-000000000002";
  const currentBetaUserId = "00000000-0000-0000-0000-000000000003";
  let activeListingId: string;

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
    `);

    const migDir = path.resolve(process.cwd(), "supabase", "migrations");
    const migrationFiles = fs.readdirSync(migDir).filter((f) => f.endsWith(".sql")).sort();

    // 2. Apply migrations 1 through 19
    const priorMigrations = migrationFiles.filter((f) => !f.includes("000020_") && !f.includes("000021_"));
    for (const file of priorMigrations) {
      const sql = fs.readFileSync(path.join(migDir, file), "utf8");
      await db.exec(sql);
    }

    // 3. Seed historical pilot user accounts (prior to Migration 20)
    await db.exec(`
      INSERT INTO auth.users (id, email, raw_user_meta_data, created_at)
      VALUES 
        ('${pilotUserId}', 'pilot1@fairswap.local', '{"display_name":"Pilot User 1","terms_accepted":"true","terms_version":"2026-09-01","privacy_policy_version":"2026-09-01"}'::jsonb, clock_timestamp()),
        ('${pilotUser2Id}', 'pilot2@fairswap.local', '{"display_name":"Pilot User 2","terms_accepted":"true","terms_version":"2026-09-01","privacy_policy_version":"2026-09-01"}'::jsonb, clock_timestamp());
    `);

    // 4. Apply Migration 20
    const migration20File = migrationFiles.find((f) => f.includes("000020_"));
    if (!migration20File) throw new Error("Migration 20 not found");
    await db.exec(fs.readFileSync(path.join(migDir, migration20File), "utf8"));

    // 5. Create a new Public Beta user under Migration 20 trigger
    await db.exec(`
      INSERT INTO auth.users (id, email, raw_user_meta_data, created_at)
      VALUES (
        '${currentBetaUserId}',
        'current@fairswap.local',
        jsonb_build_object(
          'display_name', 'Current Beta User',
          'terms_accepted', 'true',
          'terms_version', '2026-09-18',
          'privacy_policy_version', '2026-09-18',
          'acceptable_use_version', '2026-09-18',
          'age_confirmed', 'true'
        ),
        clock_timestamp()
      );
    `);

    // 6. Apply Migration 21
    const migration21File = migrationFiles.find((f) => f.includes("000021_"));
    if (!migration21File) throw new Error("Migration 21 not found");
    await db.exec(fs.readFileSync(path.join(migDir, migration21File), "utf8"));

    await db.exec(`
      GRANT USAGE ON SCHEMA auth TO authenticated;
      GRANT USAGE ON SCHEMA app_security TO authenticated;
      GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;
      GRANT EXECUTE ON FUNCTION auth.role() TO authenticated;
      GRANT EXECUTE ON FUNCTION auth.jwt() TO authenticated;
    `);

    // Seed a category, location, and listing owned by currentBetaUserId for testing
    await db.exec(`
      INSERT INTO public.categories (name, slug)
      VALUES ('Electronics', 'electronics')
      ON CONFLICT DO NOTHING;

      INSERT INTO public.cities (name, slug, state)
      VALUES ('Bengaluru', 'bengaluru', 'Karnataka')
      ON CONFLICT DO NOTHING;
    `);

    const seedRes: any = await db.query(`
      INSERT INTO public.listings (
        seller_id, title, slug, description, category_id, city_id,
        price_paise, price_type, condition, status, published_at
      ) VALUES (
        '${currentBetaUserId}',
        'Vintage Camera',
        'vintage-camera-seed',
        'Great working camera',
        (SELECT id FROM public.categories LIMIT 1),
        (SELECT id FROM public.cities LIMIT 1),
        500000,
        'fixed',
        'like_new',
        'active',
        clock_timestamp()
      ) RETURNING id;
    `);
    activeListingId = seedRes.rows[0].id;

    // Transition listing to active (the insert trigger defaults to draft)
    await db.query(`
      UPDATE public.listings
      SET status = 'active'
      WHERE id = '${activeListingId}';
    `);
  });

  it("proves historical pilot accounts initially have has_current_policy_acceptance = false", async () => {
    const res: any = await db.query(`
      SELECT app_security.has_current_policy_acceptance('${pilotUserId}') AS is_current;
    `);
    expect(res.rows[0].is_current).toBe(false);

    // Verify historical pilot row fields in user_accounts remain intact (null/2026-09-01)
    const pilotAcct: any = await db.query(`
      SELECT terms_version, privacy_policy_version, acceptable_use_version, age_confirmed_at, minimum_age_confirmed
      FROM public.user_accounts
      WHERE user_id = '${pilotUserId}';
    `);
    expect(pilotAcct.rows[0].terms_version).toBe("2026-09-01");
    expect(pilotAcct.rows[0].privacy_policy_version).toBe("2026-09-01");
    expect(pilotAcct.rows[0].acceptable_use_version).toBeNull();
    expect(pilotAcct.rows[0].age_confirmed_at).toBeNull();
    expect(pilotAcct.rows[0].minimum_age_confirmed).toBeNull();
  });

  it("proves new Public Beta signup immediately has has_current_policy_acceptance = true", async () => {
    const res: any = await db.query(`
      SELECT app_security.has_current_policy_acceptance('${currentBetaUserId}') AS is_current;
    `);
    expect(res.rows[0].is_current).toBe(true);
  });

  it("proves stale pilot account cannot favourite a listing via direct INSERT", async () => {
    // Set auth context as pilotUserId
    await db.exec(`
      CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS $$ SELECT '${pilotUserId}'::uuid $$ LANGUAGE sql STABLE;
      CREATE OR REPLACE FUNCTION auth.role() RETURNS text AS $$ SELECT 'authenticated'::text $$ LANGUAGE sql STABLE;
      SET ROLE authenticated;
    `);

    // Direct insert should violate favourites_insert_policy because has_current_policy_acceptance is false
    await expect(
      db.query(`
        INSERT INTO public.favourites (user_id, listing_id)
        VALUES ('${pilotUserId}', '${activeListingId}');
      `)
    ).rejects.toThrow();

    await db.exec(`RESET ROLE;`);
  });

  it("proves stale pilot account cannot start a conversation with a seller", async () => {
    await db.exec(`
      CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS $$ SELECT '${pilotUserId}'::uuid $$ LANGUAGE sql STABLE;
      CREATE OR REPLACE FUNCTION auth.role() RETURNS text AS $$ SELECT 'authenticated'::text $$ LANGUAGE sql STABLE;
    `);

    await expect(
      db.query(`
        SELECT public.start_conversation(
          '${activeListingId}',
          'Hi, is this available?',
          'req-msg-001'
        );
      `)
    ).rejects.toThrow(/POLICY_ACCEPTANCE_REQUIRED/);
  });

  it("proves stale pilot account cannot block another user", async () => {
    await db.exec(`
      CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS $$ SELECT '${pilotUserId}'::uuid $$ LANGUAGE sql STABLE;
      CREATE OR REPLACE FUNCTION auth.role() RETURNS text AS $$ SELECT 'authenticated'::text $$ LANGUAGE sql STABLE;
    `);

    await expect(
      db.query(`
        SELECT app_security.impl_block_user('${currentBetaUserId}', 'Inappropriate conduct');
      `)
    ).rejects.toThrow(/POLICY_ACCEPTANCE_REQUIRED/);
  });

  it("proves re-acceptance RPC rejects missing terms acceptance or missing age confirmation", async () => {
    await db.exec(`
      CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS $$ SELECT '${pilotUserId}'::uuid $$ LANGUAGE sql STABLE;
      CREATE OR REPLACE FUNCTION auth.role() RETURNS text AS $$ SELECT 'authenticated'::text $$ LANGUAGE sql STABLE;
    `);

    // Missing terms acceptance
    await expect(
      db.query(`SELECT public.record_policy_reacceptance(false, true);`)
    ).rejects.toThrow(/Terms, Acceptable Use, and Privacy acceptance is required/);

    // Missing age confirmation
    await expect(
      db.query(`SELECT public.record_policy_reacceptance(true, false);`)
    ).rejects.toThrow(/Age confirmation \(18\+\) is required/);
  });

  it("proves successful re-acceptance records immutable current evidence without mutating user_accounts", async () => {
    await db.exec(`
      CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS $$ SELECT '${pilotUserId}'::uuid $$ LANGUAGE sql STABLE;
      CREATE OR REPLACE FUNCTION auth.role() RETURNS text AS $$ SELECT 'authenticated'::text $$ LANGUAGE sql STABLE;
    `);

    const result: any = await db.query(`
      SELECT public.record_policy_reacceptance(true, true) AS res;
    `);
    const data = result.rows[0].res;
    expect(data.success).toBe(true);
    expect(data.already_recorded).toBe(false);
    expect(data.record_id).toBeDefined();

    // Verify row in policy_acceptance_records
    const recordRow: any = await db.query(`
      SELECT * FROM public.policy_acceptance_records WHERE user_id = '${pilotUserId}';
    `);
    expect(recordRow.rows.length).toBe(1);
    expect(recordRow.rows[0].terms_version).toBe(LEGAL_POLICY.termsVersion);
    expect(recordRow.rows[0].privacy_policy_version).toBe(LEGAL_POLICY.privacyVersion);
    expect(recordRow.rows[0].acceptable_use_version).toBe(LEGAL_POLICY.acceptableUseVersion);
    expect(recordRow.rows[0].minimum_age_confirmed).toBe(18);
    expect(recordRow.rows[0].accepted_at).toBeDefined();

    // Verify historical pilot row in user_accounts was NOT overwritten or mutated
    const pilotAcct: any = await db.query(`
      SELECT terms_version, privacy_policy_version, acceptable_use_version, age_confirmed_at, minimum_age_confirmed
      FROM public.user_accounts
      WHERE user_id = '${pilotUserId}';
    `);
    expect(pilotAcct.rows[0].terms_version).toBe("2026-09-01");
    expect(pilotAcct.rows[0].privacy_policy_version).toBe("2026-09-01");
    expect(pilotAcct.rows[0].acceptable_use_version).toBeNull();
    expect(pilotAcct.rows[0].age_confirmed_at).toBeNull();
    expect(pilotAcct.rows[0].minimum_age_confirmed).toBeNull();

    // Proves has_current_policy_acceptance is now true
    const currentCheck: any = await db.query(`
      SELECT public.has_current_policy_acceptance() AS is_current;
    `);
    expect(currentCheck.rows[0].is_current).toBe(true);
  });

  it("proves re-acceptance is idempotent and does not create duplicate rows on retries", async () => {
    await db.exec(`
      CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS $$ SELECT '${pilotUserId}'::uuid $$ LANGUAGE sql STABLE;
      CREATE OR REPLACE FUNCTION auth.role() RETURNS text AS $$ SELECT 'authenticated'::text $$ LANGUAGE sql STABLE;
    `);

    // Repeated invocation
    const retryRes: any = await db.query(`
      SELECT public.record_policy_reacceptance(true, true) AS res;
    `);
    const data = retryRes.rows[0].res;
    expect(data.success).toBe(true);
    expect(data.already_recorded).toBe(true);

    // Row count must remain 1
    const countRes: any = await db.query(`
      SELECT COUNT(*)::int AS cnt FROM public.policy_acceptance_records WHERE user_id = '${pilotUserId}';
    `);
    expect(countRes.rows[0].cnt).toBe(1);
  });

  it("proves policy_acceptance_records rows are strictly immutable against UPDATE and direct DELETE", async () => {
    // Attempt UPDATE
    await expect(
      db.query(`
        UPDATE public.policy_acceptance_records
        SET minimum_age_confirmed = 21
        WHERE user_id = '${pilotUserId}';
      `)
    ).rejects.toThrow(/policy_acceptance_records rows are immutable/);

    // Attempt direct DELETE
    await expect(
      db.query(`
        DELETE FROM public.policy_acceptance_records
        WHERE user_id = '${pilotUserId}';
      `)
    ).rejects.toThrow(/policy_acceptance_records rows are immutable; direct deletion is prohibited/);
  });

  it("proves authenticated users cannot read another user's policy acceptance records", async () => {
    // Authenticate as pilotUser2Id
    await db.exec(`
      CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS $$ SELECT '${pilotUser2Id}'::uuid $$ LANGUAGE sql STABLE;
      CREATE OR REPLACE FUNCTION auth.role() RETURNS text AS $$ SELECT 'authenticated'::text $$ LANGUAGE sql STABLE;
      SET ROLE authenticated;
    `);

    // Pilot 2 queries policy_acceptance_records for Pilot 1
    const res: any = await db.query(`
      SELECT * FROM public.policy_acceptance_records WHERE user_id = '${pilotUserId}';
    `);
    // RLS filters out pilotUserId's records
    expect(res.rows.length).toBe(0);

    await db.exec(`RESET ROLE;`);
  });

  it("proves after re-acceptance, authenticated mutations (favourite, messaging, block) succeed", async () => {
    // Authenticate as re-accepted pilotUserId
    await db.exec(`
      CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS $$ SELECT '${pilotUserId}'::uuid $$ LANGUAGE sql STABLE;
      CREATE OR REPLACE FUNCTION auth.role() RETURNS text AS $$ SELECT 'authenticated'::text $$ LANGUAGE sql STABLE;
      SET ROLE authenticated;
    `);

    // 1. Favourite insertion now succeeds
    await db.query(`
      INSERT INTO public.favourites (user_id, listing_id)
      VALUES ('${pilotUserId}', '${activeListingId}');
    `);
    const favRes: any = await db.query(`
      SELECT * FROM public.favourites WHERE user_id = '${pilotUserId}' AND listing_id = '${activeListingId}';
    `);
    expect(favRes.rows.length).toBe(1);

    await db.exec(`RESET ROLE;`);

    // 2. Start conversation now succeeds
    const convRes: any = await db.query(`
      SELECT public.start_conversation(
        '${activeListingId}',
        'Hi, I would like to buy this camera.',
        'req-msg-reaccepted-001'
      ) AS res;
    `);
    expect(convRes.rows[0].res.conversation_id).toBeDefined();

    // 3. Block user now succeeds
    await db.query(`
      SELECT app_security.impl_block_user('${pilotUser2Id}', 'Test block after acceptance');
    `);
    const blockRes: any = await db.query(`
      SELECT * FROM public.user_blocks WHERE blocker_id = '${pilotUserId}' AND blocked_id = '${pilotUser2Id}';
    `);
    expect(blockRes.rows.length).toBe(1);
  });

  it("proves privacy data export includes policy_acceptances array", async () => {
    // Create an export request for pilotUserId
    const exportReqRes: any = await db.query(`
      INSERT INTO public.privacy_requests (user_id, request_type, status)
      VALUES ('${pilotUserId}', 'export_data', 'pending')
      RETURNING id;
    `);
    const reqId = exportReqRes.rows[0].id;

    // Fulfill export
    const fulfillRes: any = await db.query(`
      SELECT app_security.impl_fulfill_data_export('${reqId}') AS export_data;
    `);
    const exportData = fulfillRes.rows[0].export_data;
    expect(exportData.policy_acceptances).toBeDefined();
    expect(Array.isArray(exportData.policy_acceptances)).toBe(true);
    expect(exportData.policy_acceptances.length).toBe(1);
    expect(exportData.policy_acceptances[0].terms_version).toBe(LEGAL_POLICY.termsVersion);
    expect(exportData.policy_acceptances[0].acceptable_use_version).toBe(LEGAL_POLICY.acceptableUseVersion);
  });
});
