import { describe, expect, it, vi } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { fetchMyListingCounts, parseMyAdsPage } from '@/lib/listings/my-ads';

describe('ADS-01 count transport and input boundaries', () => {
  it.each(['0', '-1', '2junk', '1.5', 'Infinity', '999999999999999999999', '214748365', ''])('rejects unsafe page %s', value => {
    expect(parseMyAdsPage(value)).toBe(1);
  });
  it('accepts page arrays deterministically', () => {
    expect(parseMyAdsPage(['2', '3'])).toBe(2);
  });
  it.each([null, {}, {all:-1}, {all:Infinity}, {all:10,active:10}])('falls back on malformed RPC payload %j with exact owner-scoped HEAD counts', async payload => {
    const requests: {url:URL;method:string}[] = [];
    const client = createClient<Database>('http://127.0.0.1:54321', 'synthetic-key', {
      auth:{persistSession:false,autoRefreshToken:false},
      global:{fetch: vi.fn(async (input, init) => {
        const url = new URL(String(input));
        requests.push({url,method:init?.method ?? 'GET'});
        if(url.pathname.includes('/rpc/')) return new Response(JSON.stringify(payload), {status:200});
        const count = url.searchParams.has('status') ? 1500 : 12000;
        return new Response(null, {status:200,headers:{'content-range':`*/${count}`}});
      })},
    });
    expect(await fetchMyListingCounts(client, 'seller-a')).toEqual({all:12000,active:1500,pending_review:1500,draft:1500,rejected:1500,paused:1500,expired:1500,sold:1500});
    const reads=requests.filter(r=>r.url.pathname.endsWith('/listings'));
    expect(reads).toHaveLength(8);
    for(const request of reads){
      expect(request.method).toBe('HEAD');
      expect(request.url.searchParams.get('seller_id')).toBe('eq.seller-a');
    }
    expect(reads.find(r=>r.url.searchParams.get('status')?.includes('reserved'))?.url.searchParams.get('status')).toBe('in.(active,reserved)');
  });
  it('returns unavailable instead of false zero counts when RPC and fallback fail', async () => {
    const client=createClient<Database>('http://127.0.0.1:54321','synthetic-key',{
      auth:{persistSession:false,autoRefreshToken:false},
      global:{fetch:async()=>new Response(JSON.stringify({message:'Unavailable'}),{status:400})},
    });
    expect(await fetchMyListingCounts(client,'seller-a')).toBeNull();
  });
  it('supports order().order().range() with the installed Supabase SDK', async () => {
    let requested:URL|undefined;
    const client=createClient<Database>('http://127.0.0.1:54321','synthetic-key',{
      auth:{persistSession:false,autoRefreshToken:false},
      global:{fetch:async input=>{requested=new URL(String(input));return new Response('[]',{status:200,headers:{'content-range':'*/0'}});}},
    });
    await client.from('listings').select('id',{count:'exact'}).eq('seller_id','seller-a').in('status',['active','reserved'])
      .order('updated_at',{ascending:false}).order('id',{ascending:false}).range(10,19);
    expect(requested?.searchParams.get('offset')).toBe('10');
    expect(requested?.searchParams.get('limit')).toBe('10');
    expect(requested?.searchParams.get('order')).toBe('updated_at.desc,id.desc');
  });
});
