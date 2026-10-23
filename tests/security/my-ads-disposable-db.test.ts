import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { expect, it } from 'vitest';
import type { Database } from '@/types/database';
import { fetchMyListingCounts } from '@/lib/listings/my-ads';
import { validateLocalTestEnvironment } from '../helpers/local-test-guard';

const enabled = process.env.ADS01_RUN_DISPOSABLE_DB_TESTS === 'true';

it.skipIf(!enabled)('isolates actual ADS-01 row and exact-count paths between two disposable owners', async () => {
  // Only the disposable GitHub runner stack may create these synthetic fixtures.
  if (process.env.GITHUB_ACTIONS !== 'true' || process.env.CI !== 'true') {
    throw new Error('ADS-01 DB acceptance requires an identified disposable GitHub runner');
  }
  const { supabaseUrl } = validateLocalTestEnvironment();
  if (supabaseUrl !== 'http://127.0.0.1:54321') throw new Error('Unexpected disposable API target');
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!anonKey || !serviceKey) throw new Error('Disposable stack credentials are required');
  const options = { auth: { persistSession: false, autoRefreshToken: false } };
  const admin = createClient<Database>(supabaseUrl, serviceKey, options);
  const owners: string[] = [];
  const listingIds: string[] = [];
  try {
    const category = await admin.from('categories').select('id').eq('slug', 'electronics').single();
    const city = await admin.from('cities').select('id').limit(1).single();
    expect(category.error).toBeNull();
    expect(city.error).toBeNull();
    if (!category.data || !city.data) throw new Error('Disposable Goods reference data missing');
    const clients = [];
    for (let owner = 0; owner < 2; owner++) {
      const email = `ads01-${randomUUID()}@example.invalid`;
      const password = `Synthetic-${randomUUID()}-aA1!`;
      const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
      expect(created.error).toBeNull();
      if (!created.data.user) throw new Error('Fixture user creation failed');
      owners.push(created.data.user.id);
      const client = createClient<Database>(supabaseUrl, anonKey, options);
      expect((await client.auth.signInWithPassword({ email, password })).error).toBeNull();
      clients.push(client);
      // Different owner totals detect swapped/mixed count results. Fixtures remain private drafts.
      for (let index = 0; index <= owner; index++) {
        const inserted = await admin.from('listings').insert({
          seller_id: owners[owner], title: `ADS01 private fixture ${randomUUID()}`,
          category_id: category.data.id, city_id: city.data.id, condition: 'good',
        }).select('id').single();
        expect(inserted.error).toBeNull();
        if (!inserted.data) throw new Error('Fixture listing creation failed');
        listingIds.push(inserted.data.id);
      }
    }
    for (let owner = 0; owner < 2; owner++) {
      const counts = await fetchMyListingCounts(clients[owner], owners[owner]);
      expect(counts).toEqual({ all: owner + 1, draft: owner + 1, active: 0, pending_review: 0, rejected: 0, paused: 0, expired: 0, sold: 0 });
      const rows = await clients[owner].from('listings').select('id,seller_id,status', { count: 'exact' })
        .eq('seller_id', owners[owner]).in('status', ['draft'])
        .order('updated_at', { ascending: false }).order('id', { ascending: false }).range(0, 9);
      expect(rows.error).toBeNull();
      expect(rows.count).toBe(owner + 1);
      expect(rows.data).toHaveLength(owner + 1);
      expect(rows.data?.every(row => row.seller_id === owners[owner])).toBe(true);
      // Adversarial seller predicate must still be restricted by actual PostgreSQL RLS.
      const foreignCounts = await fetchMyListingCounts(clients[owner], owners[1 - owner]);
      expect(foreignCounts).toEqual({ all: 0, draft: 0, active: 0, pending_review: 0, rejected: 0, paused: 0, expired: 0, sold: 0 });
      const foreign = await clients[owner].from('listings').select('id', { count: 'exact' }).eq('seller_id', owners[1 - owner]).range(0, 9);
      expect(foreign.error).toBeNull();
      expect(foreign.count).toBe(0);
      expect(foreign.data).toEqual([]);
    }
  } finally {
    // Delete only IDs created in this run, including partially completed fixture setup.
    if (listingIds.length) expect((await admin.from('listings').delete().in('id', listingIds)).error).toBeNull();
    for (const id of owners) expect((await admin.auth.admin.deleteUser(id)).error).toBeNull();
  }
}, 120_000);
