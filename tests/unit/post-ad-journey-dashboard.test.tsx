import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import ListingsDashboardPage from '@/app/account/listings/page';

type Category={name?:string;slug?:string};
type Draft={id:string;category_id:string;title:string;status:string;revision:number;price_type:string;price_paise:number;updated_at:string;categories:Category|Category[]|null;cities:{name:string}};

const m=vi.hoisted(()=>({from:vi.fn(),select:vi.fn(),submit:vi.fn(),transition:vi.fn(),flags:{property:true,tw:true,cars:true},rows:[] as Draft[],contexts:{} as Record<string,{listing_id:string;category_id?:string;financial?:unknown}[]>,errors:{} as Record<string,boolean>,reads:[] as {table:string;column:string;ids:string[]}[]}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
  redirect: vi.fn(),
}));

vi.mock('@/lib/supabase/server',()=>({createClient:async()=>({auth:{getUser:async()=>({data:{user:{id:'owner'}}})},from:m.from})}));
vi.mock('@/app/account/listings/actions',()=>({submitListingAction:m.submit,transitionListingAction:m.transition}));
vi.mock('@/lib/listings/property/server',()=>({isPropertyEnabled:()=>m.flags.property}));
vi.mock('@/lib/listings/two-wheeler/server',()=>({isTwoWheelerEnabled:()=>m.flags.tw,isCarsEnabled:()=>m.flags.cars}));

const rows:Draft[]=[['goods','Electronics','electronics'],['legacy','Bicycles & Sports','bicycles-sports'],['tw','Commuter Bikes','tw-commuter-bikes'],['car','Hatchback','car-hatchback'],['pg','Boys PG','rental-boys-pg']].map(([id,name,slug])=>({id,category_id:id+'-category',title:`Synthetic ${id}`,status:'draft',revision:1,price_type:'fixed',price_paise:123450,updated_at:'2026-10-10',categories:{name,slug},cities:{name:'Isolated city'}}));
const financial={currency:'INR',period:'month',basis:'per_bed',rent:{state:'known',amount_paise:123450}};

beforeEach(()=>{vi.clearAllMocks();m.flags={property:true,tw:true,cars:true};m.rows=structuredClone(rows);m.errors={};m.reads=[];m.contexts={listing_property_contexts:[{listing_id:'pg',category_id:'pg-category',financial}]};m.from.mockImplementation(table=>{const q={select:m.select.mockImplementation(()=>q),eq:vi.fn(()=>q),order:()=>q,limit:async()=>({data:m.rows,error:null}),in:async(column:string,ids:string[])=>{m.reads.push({table,column,ids});if(m.errors[table])return {data:null,error:{message:'Reference read failed'}};return {data:m.contexts[table]??[],error:null};}};return q;});});
afterEach(cleanup);

const card=(id:string)=>within(screen.getByRole('heading',{name:`Synthetic ${id}`}).closest('.rounded-lg')!);
const noSubmit=(id:string)=>{
  expect(card(id).queryByRole('button',{name:'More actions'})).toBeNull();
};

const hasSubmit=(id:string)=>{
  const menuBtn = card(id).getByRole('button',{name:'More actions'});
  fireEvent.click(menuBtn);
  expect(card(id).getByRole('menuitem',{name:'Submit for review'})).toBeInTheDocument();
};

it('dashboard preserves Goods submission and omits it for current draft-only families',async()=>{
  render(await ListingsDashboardPage());
  for(const id of ['goods','legacy']) hasSubmit(id);
  for(const id of ['tw','car','pg']) noSubmit(id);
  expect(m.submit).not.toHaveBeenCalled();
  expect(m.transition).not.toHaveBeenCalled();
});

it('dashboard keeps item prices separate from per-bed rent',async()=>{
  render(await ListingsDashboardPage());
  expect(screen.getByText('INR 1234.50 / bed / month')).toBeInTheDocument();
  expect(card('car').getByText('₹1,234.5')).toBeInTheDocument();
});

it.each(['tw','car'])('missing category on owned %s never offers review',async id=>{
  m.rows.find(r=>r.id===id)!.categories=id==='tw'?null:[];
  render(await ListingsDashboardPage());
  noSubmit(id);
  expect(card(id).getByText(/Category information is unavailable/)).toBeInTheDocument();
});

it.each([null,[],{name:'Lost category'},{slug:''}])('default-OFF unresolved category %j cannot imply Goods eligibility',async category=>{
  m.flags={property:false,tw:false,cars:false};
  m.rows=[{...rows[0],categories:category}];
  render(await ListingsDashboardPage());
  noSubmit('goods');
  expect(card('goods').getByText(/Category information is unavailable/)).toBeInTheDocument();
  expect(m.reads).toEqual([]);
  expect(m.from.mock.calls.map(c=>c[0])).toEqual(['listings']);
});

it('batched owner context fallback recognizes hidden motorcycle and Cars categories',async()=>{
  for(const id of ['tw','car'])m.rows.find(r=>r.id===id)!.categories=null;
  m.contexts.listing_vehicle_contexts=[{listing_id:'tw',category_id:'tw-category'}];
  m.contexts.listing_car_contexts=[{listing_id:'car',category_id:'car-category'}];
  render(await ListingsDashboardPage());
  for(const id of ['tw','car']){
    noSubmit(id);
    expect(card(id).getByText(/Draft only/)).toBeInTheDocument();
  }
  for(const table of ['listing_vehicle_contexts','listing_car_contexts']) expect(m.reads.filter(r=>r.table===table)).toEqual([{table,column:'listing_id',ids:['tw','car']}]);
  hasSubmit('goods');
});

it('owner Property context recognizes a missing ordinary relation and preserves rental summary',async()=>{
  m.rows.find(r=>r.id==='pg')!.categories=[];
  render(await ListingsDashboardPage());
  noSubmit('pg');
  expect(card('pg').getByText(/Draft only/)).toBeInTheDocument();
  expect(card('pg').getByText('INR 1234.50 / bed / month')).toBeInTheDocument();
});

it.each(['listing_vehicle_contexts','listing_car_contexts','listing_property_contexts'])('lookup error in %s leaves unresolved draft unavailable, without affecting Goods',async table=>{
  m.rows.find(r=>r.id==='tw')!.categories=null;
  m.errors[table]=true;
  render(await ListingsDashboardPage());
  noSubmit('tw');
  expect(card('tw').getByText(/Category references could not be loaded/)).toBeInTheDocument();
  hasSubmit('goods');
});

it('mismatched context does not establish family or submission eligibility',async()=>{
  m.rows.find(r=>r.id==='tw')!.categories=null;
  m.contexts.listing_vehicle_contexts=[{listing_id:'tw',category_id:'different-category'}];
  render(await ListingsDashboardPage());
  noSubmit('tw');
  expect(card('tw').getByText(/Category information is unavailable/)).toBeInTheDocument();
});

it('listing projection supplies the category binding needed by owner fallbacks',async()=>{
  render(await ListingsDashboardPage());
  expect(m.select.mock.calls[0][0]).toMatch(/\bcategory_id\b/);
});

it('thrown context reads leave the unresolved draft unavailable',async()=>{
  m.rows=[{...rows[2],categories:null}];
  m.from.mockImplementation(table=>{if(table==='listing_vehicle_contexts')throw Error('Unavailable');const q={select:()=>q,eq:()=>q,order:()=>q,limit:async()=>({data:m.rows,error:null}),in:async()=>({data:[],error:null})};return q;});
  render(await ListingsDashboardPage());
  noSubmit('tw');
  expect(card('tw').getByText(/Category references could not be loaded/)).toBeInTheDocument();
});

it('Cars-only gate reads no disabled motorcycle or Property table',async()=>{
  m.flags={property:false,tw:false,cars:true};
  m.rows=[{...rows[3],categories:[]}];
  m.contexts.listing_car_contexts=[{listing_id:'car',category_id:'car-category'}];
  render(await ListingsDashboardPage());
  noSubmit('car');
  expect(card('car').getByText(/Draft only/)).toBeInTheDocument();
  expect(m.from.mock.calls.map(c=>c[0])).toEqual(['listings','listing_car_contexts']);
});

it.each(['tw','car','pg'])('keeps one Review — Not Live badge for pending %s when enhanced Goods status is enabled',async id=>{
  process.env.NEXT_PUBLIC_ENABLE_ENHANCED_MODERATION_STATUS='true';
  try {
    m.rows=[{...rows.find(r=>r.id===id)!,status:'pending_review'}];
    render(await ListingsDashboardPage());
    expect(screen.getAllByText('Review — Not Live')).toHaveLength(1);
    expect(screen.queryByText('Under Review')).toBeNull();
    expect(screen.queryByText('Checking...')).toBeNull();
  } finally { delete process.env.NEXT_PUBLIC_ENABLE_ENHANCED_MODERATION_STATUS; }
});
