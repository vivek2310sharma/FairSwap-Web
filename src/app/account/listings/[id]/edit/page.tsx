import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ListingForm from "@/components/listings/ListingForm";
import PendingOwnerListing from '@/components/listings/PendingOwnerListing';
import {loadSubmissionState} from '@/lib/listings/submission-server';
import {isVerifiedSubmissionTestEnvironment,isVerifiedProductionFamilySubmissionRouteEnvironment} from '@/lib/listings/test-runtime';
import {loadOwnerReadiness} from '@/lib/listings/readiness-server';
import {isPropertyEnabled,loadPropertyReferences,financialFromContext} from '@/lib/listings/property/server';
import { ListingCategoryReference, ListingAttributeReference, City, Listing, ListingMedia, PincodeLookupResult } from "@/types/listing";
import type { Database } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";
import { lookupPincodeServer } from "@/lib/location/pincode";
import { isGoodsPostAdEnabled, loadGoodsReferences } from "@/lib/listings/post-ad-server";
import { loadSavedCategoryContext } from "@/lib/listings/saved-category-context";
import { isTwoWheelerEnabled, isCarsEnabled, loadVehicleReferences, resolutionFromContext, type VehicleContext } from "@/lib/listings/two-wheeler/server";
import {
  isSellerWriteMaintenanceEnabled,
  SELLER_WRITE_MAINTENANCE_MESSAGE,
} from "@/lib/maintenance/seller-writes";

export default async function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const isMaintenanceActive = isSellerWriteMaintenanceEnabled();
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/auth/sign-in?next=/account/listings/${id}/edit`);
  }

  // Fetch listing
  const { data: baseListing, error: listingError } = await supabase
    .from("listings")
    .select(`
      id,
      seller_id,
      slug,
      category_id,
      city_id,
      locality_id,
      title,
      description,
      condition,
      price_type,
      price_paise,
      category_attributes,
      status,
      revision,
      renewal_count,
      rejection_reason,
      removal_reason,
      removed_by,
      cover_photo_id,
      created_at,
      updated_at,
      submitted_at,
      published_at,
      expires_at,
      sold_at
    `)
    .eq("id", id)
    .single();

  if (listingError || !baseListing) {
    notFound();
  }

  if (baseListing.seller_id !== user.id) {
    redirect("/account/listings");
  }
  const readiness=await loadOwnerReadiness(supabase as SupabaseClient<Database>,id);
  let submission;
  try{if(baseListing.status==='pending_review'||isVerifiedSubmissionTestEnvironment(process.env)||isVerifiedProductionFamilySubmissionRouteEnvironment(process.env))submission=await loadSubmissionState(supabase,id);}catch{return <p role="alert">Saved submission eligibility could not be loaded. Reload to try again.</p>;}

  // Fetch private location fields via owner-private path
  const { data: privLocData } = await (
    supabase as SupabaseClient<Database>
  ).rpc("get_seller_listing_location_private", { p_listing_id: id });
  const privateLoc = Array.isArray(privLocData) ? privLocData[0] : null;

  const listing: Listing = {
    ...(baseListing as Omit<Listing, "pin_code" | "landmark">),
    pin_code: privateLoc?.pin_code ?? null,
    landmark: privateLoc?.landmark ?? null,
  };

  // Fetch photos
  const { data: media } = await supabase
    .from("listing_media")
    .select("*")
    .eq("listing_id", id)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true });

  // Fetch reference data (excluding nationwide localities)
  if(submission?.family&&listing.status==='pending_review'){
    const property=submission.family==='property'?await supabase.from('listing_property_contexts').select('society_name').eq('listing_id',id).maybeSingle():null;
    if(property?.error)return <p role="alert">Saved private Property details could not be loaded.</p>;
    return <PendingOwnerListing listing={listing} media={(media as ListingMedia[])||[]} readiness={readiness} {...(property?{society:property.data?.society_name}:{})}/>;
  }
  if(isPropertyEnabled()){
    const result=await (supabase as SupabaseClient<Database>).from('listing_property_contexts').select('*').eq('listing_id',id).maybeSingle();
    if(result.error)return <p role="alert">Saved Property context could not be loaded.</p>;
    if(result.data){
      const references=await loadPropertyReferences(supabase as SupabaseClient<Database>,{listingId:id,categoryId:listing.category_id,context:result.data});
      if(references.error)return <p role="alert">{references.error}</p>;
      let financial;try{financial=financialFromContext(result.data);}catch{return <p role="alert">Saved rental declarations could not be verified.</p>;}
      const {data:cities}=await supabase.from('cities').select('*').eq('is_active',true).order('name');
      const location=listing.pin_code?await lookupPincodeServer(listing.pin_code,supabase):null;
      return <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6"><Link href="/account/listings" className="text-sm text-emerald-700">Back to My ads</Link><h1 className="my-4 text-2xl font-bold">Edit Property rental draft</h1><ListingForm submissionEnabled={submission?.enabled??false} readiness={readiness} postAdEntry="property" property={{references,initialFinancial:financial,initialSociety:result.data.society_name}} categories={references.categories.map(c=>({...c,name:`${c.path[1]} › ${c.path[2]}`}))} allAttributes={[]} cities={(cities as City[])||[]} initialListing={listing} initialMedia={(media as ListingMedia[])||[]} initialLocationLookup={location} isMaintenanceActive={isMaintenanceActive} maintenanceMessage={isMaintenanceActive?SELLER_WRITE_MAINTENANCE_MESSAGE:undefined}/></div>;
    }
    const contract=await (supabase as SupabaseClient<Database>).from('property_category_contracts').select('category_id').eq('category_id',listing.category_id).limit(1);
    if(contract.error||contract.data?.length)return <p role="alert">Saved Property context is missing. Editing is unavailable.</p>;
  }
  const vehicleEnabled=isTwoWheelerEnabled()||isCarsEnabled();
  let family: "two-wheelers"|"cars"="two-wheelers";
  let vehicleResult:{data:VehicleContext|null;error:unknown}|null=null;
  if(isTwoWheelerEnabled()){
    try { vehicleResult=await (supabase as SupabaseClient<Database>).from("listing_vehicle_contexts").select("*").eq("listing_id",id).maybeSingle(); }
    catch { return <p role="alert">Saved vehicle context could not be loaded. Please try again.</p>; }
  }
  if(vehicleResult?.error) return <p role="alert">Saved vehicle context could not be loaded. Please try again.</p>;
  if(!vehicleResult?.data && isCarsEnabled()){
    try { vehicleResult=await (supabase as SupabaseClient<Database>).from("listing_car_contexts").select("*").eq("listing_id",id).maybeSingle(); family="cars"; }
    catch { return <p role="alert">Saved car context could not be loaded. Please try again.</p>; }
    if(vehicleResult?.error)return <p role="alert">Saved car context could not be loaded. Please try again.</p>;
  }
  const vehicleContext=vehicleResult?.data;
  if (vehicleContext) {
    const references=await loadVehicleReferences(supabase as SupabaseClient<Database>,{listingId:id,categoryId:listing.category_id,context:vehicleContext},family);
    const {data:cities}=await supabase.from("cities").select("*").eq("is_active",true).order("name");
    const location=listing.pin_code?await lookupPincodeServer(listing.pin_code,supabase):null;
    return <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6"><Link href="/account/listings" className="text-sm text-emerald-700">Back to My ads</Link><h1 className="my-4 text-2xl font-bold">Edit vehicle draft</h1>{references.error?<p role="alert">{references.error}</p>:<ListingForm submissionEnabled={submission?.enabled??false} readiness={readiness} postAdEntry="vehicle" vehicle={{references,initialResolution:resolutionFromContext(vehicleContext)}} categories={references.categories.map(c=>({...c,name:`${c.path[1]} › ${c.path[2]}`}))} allAttributes={[]} cities={(cities as City[])||[]} initialListing={listing} initialMedia={(media as ListingMedia[])||[]} initialLocationLookup={location} isMaintenanceActive={isMaintenanceActive} maintenanceMessage={isMaintenanceActive?SELLER_WRITE_MAINTENANCE_MESSAGE:undefined}/>}</div>;
  }
  // Saved category, never edit query parameters, determines the staging Goods context.
  const integrationEnabled = isGoodsPostAdEnabled();
  const saved = integrationEnabled ? await loadSavedCategoryContext(supabase,id) : null;
  if (saved?.status==="error") return <p role="alert">Saved category is unavailable to your account.</p>;
  if (saved?.status==="ready" && saved.context.category.id!==listing.category_id) return <p role="alert">Saved category could not be verified.</p>;
  if(vehicleEnabled && saved?.status==="ready" && saved.context.category.macro_category==="vehicles") return <p role="alert">Saved vehicle context is missing. Editing is unavailable.</p>;
  const goods = saved?.status==="ready" && saved.context.category.macro_category === "goods";
  const goodsReferences = goods && saved?.status==="ready" ? await loadGoodsReferences(supabase,saved.context) : null;
  if (goodsReferences?.status === "error") return <p role="alert">{goodsReferences.message}</p>;
  const legacySaved = !goods && saved?.status==="ready" ? saved.context : null;
  const { data: discoveredCategories } = goodsReferences?.status === "ready" ? {data: goodsReferences.categories} : await supabase
    .from("categories")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  const categories:ListingCategoryReference[] = legacySaved
    ? [...(discoveredCategories || []).filter(row=>row.id!==legacySaved.category.id),legacySaved.category]
    : discoveredCategories || [];
  const legacyNewIds=legacySaved ? categories.filter(row=>row.id!==legacySaved.category.id).map(row=>row.id) : null;

  const { data: discoveredAttributes } = goodsReferences?.status === "ready" ? {data: goodsReferences.attributes} : legacyNewIds
    ? legacyNewIds.length ? await supabase.from("category_attributes").select("*").in("category_id",legacyNewIds).order("sort_order",{ascending:true}) : {data:[]}
    : await supabase
    .from("category_attributes")
    .select("*")
    .order("sort_order", { ascending: true });
  const allAttributes:ListingAttributeReference[] = legacySaved
    ? [...(discoveredAttributes || []).filter(row=>row.category_id!==legacySaved.category.id),...legacySaved.attributes]
    : discoveredAttributes || [];

  const { data: cities } = goodsReferences?.status === "ready" ? {data: goodsReferences.cities} : await supabase
    .from("cities")
    .select("*")
    .eq("is_active", true)
    .order("name", { ascending: true });

  // Server-hydrate location lookup for this listing's specific PIN code
  let initialLocationLookup: PincodeLookupResult | null = null;
  if (listing.pin_code) {
    initialLocationLookup = await lookupPincodeServer(listing.pin_code, supabase);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="mb-6">
        <Link
          href="/account/listings"
          className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
        >
          Back to My ads
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Edit ad</h1>
        <p className="mt-1 text-sm text-gray-600">
          Update your item details, manage photos, and submit for review.
        </p>
      </div>

      <ListingForm
        readiness={readiness}
        {...(goods ? {postAdEntry: "goods" as const} : {})}
        categories={categories}
        allAttributes={allAttributes}
        cities={(cities as City[]) || []}
        initialListing={listing}
        initialMedia={(media as ListingMedia[]) || []}
        initialLocationLookup={initialLocationLookup}
        isMaintenanceActive={isMaintenanceActive}
        maintenanceMessage={isMaintenanceActive ? SELLER_WRITE_MAINTENANCE_MESSAGE : undefined}
      />
    </div>
  );
}
