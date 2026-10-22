import 'server-only';
import {z} from 'zod';
import type {SupabaseClient} from '@supabase/supabase-js';
import type {Database} from '@/types/database';
import {isVerifiedPostAdTestEnvironment,isVerifiedSubmissionTestEnvironment} from './test-runtime';

const stateSchema=z.object({family:z.enum(['two-wheelers','cars','property']).nullable(),enabled:z.boolean(),policy_key:z.string().nullable()}).strict();
export async function loadSubmissionState(client:SupabaseClient<Database>,listingId:string){
  if(!isVerifiedPostAdTestEnvironment(process.env))return null;
  const {data,error}=await client.rpc('get_seller_submission_status',{listing_id:listingId});
  const parsed=stateSchema.safeParse(data);
  if(error||!parsed.success)throw Error('Saved submission eligibility could not be verified. Please reload.');
  return {...parsed.data,enabled:parsed.data.enabled&&isVerifiedSubmissionTestEnvironment(process.env)};
}
