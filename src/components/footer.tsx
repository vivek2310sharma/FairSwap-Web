import Link from "next/link";
import Image from "next/image";
import { HELP_CENTRE_URL } from "@/lib/help-centre";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-border bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-4">
          {/* Brand & Mission */}
          <div>
            <Link href="/" className="inline-block group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-500 rounded-sm">
              <div className="rounded-sm bg-transparent dark:bg-white/90 px-1 py-0.5"><Image
                src="/brand/FairSwap_Web_Logo_Transparent.png"
                alt="FairSwap.in"
                width={120}
                height={32}
                className="h-8 w-auto object-contain"
                priority
              /></div>
            </Link>
            <p className="mt-3 text-xs text-brand-900 dark:text-brand-300 font-medium italic">
              Give. Get. Grow Together.
            </p>
            <p className="mt-2 text-xs text-muted leading-relaxed">
              India&apos;s local classifieds marketplace
            </p>
          </div>

          {/* Discovery Links */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
              Discovery
            </h3>
            <ul className="mt-3 space-y-2 text-xs text-muted">
              <li>
                <Link href="/search" className="hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-500 rounded-sm">
                  Browse All Listings
                </Link>
              </li>
              <li>
                <Link href="/account/favourites" className="hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-500 rounded-sm">
                  Saved Favourites
                </Link>
              </li>
              <li>
                <Link href="/account/listings/new" className="hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-500 rounded-sm">
                  Post an Advertisement
                </Link>
              </li>
            </ul>
          </div>

          {/* Help & Safety */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
              Guidance &amp; Safety
            </h3>
            <ul className="mt-3 space-y-2 text-xs text-muted">
              <li>
                <a href={HELP_CENTRE_URL} className="hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-500 rounded-sm">
                  Help Centre
                </a>
              </li>
              <li>
                <Link href="/safety" className="hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-500 rounded-sm">
                  In-Person Safety Tips
                </Link>
              </li>
              <li>
                <a href="https://help.fairswap.in/en/contact" className="hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-500 rounded-sm">
                  Contact Us
                </a>
              </li>
              <li>
                <a href="mailto:support@fairswap.in" className="hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-500 rounded-sm">
                  support@fairswap.in
                </a>
              </li>
              <li>
                <a
                  href="https://wa.me/917877966996"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-500 rounded-sm"
                >
                  WhatsApp Support: +91 7877966996
                </a>
              </li>
            </ul>
          </div>

          {/* Policies */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
              Policies
            </h3>
            <ul className="mt-3 space-y-2 text-xs text-muted">
              <li>
                <Link href="/terms" className="hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-500 rounded-sm">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/refund-policy" className="hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-500 rounded-sm">
                  Refund &amp; Cancellation Policy
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-500 rounded-sm">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/acceptable-use" className="hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-500 rounded-sm">
                  Acceptable Use
                </Link>
              </li>
              <li>
                <Link href="/grievance" className="hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-500 rounded-sm">
                  Grievance Redressal
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 border-t border-border/60 pt-6 text-center sm:text-left">
          <p className="text-xs text-muted">
            &copy; {currentYear} FairSwap.
          </p>
        </div>
      </div>
    </footer>
  );
}
