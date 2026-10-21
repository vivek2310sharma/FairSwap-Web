import { notFound, permanentRedirect } from "next/navigation";
import Link from "next/link";
import { Metadata } from "next";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { PhotoGallery } from "@/components/listings/PhotoGallery";
import { FavouriteButton } from "@/components/listings/FavouriteButton";
import { ContactSellerButton } from "@/components/listings/ContactSellerButton";
import { ListingCard } from "@/components/listings/ListingCard";
import { CompactSafetyNotice, IndiaSafetyCard } from "@/components/listings/IndiaSafetyAdvice";
import { ShareButton } from "@/components/listings/ShareButton";
import {
  getPublicListingBySlugOrId,
  getSellerPublicListings,
} from "@/lib/discovery/queries";
import { createClient } from "@/lib/supabase/server";
import { getBackToSearchHref } from "@/lib/navigation/search-context";
import {z} from 'zod';
import {loadOwnerReadiness} from '@/lib/listings/readiness-server';
import {reviewableField,reviewPacketSchema} from '@/lib/listings/submission-readiness';
import {propertyRentSummary,paiseToPropertyRupees} from '@/lib/listings/property/contract';
import type {Database} from '@/types/database';
import type {SupabaseClient} from '@supabase/supabase-js';
import {
  MapPin,
  Calendar,
  ArrowLeft,
  User,
  AlertTriangle,
  Info,
} from "lucide-react";

interface ListingDetailPageProps {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({
  params,
}: ListingDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const { listing, redirectSlug } = await getPublicListingBySlugOrId(slug);

  if (redirectSlug || !listing) {
    return {
      title: "Listing Details — FairSwap",
    };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const canonicalUrl = `${siteUrl}/listings/${listing.slug}`;

  const firstPhoto = listing.media?.[0];
  const photoUrl = firstPhoto
    ? `${siteUrl}/api/listings/${listing.id}/media/${firstPhoto.id}/large`
    : undefined;

  const formattedPrice =
    listing.price_type === "free"
      ? "Free"
      : listing.price_paise !== null && listing.price_paise !== undefined
      ? `₹${(listing.price_paise / 100).toLocaleString("en-IN")}`
      : "Price on request";

  const descriptionText = `${formattedPrice} • ${
    listing.description?.slice(0, 140) ||
    `Find ${listing.title} available for sale in ${listing.city?.name || "India"} on FairSwap.`
  }`;

  return {
    title: `${listing.title} — FairSwap`,
    description: descriptionText,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: `${listing.title} — FairSwap`,
      description: descriptionText,
      url: canonicalUrl,
      siteName: "FairSwap",
      type: "website",
      images: photoUrl ? [{ url: photoUrl, alt: listing.title }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title: `${listing.title} — FairSwap`,
      description: descriptionText,
      images: photoUrl ? [photoUrl] : [],
    },
  };
}

export default async function ListingDetailPage({ params, searchParams }: ListingDetailPageProps) {
  const { slug } = await params;
  const ctxParam = searchParams ? (await searchParams).ctx : undefined;
  const backHref = getBackToSearchHref(ctxParam);
  const { listing, redirectSlug, isOwnerOrStaffPreview } =
    await getPublicListingBySlugOrId(slug);

  // 1. Obsolete or UUID slug redirect after visibility verification
  if (redirectSlug) {
    permanentRedirect(`/listings/${redirectSlug}`);
  }

  // 2. Listing not found or withheld by RLS
  if (!listing) {
    notFound();
  }

  // 3. Fetch seller's other active listings and favourite state
  const supabase = await createClient();
  const [sellerOtherListings, { data: authData }] = await Promise.all([
    listing.seller_id
      ? getSellerPublicListings(listing.seller_id, listing.id)
      : Promise.resolve([]),
    supabase.auth.getUser(),
  ]);

  let isFavourited = false;
  if (authData?.user) {
    const { data: fav } = await supabase
      .from("favourites")
      .select("listing_id")
      .eq("user_id", authData.user.id)
      .eq("listing_id", listing.id)
      .maybeSingle();

    isFavourited = !!fav;
  }

  // Reuse the saved owner projection only on the existing authorized preview.
  // A captured packet must describe this exact record, not a newer revision.
  const assessment=isOwnerOrStaffPreview&&authData?.user?.id===listing.seller_id
    ?await loadOwnerReadiness(supabase as SupabaseClient<Database>,listing.id):null;
  const parsed=reviewPacketSchema.safeParse(assessment?.packet);
  const packet=parsed.success&&parsed.data.identity.id===listing.id
    &&parsed.data.identity.category_id===listing.category.id
    &&parsed.data.identity.revision===listing.revision
    &&parsed.data.identity.status===listing.status
    &&parsed.data.identity.updated_at===listing.updated_at
    &&parsed.data.consistency!=='mismatch'
    &&parsed.data.advertisement.title===listing.title
    &&parsed.data.advertisement.description===listing.description
    &&parsed.data.checks.some(c=>c.id==='reference.supported'&&c.outcome==='pass')
    ?parsed.data:null;
  let specifications: {field:string;label:string;value:string}[]=[];
  let specificationsUnavailable=!!assessment&&!packet;
  if(packet)specifications=packet.sellerAnswers;
  else if(!assessment){
    // Goods/legacy definitions remain the source of public field membership.
    // Failed/invalid reads never fall back to raw stored keys or nested values.
    const definitions=await supabase.from('category_attributes').select('category_id,name,label').eq('category_id',listing.category.id);
    const rows=z.array(z.object({category_id:z.string().uuid(),name:z.string(),label:z.string()})).safeParse(definitions.data);
    specificationsUnavailable=!!definitions.error||!rows.success||rows.data.some(a=>a.category_id!==listing.category.id);
    if(!specificationsUnavailable&&rows.success)specifications=rows.data.flatMap(a=>{
      const value=listing.category_attributes?.[a.name];
      return reviewableField(a.name)&&(typeof value==='string'||typeof value==='boolean'||typeof value==='number'&&Number.isFinite(value))
        ?[{field:a.name,label:a.label,value:String(value)}]:[];
    });
  }
  const rental=packet?.pricing.kind==='rental'?packet.pricing.financial:null;
  const formattedPrice = assessment&&!packet?'Saved amount could not be verified':
    packet?.family==='property'&&!rental?'Rental financial declarations could not be verified':
    rental?propertyRentSummary(rental):
    listing.price_type === "free"
      ? "Free"
      : listing.price_paise !== null && listing.price_paise !== undefined
      ? `₹${(listing.price_paise / 100).toLocaleString("en-IN")}`
      : "Price on request";

  const conditionLabels: Record<string, string> = {
    new: "Brand New",
    like_new: "Like New",
    good: "Good Condition",
    fair: "Fair Condition",
    poor: "For Parts / Poor",
  };

  const publishedDate = listing.published_at
    ? new Date(listing.published_at).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : new Date(listing.created_at).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });

  const memberSince = new Date(listing.seller.created_at).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

  return (
    <>
      <Header />

      <main className="flex-1 bg-surface/20">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Breadcrumb Navigation */}
          <div className="mb-6 flex items-center gap-2 text-xs text-muted">
            <Link href={backHref} className="hover:text-foreground inline-flex items-center gap-1">
              <ArrowLeft className="h-3 w-3" aria-hidden="true" />
              Back to search
            </Link>
            <span>/</span>
            {listing.category && (
              <>
                <Link
                  href={`/search?category=${listing.category.slug}`}
                  className="hover:text-foreground font-medium"
                >
                  {listing.category.name}
                </Link>
                <span>/</span>
              </>
            )}
            <span className="truncate max-w-xs text-foreground font-medium">
              {listing.title}
            </span>
          </div>

          {/* Owner/Staff Preview Notice */}
          {isOwnerOrStaffPreview && (
            <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/60 dark:text-amber-200">
              <div className="flex items-center gap-2 font-semibold">
                <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                <span>Privileged Preview Mode</span>
              </div>
              <p className="mt-1 text-xs">
                This listing has status <span className="font-bold uppercase">{listing.status}</span> and is
                currently withheld from public visitors. You can inspect it because you are the seller or authorized staff.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* Left Column: Photos & Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Photo Gallery */}
              <PhotoGallery
                listingId={listing.id}
                title={listing.title}
                media={listing.media}
              />

              {/* Title & Core Meta */}
              <div className="rounded-2xl border border-border bg-card p-6 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-3xl font-extrabold text-foreground">
                      {formattedPrice}
                    </span>
                    {listing.price_type === "negotiable" && (
                      <span className="rounded-md bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-muted dark:bg-neutral-800">
                        Negotiable
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <FavouriteButton
                      listingId={listing.id}
                      initialIsFavourited={isFavourited}
                      showText={true}
                    />
                    {!isOwnerOrStaffPreview && listing.status === "active" && (
                      <ShareButton
                        slug={listing.slug}
                        title={listing.title}
                        formattedPrice={formattedPrice}
                        variant="inline"
                      />
                    )}
                  </div>
                </div>

                <h1 className="mt-4 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  {listing.title}
                </h1>

                <div className="mt-4 flex flex-wrap items-center gap-y-2 gap-x-4 text-xs text-muted border-t border-border/60 pt-4">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-action-600" aria-hidden="true" />
                    <span>
                      {listing.locality?.name
                        ? `${listing.locality.name}, ${listing.city?.name}`
                        : listing.city?.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Posted on {publishedDate}</span>
                  </div>

                  {listing.condition && (
                    <span className="rounded-md bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-900 dark:bg-brand-950 dark:text-brand-300">
                      {conditionLabels[listing.condition] || listing.condition}
                    </span>
                  )}
                </div>
              </div>

              {/* Category-specific attributes if any */}
              {specificationsUnavailable&&<p role="status">Saved specifications could not be verified. No raw category values are displayed.</p>}
              {specifications.length > 0 && (
                  <div className="rounded-2xl border border-border bg-card p-6 shadow-xs">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                      Item Specifications
                    </h2>
                    <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
                      {specifications.map(answer => (
                        <div key={answer.field}>
                          <dt className="text-xs font-medium capitalize text-muted">
                            {answer.label}
                          </dt>
                          <dd className="mt-1 text-sm font-semibold text-foreground">
                            {answer.value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                )}

              {/* Description */}
              {rental&&<section aria-label="Rental financial declarations">
                <p>Basis: {rental.basis??'Unanswered'} · period: month</p>
                <p>One-time deposit: {rental.deposit?.state==='known'?`INR ${paiseToPropertyRupees(rental.deposit.amount_paise)}`:rental.deposit?.state??'Unanswered'}</p>
                <p>Maintenance: {rental.maintenance?.state==='separate'?`INR ${paiseToPropertyRupees(rental.maintenance.amount_paise)} / month / ${rental.maintenance.basis}`:rental.maintenance?.state??'Unanswered'}</p>
              </section>}
              <div className="rounded-2xl border border-border bg-card p-6 shadow-xs">
                <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                  Description
                </h2>
                <div className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-muted">
                  {listing.description || "No detailed description was provided for this item."}
                </div>
              </div>

              {/* Location disclaimer */}
              <div className="rounded-xl border border-border bg-surface p-4 flex items-start gap-3">
                <Info className="h-4 w-4 shrink-0 text-muted mt-0.5" aria-hidden="true" />
                <p className="text-xs text-muted leading-relaxed">
                  Location is provided as an approximate municipal reference ({listing.city?.name}
                  {listing.locality?.name ? `, ${listing.locality.name}` : ""}).
                  Exact pickup addresses are coordinated directly between buyer and seller upon mutual agreement.
                </p>
              </div>
            </div>

            {/* Right Column: Seller Profile & Safety */}
            <div className="space-y-6">
              {/* Seller Card */}
              <div className="rounded-2xl border border-border bg-card p-6 shadow-xs">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Seller Information
                </h2>

                <div className="mt-4 flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-brand-900 font-bold text-lg dark:bg-brand-950 dark:text-brand-300">
                    {listing.seller.display_name?.charAt(0).toUpperCase() || <User className="h-6 w-6" />}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground">
                      <Link
                        href={`/seller/${listing.seller.id}`}
                        className="hover:text-action-600 focus:outline-hidden"
                      >
                        {listing.seller.display_name}
                      </Link>
                    </h3>
                    <p className="text-xs text-muted">Member since {memberSince}</p>
                  </div>
                </div>

                {listing.seller.bio && (
                  <p className="mt-4 text-xs text-muted line-clamp-3">
                    {listing.seller.bio}
                  </p>
                )}

                <div className="mt-6 space-y-3">
                  <CompactSafetyNotice />
                  <ContactSellerButton
                    sellerName={listing.seller.display_name}
                    listingId={listing.id}
                  />

                  <Link
                    href={`/seller/${listing.seller.id}`}
                    className="block w-full text-center rounded-xl border border-border px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-surface"
                  >
                    View Seller Profile &amp; Ads
                  </Link>
                </div>
              </div>

              {/* India Safety Advice Card */}
              <IndiaSafetyCard />
            </div>
          </div>

          {/* Seller's other available listings */}
          {sellerOtherListings.length > 0 && (
            <div className="mt-16 border-t border-border pt-12">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold tracking-tight text-foreground">
                  More from this Seller
                </h2>
                <Link
                  href={`/seller/${listing.seller.id}`}
                  className="text-xs font-semibold text-brand-link hover:underline"
                >
                  View all &rarr;
                </Link>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {sellerOtherListings.map((other) => (
                  <ListingCard key={other.id} listing={other} />
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}
