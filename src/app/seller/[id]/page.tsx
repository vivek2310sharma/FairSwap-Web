import { notFound } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { ListingCard } from "@/components/listings/ListingCard";
import { createClient } from "@/lib/supabase/server";
import { getSellerPublicListings } from "@/lib/discovery/queries";
import { type Profile } from "@/types/account";
import { MapPin, Calendar, ShoppingBag, ArrowLeft, User } from "lucide-react";
import { Metadata } from "next";

interface SellerPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: SellerPageProps): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, bio")
    .eq("id", id)
    .maybeSingle();

  if (!profile) {
    return { title: "Seller Profile — FairSwap" };
  }

  return {
    title: `${profile.display_name} — Seller Profile | FairSwap`,
    description: profile.bio || `View listings posted by ${profile.display_name} on FairSwap.`,
  };
}

export default async function SellerProfilePage({ params }: SellerPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: profile, error }, activeListings] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, display_name, avatar_url, bio, city, state, created_at")
      .eq("id", id)
      .single<Profile>(),
    getSellerPublicListings(id),
  ]);

  // If profile is not found, or hidden by RLS due to suspension/deletion, return 404
  if (error || !profile) {
    notFound();
  }

  const memberSince = new Date(profile.created_at).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
  });

  return (
    <>
      <Header />

      <main className="flex-1 bg-surface/20">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          {/* Breadcrumbs */}
          <div className="mb-6">
            <Link
              href="/search"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              Back to listings
            </Link>
          </div>

          {/* Seller Profile Header */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-xs sm:p-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-5">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-100 text-brand-700 font-bold text-2xl dark:bg-brand-950 dark:text-brand-300 shadow-xs">
                  {profile.display_name?.charAt(0).toUpperCase() || <User className="h-8 w-8" />}
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold text-foreground">
                      {profile.display_name}
                    </h1>
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                      Registered Seller
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-muted">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Member since {memberSince}</span>
                    </div>

                    {profile.city && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>
                          {profile.city}
                          {profile.state ? `, ${profile.state}` : ""}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-sm font-medium text-muted sm:text-right">
                <span className="text-lg font-bold text-foreground">{activeListings.length}</span>{" "}
                active {activeListings.length === 1 ? "ad" : "ads"}
              </div>
            </div>

            {profile.bio && (
              <div className="mt-6 border-t border-border/60 pt-6">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
                  About this seller
                </h2>
                <p className="mt-2 text-sm text-foreground/90 leading-relaxed">
                  {profile.bio}
                </p>
              </div>
            )}
          </div>

          {/* Seller's Active Listings Grid */}
          <div className="mt-10">
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              Active Listings ({activeListings.length})
            </h2>

            {activeListings.length > 0 ? (
              <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {activeListings.map((listing) => (
                  <ListingCard key={listing.id} listing={listing} />
                ))}
              </div>
            ) : (
              <div className="mt-6 rounded-2xl border border-border bg-card p-12 text-center">
                <ShoppingBag className="mx-auto h-12 w-12 text-muted opacity-40" aria-hidden="true" />
                <h3 className="mt-3 text-base font-semibold text-foreground">
                  No active listings
                </h3>
                <p className="mt-1 text-xs text-muted max-w-sm mx-auto">
                  This seller does not currently have any active advertisements available for sale.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
