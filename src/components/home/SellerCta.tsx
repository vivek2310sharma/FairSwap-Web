import Link from "next/link";
import Image from "next/image";
import { buttonVariants } from "@/components/ui/button";

/** Seller call to action with the approved walking mascot. Claims nothing about reach, speed or sales. */
export function SellerCta() {
  return (
    <section aria-labelledby="sell-heading" className="fs-container py-6">
      <div className="flex items-center gap-4 overflow-hidden rounded-3xl bg-(--fs-tone-b) p-5 sm:gap-8 sm:p-8">
        <div className="min-w-0 flex-1">
          <h2 id="sell-heading" className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">Have something to pass on?</h2>
          <p className="mt-1.5 text-sm text-muted sm:text-base">Post an ad with photos and a public area. Buyers message you on FairSwap, and you choose where to meet.</p>
          <Link href="/account/listings/new" className={buttonVariants({ variant: "primary", size: "lg", className: "mt-4" })}>Post Ad</Link>
        </div>
        <Image src="/animations/fairswap-intro/woman-walk-01-480w.webp" alt="" aria-hidden="true" width={480} height={830} sizes="(max-width: 639px) 96px, 140px" loading="lazy" className="h-28 w-auto shrink-0 sm:h-40" />
      </div>
    </section>
  );
}