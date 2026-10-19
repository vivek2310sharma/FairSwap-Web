"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { Menu, X, Search, Heart, PlusCircle, User, MessageSquare, Bell, LifeBuoy } from "lucide-react";
import { NotificationBell } from "@/components/communication/NotificationBell";
import { HELP_CENTRE_URL } from "@/lib/help-centre";

const navLinks = [
  { label: "How It Works", href: "/#how-it-works" },
  { label: "Categories", href: "/#categories" },
  { label: "Safety", href: "/#safety" },
];

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleMenu = useCallback(() => {
    setMobileMenuOpen((prev) => !prev);
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-xs">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Wordmark */}
        <Link href="/" className="flex items-center gap-2" aria-label="FairSwap home">
          <span className="text-xl font-bold tracking-tight sm:text-2xl">
            <span className="text-brand-link">Fair</span>
            <span className="text-foreground">Swap</span>
            <span className="text-sm font-normal text-muted">.in</span>
          </span>
        </Link>

        {/* Desktop navigation */}
        <nav className="hidden items-center gap-6 lg:flex" aria-label="Main navigation">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
          <a
            href={HELP_CENTRE_URL}
            className="text-sm font-medium text-muted transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
          >
            Help Centre
          </a>
          <Link
            href="/search"
            className="flex items-center gap-1.5 text-sm font-medium text-brand-link hover:underline"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
            Browse
          </Link>
          <Link
            href="/account/favourites"
            className="flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-foreground"
          >
            <Heart className="h-4 w-4" aria-hidden="true" />
            Favourites
          </Link>
        </nav>

        {/* Action buttons */}
        <div className="hidden items-center gap-3 sm:flex">
          <Link
            href="/account/messages"
            className="flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-foreground p-1.5 rounded-lg hover:bg-surface"
            aria-label="Messages"
            title="Messages"
          >
            <MessageSquare className="h-4 w-4" aria-hidden="true" />
          </Link>
          <NotificationBell />
          <Link
            href="/account"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-surface"
          >
            <User className="h-3.5 w-3.5" aria-hidden="true" />
            Account
          </Link>
          <Link
            href="/account/listings/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-brand-500"
          >
            <PlusCircle className="h-3.5 w-3.5" aria-hidden="true" />
            Post Ad
          </Link>
        </div>

        {/* Mobile menu button */}
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-md p-2 text-muted hover:text-foreground lg:hidden"
          onClick={toggleMenu}
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-menu"
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
        >
          {mobileMenuOpen ? (
            <X className="h-6 w-6" aria-hidden="true" />
          ) : (
            <Menu className="h-6 w-6" aria-hidden="true" />
          )}
        </button>
      </div>

      {/* Mobile menu panel */}
      {mobileMenuOpen && (
        <nav
          id="mobile-menu"
          className="border-t border-border bg-background lg:hidden"
          aria-label="Mobile navigation"
        >
          <div className="space-y-2 px-4 py-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="block rounded-md px-3 py-2 text-base font-medium text-muted hover:bg-surface hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/search"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-base font-medium text-muted hover:bg-surface hover:text-foreground"
            >
              <Search className="h-4 w-4" aria-hidden="true" />
              Browse Listings
            </Link>
            <Link
              href="/account/favourites"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-base font-medium text-muted hover:bg-surface hover:text-foreground"
            >
              <Heart className="h-4 w-4" aria-hidden="true" />
              Saved Favourites
            </Link>
            <Link
              href="/account/listings/new"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-base font-medium text-brand-link hover:bg-surface"
            >
              <PlusCircle className="h-4 w-4" aria-hidden="true" />
              Post a Listing
            </Link>
            <Link
              href="/account/messages"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-base font-medium text-muted hover:bg-surface hover:text-foreground"
            >
              <MessageSquare className="h-4 w-4" aria-hidden="true" />
              Messages
            </Link>
            <Link
              href="/account/notifications"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-base font-medium text-muted hover:bg-surface hover:text-foreground"
            >
              <Bell className="h-4 w-4" aria-hidden="true" />
              Notifications
            </Link>
            <a
              href={HELP_CENTRE_URL}
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-base font-medium text-muted hover:bg-surface hover:text-foreground"
            >
              <LifeBuoy className="h-4 w-4" aria-hidden="true" />
              Help Centre
            </a>
            <Link
              href="/account/support"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-base font-medium text-muted hover:bg-surface hover:text-foreground"
            >
              <LifeBuoy className="h-4 w-4" aria-hidden="true" />
              Support Tickets
            </Link>
            <Link
              href="/account"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-base font-medium text-muted hover:bg-surface hover:text-foreground"
            >
              <User className="h-4 w-4" aria-hidden="true" />
              My Account
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
