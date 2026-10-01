// @vitest-environment node
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import fs from "fs";
import path from "path";
import { computeSourceRecordKey } from "../../scripts/import-india-postal-data";

describe("India Location & Postal Database RLS & Security Tests (#81)", () => {
  let db: PGlite;

  const sellerUserId = "00000000-0000-0000-0000-000000000020";
  const userAId = "00000000-0000-0000-0000-000000000030";
  let bengaluruCityId: string;
  let jaipurCityId: string;
  let koramangalaLocalityId: string;
  let malviyaNagarLocalityId: string;
  let testCategoryId: string;
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
        ('Bengaluru', 'Karnataka', 'bengaluru', true)
      RETURNING id, name;
    `);
    bengaluruCityId = cityRes.rows[0].id;

    const jaipurQuery = await db.query<any>(`SELECT id FROM public.cities WHERE name = 'Jaipur' AND state = 'Rajasthan' LIMIT 1;`);
    jaipurCityId = jaipurQuery.rows[0].id;

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
        (pincode, office_name, office_type, delivery_status, district, state, source)
      VALUES 
        ('560034', 'Koramangala I Block S.O', 'S.O', 'Delivery', 'Bengaluru Urban', 'Karnataka', 'data.gov.in'),
        ('560034', 'Agara S.O', 'S.O', 'Non-Delivery', 'Bengaluru Urban', 'Karnataka', 'data.gov.in'),
        ('302017', 'Malviya Nagar S.O', 'S.O', 'Delivery', 'Jaipur', 'Rajasthan', 'data.gov.in');

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
      expect(data.city).toBe("Bengaluru Urban"); // legacy alias reflects district
      expect(data.postal_offices).toHaveLength(2);
      expect(data.localities).toHaveLength(1);
      expect(data.localities[0].id).toBe(koramangalaLocalityId);
      expect(data.localities[0].name).toBe("Koramangala");
      expect(data.localities[0].city_id).toBe(bengaluruCityId);
      expect(data.localities[0].district).toBe("Bengaluru");
    });

    it("ensures Taluk is never promoted to city and remains raw postal metadata only", async () => {
      await db.exec(`
        INSERT INTO public.india_postal_data 
          (pincode, office_name, office_type, delivery_status, taluk, district, state, source)
        VALUES 
          ('560099', 'Electronic City S.O', 'S.O', 'Delivery', 'Anekal', 'Bangalore Rural', 'Karnataka', 'data.gov.in');
      `);

      const res = await db.query<any>(`SELECT public.lookup_pincode('560099') as result;`);
      const data = res.rows[0].result;

      expect(data.success).toBe(true);
      expect(data.district).toBe("Bangalore Rural");
      expect(data.city).toBe("Bangalore Rural"); // legacy alias is district, NOT taluk ('Anekal')
      expect(data.postal_offices[0].taluk).toBe("Anekal");
    });

    it("supports multi-district PIN codes within the same state and returns district choices", async () => {
      // Seed records with differing districts under the same PIN code and same state
      await db.exec(`
        INSERT INTO public.india_postal_data 
          (pincode, office_name, office_type, delivery_status, district, state, source)
        VALUES 
          ('990001', 'Border Post Office A', 'S.O', 'Delivery', 'District One', 'State One', 'data.gov.in'),
          ('990001', 'Border Post Office B', 'S.O', 'Delivery', 'District Two', 'State One', 'data.gov.in');
      `);

      const res = await db.query<any>(`SELECT public.lookup_pincode('990001') as result;`);
      const data = res.rows[0].result;

      expect(data.success).toBe(true);
      expect(data.pincode).toBe("990001");
      expect(data.state).toBe("State One");
      expect(data.district).toBeNull();
      expect(data.city).toBeNull();
      expect(data.city_id).toBeNull();
      expect(data.districts).toHaveLength(2);
      expect(data.districts.map((d: any) => d.name)).toEqual(["District One", "District Two"]);
    });

    it("explicitly rejects cross-state PIN codes with CONFLICTING_POSTAL_STATES", async () => {
      // Seed records with differing states under the same PIN code
      await db.exec(`
        INSERT INTO public.india_postal_data 
          (pincode, office_name, office_type, delivery_status, district, state, source)
        VALUES 
          ('990002', 'Interstate Office A', 'S.O', 'Delivery', 'District A', 'State Alpha', 'data.gov.in'),
          ('990002', 'Interstate Office B', 'S.O', 'Delivery', 'District B', 'State Beta', 'data.gov.in');
      `);

      const res = await db.query<any>(`SELECT public.lookup_pincode('990002') as result;`);
      const data = res.rows[0].result;

      expect(data.success).toBe(false);
      expect(data.error).toBe("CONFLICTING_POSTAL_STATES");
      expect(data.message).toMatch(/multiple states/i);
    });

    it("handles sentinel NA values: returns PINCODE_ADMIN_DATA_UNAVAILABLE when PIN only has NA admin metadata", async () => {
      await db.exec(`
        INSERT INTO public.india_postal_data 
          (pincode, office_name, office_type, delivery_status, district, state, source)
        VALUES 
          ('990003', 'NA Post Office', 'S.O', 'Delivery', 'NA', 'NA', 'data.gov.in');
      `);

      const res = await db.query<any>(`SELECT public.lookup_pincode('990003') as result;`);
      const data = res.rows[0].result;

      expect(data.success).toBe(false);
      expect(data.error).toBe("PINCODE_ADMIN_DATA_UNAVAILABLE");
      expect(data.message).toBe("We recognize this PIN code, but its location details are currently unavailable");
    });

    it("resolves valid admin data when PIN has both valid and NA rows (ignoring NA sentinel)", async () => {
      await db.exec(`
        INSERT INTO public.india_postal_data 
          (pincode, office_name, office_type, delivery_status, district, state, source)
        VALUES 
          ('990004', 'Valid Office', 'S.O', 'Delivery', 'Kolar', 'Karnataka', 'data.gov.in'),
          ('990004', 'Incomplete Office', 'S.O', 'Delivery', 'NA', 'NA', 'data.gov.in');
      `);

      const res = await db.query<any>(`SELECT public.lookup_pincode('990004') as result;`);
      const data = res.rows[0].result;

      expect(data.success).toBe(true);
      expect(data.state).toBe("Karnataka");
      expect(data.district).toBe("Kolar");
      expect(data.districts).toHaveLength(1);
      expect(data.districts[0].name).toBe("Kolar");
      // NA values should not appear in districts
      expect(data.districts.map((d: any) => d.name.toLowerCase())).not.toContain("na");
    });

    it("does not trigger CONFLICTING_POSTAL_STATES when PIN has 1 real state plus NA sentinel rows", async () => {
      await db.exec(`
        INSERT INTO public.india_postal_data 
          (pincode, office_name, office_type, delivery_status, district, state, source)
        VALUES 
          ('990005', 'Real State Office', 'S.O', 'Delivery', 'Mysuru', 'Karnataka', 'data.gov.in'),
          ('990005', 'NA State Office', 'S.O', 'Delivery', 'NA', 'NA', 'data.gov.in');
      `);

      const res = await db.query<any>(`SELECT public.lookup_pincode('990005') as result;`);
      const data = res.rows[0].result;

      expect(data.success).toBe(true);
      expect(data.state).toBe("Karnataka");
      expect(data.district).toBe("Mysuru");
    });

    it("resolves compatibility city_id strictly using both district name AND state", async () => {
      // Create city row for 'Jaipur', 'Rajasthan'
      const res = await db.query<any>(`SELECT public.lookup_pincode('302017') as result;`);
      const data = res.rows[0].result;

      expect(data.success).toBe(true);
      expect(data.district).toBe("Jaipur");
      expect(data.state).toBe("Rajasthan");
      expect(data.city_id).toBe(jaipurCityId); // Matched because name = 'Jaipur' AND state = 'Rajasthan'
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
          office_name: "Koramangala VI Bk S.O", // Exact canonical duplicate record
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

      // 1. Initial Import / Upsert using (source, source_record_key)
      for (const r of sampleRecords) {
        await db.query(`
          INSERT INTO public.india_postal_data 
            (pincode, office_name, office_type, delivery_status, district, state, source)
          VALUES 
            ('${r.pincode}', '${r.office_name}', '${r.office_type}', '${r.delivery_status}', '${r.district}', '${r.state}', 'data.gov.in')
          ON CONFLICT (source, source_record_key) DO UPDATE SET
            office_type = EXCLUDED.office_type,
            delivery_status = EXCLUDED.delivery_status,
            district = EXCLUDED.district,
            state = EXCLUDED.state;
        `);
      }

      // Check count: should be 2 unique records (exact duplicate 560095 collapsed)
      const countRes1 = await db.query<any>(`
        SELECT COUNT(*) as cnt FROM public.india_postal_data 
        WHERE pincode IN ('560095', '110001');
      `);
      expect(Number(countRes1.rows[0].cnt)).toBe(2);

      // 2. Re-run import (Idempotency test)
      for (const r of sampleRecords) {
        await db.query(`
          INSERT INTO public.india_postal_data 
            (pincode, office_name, office_type, delivery_status, district, state, source)
          VALUES 
            ('${r.pincode}', '${r.office_name}', '${r.office_type}', '${r.delivery_status}', '${r.district}', '${r.state}', 'data.gov.in')
          ON CONFLICT (source, source_record_key) DO NOTHING;
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

    it("preserves duplicate PIN + office_name records when their stored metadata differs", async () => {
      // Official dataset contains groups with same pincode and office name but differing districts/divisions
      await db.exec(`
        INSERT INTO public.india_postal_data 
          (pincode, office_name, office_type, delivery_status, district, state, source)
        VALUES 
          ('990099', 'Shared Office Name', 'B.O', 'Delivery', 'District Alpha', 'State Alpha', 'data.gov.in'),
          ('990099', 'Shared Office Name', 'B.O', 'Delivery', 'District Beta', 'State Alpha', 'data.gov.in')
        ON CONFLICT (source, source_record_key) DO NOTHING;
      `);

      const res = await db.query<any>(`
        SELECT district FROM public.india_postal_data 
        WHERE pincode = '990099' AND office_name = 'Shared Office Name'
        ORDER BY district ASC;
      `);

      expect(res.rows).toHaveLength(2);
      expect(res.rows[0].district).toBe("District Alpha");
      expect(res.rows[1].district).toBe("District Beta");
    });

    it("automatically recomputes source_record_key on update to canonical fields and overwrites caller-provided stale keys", async () => {
      // 1. Insert record with a caller-provided bogus key
      const insertRes = await db.query<any>(`
        INSERT INTO public.india_postal_data 
          (pincode, office_name, office_type, delivery_status, division, region, circle, taluk, district, state, source_record_key, source)
        VALUES 
          ('560001', 'Bangalore GPO', 'G.P.O.', 'Delivery', 'Bangalore Division', 'Bangalore HQ', 'Karnataka Circle', 'Bangalore North', 'Bengaluru Urban', 'Karnataka', 'stale_key_111', 'data.gov.in')
        RETURNING id, source_record_key;
      `);

      const rowId = insertRes.rows[0].id;
      const initialKey = insertRes.rows[0].source_record_key;

      // Trigger must overwrite caller-provided key with deterministic hash on insert
      expect(initialKey).not.toBe("stale_key_111");
      expect(initialKey).toMatch(/^[a-f0-9]{32}$/);

      // 2. Update canonical field (district) and attempt to inject another stale key
      const updateRes = await db.query<any>(`
        UPDATE public.india_postal_data
        SET district = 'Bengaluru Rural',
            source_record_key = 'stale_key_222'
        WHERE id = $1
        RETURNING source_record_key, district;
      `, [rowId]);

      const updatedKey = updateRes.rows[0].source_record_key;
      expect(updatedKey).not.toBe("stale_key_222");
      expect(updatedKey).not.toBe(initialKey);
      expect(updatedKey).toMatch(/^[a-f0-9]{32}$/);

      // 3. Verify updating office_name alters the key automatically
      const updateOfficeRes = await db.query<any>(`
        UPDATE public.india_postal_data
        SET office_name = 'Bangalore Head Post Office'
        WHERE id = $1
        RETURNING source_record_key;
      `, [rowId]);

      expect(updateOfficeRes.rows[0].source_record_key).not.toBe(updatedKey);
    });

    it("asserts SQL trigger and TypeScript computeSourceRecordKey canonicalization are 100% identical", async () => {
      // Test fixture with mixed case, leading/trailing spaces, multiple internal spaces, and null optional fields
      const fixture = {
        pincode: "560034",
        office_name: "  Koramangala   VI   Bk   S.O  ",
        office_type: "  S.O  ",
        delivery_status: "  Delivery  ",
        division: "  Bangalore   South   Division  ",
        region: null,
        circle: "  Karnataka   Circle  ",
        taluk: null,
        district: "  BENGALURU   URBAN  ",
        state: "  karnataka  ",
      };

      const tsKey = computeSourceRecordKey({
        pincode: fixture.pincode,
        office_name: fixture.office_name,
        office_type: fixture.office_type,
        delivery_status: fixture.delivery_status,
        division: fixture.division,
        region: fixture.region,
        circle: fixture.circle,
        taluk: fixture.taluk,
        district: fixture.district,
        state: fixture.state,
      });

      const sqlRes = await db.query<any>(`
        INSERT INTO public.india_postal_data 
          (source, pincode, office_name, office_type, delivery_status, division, region, circle, taluk, district, state)
        VALUES 
          ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING source_record_key;
      `, [
        'data.gov.in',
        fixture.pincode,
        fixture.office_name,
        fixture.office_type,
        fixture.delivery_status,
        fixture.division,
        fixture.region,
        fixture.circle,
        fixture.taluk,
        fixture.district,
        fixture.state,
      ]);

      const sqlKey = sqlRes.rows[0].source_record_key;
      expect(sqlKey).toBe(tsKey);
    });
  });

  describe("G. Release-Blocking Public Location Privacy Hardening (#81)", () => {
    beforeAll(async () => {
      // Create user A in auth.users
      const validMeta = JSON.stringify({
        display_name: "Test User A",
        terms_accepted: "true",
        terms_version: "2026-09-18",
        privacy_policy_version: "2026-09-18",
        acceptable_use_version: "2026-09-18",
        age_confirmed: "true",
      });
      await db.exec(`
        INSERT INTO auth.users (id, email, raw_user_meta_data)
        VALUES ('${userAId}', 'user_a@fairswap.test', '${validMeta}'::jsonb)
        ON CONFLICT (id) DO NOTHING;
      `);

      // Create an active listing owned by sellerUserId (user B)
      const listingRes = await db.query<any>(`
        INSERT INTO public.listings (
          seller_id, category_id, city_id, locality_id, title, description, condition, price_type, price_paise, pin_code, landmark, category_attributes, status, published_at
        ) VALUES (
          '${sellerUserId}', '${testCategoryId}', '${bengaluruCityId}', '${koramangalaLocalityId}',
          'Privacy Test Active Listing', 'Publicly searchable description',
          'good', 'fixed', 500000, '560034', 'Near Forum Mall', '{}'::jsonb, 'active', clock_timestamp()
        ) RETURNING id;
      `);
      activeListingId = listingRes.rows[0].id;

      // Add media and mark processing_status = 'ready'
      const mediaRes = await db.query<any>(`
        INSERT INTO public.listing_media (listing_id, uploader_id, original_filename, content_type, file_size_bytes, thumbnail_storage_path)
        VALUES ('${activeListingId}', '${sellerUserId}', 'thumb.webp', 'image/webp', 5000, 'thumb.webp')
        RETURNING id;
      `);
      const mediaId = mediaRes.rows[0].id;

      await db.query(`
        UPDATE public.listing_media
        SET processing_status = 'ready'
        WHERE id = '${mediaId}';
      `);

      // Update listing to active status with cover photo and published timestamp
      await db.query(`
        UPDATE public.listings
        SET status = 'active',
            cover_photo_id = '${mediaId}',
            published_at = clock_timestamp()
        WHERE id = '${activeListingId}';
      `);
    });

    it("DENIES anon active-listing pin_code direct read", async () => {
      await db.exec(`SET ROLE anon;`);
      let errorThrown = false;
      try {
        await db.query(`SELECT pin_code FROM public.listings WHERE id = '${activeListingId}';`);
      } catch (err: any) {
        errorThrown = true;
        expect(err.message).toMatch(/permission denied/i);
      } finally {
        await db.exec(`RESET ROLE;`);
      }
      expect(errorThrown).toBe(true);
    });

    it("DENIES anon active-listing landmark direct read", async () => {
      await db.exec(`SET ROLE anon;`);
      let errorThrown = false;
      try {
        await db.query(`SELECT landmark FROM public.listings WHERE id = '${activeListingId}';`);
      } catch (err: any) {
        errorThrown = true;
        expect(err.message).toMatch(/permission denied/i);
      } finally {
        await db.exec(`RESET ROLE;`);
      }
      expect(errorThrown).toBe(true);
    });

    it("DENIES authenticated user A from reading pin_code of listing owned by user B", async () => {
      await db.exec(`
        CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS $$ SELECT '${userAId}'::uuid $$ LANGUAGE sql STABLE;
        SET ROLE authenticated;
      `);
      let errorThrown = false;
      try {
        await db.query(`SELECT pin_code FROM public.listings WHERE id = '${activeListingId}';`);
      } catch (err: any) {
        errorThrown = true;
        expect(err.message).toMatch(/permission denied/i);
      } finally {
        await db.exec(`RESET ROLE;`);
      }
      expect(errorThrown).toBe(true);
    });

    it("DENIES authenticated user A from reading landmark of listing owned by user B", async () => {
      await db.exec(`
        CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS $$ SELECT '${userAId}'::uuid $$ LANGUAGE sql STABLE;
        SET ROLE authenticated;
      `);
      let errorThrown = false;
      try {
        await db.query(`SELECT landmark FROM public.listings WHERE id = '${activeListingId}';`);
      } catch (err: any) {
        errorThrown = true;
        expect(err.message).toMatch(/permission denied/i);
      } finally {
        await db.exec(`RESET ROLE;`);
      }
      expect(errorThrown).toBe(true);
    });

    it("PREVENTS authenticated user A from obtaining user B's location via get_seller_listing_location_private", async () => {
      await db.exec(`
        CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS $$ SELECT '${userAId}'::uuid $$ LANGUAGE sql STABLE;
        SET ROLE authenticated;
      `);
      const privRes = await db.query<any>(`
        SELECT * FROM public.get_seller_listing_location_private('${activeListingId}');
      `);
      await db.exec(`RESET ROLE;`);
      expect(privRes.rows.length).toBe(0);
    });

    it("ALLOWS seller owner to read own listing pin_code and landmark through intended private path", async () => {
      await db.exec(`
        CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS $$ SELECT '${sellerUserId}'::uuid $$ LANGUAGE sql STABLE;
        SET ROLE authenticated;
      `);
      const privRes = await db.query<any>(`
        SELECT * FROM public.get_seller_listing_location_private('${activeListingId}');
      `);
      await db.exec(`RESET ROLE;`);
      expect(privRes.rows.length).toBe(1);
      expect(privRes.rows[0].pin_code).toBe("560034");
      expect(privRes.rows[0].landmark).toBe("Near Forum Mall");
    });

    it("ensures search_public_listings JSON payload contains NO pin_code or landmark keys", async () => {
      const searchRes = await db.query<any>(`SELECT public.search_public_listings() as result;`);
      const items = searchRes.rows[0].result.items;
      expect(items.length).toBeGreaterThan(0);
      for (const item of items) {
        expect(item).not.toHaveProperty("pin_code");
        expect(item).not.toHaveProperty("landmark");
      }
    });

    it("ensures public listing media still loads for active listings", async () => {
      await db.exec(`SET ROLE anon;`);
      const mediaRes = await db.query<any>(`
        SELECT id, thumbnail_storage_path FROM public.listing_media WHERE listing_id = '${activeListingId}';
      `);
      await db.exec(`RESET ROLE;`);
      expect(mediaRes.rows.length).toBeGreaterThan(0);
    });

    it("ensures authenticated users can still browse public listings", async () => {
      await db.exec(`
        CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS $$ SELECT '${userAId}'::uuid $$ LANGUAGE sql STABLE;
        SET ROLE authenticated;
      `);
      const browseRes = await db.query<any>(`
        SELECT id, title, locality_id FROM public.listings WHERE status = 'active';
      `);
      await db.exec(`RESET ROLE;`);
      expect(browseRes.rows.length).toBeGreaterThan(0);
    });
  });

  describe("H. Staff-Private Listing Location RPC Access Control (#81)", () => {
    const modUserAal1Id = "00000000-0000-0000-0000-000000000041";
    const modUserSuspendedId = "00000000-0000-0000-0000-000000000042";
    const modUserActiveId = "00000000-0000-0000-0000-000000000043";
    const adminUserActiveId = "00000000-0000-0000-0000-000000000044";

    beforeAll(async () => {
      const validMeta = JSON.stringify({
        display_name: "Staff Test User",
        terms_accepted: "true",
        terms_version: "2026-09-18",
        privacy_policy_version: "2026-09-18",
        acceptable_use_version: "2026-09-18",
        age_confirmed: "true",
      });

      await db.exec(`
        INSERT INTO auth.users (id, email, raw_user_meta_data)
        VALUES 
          ('${modUserAal1Id}', 'mod_aal1@fairswap.test', '${validMeta}'::jsonb),
          ('${modUserSuspendedId}', 'mod_suspended@fairswap.test', '${validMeta}'::jsonb),
          ('${modUserActiveId}', 'mod_active@fairswap.test', '${validMeta}'::jsonb),
          ('${adminUserActiveId}', 'admin_active@fairswap.test', '${validMeta}'::jsonb)
        ON CONFLICT (id) DO NOTHING;

        INSERT INTO public.staff_roles (user_id, role)
        VALUES 
          ('${modUserAal1Id}', 'moderator'),
          ('${modUserSuspendedId}', 'moderator'),
          ('${modUserActiveId}', 'moderator'),
          ('${adminUserActiveId}', 'administrator')
        ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;

        UPDATE public.user_accounts
        SET account_status = 'suspended'
        WHERE user_id = '${modUserSuspendedId}';

        UPDATE public.user_accounts
        SET account_status = 'active'
        WHERE user_id IN ('${modUserAal1Id}', '${modUserActiveId}', '${adminUserActiveId}');
      `);
    });

    it("DENIES normal authenticated user without staff role from calling get_staff_listing_location_private", async () => {
      await db.exec(`
        CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS $$ SELECT '${userAId}'::uuid $$ LANGUAGE sql STABLE;
        CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb AS $$ SELECT '{"aal": "aal2"}'::jsonb $$ LANGUAGE sql STABLE;
        SET ROLE authenticated;
      `);
      let errorThrown = false;
      let errorMsg = "";
      try {
        await db.query(`SELECT * FROM public.get_staff_listing_location_private('${activeListingId}');`);
      } catch (err: any) {
        errorThrown = true;
        errorMsg = err.message;
      } finally {
        await db.exec(`RESET ROLE;`);
      }
      expect(errorThrown).toBe(true);
      expect(errorMsg).toMatch(/FORBIDDEN/i);
    });

    it("DENIES moderator at AAL1 from calling get_staff_listing_location_private", async () => {
      await db.exec(`
        CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS $$ SELECT '${modUserAal1Id}'::uuid $$ LANGUAGE sql STABLE;
        CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb AS $$ SELECT '{"aal": "aal1"}'::jsonb $$ LANGUAGE sql STABLE;
        SET ROLE authenticated;
      `);
      let errorThrown = false;
      let errorMsg = "";
      try {
        await db.query(`SELECT * FROM public.get_staff_listing_location_private('${activeListingId}');`);
      } catch (err: any) {
        errorThrown = true;
        errorMsg = err.message;
      } finally {
        await db.exec(`RESET ROLE;`);
      }
      expect(errorThrown).toBe(true);
      expect(errorMsg).toMatch(/FORBIDDEN/i);
    });

    it("DENIES moderator at AAL2 with non-active account_status from calling get_staff_listing_location_private", async () => {
      await db.exec(`
        CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS $$ SELECT '${modUserSuspendedId}'::uuid $$ LANGUAGE sql STABLE;
        CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb AS $$ SELECT '{"aal": "aal2"}'::jsonb $$ LANGUAGE sql STABLE;
        SET ROLE authenticated;
      `);
      let errorThrown = false;
      let errorMsg = "";
      try {
        await db.query(`SELECT * FROM public.get_staff_listing_location_private('${activeListingId}');`);
      } catch (err: any) {
        errorThrown = true;
        errorMsg = err.message;
      } finally {
        await db.exec(`RESET ROLE;`);
      }
      expect(errorThrown).toBe(true);
      expect(errorMsg).toMatch(/FORBIDDEN/i);
    });

    it("ALLOWS active moderator at AAL2 to call get_staff_listing_location_private and returns exact fields", async () => {
      await db.exec(`
        CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS $$ SELECT '${modUserActiveId}'::uuid $$ LANGUAGE sql STABLE;
        CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb AS $$ SELECT '{"aal": "aal2"}'::jsonb $$ LANGUAGE sql STABLE;
        SET ROLE authenticated;
      `);
      const res = await db.query<any>(`
        SELECT * FROM public.get_staff_listing_location_private('${activeListingId}');
      `);
      await db.exec(`RESET ROLE;`);

      expect(res.rows.length).toBe(1);
      const row = res.rows[0];
      const keys = Object.keys(row).sort();
      expect(keys).toEqual(["landmark", "listing_id", "pin_code"]);
      expect(row.listing_id).toBe(activeListingId);
      expect(row.pin_code).toBe("560034");
      expect(row.landmark).toBe("Near Forum Mall");
    });

    it("ALLOWS active administrator at AAL2 to call get_staff_listing_location_private", async () => {
      await db.exec(`
        CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS $$ SELECT '${adminUserActiveId}'::uuid $$ LANGUAGE sql STABLE;
        CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb AS $$ SELECT '{"aal": "aal2"}'::jsonb $$ LANGUAGE sql STABLE;
        SET ROLE authenticated;
      `);
      const res = await db.query<any>(`
        SELECT * FROM public.get_staff_listing_location_private('${activeListingId}');
      `);
      await db.exec(`RESET ROLE;`);

      expect(res.rows.length).toBe(1);
      const row = res.rows[0];
      const keys = Object.keys(row).sort();
      expect(keys).toEqual(["landmark", "listing_id", "pin_code"]);
      expect(row.listing_id).toBe(activeListingId);
      expect(row.pin_code).toBe("560034");
      expect(row.landmark).toBe("Near Forum Mall");
    });

    it("DENIES anon role from calling get_staff_listing_location_private directly", async () => {
      await db.exec(`
        CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS $$ SELECT null::uuid $$ LANGUAGE sql STABLE;
        CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb AS $$ SELECT '{}'::jsonb $$ LANGUAGE sql STABLE;
        SET ROLE anon;
      `);
      let errorThrown = false;
      let errorMsg = "";
      try {
        await db.query(`SELECT * FROM public.get_staff_listing_location_private('${activeListingId}');`);
      } catch (err: any) {
        errorThrown = true;
        errorMsg = err.message;
      } finally {
        await db.exec(`RESET ROLE;`);
      }
      expect(errorThrown).toBe(true);
      expect(errorMsg).toMatch(/permission denied/i);
    });

    it("ALLOWS authorized staff at AAL2 to read base listing columns via listings RLS staff branch", async () => {
      await db.exec(`
        CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS $$ SELECT '${modUserActiveId}'::uuid $$ LANGUAGE sql STABLE;
        CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb AS $$ SELECT '{"aal": "aal2"}'::jsonb $$ LANGUAGE sql STABLE;
        SET ROLE authenticated;
      `);
      const res = await db.query<any>(`
        SELECT id, title, status FROM public.listings WHERE id = '${activeListingId}';
      `);
      await db.exec(`RESET ROLE;`);

      expect(res.rows.length).toBe(1);
      expect(res.rows[0].id).toBe(activeListingId);
    });
  });
});
