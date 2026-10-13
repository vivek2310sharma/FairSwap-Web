import type {SupabaseClient} from '@supabase/supabase-js';
import type {Database} from '@/types/database';
import {requiresSavedSubmissionFamilyReads} from './test-runtime';

/** Uses request-owner RLS reads; never a caller-supplied family flag. */
export async function hasSavedSubmissionFamily(client:SupabaseClient<Database>,listingId:string):Promise<boolean>{
  if(!requiresSavedSubmissionFamilyReads(process.env))return false;
  const results=await Promise.all(['listing_vehicle_contexts','listing_car_contexts','listing_property_contexts'].map(table=>
    client.from(table as 'listing_vehicle_contexts'|'listing_car_contexts'|'listing_property_contexts').select('listing_id').eq('listing_id',listingId).maybeSingle()));
  if(results.some(r=>r.error))throw Error('Saved listing family could not be verified');
  return results.some(r=>r.data?.listing_id===listingId);
}
