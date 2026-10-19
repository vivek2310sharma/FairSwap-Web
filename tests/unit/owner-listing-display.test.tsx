import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {cleanup,render,screen} from '@testing-library/react';
import ListingDetailPage from '@/app/listings/[slug]/page';
import {evaluateReadiness} from '@/lib/listings/submission-readiness';
import {fixture,cid} from './readiness-fixtures';
const m=vi.hoisted(()=>({listing:{} as Record<string,unknown>,preview:false,user:null as {id:string}|null,readiness:null as unknown,definitions:{data:[{category_id:'22222222-2222-4222-8222-222222222222',name:'storage_gb',label:'Storage (GB)'},{category_id:'22222222-2222-4222-8222-222222222222',name:'society_name',label:'Society'}] as unknown,error:null as unknown}}));
vi.mock('@/lib/discovery/queries',()=>({getPublicListingBySlugOrId:async()=>({listing:m.listing,redirectSlug:null,isOwnerOrStaffPreview:m.preview}),getSellerPublicListings:async()=>[]}));
vi.mock('@/lib/listings/readiness-server',()=>({loadOwnerReadiness:async()=>m.readiness}));
vi.mock('@/lib/supabase/server',()=>({createClient:async()=>({auth:{getUser:async()=>({data:{user:m.user}})},from:(table:string)=>{const q={select:()=>q,eq:()=>q,maybeSingle:async()=>({data:null}),then:(resolve:(v:unknown)=>unknown)=>Promise.resolve(table==='category_attributes'?m.definitions:{data:null,error:null}).then(resolve)};return q;}})}));
vi.mock('@/components/header',()=>({Header:()=>null}));
vi.mock('@/components/footer',()=>({Footer:()=>null}));
vi.mock('@/components/listings/PhotoGallery',()=>({PhotoGallery:()=> <p>Existing photo gallery</p>}));
vi.mock('@/components/listings/FavouriteButton',()=>({FavouriteButton:()=>null}));
vi.mock('@/components/listings/ContactSellerButton',()=>({ContactSellerButton:()=>null}));
vi.mock('next/navigation',()=>({notFound:()=>{throw Error('Not found')},permanentRedirect:vi.fn()}));
beforeEach(()=>{m.preview=false;m.user=null;m.readiness=null;m.definitions.error=null;m.listing={...fixture('goods').listing,slug:'synthetic-owner-display',seller_id:'owner',created_at:'2026-10-11T00:00:00Z',published_at:null,category:{id:cid,name:'Synthetic Goods',slug:'synthetic-goods'},city:{name:'Jaipur'},locality:null,seller:{id:'owner',display_name:'Synthetic seller',created_at:'2026-10-11T00:00:00Z'},media:[],category_attributes:{storage_gb:256,unrecognized:'ARBITRARY_VALUE',society_name:'PRIVATE_VALUE',nested:{value:'NESTED_VALUE'}}};});
afterEach(cleanup);
it('actual detail page keeps category-defined storage and excludes private/arbitrary/nested metadata',async()=>{
 render(await ListingDetailPage({params:Promise.resolve({slug:'synthetic-owner-display'}), searchParams: Promise.resolve({})}));
 expect(screen.getByText('256')).toBeVisible();
 expect(screen.queryAllByText(/ARBITRARY_VALUE|PRIVATE_VALUE|NESTED_VALUE|\[object Object\]/)).toHaveLength(0);
 expect(screen.getByText('Storage (GB)')).toBeVisible();
});
it.each(['unknown contract','changed definition','changed revision','changed status','changed text','mismatched snapshot'] as const)('owner preview does not trust %s or fall back to raw fields',async kind=>{
 const v=fixture('cars');v.listing.category_attributes={year:{state:'known',value:2024}};
 m.preview=true;m.user={id:'owner'};m.listing={...m.listing,...v.listing};
 if(kind==='unknown contract')v.reference!.contractKey='unsupported-v2';
 if(kind==='changed definition')v.reference!.versionDefinition={changed:true};
 const r=evaluateReadiness(v);
 if(kind==='changed revision')m.listing.revision=4;
 if(kind==='changed status')m.listing.status='pending_review';
 if(kind==='changed text')m.listing.title='Changed saved title';
 if(kind==='mismatched snapshot')r.packet!.consistency='mismatch';
 m.readiness=r;
 render(await ListingDetailPage({params:Promise.resolve({slug:'synthetic-owner-display'}), searchParams: Promise.resolve({})}));
 expect(screen.getByRole('status')).toHaveTextContent('could not be verified');
 expect(screen.getByText('Saved amount could not be verified')).toBeVisible();
 expect(screen.queryByText('2024')).toBeNull();expect(screen.queryByText('[object Object]')).toBeNull();
 expect(screen.getByText('Existing photo gallery')).toBeVisible();
});
it('failed category definition read preserves photos without raw attribute fallback',async()=>{
 m.definitions.error={code:'42501'};
 render(await ListingDetailPage({params:Promise.resolve({slug:'synthetic-owner-display'}), searchParams: Promise.resolve({})}));
 expect(screen.getByRole('status')).toHaveTextContent('could not be verified');expect(screen.queryByText('256')).toBeNull();
 expect(screen.getByText('Existing photo gallery')).toBeVisible();
});
it('title/description stay plain text and missing description is not turned into seller text',async()=>{
 m.listing.title='Saved <b>title</b>';m.listing.description='Saved <script>description</script>';
 const first=render(await ListingDetailPage({params:Promise.resolve({slug:'synthetic-owner-display'}), searchParams: Promise.resolve({})}));
 expect(screen.getByText('Saved <script>description</script>')).toBeVisible();expect(first.container.querySelector('script,b')).toBeNull();
 cleanup();m.listing.description=null;
 render(await ListingDetailPage({params:Promise.resolve({slug:'synthetic-owner-display'}), searchParams: Promise.resolve({})}));
 expect(screen.getByText('No detailed description was provided for this item.')).toBeVisible();expect(m.listing.description).toBeNull();
});
it('rental preview keeps period/basis, zero deposit and separate maintenance',async()=>{
 const v=fixture('property');v.context!.financial={currency:'INR',period:'month',basis:'dwelling',rent:{state:'known',amount_paise:123450},deposit:{state:'known',amount_paise:0},maintenance:{state:'separate',amount_paise:123,basis:'dwelling',period:'month'}};
 m.preview=true;m.user={id:'owner'};m.listing={...m.listing,...v.listing};m.readiness=evaluateReadiness(v);
 render(await ListingDetailPage({params:Promise.resolve({slug:'synthetic-owner-display'}), searchParams: Promise.resolve({})}));
 expect(screen.getByText('INR 1234.50 / month')).toBeVisible();expect(screen.getByText('Basis: dwelling · period: month')).toBeVisible();
 expect(screen.getByText('One-time deposit: INR 0.00')).toBeVisible();expect(screen.getByText('Maintenance: INR 1.23 / month / dwelling')).toBeVisible();
});
it.each(['two-wheelers','cars','property'] as const)('existing owner %s preview uses supported saved declarations',async family=>{
 const v=fixture(family);v.listing.category_attributes=family==='property'?{area_sqft:123.45}:{year:{state:'known',value:2024},km_driven:{state:'known',value:0}};
 m.preview=true;m.user={id:'owner'};m.readiness=evaluateReadiness(v);m.listing={...m.listing,...v.listing};
 render(await ListingDetailPage({params:Promise.resolve({slug:'synthetic-owner-display'}), searchParams: Promise.resolve({})}));
 expect(screen.getByText(family==='property'?'123.45':'2024')).toBeVisible();
 expect(screen.queryByText('[object Object]')).toBeNull();
 if(family==='property')expect(screen.getByText('INR 1234.50 / month')).toBeVisible();
});
