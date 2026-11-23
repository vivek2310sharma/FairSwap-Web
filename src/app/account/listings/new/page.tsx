import { CANONICAL_POSTING_PATH, resolveCreationQuery } from "@/lib/listings/canonical-posting-route";
import { loadGoodsBindings, loadGoodsDefinition } from "@/lib/listings/ordinary-goods/server";
import { loadTaxonomy } from "@/lib/listings/taxonomy-v2-server";
import { carsV1 } from "@/lib/listings/cars/contract";
import { twoWheelerV1 } from "@/lib/listings/two-wheeler/contract";
import { propertyV1 } from "@/lib/listings/property/contract";
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

// Filter loaded references against the existing specialist forms; canonical IDs
// and unsupported paths/fields never enter a specialist write payload.
function eligible<T extends {path:string[];fields:string[];is_active:boolean;new_listing_enabled:boolean}>(
  references: {categories:T[];error?:string} | undefined,
  definition: {paths:{path:string[];fields:string[]}[]},
): T[] {
  return !references || references.error ? [] : references.categories.filter(c => c.is_active && c.new_listing_enabled &&
    definition.paths.some(p => JSON.stringify(p.path) === JSON.stringify(c.path) && JSON.stringify(p.fields) === JSON.stringify(c.fields)));
}

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
  if (query.category !== undefined) {
    const choice = resolveCreationQuery(query);
    if (choice.kind !== "category") redirect(CANONICAL_POSTING_PATH);

    const catalogue = await loadTaxonomy(supabase, loadGoodsBindings(supabase));
    const selected = catalogue?.flatMap(group => group.subs).find(node => node.id === choice.slug);
    if (integrationEnabled && (selected?.route.kind === "vehicles" || selected?.route.kind === "property")) {
      const route = selected.route;
      const testSubmission = isVerifiedSubmissionTestEnvironment(process.env);
      const submission = {
        cars: testSubmission || isVerifiedProductionFamilyLaunchEnvironment(process.env,"cars"),
        twoWheelers: testSubmission || isVerifiedProductionFamilyLaunchEnvironment(process.env,"two-wheelers"),
        property: testSubmission || isVerifiedProductionFamilyLaunchEnvironment(process.env,"property"),
      };
      const ready = route.kind === "property" ? submission.property : route.family === "cars" ? submission.cars : submission.twoWheelers;
      const typed = supabase as SupabaseClient<Database>;
      const vehicleReferences = ready && route.kind === "vehicles" ? await loadVehicleReferences(typed,undefined,route.family) : undefined;
      const propertyReferences = ready && route.kind === "property" ? await loadPropertyReferences(typed) : undefined;
      const vehicleCategories = eligible(vehicleReferences,route.kind === "vehicles" && route.family === "cars" ? carsV1 : twoWheelerV1);
      const propertyCategories = route.kind === "property" ? eligible(propertyReferences,propertyV1).filter(c=>route.paths.includes(c.path.slice(1).join("/"))) : [];
      const back = <Link className={styles.back} href={CANONICAL_POSTING_PATH}><ArrowLeft size={18} aria-hidden="true"/> Categories</Link>;
      if (!ready || !(vehicleCategories.length || propertyCategories.length))
        return <main id="posting-content" className={styles.journey}>{back}<h1>This category isn’t available right now</h1></main>;
      const locationRequest=loadPostAdLocations(supabase);
      const [references,locations]=await Promise.all([loadGoodsReferences(supabase,undefined,locationRequest),locationRequest]);
      if (locations.status !== "ready" || !locations.cities.length)
        return <main id="posting-content" className={styles.journey}>{back}<p role="alert">We couldn’t load your area options. Please try again shortly.</p></main>;
      return <main id="posting-content" className={styles.journey}>{back}
        <GoodsPostAdEntry canonicalCategory={choice.slug} catalogue={catalogue} references={references} locations={locations}
          vehicles={vehicleReferences ? {...vehicleReferences,categories:vehicleCategories} : undefined}
          property={propertyReferences ? {...propertyReferences,categories:propertyCategories} : undefined}
          submission={submission} isMaintenanceActive={isMaintenanceActive}
          maintenanceMessage={isMaintenanceActive ? SELLER_WRITE_MAINTENANCE_MESSAGE : undefined}/>
      </main>;
    }
    const definition = selected?.route.kind === "ordinary-goods"
      ? await loadGoodsDefinition(supabase, choice.slug).catch(() => null)
      : null;
    const back = <Link className={styles.back} href={CANONICAL_POSTING_PATH}><ArrowLeft size={18} aria-hidden="true"/> Categories</Link>;
    if (!selected || selected.route.kind !== "ordinary-goods" || !definition ||
        definition.category_id !== selected.route.categoryId) {
      return <main id="posting-content" className={styles.journey}>{back}<h1>This category isn’t available right now</h1></main>;
    }

    const [{ default: OrdinaryGoodsForm }, locations] = await Promise.all([
      import("@/components/listings/posting/OrdinaryGoodsForm"), loadPostAdLocations(supabase),
    ]);
    if (locations.status !== "ready") {
      return <main id="posting-content" className={styles.journey}>{back}<p role="alert">We couldn’t load your area options. Please try again shortly.</p></main>;
    }
    return <main id="posting-content" className={styles.journey}>{back}
      <OrdinaryGoodsForm key={`${user.id}:${choice.slug}:${definition.revision}`}
        definition={definition} label={selected.label} cities={locations.cities} ownerId={user.id}
        maintenance={isMaintenanceActive}
        maintenanceMessage={isMaintenanceActive ? SELLER_WRITE_MAINTENANCE_MESSAGE : undefined}/>
    </main>;
  }

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
    const [references,twRaw,carsRaw,propertyRaw,locations,catalogue]=await Promise.all([loadGoodsReferences(supabase,undefined,locationRequest),isTwoWheelerEnabled()?loadVehicleReferences(typed):undefined,isCarsEnabled()?loadVehicleReferences(typed,undefined,"cars"):undefined,isPropertyEnabled()?loadPropertyReferences(typed):undefined,locationRequest,loadTaxonomy(supabase,loadGoodsBindings(supabase).then(goods => ({
      ...goods, "specialist:phone":mobileCatalogue?.listing_category_id,
      "specialist:tablet":tabletCatalogue?.listing_category_id,"specialist:wearable":wearableCatalogue?.listing_category_id,
    })))]);
    const tw=twRaw?{...twRaw,categories:eligible(twRaw,twoWheelerV1)}:undefined;
    const cars=carsRaw?{...carsRaw,categories:eligible(carsRaw,carsV1)}:undefined;
    const property=propertyRaw?{...propertyRaw,categories:eligible(propertyRaw,propertyV1)}:undefined;
    // Each vehicle family is judged on its own loader result; a failing family is dropped
    // so it can neither block nor enable the other. No healthy family => no vehicle form.
    const healthy=(v?:{categories:unknown[];error?:string})=>!!v&&!v.error&&v.categories.length>0;
    const twOk=healthy(tw)?tw:undefined,carsOk=healthy(cars)?cars:undefined;
    const vehicles=twOk||carsOk ? {categories:[...(twOk?.categories??[]),...(carsOk?.categories??[])],states:twOk?.states.length?twOk.states:carsOk?.states??[]} : undefined;
    const testSubmission=isVerifiedSubmissionTestEnvironment(process.env);
    const submission={twoWheelers:testSubmission||isVerifiedProductionFamilyLaunchEnvironment(process.env,"two-wheelers"),cars:testSubmission||isVerifiedProductionFamilyLaunchEnvironment(process.env,"cars"),property:testSubmission||isVerifiedProductionFamilyLaunchEnvironment(process.env,"property")};
    return <main id="posting-content" className={styles.journey}>
      <Link href="/account/listings" className={styles.back}><ArrowLeft size={18} aria-hidden="true"/> My ads</Link>
      <div className="mt-6"><GoodsPostAdEntry catalogue={catalogue} wearables={!!wearableCatalogue} tablets={!!tabletCatalogue} accessories={!!accessoryCatalogue} mobilePhones={!!mobileCatalogue} submission={submission} references={references} vehicles={vehicles} property={property} locations={locations} isMaintenanceActive={isMaintenanceActive} maintenanceMessage={isMaintenanceActive ? SELLER_WRITE_MAINTENANCE_MESSAGE : undefined} /></div>
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
