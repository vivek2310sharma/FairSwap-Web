// @vitest-environment node
// Local cross-repository candidate rehearsal, not a full Supabase/RLS proof.
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, expect, it } from 'vitest';

const db = new PGlite();
const migration = readFileSync('../FairSwap-Backend/supabase/forward-migrations/india-taxonomy/20261024213147_india_goods_taxonomy.sql', 'utf8');
beforeAll(async () => {
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema app_security;
    create table public.categories(id uuid primary key default gen_random_uuid(),slug text unique,name text,description text,icon text,sort_order integer,macro_category text,new_listing_enabled boolean,is_active boolean);
    create table public.category_attributes(id uuid default gen_random_uuid(),category_id uuid references categories(id),name text,label text,value_type text,is_required boolean,is_filterable boolean,validation_rules jsonb,sort_order integer);
    create table public.listings(id uuid default gen_random_uuid(),category_id uuid references categories(id),category_attributes jsonb default '{}',status text default 'draft');
    insert into categories(slug,name,macro_category,new_listing_enabled,is_active) values ('furniture','Furniture','goods',true,true);
    insert into listings(category_id,category_attributes) select id,'{"material":"wood"}' from categories where slug='furniture';
  `);
  await db.exec(migration);
}, 30000);
afterAll(async () => { await db.close(); });

it('adds 15 identities without changing old listings or enabling unsupported categories', async () => {
  const result = await db.query<{ count: number }>('select count(*)::int as count from categories');
  expect(result.rows[0].count).toBe(16);
  const old = await db.query<{ category_attributes: unknown }>('select category_attributes from listings');
  expect(old.rows[0].category_attributes).toEqual({ material: 'wood' });
  const blocked = await db.query(`select * from categories where slug in ('baby-car-seats','everything-else','electric-cycles')`);
  expect(blocked.rows).toHaveLength(0);
});

it('permits incomplete drafts but enforces item type on review and publication, including direct writes', async () => {
  for (const status of ['pending_review', 'active', 'reserved']) {
    await expect(db.exec(`insert into listings(category_id,status) select id,'${status}' from categories where slug='fashion-men'`)).rejects.toThrow('INDIA_GOODS_ITEM_TYPE_REQUIRED');
  }
  await db.exec(`insert into listings(category_id) select id from categories where slug='fashion-men'`);
  await expect(db.exec(`update listings set status='active' where category_id=(select id from categories where slug='fashion-men')`)).rejects.toThrow('INDIA_GOODS_ITEM_TYPE_REQUIRED');
  await db.exec(`update listings set category_attributes='{"item_type":"Kurta","brand":"Local"}',status='pending_review' where category_id=(select id from categories where slug='fashion-men')`);
});

it('rejects forged, nontext and oversized answers even in drafts', async () => {
  for (const answers of [{ item_type: {} }, { item_type: 42 }, { forged: 'x' }, { brand: 'x'.repeat(101) }, [], null]) {
    await expect(db.query(`insert into listings(category_id,category_attributes) select id,$1::jsonb from categories where slug='toys-games'`, [JSON.stringify(answers)])).rejects.toThrow('INDIA_GOODS_INVALID_ANSWERS');
  }
});

it('blocks disabled category assignment and publication while preserving draft editing', async () => {
  await db.exec(`insert into listings(category_id) select id from categories where slug='baby-gear'; update categories set new_listing_enabled=false where slug='baby-gear'`);
  await expect(db.exec(`insert into listings(category_id) select id from categories where slug='baby-gear'`)).rejects.toThrow('INDIA_GOODS_CATEGORY_UNAVAILABLE');
  await expect(db.exec(`update listings set category_id=(select id from categories where slug='baby-gear') where category_id=(select id from categories where slug='furniture')`)).rejects.toThrow('INDIA_GOODS_CATEGORY_UNAVAILABLE');
  await db.exec(`update listings set category_attributes='{"item_type":"Carrier"}' where category_id=(select id from categories where slug='baby-gear')`);
  await expect(db.exec(`update listings set status='active' where category_id=(select id from categories where slug='baby-gear')`)).rejects.toThrow('INDIA_GOODS_CATEGORY_UNAVAILABLE');
});

it('leaves no callable client grant on the trigger function and stops identity collisions atomically', async () => {
  const grants = await db.query<{ allowed: boolean }>(`select has_function_privilege('authenticated','app_security.india_goods_listing_guard()','EXECUTE') as allowed`);
  expect(grants.rows[0].allowed).toBe(false);
  await expect(db.exec(migration)).rejects.toThrow('INDIA_TAXONOMY_IDENTITY_CONFLICT');
  await db.exec('rollback');
  const result = await db.query<{ count: number }>('select count(*)::int as count from categories');
  expect(result.rows[0].count).toBe(16);
});

