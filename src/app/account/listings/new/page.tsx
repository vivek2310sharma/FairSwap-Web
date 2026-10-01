import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ListingForm from "@/components/listings/ListingForm";
import { Category, CategoryAttribute, City } from "@/types/listing";

import {
  isSellerWriteMaintenanceEnabled,
  SELLER_WRITE_MAINTENANCE_MESSAGE,
} from "@/lib/maintenance/seller-writes";

export default async function NewListingPage() {
  const isMaintenanceActive = isSellerWriteMaintenanceEnabled();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/sign-in?next=/account/listings/new");
  }

  // Fetch reference data
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
        categories={(categories as Category[]) || []}
        allAttributes={(allAttributes as CategoryAttribute[]) || []}
        cities={(cities as City[]) || []}
        isMaintenanceActive={isMaintenanceActive}
        maintenanceMessage={isMaintenanceActive ? SELLER_WRITE_MAINTENANCE_MESSAGE : undefined}
      />
    </div>
  );
}
