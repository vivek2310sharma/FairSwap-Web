import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import styles from "@/components/listings/posting/Posting.module.css";
import Link from "next/link";
import WearableForm from "@/components/listings/WearableForm";
import { loadWearableCatalogue } from "@/lib/listings/wearables/server";
import TabletForm from "@/components/listings/TabletForm";
import {loadTabletCatalogue} from "@/lib/listings/tablets/server";
import AccessoryForm from "@/components/listings/AccessoryForm";
import {loadAccessoryCatalogue} from "@/lib/listings/accessories/server";
import MobilePhoneForm from "@/components/listings/MobilePhoneForm";
import { loadMobileCatalogue } from "@/lib/listings/mobiles/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ListingForm from "@/components/listings/ListingForm";
import {isPropertyEnabled,loadPropertyReferences} from '@/lib/listings/property/server';
import { sanitizeRedirectPath } from "@/lib/security/redirect";
import { Category, CategoryAttribute, City } from "@/types/listing";
import GoodsPostAdEntry from "@/components/listings/GoodsPostAdEntry";
import { isGoodsPostAdEnabled, loadGoodsReferences } from "@/lib/listings/post-ad-server";
import {loadPostAdLocations} from '@/lib/listings/post-ad-locations';
import { isVerifiedProductionFamilyLaunchEnvironment, isVerifiedSubmissionTestEnvironment } from "@/lib/listings/test-runtime";
import { isTwoWheelerEnabled, isCarsEnabled, loadVehicleReferences } from "@/lib/listings/two-wheeler/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

import {
  isSellerWriteMaintenanceEnabled,
  SELLER_WRITE_MAINTENANCE_MESSAGE,
} from "@/lib/maintenance/seller-writes";

export const metadata: Metadata = { title: "Post an ad | FairSwap.in" };

export default async function NewListingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const isMaintenanceActive = isSellerWriteMaintenanceEnabled();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(await searchParams)) {
      if (Array.isArray(value)) {
        for (const item of value) query.append(key, item);
      } else if (value !== undefined) {
        query.append(key, value);
      }
    }
    const pathname = "/account/listings/new";
    const search = query.toString();
    const next = sanitizeRedirectPath(
      search ? `${pathname}?${search}` : pathname,
      pathname
    );
    const signInQuery = new URLSearchParams({ next });
    redirect(`/auth/sign-in?${signInQuery.toString()}`);
  }

  const integrationEnabled = isGoodsPostAdEnabled();
  const query = await searchParams;
  const [mobileCatalogue,accessoryCatalogue,tabletCatalogue,wearableCatalogue] = await Promise.all([loadMobileCatalogue(supabase),loadAccessoryCatalogue(supabase),loadTabletCatalogue(supabase),loadWearableCatalogue(supabase)]);
  if(query.posting==="wearables"){
    if(!wearableCatalogue)return <main id="posting-content" className={styles.journey}><h1>This category isn’t available right now</h1><Link className={styles.back} href="/account/listings/new">Choose a category</Link></main>;
    const locations=await loadPostAdLocations(supabase);
    if(locations.status!=="ready")return <main id="posting-content" className={styles.journey}><h1>We couldn’t load your area options</h1><p role="alert">Please try again shortly.</p></main>;
    return <main id="posting-content" className={styles.journey}><Link className={styles.back} href="/account/listings/new"><ArrowLeft size={18} aria-hidden="true"/> Categories</Link><WearableForm key={user.id} ownerId={user.id} catalogue={wearableCatalogue} cities={locations.cities} maintenance={isMaintenanceActive} maintenanceMessage={isMaintenanceActive?SELLER_WRITE_MAINTENANCE_MESSAGE:undefined}/></main>;
  }
  if(query.posting==="tablets"){
    if(!tabletCatalogue)return <main id="posting-content" className={styles.journey}><h1>This category isn’t available right now</h1><Link href="/account/listings/new">Choose a category</Link></main>;
    const locations=await loadPostAdLocations(supabase);
    if(locations.status!=="ready")return <main id="posting-content" className={styles.journey}><h1>We couldn’t load your area options</h1><p role="alert">Please try again shortly.</p></main>;
    return <main id="posting-content" className={styles.journey}><Link className={styles.back} href="/account/listings/new"><ArrowLeft size={18} aria-hidden="true"/> Categories</Link><TabletForm key={user.id} ownerId={user.id} catalogue={tabletCatalogue} cities={locations.cities} maintenance={isMaintenanceActive} maintenanceMessage={isMaintenanceActive?SELLER_WRITE_MAINTENANCE_MESSAGE:undefined}/></main>;
  }
  if (query.posting === "mobile-accessories") {
    if (!accessoryCatalogue) return <main id="posting-content" className={styles.journey}><h1>This category isn’t available right now</h1><Link className={styles.back} href="/account/listings/new">Choose a category</Link></main>;
    const locations=await loadPostAdLocations(supabase);
    if(locations.status!=="ready")return <main id="posting-content" className={styles.journey}><h1>We couldn’t load your area options</h1><p role="alert">Please try again shortly.</p></main>;
    return <main id="posting-content" className={styles.journey}><Link className={styles.back} href="/account/listings/new"><ArrowLeft size={18} aria-hidden="true"/> Categories</Link><AccessoryForm key={user.id} ownerId={user.id} catalogue={accessoryCatalogue} cities={locations.cities} maintenance={isMaintenanceActive} maintenanceMessage={isMaintenanceActive?SELLER_WRITE_MAINTENANCE_MESSAGE:undefined}/></main>;
  }
  if (query.posting !== undefined) {
    if (query.posting !== "mobile-phones" || !mobileCatalogue) return <main id="posting-content" className={styles.journey}><h1>This category isn’t available right now</h1><Link className={styles.back} href="/account/listings/new">Choose a category</Link></main>;
    const locations = await loadPostAdLocations(supabase);
    if (locations.status !== "ready") return <main id="posting-content" className={styles.journey}><h1>We couldn’t load your area options</h1><p role="alert">Please try again shortly.</p><Link className={styles.back} href="/account/listings/new">Choose a category</Link></main>;
    return <main id="posting-content" className={styles.journey}><Link className={styles.back} href="/account/listings/new"><ArrowLeft size={18} aria-hidden="true"/> Categories</Link><MobilePhoneForm key={user.id} ownerId={user.id} catalogue={mobileCatalogue} cities={locations.cities} maintenance={isMaintenanceActive} maintenanceMessage={isMaintenanceActive ? SELLER_WRITE_MAINTENANCE_MESSAGE : undefined}/></main>;
  }
  // The former `?entry=legacy` creation route is retired wherever Post Ad is
  // active. Canonicalize every old/new `entry` variant so it cannot bypass
  // the main-category selector. Existing listing edit URLs are unaffected.
  if (integrationEnabled && query.entry !== undefined) {
    redirect("/account/listings/new");
  }
  if (integrationEnabled) {
    const typed=supabase as SupabaseClient<Database>;
    const locationRequest=loadPostAdLocations(supabase);
    const [references,tw,cars,property,locations]=await Promise.all([loadGoodsReferences(supabase,undefined,locationRequest),isTwoWheelerEnabled()?loadVehicleReferences(typed):undefined,isCarsEnabled()?loadVehicleReferences(typed,undefined,"cars"):undefined,isPropertyEnabled()?loadPropertyReferences(typed):undefined,locationRequest]);
    // Each vehicle family is judged on its own loader result; a failing family is dropped
    // so it can neither block nor enable the other. No healthy family => no vehicle form.
    const healthy=(v?:{categories:unknown[];error?:string})=>!!v&&!v.error&&v.categories.length>0;
    const twOk=healthy(tw)?tw:undefined,carsOk=healthy(cars)?cars:undefined;
    const vehicles=twOk||carsOk ? {categories:[...(twOk?.categories??[]),...(carsOk?.categories??[])],states:twOk?.states.length?twOk.states:carsOk?.states??[]} : undefined;
    const testSubmission=isVerifiedSubmissionTestEnvironment(process.env);
    const submission={twoWheelers:testSubmission||isVerifiedProductionFamilyLaunchEnvironment(process.env,"two-wheelers"),cars:testSubmission||isVerifiedProductionFamilyLaunchEnvironment(process.env,"cars"),property:testSubmission||isVerifiedProductionFamilyLaunchEnvironment(process.env,"property")};
    return <main id="posting-content" className={styles.journey}>
      <Link href="/account/listings" className={styles.back}><ArrowLeft size={18} aria-hidden="true"/> My ads</Link>
      <div className="mt-6"><GoodsPostAdEntry wearables={!!wearableCatalogue} tablets={!!tabletCatalogue} accessories={!!accessoryCatalogue} mobilePhones={!!mobileCatalogue} submission={submission} references={references} vehicles={vehicles} property={property} locations={locations} isMaintenanceActive={isMaintenanceActive} maintenanceMessage={isMaintenanceActive ? SELLER_WRITE_MAINTENANCE_MESSAGE : undefined} /></div>
    </main>;
  }

  // Flag OFF retains the original reference queries and creation form.
  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  const { data: allAttributes } = await supabase
    .from("category_attributes")
    .select("*")
    .order("sort_order", { ascending: true });

  const { data: cities } = await supabase
    .from("cities")
    .select("*")
    .eq("is_active", true)
    .order("name", { ascending: true });

  return (
    <main id="posting-content" className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="mb-6">
        <Link
          href="/account/listings"
          className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
        >
          Back to My ads
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Post Ad</h1>
        <p className="mt-1 text-sm text-gray-600">
          Fill in details for your item. Saving creates a draft; you can add photos on the next step.
        </p>
      </div>

      <ListingForm
        {...(integrationEnabled ? { postAdEntry: "legacy" as const } : {})}
        categories={((categories as Category[]) || []).filter(c=>!c.slug?.startsWith("tw-")&&!c.slug?.startsWith("car-")&&!c.slug?.startsWith('rental-'))}
        allAttributes={(allAttributes as CategoryAttribute[]) || []}
        cities={(cities as City[]) || []}
        isMaintenanceActive={isMaintenanceActive}
        maintenanceMessage={isMaintenanceActive ? SELLER_WRITE_MAINTENANCE_MESSAGE : undefined}
      />
    </main>
  );
}
