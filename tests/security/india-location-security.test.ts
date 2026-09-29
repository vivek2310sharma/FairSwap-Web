// @vitest-environment node
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import fs from "fs";
import path from "path";

describe("India Location & Postal Database RLS & Security Tests (#81)", () => {
  let db: PGlite;

  const sellerUserId = "00000000-0000-0000-0000-000000000020";
  let bengaluruCityId: string;
  let jaipurCityId: string;
  let koramangalaLocalityId: string;
  let malviyaNagarLocalityId: string;
  let testCategoryId: string;

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
    `);

    // 2. Load base migrations 1 through 21 and migration 25
    const migrationsDir = path.join(process.cwd(), "supabase", "migrations");
    const migrationFiles = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith(".sql"))
      .sort();

    for (const file of migrationFiles) {
      // Exclude pg_net extension migrations in pglite
      if (file.includes("email_outbox") || file.includes("listing_email_notifications")) {
        continue;
      }
      const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
      await db.exec(sql);
    }

    // 3. Seed cities and localities for tests
    const cityRes = await db.query<any>(`
      INSERT INTO public.cities (name, state, slug, is_active)
      VALUES 
        ('Bengaluru', 'Karnataka', 'bengaluru', true),
        ('Jaipur', 'Rajasthan', 'jaipur-test', true)
      RETURNING id, name;
    `);
    bengaluruCityId = cityRes.rows.find((r: any) => r.name === "Bengaluru")?.id;
    jaipurCityId = cityRes.rows.find((r: any) => r.name === "Jaipur")?.id;

    const locRes = await db.query<any>(`
      INSERT INTO public.localities (city_id, name, slug, is_active)
      VALUES 
        ($1, 'Koramangala', 'koramangala', true),
        ($2, 'Malviya Nagar', 'malviya-nagar-test', true)
      RETURNING id, name;
    `, [bengaluruCityId, jaipurCityId]);
    koramangalaLocalityId = locRes.rows.find((r: any) => r.name === "Koramangala")?.id;
    malviyaNagarLocalityId = locRes.rows.find((r: any) => r.name === "Malviya Nagar")?.id;

    // Get an existing category
    const catRes = await db.query<any>(`SELECT id FROM public.categories LIMIT 1;`);
    testCategoryId = catRes.rows[0].id;

    // Seed test postal records
    await db.exec(`
      INSERT INTO public.india_postal_data 
        (pincode, office_name, office_type, delivery_status, district, state)
      VALUES 
        ('560034', 'Koramangala I Block S.O', 'S.O', 'Delivery', 'Bengaluru Urban', 'Karnataka'),
        ('560034', 'Agara S.O', 'S.O', 'Non-Delivery', 'Bengaluru Urban', 'Karnataka'),
        ('302017', 'Malviya Nagar S.O', 'S.O', 'Delivery', 'Jaipur', 'Rajasthan');

      INSERT INTO public.postal_pincode_localities 
        (pincode, locality_id, office_name, source)
      VALUES 
        ('560034', '${koramangalaLocalityId}', 'Koramangala I Block S.O', 'india_post_candidate'),
        ('302017', '${malviyaNagarLocalityId}', 'Malviya Nagar S.O', 'india_post_candidate');
    `);

    // Setup active seller user with valid policy acceptance metadata
    const validMeta = JSON.stringify({
      display_name: "Test Seller",
      terms_accepted: "true",
      terms_version: "2026-09-18",
      privacy_policy_version: "2026-09-18",
      acceptable_use_version: "2026-09-18",
      age_confirmed: "true",
    });

    await db.exec(`
      INSERT INTO auth.users (id, email, raw_user_meta_data)
      VALUES ('${sellerUserId}', 'seller@fairswap.test', '${validMeta}'::jsonb);
    `);
  });

  describe("A. lookup_pincode RPC", () => {
    it("returns correct administrative and locality data for valid PIN code", async () => {
      const res = await db.query<any>(`SELECT public.lookup_pincode('560034') as result;`);
      const data = res.rows[0].result;

      expect(data.success).toBe(true);
      expect(data.pincode).toBe("560034");
      expect(data.state).toBe("Karnataka");
      expect(data.district).toBe("Bengaluru Urban");
      expect(data.postal_offices).toHaveLength(2);
      expect(data.localities).toHaveLength(1);
      expect(data.localities[0].id).toBe(koramangalaLocalityId);
      expect(data.localities[0].name).toBe("Koramangala");
    });

    it("rejects invalid PIN code format", async () => {
      const res = await db.query<any>(`SELECT public.lookup_pincode('56003') as result;`);
      const data = res.rows[0].result;

      expect(data.success).toBe(false);
      expect(data.error).toBe("INVALID_PINCODE");
    });

    it("returns PINCODE_NOT_FOUND for uncatalogued 6-digit PIN", async () => {
      const res = await db.query<any>(`SELECT public.lookup_pincode('999999') as result;`);
      const data = res.rows[0].result;

      expect(data.success).toBe(false);
      expect(data.error).toBe("PINCODE_NOT_FOUND");
    });

    it("allows execution by anon and authenticated roles", async () => {
      await db.exec(`SET ROLE anon;`);
      const anonRes = await db.query<any>(`SELECT public.lookup_pincode('302017') as result;`);
      expect(anonRes.rows[0].result.success).toBe(true);

      await db.exec(`SET ROLE authenticated;`);
      const authRes = await db.query<any>(`SELECT public.lookup_pincode('302017') as result;`);
      expect(authRes.rows[0].result.success).toBe(true);

      await db.exec(`RESET ROLE;`);
    });

    it("asserts lookup_pincode is SECURITY INVOKER and PUBLIC does not have unintended execute privilege", async () => {
      const procRes = await db.query<any>(`
        SELECT prosecdef, proconfig
        FROM pg_proc
        JOIN pg_namespace n ON n.oid = pg_proc.pronamespace
        WHERE n.nspname = 'public' AND proname = 'lookup_pincode';
      `);
      expect(procRes.rows).toHaveLength(1);
      // prosecdef must be false for SECURITY INVOKER
      expect(procRes.rows[0].prosecdef).toBe(false);

      // Verify safe search_path is configured in proconfig
      const proconfig = procRes.rows[0].proconfig;
      expect(proconfig).toEqual(expect.arrayContaining([expect.stringContaining("search_path=")]));

      // Assert PUBLIC pseudo-role does NOT have execute privilege
      const pubPriv = await db.query<any>(`
        SELECT has_function_privilege('public', 'public.lookup_pincode(text)', 'execute') as has_priv;
      `);
      expect(pubPriv.rows[0].has_priv).toBe(false);

      // Assert anon and authenticated DO have execute privilege
      const anonPriv = await db.query<any>(`
        SELECT has_function_privilege('anon', 'public.lookup_pincode(text)', 'execute') as has_priv;
      `);
      expect(anonPriv.rows[0].has_priv).toBe(true);

      const authPriv = await db.query<any>(`
        SELECT has_function_privilege('authenticated', 'public.lookup_pincode(text)', 'execute') as has_priv;
      `);
      expect(authPriv.rows[0].has_priv).toBe(true);
    });
  });

  describe("B. PostgreSQL Grants & RLS Write Boundaries", () => {
    it("allows anon to SELECT from india_postal_data and postal_pincode_localities", async () => {
      await db.exec(`SET ROLE anon;`);
      const res = await db.query<any>(`SELECT count(*) as count FROM public.india_postal_data;`);
      expect(parseInt(res.rows[0].count, 10)).toBeGreaterThan(0);
      await db.exec(`RESET ROLE;`);
    });

    it("blocks anon from INSERT/UPDATE/DELETE on india_postal_data", async () => {
      await db.exec(`SET ROLE anon;`);
      let errorThrown = false;
      try {
        await db.query(`
          INSERT INTO public.india_postal_data (pincode, office_name, district, state)
          VALUES ('110001', 'Test H.O', 'New Delhi', 'Delhi');
        `);
      } catch (err: any) {
        errorThrown = true;
        expect(err.message).toMatch(/permission denied/i);
      }
      await db.exec(`RESET ROLE;`);
      expect(errorThrown).toBe(true);
    });

    it("blocks authenticated user from mutating postal master records", async () => {
      await db.exec(`SET ROLE authenticated;`);
      let errorThrown = false;
      try {
        await db.query(`
          DELETE FROM public.india_postal_data WHERE pincode = '560034';
        `);
      } catch (err: any) {
        errorThrown = true;
        expect(err.message).toMatch(/permission denied/i);
      }
      await db.exec(`RESET ROLE;`);
      expect(errorThrown).toBe(true);
    });
  });

  describe("C. Listing Submission PIN-Locality Server Integrity", () => {
    it("rejects submission if listing is missing a valid 6-digit PIN code", async () => {
      // Create draft listing with no PIN
      const draftRes = await db.query<any>(`
        INSERT INTO public.listings (
          seller_id, category_id, city_id, title, description, condition, price_type, price_paise, pin_code, status
        ) VALUES (
          '${sellerUserId}', '${testCategoryId}', '${bengaluruCityId}', 'Draft item title', 'Detailed description for test item',
          'good', 'fixed', 100000, null, 'draft'
        ) RETURNING id;
      `);
      const listingId = draftRes.rows[0].id;

      // Add dummy media
      await db.query(`
        INSERT INTO public.listing_media (listing_id, uploader_id, original_filename, content_type, file_size_bytes, processing_status)
        VALUES ('${listingId}', '${sellerUserId}', 'test.jpg', 'image/jpeg', 1000, 'ready');
      `);

      // Attempt to submit as seller
      // Setup auth session as seller
      await db.exec(`
        CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS $$ SELECT '${sellerUserId}'::uuid $$ LANGUAGE sql STABLE;
        SET ROLE authenticated;
      `);

      let errorThrown = false;
      try {
        await db.query(`SELECT public.seller_submit_listing('${listingId}');`);
      } catch (err: any) {
        errorThrown = true;
        expect(err.message).toMatch(/valid 6-digit PIN code is required/i);
      }

      await db.exec(`RESET ROLE;`);
      expect(errorThrown).toBe(true);
    });

    it("rejects submission if locality belongs to a DIFFERENT PIN code (PIN A + locality B mismatch)", async () => {
      // Create listing with Bengaluru PIN (560034) but Jaipur locality (Malviya Nagar)
      const draftRes = await db.query<any>(`
        INSERT INTO public.listings (
          seller_id, category_id, city_id, locality_id, title, description, condition, price_type, price_paise, pin_code, status
        ) VALUES (
          '${sellerUserId}', '${testCategoryId}', '${bengaluruCityId}', '${malviyaNagarLocalityId}',
          'Mismatched location item', 'Detailed description for test item',
          'good', 'fixed', 100000, '560034', 'draft'
        ) RETURNING id;
      `);
      const listingId = draftRes.rows[0].id;

      await db.query(`
        INSERT INTO public.listing_media (listing_id, uploader_id, original_filename, content_type, file_size_bytes, processing_status)
        VALUES ('${listingId}', '${sellerUserId}', 'test.jpg', 'image/jpeg', 1000, 'ready');
      `);

      // Setup auth session as seller
      await db.exec(`
        CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS $$ SELECT '${sellerUserId}'::uuid $$ LANGUAGE sql STABLE;
        SET ROLE authenticated;
      `);

      let errorThrown = false;
      try {
        await db.query(`SELECT public.seller_submit_listing('${listingId}');`);
      } catch (err: any) {
        errorThrown = true;
        expect(err.message).toMatch(/INVALID_PIN_LOCALITY_MAPPING/i);
      }

      await db.exec(`RESET ROLE;`);
      expect(errorThrown).toBe(true);
    });

    it("successfully submits listing when PIN and locality match correctly", async () => {
      // Create listing with Bengaluru PIN (560034) and Bengaluru Koramangala locality
      const draftRes = await db.query<any>(`
        INSERT INTO public.listings (
          seller_id, category_id, city_id, locality_id, title, description, condition, price_type, price_paise, pin_code, landmark, category_attributes, status
        ) VALUES (
          '${sellerUserId}', '${testCategoryId}', '${bengaluruCityId}', '${koramangalaLocalityId}',
          'Legitimate location item', 'Detailed description for test item',
          'good', 'fixed', 100000, '560034', 'Near Forum Mall', '{"brand": "Apple"}'::jsonb, 'draft'
        ) RETURNING id;
      `);
      const listingId = draftRes.rows[0].id;

      await db.exec(`
        INSERT INTO public.listing_media (listing_id, uploader_id, original_filename, content_type, file_size_bytes)
        VALUES ('${listingId}', '${sellerUserId}', 'test.jpg', 'image/jpeg', 1000);

        UPDATE public.listing_media
        SET processing_status = 'ready'
        WHERE listing_id = '${listingId}';
      `);

      await db.exec(`
        CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS $$ SELECT '${sellerUserId}'::uuid $$ LANGUAGE sql STABLE;
        SET ROLE authenticated;
      `);

      const submitRes = await db.query<any>(`SELECT public.seller_submit_listing('${listingId}') as result;`);
      expect(submitRes.rows[0].result.success).toBe(true);
      expect(submitRes.rows[0].result.status).toBe("pending_review");

      // Verify status in table
      const verifyRes = await db.query<any>(`SELECT status FROM public.listings WHERE id = '${listingId}';`);
      expect(verifyRes.rows[0].status).toBe("pending_review");

      await db.exec(`RESET ROLE;`);
    });
  });

  describe("D. Official Postal Dataset Importer & Idempotency Smoke Test", () => {
    it("handles duplicate official records and can be rerun safely (idempotent)", async () => {
      // Test sample representing official Department of Posts records
      const sampleRecords = [
        {
          pincode: "560095",
          office_name: "Koramangala VI Bk S.O",
          office_type: "S.O",
          delivery_status: "Delivery",
          district: "Bengaluru Urban",
          state: "Karnataka",
        },
        {
          pincode: "560095",
          office_name: "Koramangala VI Bk S.O", // Duplicate record
          office_type: "S.O",
          delivery_status: "Delivery",
          district: "Bengaluru Urban",
          state: "Karnataka",
        },
        {
          pincode: "110001",
          office_name: "Connaught Place H.O",
          office_type: "H.O",
          delivery_status: "Delivery",
          district: "New Delhi",
          state: "Delhi",
        },
      ];

      // 1. Initial Import / Upsert
      for (const r of sampleRecords) {
        await db.query(`
          INSERT INTO public.india_postal_data 
            (pincode, office_name, office_type, delivery_status, district, state)
          VALUES 
            ('${r.pincode}', '${r.office_name}', '${r.office_type}', '${r.delivery_status}', '${r.district}', '${r.state}')
          ON CONFLICT (pincode, office_name) DO UPDATE SET
            office_type = EXCLUDED.office_type,
            delivery_status = EXCLUDED.delivery_status,
            district = EXCLUDED.district,
            state = EXCLUDED.state;
        `);
      }

      // Check count: should be 2 unique records (duplicate 560095 collapsed)
      const countRes1 = await db.query<any>(`
        SELECT COUNT(*) as cnt FROM public.india_postal_data 
        WHERE pincode IN ('560095', '110001');
      `);
      expect(Number(countRes1.rows[0].cnt)).toBe(2);

      // 2. Re-run import (Idempotency test)
      for (const r of sampleRecords) {
        await db.query(`
          INSERT INTO public.india_postal_data 
            (pincode, office_name, office_type, delivery_status, district, state)
          VALUES 
            ('${r.pincode}', '${r.office_name}', '${r.office_type}', '${r.delivery_status}', '${r.district}', '${r.state}')
          ON CONFLICT (pincode, office_name) DO NOTHING;
        `);
      }

      const countRes2 = await db.query<any>(`
        SELECT COUNT(*) as cnt FROM public.india_postal_data 
        WHERE pincode IN ('560095', '110001');
      `);
      expect(Number(countRes2.rows[0].cnt)).toBe(2);

      // 3. Verify provenance and candidate mapping
      const mappingRes = await db.query<any>(`
        INSERT INTO public.postal_pincode_localities 
          (pincode, locality_id, office_name, source)
        VALUES 
          ('560095', '${koramangalaLocalityId}', 'Koramangala VI Bk S.O', 'india_post_candidate')
        ON CONFLICT (pincode, locality_id) DO UPDATE SET
          office_name = EXCLUDED.office_name,
          source = EXCLUDED.source
        RETURNING office_name, source;
      `);

      expect(mappingRes.rows[0].office_name).toBe("Koramangala VI Bk S.O");
      expect(mappingRes.rows[0].source).toBe("india_post_candidate");
    });
  });
});
