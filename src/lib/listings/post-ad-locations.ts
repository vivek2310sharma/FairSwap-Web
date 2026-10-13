import 'server-only';
import type {SupabaseClient} from '@supabase/supabase-js';
import type {City} from '@/types/listing';

export type PostAdLocations = {status:'ready';cities:City[]} | {status:'error';message:string};

/** Shared active-city lookup must not depend on a section's category discovery. */
export async function loadPostAdLocations(client:SupabaseClient):Promise<PostAdLocations> {
  try {
    const {data,error}=await client.from('cities').select('*').eq('is_active',true).order('name',{ascending:true});
    if(!error&&Array.isArray(data))return {status:'ready',cities:data};
  } catch { /* Surface transport failures as location failures too. */ }
  return {status:'error',message:'Shared city/location references could not be loaded. Please try again later.'};
}
