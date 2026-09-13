import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { type Profile } from "@/types/account";

interface SellerPageProps {
  params: Promise<{ id: string }>;
}

export default async function SellerProfilePage({ params }: SellerPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, bio, city, state, created_at")
    .eq("id", id)
    .single<Profile>();

  // If profile is not found, or hidden by RLS due to suspension/deletion, return 404
  if (error || !profile) {
    notFound();
  }

  const memberSince = new Date(profile.created_at).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{profile.display_name}</h1>
            <p className="mt-1 text-sm text-gray-500">Member since {memberSince}</p>
          </div>
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
            Registered Seller
          </span>
        </div>

        <div className="mt-6 border-t border-gray-100 pt-6">
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase text-gray-500">Location</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {profile.city ? `${profile.city}, ${profile.state || ""}` : "Not specified"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-gray-500">Active Listings</dt>
              <dd className="mt-1 text-sm text-gray-500">None yet (Marketplace opens in Milestone 1.3)</dd>
            </div>
          </dl>

          {profile.bio && (
            <div className="mt-6 border-t border-gray-100 pt-6">
              <h2 className="text-xs font-semibold uppercase text-gray-500">About this seller</h2>
              <p className="mt-2 text-sm text-gray-700">{profile.bio}</p>
            </div>
          )}
        </div>

        <div className="mt-8 border-t border-gray-100 pt-6">
          <Link href="/" className="text-sm font-semibold text-emerald-600 hover:text-emerald-500">
            &larr; Back to FairSwap Home
          </Link>
        </div>
      </div>
    </div>
  );
}
