import Link from "next/link";
import Image from "next/image";
import { HELP_CENTRE_URL } from "@/lib/help-centre";
import { LanguageSelector } from "@/components/LanguageSelector";
import { Reveal } from "@/components/home/Reveal";

type FooterLink = { label: string; href: string; external?: boolean };
const HOME_GROUPS: { title: string; links: FooterLink[] }[] = [
  { title: "Browse", links: [
    { label: "Browse All Ads", href: "/search" },
    { label: "Saved on this device", href: "/saved" },
    { label: "Account Favourites", href: "/account/favourites" },
    { label: "Post an Advertisement", href: "/account/listings/new" },
  ] },
  { title: "Support", links: [
    { label: "Help Centre", href: HELP_CENTRE_URL },
    { label: "In-Person Safety Tips", href: "/safety" },
    { label: "Contact Us", href: "https://help.fairswap.in/en/contact" },
    { label: "support@fairswap.in", href: "mailto:support@fairswap.in" },
    { label: "WhatsApp Support: +91 7877966996", href: "https://wa.me/917877966996", external: true },
  ] },
  { title: "Policies", links: [
    { label: "Terms of Service", href: "/terms" },
    { label: "Refund & Cancellation Policy", href: "/refund-policy" },
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Acceptable Use", href: "/acceptable-use" },
    { label: "Grievance Redressal", href: "/grievance" },
  ] },
];

/** Homepage-only finale. Same destinations as the default footer, regrouped; no invented pages, socials or app badges. */
function HomeFooter() {
  const currentYear = new Date().getFullYear();
  const linkClass = "rounded-sm text-sm text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--fs-focus)";
  return (
    <footer className="fs-plum-dark fs-footer-plum mt-auto overflow-hidden">
      <div className="fs-container pb-8 pt-16">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,2fr)] lg:gap-16">
          <Reveal>
            <p aria-hidden="true" className="fs-wordmark">FairSwap.</p>
            <p className="mt-4 text-lg font-semibold text-foreground">Good things deserve another chapter.</p>
            <p className="mt-1 text-sm text-muted">Buy locally. Sell simply. Exchange more safely.</p>
            <p className="mt-1 text-xs text-muted">India&apos;s local classifieds marketplace</p>
            <Link href="/account/listings/new" className="mt-4 inline-flex min-h-11 items-center rounded-xl border border-[#F5D6BE] px-5 text-sm font-semibold text-[#F5D6BE] hover:bg-[#F5D6BE] hover:text-[#271B38] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--fs-focus)">Post Ad</Link>
          </Reveal>
          <div className="grid grid-cols-1 gap-8 min-[480px]:grid-cols-2 md:grid-cols-3">
            {HOME_GROUPS.map(group => (
              <nav key={group.title} aria-label={group.title}>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#F5D6BE]">{group.title}</h3>
                <ul className="mt-2 space-y-0.5">
                  {group.links.map(link => (
                    <li key={link.href}>
                      {link.href.startsWith("/")
                        ? <Link href={link.href} className={linkClass}>{link.label}</Link>
                        : <a href={link.href} {...(link.external ? { target: "_blank", rel: "noopener noreferrer" } : {})} className={linkClass}>{link.label}</a>}
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>
        <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6">
          <p className="text-xs text-muted">&copy; {currentYear} FairSwap.</p>
          <LanguageSelector id="language-select-footer" />
        </div>
      </div>
    </footer>
  );
}

export function Footer({ variant = "default" }: { variant?: "default" | "home" } = {}) {
  if (variant === "home") return <HomeFooter />;
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
                  Browse All Ads
                </Link>
              </li>
              <li>
                <Link href="/saved" className="hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-500 rounded-sm">
                  Saved on this device
                </Link>
              </li>
              <li>
                <Link href="/account/favourites" className="hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-500 rounded-sm">
                  Account Favourites
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
          <LanguageSelector id="language-select-footer" className="mt-2" />

        </div>
      </div>
    </footer>
  );
}