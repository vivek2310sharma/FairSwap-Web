import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ListingForm from "@/components/listings/ListingForm";
import {isPropertyEnabled,loadPropertyReferences} from '@/lib/listings/property/server';
import { sanitizeRedirectPath } from "@/lib/security/redirect";
import { Category, CategoryAttribute, City } from "@/types/listing";
import GoodsPostAdEntry from "@/components/listings/GoodsPostAdEntry";
import { isGoodsPostAdEnabled, loadGoodsReferences } from "@/lib/listings/post-ad-server";
import {loadPostAdLocations} from '@/lib/listings/post-ad-locations';
import { isTwoWheelerEnabled, isCarsEnabled, loadVehicleReferences } from "@/lib/listings/two-wheeler/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

import {
  isSellerWriteMaintenanceEnabled,
  SELLER_WRITE_MAINTENANCE_MESSAGE,
} from "@/lib/maintenance/seller-writes";

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
    const vehicles=tw||cars ? {categories:[...(tw?.categories??[]),...(cars?.categories??[])],states:tw?.states.length?tw.states:cars?.states??[],error:tw?.error??cars?.error} : undefined;
    return <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Link href="/account/listings" className="text-sm font-medium text-emerald-600 hover:text-emerald-700">← Back to My Listings</Link>
      <div className="mt-6"><GoodsPostAdEntry references={references} vehicles={vehicles} property={property} locations={locations} isMaintenanceActive={isMaintenanceActive} maintenanceMessage={isMaintenanceActive ? SELLER_WRITE_MAINTENANCE_MESSAGE : undefined} /></div>
    </div>;
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
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="mb-6">
        <Link
          href="/account/listings"
          className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
        >
          ← Back to My Listings
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Create New Listing</h1>
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
    </div>
  );
}
