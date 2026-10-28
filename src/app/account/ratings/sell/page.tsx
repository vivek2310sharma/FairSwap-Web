import { notFound, redirect } from "next/navigation";
import { AccountPageShell } from "@/components/account/AccountPageShell";
import { BuyerSelection } from "@/components/ratings/RatingUI";
import { ratingsEnabled, ratingsSession } from "@/lib/ratings/server";
import { uuid } from "@/lib/ratings/contracts";
import { ratingsCopy } from "@/lib/ratings/copy";
import Link from "next/link";

export const dynamic = "force-dynamic";
export default async function SellPage({ searchParams }: { searchParams: Promise<{ listing_id?: string; lang?: string }> }) {
  if (!ratingsEnabled()) notFound();
  const query = await searchParams; if (!uuid.safeParse(query.listing_id).success) notFound();
  const locale = "en"; const t = ratingsCopy(locale);
  const session = await ratingsSession(); if (session.error === "unauthenticated") redirect("/auth/sign-in?next=/account/listings");
  return <AccountPageShell title={t.sold} width="lg"><div lang={locale} className="space-y-4">
    {session.error ? <p>{t.unavailable}</p> : <BuyerSelection listingId={query.listing_id!} locale={locale} />}
    <Link href="/account/listings" className="inline-flex min-h-11 items-center underline">{t.cancel}</Link>
  </div></AccountPageShell>;
}
