// @vitest-environment node
// Real source lifecycle functions in PostgreSQL/WASM, not hosted Auth/RPC proof.
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

const source = (file: string) => readFileSync('../FairSwap-Backend/' + file, 'utf8');
const candidate = 'supabase/forward-migrations/india-taxonomy/';
const seed = source(candidate + '20261024213147_india_goods_taxonomy.sql');
const activation = source(candidate + 'activation/20261024221855_activate_india_goods_taxonomy.sql');
const deactivate = source(candidate + 'deactivate.readwrite.sql');
const baseline = 'supabase/migrations/20260914000005_create_listings.sql';
const testSubmission = 'supabase/migrations/20261011092234_test_family_submission_v1.sql';
function functionSource(file: string, name: string) {
  const sql = source(file);
  const header = new RegExp(`create(?: or replace)? function ${name.replaceAll('.', '\\.')}\\([\\s\\S]*?\\bas\\s+(\\$[a-z0-9_]*\\$)`, 'i').exec(sql);
  if (!header) throw Error(`Missing source function ${name}`);
  const end = sql.indexOf(header[1], header.index + header[0].length);
  if (end < 0) throw Error(`Unterminated source function ${name}`);
  return sql.slice(header.index, end + header[1].length) + ';';
}

describe.each([['FairSwapTest','wpppxlnbzqynvhpeuavd'],['FairSwapProd','kriuhwppxgxsyyrbjsau']])('%s lifecycle and activation', (environment, project) => {
  let db: PGlite;
  let originalIds: unknown[];
  let originalGuards: unknown[];
  async function attest(release = 'a'.repeat(40), target = project) {
    await db.query<Record<string, unknown>>(`select set_config('app.india_taxonomy_verified_web_release',$1,false),set_config('app.india_taxonomy_target_project',$2,false)`,[release,target]);
  }
  async function activate() { await attest(); await db.exec(activation); }
  async function rejectedScript(sql: string, message: string) {
    await expect(db.exec(sql)).rejects.toThrow(message);
    await db.exec('rollback'); // Explicit script transaction, on this in-memory DB only.
  }
  async function draft(slug = 'fashion-men', answers: unknown = {}) {
    return (await db.query<{id: string}>(`insert into listings(category_id,category_attributes) select id,$2::jsonb from categories where slug=$1 returning id`,[slug,JSON.stringify(answers)])).rows[0].id;
  }
  async function asRole(role: string, run: () => Promise<unknown>) {
    await db.exec(`set role ${role}`); // Fixed fixture constants only.
    try { return await run(); } finally { await db.exec('reset role'); }
  }
  async function guards() {
    return (await db.query<Record<string, unknown>>(`select tgname,tgtype,tgenabled,tgfoid::regprocedure::text as function from pg_trigger
      where tgrelid='listings'::regclass and not tgisinternal and tgname<>'india_goods_listing_guard' order by tgname`)).rows;
  }
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`
      create role anon; create role authenticated; create role service_role bypassrls; create role taxonomy_staff_fixture bypassrls;
      create schema app_security; create schema auth;
      create function auth.uid() returns uuid language sql as $$select '11111111-1111-4111-8111-111111111111'::uuid$$;
      create type listing_status_enum as enum ('draft','pending_review','active','reserved','sold','rejected','paused','expired','removed');
      create table categories(id uuid primary key default gen_random_uuid(),slug text unique,name text,description text,icon text,sort_order integer,macro_category text,new_listing_enabled boolean,is_active boolean,updated_at timestamptz default now());
      create table category_attributes(id uuid default gen_random_uuid(),category_id uuid references categories(id),name text,label text,value_type text,is_required boolean,is_filterable boolean,options jsonb,validation_rules jsonb,sort_order integer);
      create table listings(id uuid primary key default gen_random_uuid(),seller_id uuid default '11111111-1111-4111-8111-111111111111',slug text,title text default 'Fixture listing',description text,
        category_id uuid references categories(id),category_attributes jsonb default '{}',status listing_status_enum default 'draft',revision integer default 1,
        renewal_count integer,rejection_reason text,removal_reason text,removed_by uuid,cover_photo_id uuid,created_at timestamptz,updated_at timestamptz,
        submitted_at timestamptz,published_at timestamptz,expires_at timestamptz,sold_at timestamptz,city_id uuid,locality_id uuid,condition text,price_type text,price_paise bigint,pin_code text,search_vector tsvector);
      create table vehicle_category_contracts(category_id uuid,version_id uuid,fields jsonb);
      create table car_category_contracts(category_id uuid,version_id uuid,fields jsonb);
      create table property_category_contracts(category_id uuid);
      create table listing_vehicle_contexts(listing_id uuid,category_id uuid,version_id uuid);
      create table listing_car_contexts(listing_id uuid,category_id uuid,version_id uuid);
      create table listing_property_contexts(listing_id uuid);
      create table app_security.test_submission_permits(listing_id uuid,transaction_id bigint,operation text);
      create table taxonomy_transition_fixture(listing_id uuid,status listing_status_enum);
      insert into categories(slug,name,macro_category,new_listing_enabled,is_active) values ('furniture','Furniture','goods',true,true),('fixture-two-wheeler','Family fixture','vehicles',false,false);
      insert into vehicle_category_contracts(category_id) select id from categories where slug='fixture-two-wheeler';
      alter table categories enable row level security;
      create policy fixture_category_read on categories for select to anon,authenticated using (is_active);
      grant select on categories to anon,authenticated;
      alter table listings enable row level security;
      create policy fixture_owner on listings to authenticated using (seller_id=auth.uid()) with check (seller_id=auth.uid());
      grant select on listings to authenticated,taxonomy_staff_fixture,service_role;
      grant insert(title,category_id,category_attributes),update(title,category_id,category_attributes) on listings to authenticated;
      grant insert,update on listings to taxonomy_staff_fixture,service_role;
    `);
    for (const name of ['app_security.generate_listing_slug','public.handle_listing_before_insert','public.handle_listing_before_update']) await db.exec(functionSource(baseline,name));
    await db.exec(`create trigger trg_listings_before_insert before insert on listings for each row execute function public.handle_listing_before_insert();
      create trigger trg_listings_before_update before update on listings for each row execute function public.handle_listing_before_update()`);
    for (const [file,fn,trigger] of [
      ['20261009201151_two_wheeler_draft_v1.sql','vehicle_listing_guard','z_vehicle_listing_guard'],
      ['20261010064518_car_draft_v1.sql','car_listing_guard','zz_car_listing_guard'],
      ['20261010084523_property_rental_draft_v1.sql','property_listing_guard','zzz_property_listing_guard'],
    ]) {
      await db.exec(functionSource('supabase/migrations/'+file,'app_security.'+fn));
      await db.exec(`create trigger ${trigger} before insert or update on listings for each row execute function app_security.${fn}()`);
    }
    if (environment === 'FairSwapTest') {
      await db.exec(functionSource(testSubmission,'app_security.submission_family'));
      await db.exec(functionSource(testSubmission,'app_security.test_submission_lifecycle'));
      await db.exec('create trigger z_0_test_submission_lifecycle before insert or update or delete on listings for each row execute function app_security.test_submission_lifecycle()');
    }
    await db.exec(`
      -- Inert unless enabled by a test; sorts after all current BEFORE guards.
      create function taxonomy_late_before_fixture() returns trigger language plpgsql as $$begin
        case current_setting('test.taxonomy_before_mode',true)
          when 'forge' then new.category_attributes:='{"forged":"value"}';
          when 'reassign' then select id into new.category_id from categories where slug='fashion-men';
          when 'publish' then new.status:='active'; else null;
        end case;return new;end $$;
      create trigger zzzz_taxonomy_late_before_fixture before insert or update on listings for each row execute function taxonomy_late_before_fixture();
      create function taxonomy_transition_fixture() returns trigger language plpgsql security definer as $$begin insert into public.taxonomy_transition_fixture values(new.id,new.status);return null;end $$;
      create trigger aaa_taxonomy_transition_fixture after insert or update on listings for each row execute function taxonomy_transition_fixture();
    `);
    originalGuards = await guards();
    await db.exec(seed);
    originalIds = (await db.query<Record<string, unknown>>('select slug,id from categories order by slug')).rows;
  },30000);
  beforeEach(async () => {
    await db.exec('reset role');
    await db.exec(`select set_config('test.taxonomy_before_mode','',false),set_config('app.india_taxonomy_verified_web_release','',false),set_config('app.india_taxonomy_target_project','',false)`);
    await db.exec(deactivate);
    await db.exec('truncate listings,taxonomy_transition_fixture');
  });
  afterAll(async () => { await db.close(); });

  it('seeds 15 hidden disabled identities and leaves unsupported categories absent',async () => {
    expect((await db.query<Record<string, unknown>>('select count(*)::int as count from categories')).rows[0].count).toBe(17);
    expect((await asRole('anon',() => db.query<Record<string, unknown>>('select slug from categories'))) as {rows: unknown[]}).toMatchObject({rows:[{slug:'furniture'}]});
    const id=(await db.query<Record<string, unknown>>(`select id from categories where slug='fashion-men'`)).rows[0].id;
    for (const role of ['authenticated','taxonomy_staff_fixture','service_role']) {
      await expect(asRole(role,() => db.query<Record<string, unknown>>('insert into listings(category_id) values($1)',[id]))).rejects.toThrow('INDIA_GOODS_CATEGORY_UNAVAILABLE');
    }
    expect((await db.query<Record<string, unknown>>(`select slug from categories where slug in ('baby-car-seats','everything-else','electric-cycles','rent-warehouses','sale-warehouses')`)).rows).toHaveLength(0);
  });
  it('requires a deployed-Web acknowledgement and activates only the original 15 IDs',async () => {
    await rejectedScript(activation,'INDIA_TAXONOMY_WEB_DEPLOYMENT_ATTESTATION_REQUIRED');
    for (const [release,target] of [['not-a-release',project],['a'.repeat(40),'wrong-project']]) {
      await attest(release,target);await rejectedScript(activation,'INDIA_TAXONOMY_WEB_DEPLOYMENT_ATTESTATION_REQUIRED');
    }
    await activate();
    expect((await db.query<Record<string, unknown>>(`select count(*)::int as count from categories where slug<>'furniture' and macro_category='goods' and is_active and new_listing_enabled`)).rows[0].count).toBe(15);
    expect((await db.query<Record<string, unknown>>('select slug,id from categories order by slug')).rows).toEqual(originalIds);
    expect((await db.query<Record<string, unknown>>(`select current_setting('app.india_taxonomy_verified_web_release') as release`)).rows[0].release).toBe('');
  });
  it('rejects attribute-contract drift atomically',async () => {
    await db.exec(`update category_attributes set validation_rules='{}' where name='brand' and category_id=(select id from categories where slug='fashion-men')`);
    try { await attest();await rejectedScript(activation,'INDIA_TAXONOMY_ATTRIBUTE_CONTRACT_MISMATCH'); }
    finally { await db.exec(`update category_attributes set validation_rules='{"contract":"india_goods_v1","max_length":100}' where name='brand' and category_id=(select id from categories where slug='fashion-men')`); }
    expect((await db.query<Record<string, unknown>>(`select * from categories where slug='fashion-men' and is_active`)).rows).toHaveLength(0);
  });
  it('refuses activation if validation regresses to BEFORE timing',async () => {
    await db.exec('drop trigger india_goods_listing_guard on listings; create trigger india_goods_listing_guard before insert or update on listings for each row execute function app_security.india_goods_listing_guard()');
    try { await attest();await rejectedScript(activation,'INDIA_TAXONOMY_FINAL_ROW_GUARD_REQUIRED'); }
    finally { await db.exec('drop trigger india_goods_listing_guard on listings; create trigger india_goods_listing_guard after insert or update on listings for each row execute function app_security.india_goods_listing_guard()'); }
  });
  it('refuses partial activation or caller-supplied acknowledgements without operator privileges',async () => {
    await db.exec(`update categories set is_active=true where slug='fashion-men'`);
    try { await attest();await rejectedScript(activation,'INDIA_TAXONOMY_DISABLED_SEED_MISMATCH'); }
    finally { await db.exec(deactivate); }
    await attest();
    await asRole('authenticated',() => rejectedScript(activation,'permission denied'));
  });
  it('installs AFTER ROW INSERT/UPDATE validation without changing existing guards or client grants',async () => {
    expect((await db.query<Record<string, unknown>>(`select tgtype,tgenabled from pg_trigger where tgrelid='listings'::regclass and tgname='india_goods_listing_guard'`)).rows[0]).toMatchObject({tgtype:21,tgenabled:'O'});
    expect(await guards()).toEqual(originalGuards);
    expect((await db.query<Record<string, unknown>>(`select has_function_privilege('authenticated','app_security.india_goods_listing_guard()','EXECUTE') as allowed`)).rows[0].allowed).toBe(false);
  });
  it('accepts incomplete INSERT after the real lifecycle resets requested active status to draft',async () => {
    await activate();
    expect((await db.query<Record<string, unknown>>(`insert into listings(category_id,status) select id,'active' from categories where slug='fashion-men' returning status,revision`)).rows[0]).toEqual({status:'draft',revision:1});
  });
  it('rejects direct submission/publication without an item type and denies seller status writes',async () => {
    await activate();const id=await draft();
    for (const status of ['pending_review','active','reserved']) await expect(db.query<Record<string, unknown>>('update listings set status=$1 where id=$2',[status,id])).rejects.toThrow('INDIA_GOODS_ITEM_TYPE_REQUIRED');
    await expect(asRole('authenticated',() => db.query<Record<string, unknown>>(`update listings set status='active' where id=$1`,[id]))).rejects.toThrow('permission denied');
  });
  it('rejects forged, nontext and oversized answers on direct INSERT and UPDATE',async () => {
    await activate();const id=await draft();
    for (const answers of [{item_type:{}},{item_type:42},{forged:'x'},{brand:'x'.repeat(101)},[],null]) {
      await expect(asRole('authenticated',() => draft('toys-games',answers))).rejects.toThrow('INDIA_GOODS_INVALID_ANSWERS');
      await expect(asRole('authenticated',() => db.query<Record<string, unknown>>('update listings set category_attributes=$1::jsonb where id=$2',[JSON.stringify(answers),id]))).rejects.toThrow('INDIA_GOODS_INVALID_ANSWERS');
    }
  });
  it('checks final attributes and category after an arbitrarily late BEFORE trigger',async () => {
    await activate();const id=await draft('furniture',{material:'wood'});
    await db.exec(`select set_config('test.taxonomy_before_mode','forge',false)`);
    await expect(draft()).rejects.toThrow('INDIA_GOODS_INVALID_ANSWERS');
    await db.exec(deactivate);await db.exec(`select set_config('test.taxonomy_before_mode','reassign',false)`);
    await expect(db.query<Record<string, unknown>>(`update listings set title='Changed title' where id=$1`,[id])).rejects.toThrow('INDIA_GOODS_CATEGORY_UNAVAILABLE');
  });
  it('checks publication introduced by a late BEFORE trigger',async () => {
    await activate();await db.exec(`select set_config('test.taxonomy_before_mode','publish',false)`);
    await expect(draft()).rejects.toThrow('INDIA_GOODS_ITEM_TYPE_REQUIRED');
  });
  it('validates final rejected-to-draft lifecycle rather than premature pending_review input',async () => {
    await activate();const id=await draft();await db.query<Record<string, unknown>>(`update listings set status='rejected' where id=$1`,[id]);
    expect((await db.query<Record<string, unknown>>(`update listings set title='Edited rejected draft',status='pending_review' where id=$1 returning status,revision`,[id])).rows[0]).toEqual({status:'draft',revision:2});
  });
  it.each(['authenticated','taxonomy_staff_fixture','service_role'])('blocks %s edits changed by lifecycle to pending_review and rolls back side effects',async role => {
    await activate();const id=await draft('fashion-men',{item_type:'Kurta'});await db.query<Record<string, unknown>>(`update listings set status='active' where id=$1`,[id]);
    const before=(await db.query<Record<string, unknown>>('select * from listings where id=$1',[id])).rows;
    const events=(await db.query<Record<string, unknown>>('select * from taxonomy_transition_fixture')).rows;
    const action=role==='authenticated'?`update listings set category_attributes='{}' where id=$1`:`update listings set status='draft',category_attributes='{}' where id=$1`;
    await expect(asRole(role,() => db.query<Record<string, unknown>>(action,[id]))).rejects.toThrow('INDIA_GOODS_ITEM_TYPE_REQUIRED');
    expect((await db.query<Record<string, unknown>>('select * from listings where id=$1',[id])).rows).toEqual(before);
    expect((await db.query<Record<string, unknown>>('select * from taxonomy_transition_fixture')).rows).toEqual(events);
  });
  it.each(['taxonomy_staff_fixture','service_role'])('permits complete %s publication and preserves lifecycle re-review',async role => {
    await activate();const id=await draft('fashion-men',{item_type:'Kurta'});
    await asRole(role,() => db.query<Record<string, unknown>>(`update listings set status='active' where id=$1`,[id]));
    expect((await db.query<Record<string, unknown>>('select status from listings where id=$1',[id])).rows[0].status).toBe('active');
    await asRole(role,() => db.query<Record<string, unknown>>(`update listings set title='Updated valid title',status='draft' where id=$1`,[id]));
    expect((await db.query<Record<string, unknown>>('select status,revision from listings where id=$1',[id])).rows[0]).toEqual({status:'pending_review',revision:2});
  });
  it.each(['taxonomy_staff_fixture','service_role'])('blocks %s publication/reassignment after rollback and retains editable drafts',async role => {
    await activate();const id=await draft('fashion-men',{item_type:'Kurta'});const old=await draft('furniture',{material:'wood'});
    const categoryId=(await db.query<Record<string, unknown>>(`select id from categories where slug='fashion-men'`)).rows[0].id;
    await db.exec(deactivate);
    await expect(asRole(role,() => db.query<Record<string, unknown>>(`update listings set status='active' where id=$1`,[id]))).rejects.toThrow('INDIA_GOODS_CATEGORY_UNAVAILABLE');
    await expect(asRole(role,() => db.query<Record<string, unknown>>(`update listings set category_id=$2,category_attributes='{}' where id=$1`,[old,categoryId]))).rejects.toThrow('INDIA_GOODS_CATEGORY_UNAVAILABLE');
    await asRole('authenticated',() => db.query<Record<string, unknown>>(`update listings set title='Retained draft' where id=$1`,[id]));
    expect((await db.query<Record<string, unknown>>('select status from listings where id=$1',[id])).rows[0].status).toBe('draft');
    expect((await db.query<Record<string, unknown>>('select slug,id from categories order by slug')).rows).toEqual(originalIds);
  });
  it('rejects reassignment retaining incompatible old attributes',async () => {
    await activate();const id=await draft('furniture',{material:'wood'});
    await expect(db.query<Record<string, unknown>>(`update listings set category_id=(select id from categories where slug='fashion-men') where id=$1`,[id])).rejects.toThrow('INDIA_GOODS_INVALID_ANSWERS');
  });
  it('preserves family publication guards and existing Goods behavior',async () => {
    await activate();const id=await draft('furniture',{material:'wood'});
    await expect(db.query<Record<string, unknown>>(`update listings set category_id=(select id from categories where slug='fixture-two-wheeler'),status='active' where id=$1`,[id])).rejects.toThrow(environment==='FairSwapTest'?'disabled':'Two-wheeler review/publication is disabled');
    await db.query<Record<string, unknown>>(`update listings set status='active' where id=$1`,[id]);
    expect((await db.query<Record<string, unknown>>('select category_attributes from listings where id=$1',[id])).rows[0].category_attributes).toEqual({material:'wood'});
  });
  it('stops seed identity collisions without rewriting IDs',async () => {
    await rejectedScript(seed,'INDIA_TAXONOMY_IDENTITY_CONFLICT');
    expect((await db.query<Record<string, unknown>>('select slug,id from categories order by slug')).rows).toEqual(originalIds);
  });
});

