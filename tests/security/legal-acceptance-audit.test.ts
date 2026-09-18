// @vitest-environment node
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import fs from "fs";
import path from "path";
import { LEGAL_POLICY } from "../../src/lib/compliance/legal-policy";

describe("Legal Acceptance & 18+ Age Audit Security Safeguards (Migration 20)", () => {
  let db: PGlite;

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

    // 2. Apply all repository migrations in order (1 to 20)
    const migDir = path.resolve(process.cwd(), "supabase", "migrations");
    const migrationFiles = fs.readdirSync(migDir).filter((f) => f.endsWith(".sql")).sort();

    for (const file of migrationFiles) {
      const sql = fs.readFileSync(path.join(migDir, file), "utf8");
      await db.exec(sql);
    }
  });

  it("Migration 20 adds acceptable_use_version, age_confirmed_at, and minimum_age_confirmed as nullable columns", async () => {
    const res: any = await db.query(`
      SELECT column_name, is_nullable, data_type
      FROM information_schema.columns
      WHERE table_name = 'user_accounts' AND column_name IN (
        'acceptable_use_version', 'age_confirmed_at', 'minimum_age_confirmed'
      )
      ORDER BY column_name;
    `);

    expect(res.rows).toHaveLength(3);
    const cols = Object.fromEntries(res.rows.map((r: any) => [r.column_name, r]));

    expect(cols.acceptable_use_version.is_nullable).toBe("YES");
    expect(cols.acceptable_use_version.data_type).toBe("text");

    expect(cols.age_confirmed_at.is_nullable).toBe("YES");
    expect(cols.age_confirmed_at.data_type).toContain("timestamp");

    expect(cols.minimum_age_confirmed.is_nullable).toBe("YES");
    expect(cols.minimum_age_confirmed.data_type).toBe("smallint");
  });

  it("permits existing pilot accounts to retain null values for newly added acceptance fields", async () => {
    const pilotUserId = "00000000-0000-0000-0000-000000000001";
    await db.exec(`
      INSERT INTO auth.users (id, email, raw_user_meta_data, created_at)
      VALUES ('${pilotUserId}', 'pilot@fairswap.local', '{"terms_version":"2026-09-01"}'::jsonb, clock_timestamp());
    `);

    const accountRes: any = await db.query(`
      SELECT user_id, terms_version, acceptable_use_version, age_confirmed_at, minimum_age_confirmed
      FROM public.user_accounts
      WHERE user_id = '${pilotUserId}';
    `);

    expect(accountRes.rows).toHaveLength(1);
    expect(accountRes.rows[0].acceptable_use_version).toBeNull();
    expect(accountRes.rows[0].age_confirmed_at).toBeNull();
    expect(accountRes.rows[0].minimum_age_confirmed).toBeNull();
  });

  it("provisions new user with verified immutable consent evidence when all legal metadata is provided", async () => {
    const newUserId = "00000000-0000-0000-0000-000000000002";
    const userMeta = JSON.stringify({
      display_name: "Beta User",
      terms_accepted: "true",
      terms_version: LEGAL_POLICY.termsVersion,
      privacy_policy_version: LEGAL_POLICY.privacyVersion,
      acceptable_use_version: LEGAL_POLICY.acceptableUseVersion,
      age_confirmed: "true",
      minimum_age_confirmed: 18,
    });

    await db.exec(`
      INSERT INTO auth.users (id, email, raw_user_meta_data, created_at)
      VALUES ('${newUserId}', 'beta@fairswap.local', '${userMeta}'::jsonb, clock_timestamp());
    `);

    const accountRes: any = await db.query(`
      SELECT user_id, terms_accepted_at, terms_version, privacy_policy_version,
             acceptable_use_version, age_confirmed_at, minimum_age_confirmed
      FROM public.user_accounts
      WHERE user_id = '${newUserId}';
    `);

    expect(accountRes.rows).toHaveLength(1);
    const acc = accountRes.rows[0];
    expect(acc.terms_version).toBe(LEGAL_POLICY.termsVersion);
    expect(acc.privacy_policy_version).toBe(LEGAL_POLICY.privacyVersion);
    expect(acc.acceptable_use_version).toBe(LEGAL_POLICY.acceptableUseVersion);
    expect(acc.terms_accepted_at).toBeDefined();
    expect(acc.age_confirmed_at).toBeDefined();
    expect(acc.minimum_age_confirmed).toBe(18);
  });

  it("rejects user creation and prevents account record when terms acceptance is absent", async () => {
    const invalidUserId = "00000000-0000-0000-0000-000000000003";
    const invalidMeta = JSON.stringify({
      display_name: "Incomplete User",
      terms_version: LEGAL_POLICY.termsVersion,
      privacy_policy_version: LEGAL_POLICY.privacyVersion,
      acceptable_use_version: LEGAL_POLICY.acceptableUseVersion,
      age_confirmed: "true",
      // terms_accepted missing!
    });

    await expect(
      db.exec(`
        INSERT INTO auth.users (id, email, raw_user_meta_data, created_at)
        VALUES ('${invalidUserId}', 'noterms@fairswap.local', '${invalidMeta}'::jsonb, clock_timestamp());
      `)
    ).rejects.toThrow(/Registration rejected: mandatory Terms acceptance/);

    // Verify no account record was created
    const checkRes: any = await db.query(`
      SELECT count(*) as count FROM public.user_accounts WHERE user_id = '${invalidUserId}';
    `);
    expect(Number(checkRes.rows[0].count)).toBe(0);
  });

  it("rejects user creation when 18+ age confirmation is absent", async () => {
    const minorUserId = "00000000-0000-0000-0000-000000000004";
    const minorMeta = JSON.stringify({
      display_name: "Minor User",
      terms_accepted: "true",
      terms_version: LEGAL_POLICY.termsVersion,
      privacy_policy_version: LEGAL_POLICY.privacyVersion,
      acceptable_use_version: LEGAL_POLICY.acceptableUseVersion,
      age_confirmed: "false",
      minimum_age_confirmed: 16,
    });

    await expect(
      db.exec(`
        INSERT INTO auth.users (id, email, raw_user_meta_data, created_at)
        VALUES ('${minorUserId}', 'minor@fairswap.local', '${minorMeta}'::jsonb, clock_timestamp());
      `)
    ).rejects.toThrow(/Registration rejected: mandatory Terms acceptance.*age confirmation/);
  });

  it("enforces immutability: prevents normal users or updates from altering acceptance evidence", async () => {
    const targetUserId = "00000000-0000-0000-0000-000000000002";

    // 1. Attempt to alter terms_accepted_at
    await expect(
      db.exec(`
        UPDATE public.user_accounts
        SET terms_accepted_at = clock_timestamp()
        WHERE user_id = '${targetUserId}';
      `)
    ).rejects.toThrow(/terms_accepted_at is immutable/);

    // 2. Attempt to alter terms_version
    await expect(
      db.exec(`
        UPDATE public.user_accounts
        SET terms_version = '2099-01-01'
        WHERE user_id = '${targetUserId}';
      `)
    ).rejects.toThrow(/terms_version is immutable/);

    // 3. Attempt to alter privacy_policy_version
    await expect(
      db.exec(`
        UPDATE public.user_accounts
        SET privacy_policy_version = '2099-01-01'
        WHERE user_id = '${targetUserId}';
      `)
    ).rejects.toThrow(/privacy_policy_version is immutable/);

    // 4. Attempt to alter acceptable_use_version
    await expect(
      db.exec(`
        UPDATE public.user_accounts
        SET acceptable_use_version = '2099-01-01'
        WHERE user_id = '${targetUserId}';
      `)
    ).rejects.toThrow(/acceptable_use_version is immutable/);

    // 5. Attempt to alter age_confirmed_at
    await expect(
      db.exec(`
        UPDATE public.user_accounts
        SET age_confirmed_at = clock_timestamp()
        WHERE user_id = '${targetUserId}';
      `)
    ).rejects.toThrow(/age_confirmed_at is immutable/);

    // 6. Attempt to alter minimum_age_confirmed
    await expect(
      db.exec(`
        UPDATE public.user_accounts
        SET minimum_age_confirmed = 21
        WHERE user_id = '${targetUserId}';
      `)
    ).rejects.toThrow(/minimum_age_confirmed is immutable/);
  });

  it("privacy export RPC includes full legal acceptance and age metadata in account export", async () => {
    const exportUserId = "00000000-0000-0000-0000-000000000002";
    const requestId = "10000000-0000-0000-0000-000000000001";

    // 1. Mock auth.uid() to return the export user
    await db.exec(`
      CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
      LANGUAGE sql STABLE
      SET search_path = 'pg_catalog'
      AS $$
        SELECT '${exportUserId}'::uuid;
      $$;
    `);

    // 2. Create privacy request with authenticated user
    await db.exec(`
      INSERT INTO public.privacy_requests (id, user_id, request_type, status, requested_at)
      VALUES ('${requestId}', '${exportUserId}', 'export_data', 'pending', clock_timestamp());
    `);

    // 3. Fulfill data export via RPC
    const exportRes: any = await db.query(`
      SELECT app_security.impl_fulfill_data_export('${requestId}') as export_data;
    `);

    expect(exportRes.rows).toHaveLength(1);
    const data = exportRes.rows[0].export_data;
    expect(data.account).toBeDefined();
    expect(data.account.terms_version).toBe(LEGAL_POLICY.termsVersion);
    expect(data.account.privacy_policy_version).toBe(LEGAL_POLICY.privacyVersion);
    expect(data.account.acceptable_use_version).toBe(LEGAL_POLICY.acceptableUseVersion);
    expect(data.account.minimum_age_confirmed).toBe(18);
    expect(data.account.age_confirmed_at).toBeDefined();
  });
});
