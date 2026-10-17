import Link from "next/link";
import { HELP_CENTRE_URL } from "@/lib/help-centre";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-border bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-4">
          {/* Brand & Mission */}
          <div>
            <p className="text-base font-bold text-foreground">
              <span className="text-brand-link">Fair</span>Swap
              <span className="text-muted">.in</span>
            </p>
            <p className="mt-2 text-xs text-muted leading-relaxed">
              India&apos;s local classifieds marketplace
            </p>
            <a
              href="https://websitelaunches.com/site/fairswap.in"
              target="_blank"
              rel="noopener noreferrer external"
              className="mt-2 inline-block text-xs text-muted underline underline-offset-2 hover:text-foreground"
            >
              View FairSwap&apos;s public launch record
            </a>
          </div>

          {/* Discovery Links */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
              Discovery
            </h3>
            <ul className="mt-3 space-y-2 text-xs text-muted">
              <li>
                <Link href="/search" className="hover:text-foreground">
                  Browse All Listings
                </Link>
              </li>
              <li>
                <Link href="/account/favourites" className="hover:text-foreground">
                  Saved Favourites
                </Link>
              </li>
              <li>
                <Link href="/account/listings/new" className="hover:text-foreground">
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
                <a href={HELP_CENTRE_URL} className="hover:text-foreground">
                  Help Centre
                </a>
              </li>
              <li>
                <Link href="/safety" className="hover:text-foreground">
                  In-Person Safety Tips
                </Link>
              </li>
              <li>
                <a href="https://help.fairswap.in/en/contact" className="hover:text-foreground">
                  Contact Us
                </a>
              </li>
              <li>
                <a href="mailto:support@fairswap.in" className="hover:text-foreground">
                  support@fairswap.in
                </a>
              </li>
              <li>
                <a href="tel:+918826599917" className="hover:text-foreground">
                  +91 8826599917
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
                <Link href="/terms" className="hover:text-foreground">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/refund-policy" className="hover:text-foreground">
                  Refund &amp; Cancellation Policy
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-foreground">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/acceptable-use" className="hover:text-foreground">
                  Acceptable Use
                </Link>
              </li>
              <li>
                <Link href="/grievance" className="hover:text-foreground">
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
