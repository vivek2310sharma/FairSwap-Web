// @vitest-environment node
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import fs from "fs";
import path from "path";

describe("Seller Media Database RLS, RPCs & Lifecycle Regression Tests (#103 / Issue #83)", () => {
  let db: PGlite;

  const sellerUserId = "00000000-0000-0000-0000-000000000020";
  const userBId = "00000000-0000-0000-0000-000000000030";
  let testCategoryId: string;
  let testCityId: string;
  let testLocalityId: string;

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

    // 2. Load base migrations 1 through 21, 25 through 32, and new 33
    const migrationsDir = path.join(process.cwd(), "supabase", "migrations");
    const migrationFiles = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith(".sql"))
      .sort();

    for (const file of migrationFiles) {
      // Exclude pg_net / cron extension migrations in PGlite
      if (file.includes("email_outbox") || file.includes("listing_email_notifications")) {
        continue;
      }
      const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
      await db.exec(sql);
    }

    // 3. Seed city, locality, category
    const cityRes = await db.query<any>(`
      INSERT INTO public.cities (name, state, slug, is_active)
      VALUES ('Bengaluru', 'Karnataka', 'bengaluru', true)
      RETURNING id;
    `);
    testCityId = cityRes.rows[0].id;

    const locRes = await db.query<any>(`
      INSERT INTO public.localities (city_id, name, slug, is_active)
      VALUES ($1, 'Indiranagar', 'indiranagar', true)
      RETURNING id;
    `, [testCityId]);
    testLocalityId = locRes.rows[0].id;

    const catRes = await db.query<any>(`SELECT id FROM public.categories LIMIT 1;`);
    testCategoryId = catRes.rows[0].id;

    // Seed test users with required policy acceptance metadata
    const validMeta = JSON.stringify({
      display_name: "Test Seller",
      terms_accepted: "true",
      terms_version: "2026-09-18",
      privacy_policy_version: "2026-09-18",
      acceptable_use_version: "2026-09-18",
      age_confirmed: "true",
    });

    await db.exec(`
      INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
        ('${sellerUserId}', 'seller@example.com', '${validMeta}'::jsonb),
        ('${userBId}', 'buyer@example.com', '${validMeta}'::jsonb)
      ON CONFLICT DO NOTHING;
    `);
  });

  describe("A. Migration 33 listing_media RLS Policy Status Enforcement", () => {
    async function createListingWithStatus(status: string): Promise<string> {
      await db.exec(`SET ROLE postgres;`);
      const res = await db.query<any>(`
        INSERT INTO public.listings (
          seller_id, category_id, city_id, locality_id, title, description,
          condition, price_type, price_paise, pin_code
        ) VALUES (
          '${sellerUserId}', '${testCategoryId}', '${testCityId}', '${testLocalityId}',
          'Test Listing ${status}', 'Valid description for testing status boundaries',
          'good', 'fixed', 50000, '560038'
        ) RETURNING id;
      `);
      const id = res.rows[0].id;

      if (status !== "draft") {
        await db.exec(`
          UPDATE public.listings
          SET status = '${status}'::public.listing_status_enum
          WHERE id = '${id}';
        `);
      }

      return id;
    }

    it("ALLOWS authenticated owner to insert media on draft listing", async () => {
      const listingId = await createListingWithStatus("draft");

      await db.exec(`
        CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS $$ SELECT '${sellerUserId}'::uuid $$ LANGUAGE sql STABLE;
        SET ROLE authenticated;
      `);

      const res = await db.query<any>(`
        INSERT INTO public.listing_media (
          listing_id, original_filename, content_type, file_size_bytes
        ) VALUES (
          '${listingId}', 'photo1.jpg', 'image/jpeg', 102400
        ) RETURNING id;
      `);

      expect(res.rows.length).toBe(1);
    });

    it("ALLOWS authenticated owner to insert media on pending_review listing", async () => {
      const listingId = await createListingWithStatus("pending_review");

      await db.exec(`
        CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS $$ SELECT '${sellerUserId}'::uuid $$ LANGUAGE sql STABLE;
        SET ROLE authenticated;
      `);

      const res = await db.query<any>(`
        INSERT INTO public.listing_media (
          listing_id, original_filename, content_type, file_size_bytes
        ) VALUES (
          '${listingId}', 'photo_review.jpg', 'image/jpeg', 102400
        ) RETURNING id;
      `);

      expect(res.rows.length).toBe(1);
    });

    it("DENIES authenticated owner from inserting media on sold listing (terminal state)", async () => {
      const listingId = await createListingWithStatus("sold");

      await db.exec(`
        CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS $$ SELECT '${sellerUserId}'::uuid $$ LANGUAGE sql STABLE;
        SET ROLE authenticated;
      `);

      let errorThrown = false;
      try {
        await db.query(`
          INSERT INTO public.listing_media (
            listing_id, original_filename, content_type, file_size_bytes
          ) VALUES (
            '${listingId}', 'sold.jpg', 'image/jpeg', 102400
          );
        `);
      } catch {
        errorThrown = true;
      }

      expect(errorThrown).toBe(true);
    });

    it("DENIES authenticated owner from inserting media on expired listing (terminal state)", async () => {
      const listingId = await createListingWithStatus("expired");

      await db.exec(`
        CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS $$ SELECT '${sellerUserId}'::uuid $$ LANGUAGE sql STABLE;
        SET ROLE authenticated;
      `);

      let errorThrown = false;
      try {
        await db.query(`
          INSERT INTO public.listing_media (
            listing_id, original_filename, content_type, file_size_bytes
          ) VALUES (
            '${listingId}', 'expired.jpg', 'image/jpeg', 102400
          );
        `);
      } catch {
        errorThrown = true;
      }

      expect(errorThrown).toBe(true);
    });

    it("DENIES direct authenticated DELETE on listing_media (must use server-mediated RPC)", async () => {
      const listingId = await createListingWithStatus("draft");

      await db.exec(`SET ROLE postgres;`);
      const mediaRes = await db.query<any>(`
        INSERT INTO public.listing_media (
          listing_id, uploader_id, original_filename, content_type, file_size_bytes
        ) VALUES (
          '${listingId}', '${sellerUserId}', 'photo.jpg', 'image/jpeg', 102400
        ) RETURNING id;
      `);
      const mediaId = mediaRes.rows[0].id;

      await db.exec(`
        CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS $$ SELECT '${sellerUserId}'::uuid $$ LANGUAGE sql STABLE;
        SET ROLE authenticated;
      `);

      let deleteError = false;
      try {
        await db.query(`DELETE FROM public.listing_media WHERE id = '${mediaId}';`);
      } catch {
        deleteError = true;
      }

      expect(deleteError).toBe(true);
    });
  });

  describe("B. Transactional Reorder RPC (seller_reorder_listing_media)", () => {
    it("atomically updates display_order for all photos and enforces complete membership", async () => {
      await db.exec(`SET ROLE postgres;`);
      const listingRes = await db.query<any>(`
        INSERT INTO public.listings (
          seller_id, category_id, city_id, locality_id, title, description,
          condition, price_type, price_paise, pin_code
        ) VALUES (
          '${sellerUserId}', '${testCategoryId}', '${testCityId}', '${testLocalityId}',
          'Reorder Test', 'Description for reorder test', 'good', 'fixed', 10000, '560038'
        ) RETURNING id;
      `);
      const listingId = listingRes.rows[0].id;

      const m1Res = await db.query<any>(`
        INSERT INTO public.listing_media (listing_id, uploader_id, original_filename, content_type, file_size_bytes, display_order)
        VALUES ('${listingId}', '${sellerUserId}', 'p1.jpg', 'image/jpeg', 1000, 0) RETURNING id;
      `);
      const m1 = m1Res.rows[0].id;

      const m2Res = await db.query<any>(`
        INSERT INTO public.listing_media (listing_id, uploader_id, original_filename, content_type, file_size_bytes, display_order)
        VALUES ('${listingId}', '${sellerUserId}', 'p2.jpg', 'image/jpeg', 1000, 1) RETURNING id;
      `);
      const m2 = m2Res.rows[0].id;

      await db.exec(`
        UPDATE public.listing_media SET processing_status = 'ready' WHERE listing_id = '${listingId}';
      `);

      await db.exec(`
        CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS $$ SELECT '${sellerUserId}'::uuid $$ LANGUAGE sql STABLE;
        SET ROLE authenticated;
      `);

      // 1. Partial membership should be rejected
      let partialError = false;
      try {
        await db.query(`SELECT public.seller_reorder_listing_media('${listingId}', ARRAY['${m1}']::uuid[]);`);
      } catch {
        partialError = true;
      }
      expect(partialError).toBe(true);

      // 2. Duplicate ID should be rejected
      let duplicateError = false;
      try {
        await db.query(`SELECT public.seller_reorder_listing_media('${listingId}', ARRAY['${m1}', '${m1}']::uuid[]);`);
      } catch {
        duplicateError = true;
      }
      expect(duplicateError).toBe(true);

      // 3. Valid complete reorder: reverse order [m2, m1]
      const reorderRes = await db.query<any>(`
        SELECT public.seller_reorder_listing_media('${listingId}', ARRAY['${m2}', '${m1}']::uuid[]) as result;
      `);
      expect(reorderRes.rows[0].result.success).toBe(true);
      expect(reorderRes.rows[0].result.count).toBe(2);

      // Check display_order
      const rows = (await db.query<any>(`
        SELECT id, display_order FROM public.listing_media WHERE listing_id = '${listingId}' ORDER BY display_order ASC;
      `)).rows;

      expect(rows[0].id).toBe(m2);
      expect(rows[0].display_order).toBe(0);
      expect(rows[1].id).toBe(m1);
      expect(rows[1].display_order).toBe(1);
    });

    it("triggers re-review (active -> pending_review) once, and no extra transitions when already pending_review", async () => {
      await db.exec(`SET ROLE postgres;`);
      const listingRes = await db.query<any>(`
        INSERT INTO public.listings (
          seller_id, category_id, city_id, locality_id, title, description,
          condition, price_type, price_paise, pin_code, revision
        ) VALUES (
          '${sellerUserId}', '${testCategoryId}', '${testCityId}', '${testLocalityId}',
          'Active Reorder Listing', 'Valid description for active reorder test',
          'good', 'fixed', 20000, '560038', 1
        ) RETURNING id;
      `);
      const listingId = listingRes.rows[0].id;

      // Insert media first while draft
      const m1Res = await db.query<any>(`
        INSERT INTO public.listing_media (listing_id, uploader_id, original_filename, content_type, file_size_bytes, display_order)
        VALUES ('${listingId}', '${sellerUserId}', 'p1.jpg', 'image/jpeg', 1000, 0) RETURNING id;
      `);
      const m1 = m1Res.rows[0].id;

      const m2Res = await db.query<any>(`
        INSERT INTO public.listing_media (listing_id, uploader_id, original_filename, content_type, file_size_bytes, display_order)
        VALUES ('${listingId}', '${sellerUserId}', 'p2.jpg', 'image/jpeg', 1000, 1) RETURNING id;
      `);
      const m2 = m2Res.rows[0].id;

      await db.exec(`
        UPDATE public.listing_media SET processing_status = 'ready' WHERE listing_id = '${listingId}';
      `);

      // Now set listing to active
      await db.exec(`
        UPDATE public.listings
        SET status = 'active'::public.listing_status_enum,
            published_at = now()
        WHERE id = '${listingId}';
      `);

      await db.exec(`
        CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS $$ SELECT '${sellerUserId}'::uuid $$ LANGUAGE sql STABLE;
        SET ROLE authenticated;
      `);

      // Count status transitions before
      const countBefore = (await db.query<any>(`
        SELECT count(*) FROM public.listing_status_transitions WHERE listing_id = '${listingId}';
      `)).rows[0].count;

      // First reorder: on active listing -> moves to pending_review
      await db.query(`SELECT public.seller_reorder_listing_media('${listingId}', ARRAY['${m2}', '${m1}']::uuid[]);`);

      const listingAfter1 = (await db.query<any>(`
        SELECT status, revision FROM public.listings WHERE id = '${listingId}';
      `)).rows[0];

      expect(listingAfter1.status).toBe("pending_review");
      expect(listingAfter1.revision).toBe(2);

      const countAfter1 = (await db.query<any>(`
        SELECT count(*) FROM public.listing_status_transitions WHERE listing_id = '${listingId}';
      `)).rows[0].count;

      expect(parseInt(countAfter1) - parseInt(countBefore)).toBe(1);

      // Second reorder: already pending_review -> must NOT fabricate an additional transition
      await db.query(`SELECT public.seller_reorder_listing_media('${listingId}', ARRAY['${m1}', '${m2}']::uuid[]);`);

      const listingAfter2 = (await db.query<any>(`
        SELECT status, revision FROM public.listings WHERE id = '${listingId}';
      `)).rows[0];

      expect(listingAfter2.status).toBe("pending_review");
      expect(listingAfter2.revision).toBe(2); // Revision not artificially incremented again

      const countAfter2 = (await db.query<any>(`
        SELECT count(*) FROM public.listing_status_transitions WHERE listing_id = '${listingId}';
      `)).rows[0].count;

      // Exact same count: no extra transition created!
      expect(countAfter2).toBe(countAfter1);
    });
  });

  describe("C. Transactional Cover RPC (seller_set_listing_cover_photo)", () => {
    it("sets cover photo cleanly when listing is pending_review without failing direct RLS updates", async () => {
      await db.exec(`SET ROLE postgres;`);
      const listingRes = await db.query<any>(`
        INSERT INTO public.listings (
          seller_id, category_id, city_id, locality_id, title, description,
          condition, price_type, price_paise, pin_code, revision
        ) VALUES (
          '${sellerUserId}', '${testCategoryId}', '${testCityId}', '${testLocalityId}',
          'Cover Test Listing', 'Valid description for cover test',
          'good', 'fixed', 30000, '560038', 2
        ) RETURNING id;
      `);
      const listingId = listingRes.rows[0].id;

      await db.exec(`
        UPDATE public.listings
        SET status = 'pending_review'::public.listing_status_enum
        WHERE id = '${listingId}';
      `);

      await db.query<any>(`
        INSERT INTO public.listing_media (listing_id, uploader_id, original_filename, content_type, file_size_bytes, display_order)
        VALUES ('${listingId}', '${sellerUserId}', 'c1.jpg', 'image/jpeg', 1000, 0) RETURNING id;
      `);

      const m2Res = await db.query<any>(`
        INSERT INTO public.listing_media (listing_id, uploader_id, original_filename, content_type, file_size_bytes, display_order)
        VALUES ('${listingId}', '${sellerUserId}', 'c2.jpg', 'image/jpeg', 1000, 1) RETURNING id;
      `);
      const m2 = m2Res.rows[0].id;

      await db.exec(`
        UPDATE public.listing_media SET processing_status = 'ready' WHERE listing_id = '${listingId}';
      `);

      await db.exec(`
        CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS $$ SELECT '${sellerUserId}'::uuid $$ LANGUAGE sql STABLE;
        SET ROLE authenticated;
      `);

      const countBefore = (await db.query<any>(`
        SELECT count(*) FROM public.listing_status_transitions WHERE listing_id = '${listingId}';
      `)).rows[0].count;

      const coverRes = await db.query<any>(`
        SELECT public.seller_set_listing_cover_photo('${listingId}', '${m2}') as result;
      `);

      expect(coverRes.rows[0].result.success).toBe(true);
      expect(coverRes.rows[0].result.cover_photo_id).toBe(m2);

      const listing = (await db.query<any>(`SELECT cover_photo_id, status FROM public.listings WHERE id = '${listingId}';`)).rows[0];
      expect(listing.cover_photo_id).toBe(m2);
      expect(listing.status).toBe("pending_review");

      // No artificial transition created since already pending_review
      const countAfter = (await db.query<any>(`
        SELECT count(*) FROM public.listing_status_transitions WHERE listing_id = '${listingId}';
      `)).rows[0].count;
      expect(countAfter).toBe(countBefore);
    });

    it("rejects non-ready media from being set as cover photo", async () => {
      await db.exec(`SET ROLE postgres;`);
      const listingRes = await db.query<any>(`
        INSERT INTO public.listings (
          seller_id, category_id, city_id, locality_id, title, description,
          condition, price_type, price_paise, pin_code
        ) VALUES (
          '${sellerUserId}', '${testCategoryId}', '${testCityId}', '${testLocalityId}',
          'Unready Cover Test', 'Description', 'good', 'fixed', 30000, '560038'
        ) RETURNING id;
      `);
      const listingId = listingRes.rows[0].id;

      const unreadyMedia = await db.query<any>(`
        INSERT INTO public.listing_media (listing_id, uploader_id, original_filename, content_type, file_size_bytes, display_order)
        VALUES ('${listingId}', '${sellerUserId}', 'unready.jpg', 'image/jpeg', 1000, 0) RETURNING id;
      `);

      await db.exec(`
        CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS $$ SELECT '${sellerUserId}'::uuid $$ LANGUAGE sql STABLE;
        SET ROLE authenticated;
      `);

      let errorThrown = false;
      try {
        await db.query(`SELECT public.seller_set_listing_cover_photo('${listingId}', '${unreadyMedia}');`);
      } catch {
        errorThrown = true;
      }
      expect(errorThrown).toBe(true);
    });
  });
});
