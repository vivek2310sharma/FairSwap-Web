"use client";

import { useState, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Menu,
  X,
  Search,
  Heart,
  PlusCircle,
  User,
  MessageSquare,
  Bell,
  LifeBuoy,
  LogOut,
  LogIn,
} from "lucide-react";
import { NotificationBell } from "@/components/communication/NotificationBell";
import { HELP_CENTRE_URL } from "@/lib/help-centre";
import { useAuth } from "@/components/providers/AuthProvider";
import { useHeaderFit } from "@/components/navigation/useHeaderFit";
import { buttonVariants } from "@/components/ui/button";

const navLinks = [
  { label: "How It Works", href: "/#how-it-works" },
  { label: "Categories", href: "/#categories" },
  { label: "Safety", href: "/safety" },
];

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isLoading, unreadMessagesCount, unreadNotificationsCount, signOut } =
    useAuth();

  const toggleMenu = useCallback(() => {
    setMobileMenuOpen((prev) => !prev);
  }, []);

  const [signOutError, setSignOutError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  useHeaderFit(headerRef, barRef, `${isLoading}|${user?.id ?? ""}|${unreadMessagesCount}|${unreadNotificationsCount}|${signingOut}`);
  const handleSignOut = useCallback(async () => {
    setSigningOut(true);
    setSignOutError(null);
    try { await signOut(); } catch { setSignOutError("Sign out failed. Please try again."); }
    finally { setSigningOut(false); }
  }, [signOut]);

  return (
    <header ref={headerRef} onKeyDown={event => { if (event.key === "Escape" && mobileMenuOpen) { setMobileMenuOpen(false); menuButton.current?.focus(); } }} className="fs-header sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-xs">
      <div className="px-4 sm:px-6 lg:px-8">
      <div ref={barRef} className="mx-auto flex max-w-7xl items-center gap-4 py-2.5">
        {/* Wordmark */}
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--fs-focus) rounded-md"
          aria-label="FairSwap home"
        >
          <span className="rounded-sm bg-transparent dark:bg-white/90 px-1 py-0.5">
            <Image
              src="/brand/FairSwap_Web_Logo_Transparent.png"
              alt="FairSwap"
              width={140}
              height={36}
              className="h-7 sm:h-8 w-auto object-contain"
              priority
            />
          </span>
        </Link>

        {/* Desktop navigation */}
        <nav
          className="fs-inline-only shrink-0 items-center gap-6"
          aria-label="Main navigation"
        >
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="whitespace-nowrap rounded-md text-sm font-semibold text-muted transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
          <a
            href={HELP_CENTRE_URL}
            className="whitespace-nowrap rounded-md text-sm font-semibold text-muted transition-colors hover:text-foreground"
          >
            Help Centre
          </a>
          <Link
            href="/search"
            className="flex items-center gap-1.5 whitespace-nowrap rounded-md text-sm font-semibold text-link hover:underline"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
            Browse
          </Link>
          <Link
            href="/account/favourites"
            className="flex items-center gap-1.5 whitespace-nowrap rounded-md text-sm font-semibold text-muted transition-colors hover:text-foreground"
          >
            <Heart className="h-4 w-4" aria-hidden="true" />
            Favourites
          </Link>
        </nav>

        {/* Action buttons */}
        <div className="fs-inline-only ml-auto shrink-0 items-center gap-3">
          {isLoading ? <span role="status" className="px-3 text-xs">Checking session…</span> : user ? (
            <>
              <Link
                href="/account/messages"
                className="relative flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-xl text-xs font-semibold text-muted hover:bg-subtle hover:text-foreground"
                aria-label={`Messages ${
                  (unreadMessagesCount ?? 0) > 0
                    ? `(${unreadMessagesCount} unread)`
                    : ""
                }`}
                title="Messages"
              >
                <MessageSquare className="h-4 w-4" aria-hidden="true" />
                {(unreadMessagesCount ?? 0) > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-on-primary">
                    {(unreadMessagesCount ?? 0) > 9 ? "9+" : unreadMessagesCount}
                  </span>
                )}
              </Link>
              <NotificationBell />
              <button
                type="button"
                disabled={signingOut}
                aria-busy={signingOut}
                onClick={handleSignOut}
                className={buttonVariants({ variant: "secondary", className: "gap-1.5" })}
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                {signingOut ? "Signing out…" : "Sign Out"}
              </button>
              <Link
                href="/account"
                className={buttonVariants({ variant: "secondary", className: "gap-1.5" })}
              >
                <User className="h-4 w-4" aria-hidden="true" />
                Account
              </Link>
            </>
          ) : (
            <Link
              href="/auth/sign-in"
              className={buttonVariants({ variant: "secondary", className: "gap-1.5" })}
            >
              <LogIn className="h-4 w-4" aria-hidden="true" />
              Sign In
            </Link>
          )}

          <Link
            href="/account/listings/new"
            className={buttonVariants({ variant: "primary", className: "gap-1.5" })}
          >
            <PlusCircle className="h-4 w-4" aria-hidden="true" />
            Post Ad
          </Link>
        </div>

        {/* Medium-width shortcuts: kept visible beside the menu button when they fit */}
        <div className="fs-medium-only ml-auto shrink-0 items-center gap-3">
          <Link
            href="/search"
            className="inline-flex min-h-[44px] items-center gap-1.5 whitespace-nowrap rounded-md text-sm font-semibold text-link hover:underline"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
            Browse
          </Link>
          <Link
            href="/account/listings/new"
            className={buttonVariants({ variant: "primary", className: "gap-1.5" })}
          >
            <PlusCircle className="h-4 w-4" aria-hidden="true" />
            Post Ad
          </Link>
        </div>

        {/* Mobile menu button */}
        <button
          type="button"
          className="fs-compact-btn ml-auto min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-xl text-muted hover:bg-subtle hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--fs-focus)"
          ref={menuButton}
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
      </div>

      {signOutError && <p role="alert" className="px-4 py-2 text-sm">{signOutError}</p>}
      {/* Mobile menu panel */}
      {mobileMenuOpen && (
        <nav
          id="mobile-menu"
          className="fs-compact-panel border-t border-border bg-card"
          aria-label="Mobile navigation"
        >
          <div className="space-y-2 px-4 py-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="block rounded-xl px-3 py-2.5 text-base font-semibold text-muted hover:bg-subtle hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/search"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-base font-semibold text-muted hover:bg-subtle hover:text-foreground"
            >
              <Search className="h-4 w-4" aria-hidden="true" />
              Browse Ads
            </Link>
            <Link
              href="/account/favourites"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-base font-semibold text-muted hover:bg-subtle hover:text-foreground"
            >
              <Heart className="h-4 w-4" aria-hidden="true" />
              Saved Favourites
            </Link>
            <Link
              href="/account/listings/new"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-base font-semibold text-link hover:bg-subtle"
            >
              <PlusCircle className="h-4 w-4" aria-hidden="true" />
              Post Ad
            </Link>

            <a href={HELP_CENTRE_URL} onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-base font-semibold text-muted hover:bg-subtle hover:text-foreground">
              <LifeBuoy className="h-4 w-4" aria-hidden="true" />
              Help Centre
            </a>
            {isLoading ? <p role="status" className="px-3 py-2 text-sm">Checking session…</p> : user ? (
              <>
                <Link
                  aria-label={unreadMessagesCount === null ? "Messages" : `Messages (${unreadMessagesCount} unread)`}
                  href="/account/messages"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between rounded-xl px-3 py-2.5 text-base font-semibold text-muted hover:bg-subtle hover:text-foreground"
                >
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" aria-hidden="true" />
                    <span>Messages</span>
                  </div>
                  {(unreadMessagesCount ?? 0) > 0 && (
                    <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-on-primary">
                      {(unreadMessagesCount ?? 0) > 9 ? "9+" : unreadMessagesCount}
                    </span>
                  )}
                </Link>
                <Link
                  aria-label={unreadNotificationsCount === null ? "Notifications" : `Notifications (${unreadNotificationsCount} unread)`}
                  href="/account/notifications"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between rounded-xl px-3 py-2.5 text-base font-semibold text-muted hover:bg-subtle hover:text-foreground"
                >
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4" aria-hidden="true" />
                    <span>Notifications</span>
                  </div>
                  {(unreadNotificationsCount ?? 0) > 0 && (
                    <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-on-primary">
                      {(unreadNotificationsCount ?? 0) > 9
                        ? "9+"
                        : unreadNotificationsCount}
                    </span>
                  )}
                </Link>
                <Link
                  href="/account/support"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-base font-semibold text-muted hover:bg-subtle hover:text-foreground"
                >
                  <LifeBuoy className="h-4 w-4" aria-hidden="true" />
                  Support Tickets
                </Link>
                <Link
                  href="/account"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-base font-semibold text-muted hover:bg-subtle hover:text-foreground"
                >
                  <User className="h-4 w-4" aria-hidden="true" />
                  My Account
                </Link>
                <button
                  type="button"
                  disabled={signingOut}
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-base font-semibold text-red-600 hover:bg-subtle dark:text-red-400"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  Sign Out
                </button>
              </>
            ) : (
              <>

                <Link
                  href="/auth/sign-in"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-base font-semibold text-link hover:bg-subtle"
                >
                  <LogIn className="h-4 w-4" aria-hidden="true" />
                  Sign In
                </Link>
              </>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
