import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {submitListingAction} from '@/app/account/listings/actions';
const m=vi.hoisted(()=>({client:vi.fn(),enabled:vi.fn()}));
vi.mock('@/lib/supabase/server',()=>({createClient:m.client}));
vi.mock('@/lib/compliance/policy-acceptance',()=>({requireCurrentPolicyAcceptance:vi.fn(async()=>({allowed:true}))}));
vi.mock('@/lib/listings/property/server',()=>({isPropertyEnabled:m.enabled,savePropertyDraft:vi.fn()}));
vi.mock('@/lib/maintenance/seller-writes',()=>({isSellerWriteMaintenanceEnabled:()=>false,SELLER_WRITE_MAINTENANCE_MESSAGE:'Maintenance'}));
vi.mock('next/cache',()=>({revalidatePath:vi.fn()}));
vi.mock('@/lib/logger',()=>({logger:{info:vi.fn(),warn:vi.fn()}}));
const id='11111111-1111-4111-8111-111111111111';
beforeEach(()=>{vi.clearAllMocks();vi.stubGlobal('fetch',vi.fn(()=>{throw Error('Network forbidden')}));});
afterEach(()=>vi.unstubAllGlobals());
function client(categories:unknown,context:unknown=null,error:unknown=null){const rpc=vi.fn(async(name:string)=>({data:name==='get_seller_listing_location_private'?[{pin_code:'302021'}]:null,error:null}));const from=vi.fn(()=>{const q={select:()=>q,eq:()=>q,single:async()=>({data:{locality_id:null,categories},error:null}),maybeSingle:async()=>({data:context,error})};return q;});m.client.mockResolvedValue({from,rpc});return {from,rpc};}
it.each([{slug:'rental-apartment-or-flat'},[{slug:'rental-apartment-or-flat'}]])('canonical Property refuses application submission even when flag OFF: %j',async categories=>{m.enabled.mockReturnValue(false);const c=client(categories);expect(await submitListingAction(id)).toEqual({error:'Property review/publication is disabled'});expect(c.rpc).not.toHaveBeenCalled();expect(c.from).toHaveBeenCalledTimes(1);});
it('closed saved category with an owner Property context remains application draft-only',async()=>{m.enabled.mockReturnValue(true);const c=client(null,{listing_id:id});expect(await submitListingAction(id)).toEqual({error:'Property review/publication is disabled'});expect(c.rpc).not.toHaveBeenCalled();expect(c.from).toHaveBeenCalledWith('listing_property_contexts');});
it('context lookup failure cannot fall through to submission',async()=>{m.enabled.mockReturnValue(true);const c=client(null,null,{code:'READ_FAILED'});expect(await submitListingAction(id)).toEqual({error:'Unable to verify draft submission eligibility'});expect(c.rpc).not.toHaveBeenCalled();});
it('OFF leaves an unrelated Goods submission free of Property schema dependencies',async()=>{m.enabled.mockReturnValue(false);const c=client({slug:'existing-goods'});expect(await submitListingAction(id)).toMatchObject({success:true,listingId:id});expect(c.from).toHaveBeenCalledTimes(1);expect(c.rpc).toHaveBeenCalledWith('seller_submit_listing',{listing_id:id});});
