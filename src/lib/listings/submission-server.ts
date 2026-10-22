import 'server-only';
import {z} from 'zod';
import type {SupabaseClient} from '@supabase/supabase-js';
import type {Database} from '@/types/database';
import {
  isVerifiedPostAdTestEnvironment,
  isVerifiedSubmissionTestEnvironment,
  isVerifiedProductionFamilyLaunchEnvironment,
  isVerifiedProductionFamilySubmissionRouteEnvironment,
} from './test-runtime';
import {productionFamilyRpcClient} from './production-family-rpc';

const stateSchema=z.object({
  family:z.enum(['two-wheelers','cars','property']).nullable(),
  enabled:z.boolean(),
  policy_key:z.string().nullable(),
}).strict();

/** Only the saved, owned listing's server-authoritative family is trusted.
 * Test and Production have separately named RPCs, enabling zero cross-environment
 * privilege or action inference. Unavailable eligibility fails closed. */
export async function loadSubmissionState(client:SupabaseClient<Database>,listingId:string){
  const production=isVerifiedProductionFamilySubmissionRouteEnvironment(process.env);
  if(!isVerifiedPostAdTestEnvironment(process.env) && !production)return null;
  const {data,error}=production
    ? await productionFamilyRpcClient(client).rpc('get_seller_production_submission_status',{listing_id:listingId})
    : await client.rpc('get_seller_submission_status',{listing_id:listingId});
  const parsed=stateSchema.safeParse(data);
  if(error||!parsed.success)throw Error('Saved submission eligibility could not be verified. Please reload.');
  const family=parsed.data.family;
  return {
    ...parsed.data,
    enabled:parsed.data.enabled && (production
      ? family!==null && isVerifiedProductionFamilyLaunchEnvironment(process.env,family)
      : isVerifiedSubmissionTestEnvironment(process.env)),
  };
}
