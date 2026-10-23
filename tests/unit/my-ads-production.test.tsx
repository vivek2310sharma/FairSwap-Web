import { beforeEach, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import Page from '@/app/account/listings/page';

const m=vi.hoisted(()=>({select:vi.fn(),eq:vi.fn(),range:vi.fn(),rows:[] as Record<string,unknown>[]}));
vi.mock('@/lib/supabase/server',()=>({createClient:async()=>({
  auth:{getUser:async()=>({data:{user:{id:'production-owner'}}})},
  from:()=>{const q={select:m.select.mockImplementation(()=>q),eq:m.eq.mockImplementation(()=>q),in:()=>q,order:()=>q,
    range:m.range.mockImplementation(async()=>({data:m.rows,count:m.rows.length,error:null}))};return q;},
  rpc:async()=>({data:false,error:null}),
})}));
vi.mock('@/lib/listings/my-ads',async original=>({...await original<typeof import('@/lib/listings/my-ads')>(),fetchMyListingCounts:async()=>({all:6,active:1,draft:1,pending_review:1,rejected:0,paused:0,expired:2,sold:0})}));
vi.mock('next/navigation',()=>({redirect:vi.fn(),useRouter:()=>({push:vi.fn(),refresh:vi.fn()})}));
vi.mock('@/app/account/listings/ListingThumbnail',()=>({ListingThumbnail:()=>null}));
vi.mock('@/lib/listings/property/server',()=>({isPropertyEnabled:()=>false}));
vi.mock('@/lib/listings/two-wheeler/server',()=>({isTwoWheelerEnabled:()=>false,isCarsEnabled:()=>false}));
vi.mock('@/lib/listings/test-runtime',()=>({isVerifiedSubmissionTestEnvironment:()=>false}));

beforeEach(()=>{
  vi.clearAllMocks();
  m.rows=[['renewable','expired',2,'electronics'],['exhausted','expired',3,'electronics'],['reserved','reserved',0,'electronics'],
    ['removed','removed',0,'electronics'],['car-draft','draft',0,'car-hatchback'],['car-review','pending_review',0,'car-hatchback']]
    .map(([id,status,renewal_count,slug])=>({id,title:id,slug:id,status,renewal_count,category_id:'category',price_type:'fixed',price_paise:123450,
      updated_at:'2026-10-23T00:00:00Z',expires_at:'2026-10-22T00:00:00Z',categories:{name:'Synthetic category',slug},cities:{name:'Mumbai'},removal_reason:status==='removed'?'Synthetic removal':null}));
});

it('preserves production renewal limits, Reserved/Removed badges and private family actions on All',async()=>{
  render(await Page());
  const card=(name:string)=>within(screen.getByRole('heading',{name}).closest('.rounded-lg')!);
  expect(card('renewable').getByRole('button',{name:'Renew (1 left)'})).toBeInTheDocument();
  expect(card('exhausted').queryByRole('button',{name:/Renew/})).toBeNull();
  expect(card('exhausted').getByRole('link',{name:'Edit'})).toBeInTheDocument();
  expect(card('reserved').getByText('Reserved',{exact:true})).toBeInTheDocument();
  expect(card('reserved').getByRole('button',{name:'Mark as sold'})).toBeInTheDocument();
  expect(card('removed').getByText('Removed by Moderator')).toBeInTheDocument();
  expect(card('removed').getByText('Synthetic removal')).toBeInTheDocument();
  expect(card('car-draft').getByText('Draft only. This category is not yet open for submission or publication.')).toBeInTheDocument();
  expect(card('car-draft').queryByRole('button',{name:'More actions'})).toBeNull();
  expect(card('car-review').getByText('Review — Not Live')).toBeInTheDocument();
  expect(card('car-review').getByText(/Automated review can finish while this category is not publicly live/)).toBeInTheDocument();
  expect(m.select.mock.calls[0][0]).toContain('expires_at');
  expect(m.eq).toHaveBeenCalledWith('seller_id','production-owner');
  expect(m.range).toHaveBeenCalledWith(0,9);
});
