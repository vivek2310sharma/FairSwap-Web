"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, Search, Plus, MessageCircle, UserRound } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";

export function shouldShowBottomNav(pathname: string | null): boolean {
  if (!pathname) return false;

  // Hide on auth routes
  if (pathname.startsWith("/auth")) return false;

  // Hide on listing creation flow
  if (pathname.startsWith("/account/listings/new")) return false;

  // Hide on listing edit routes (e.g. /account/listings/[id]/edit, /account/listings/car/edit)
  if (pathname.endsWith("/edit") || pathname.includes("/edit/")) return false;

  // Hide on individual chat thread (/account/messages/[id])
  if (pathname.startsWith("/account/messages/") && pathname !== "/account/messages") return false;

  // Hide on compliance/policy review screens
  if (pathname.startsWith("/account/policy-review")) return false;

  return true;
}

export function isRouteActive(href: string, pathname: string | null): boolean {
  if (!pathname) return false;

  if (href === "/") {
    return pathname === "/";
  }
  if (href === "/search") {
    return pathname === "/search" || pathname.startsWith("/search/");
  }
  if (href === "/account/messages") {
    return pathname === "/account/messages" || pathname.startsWith("/account/messages/");
  }
  if (href === "/account/listings/new") {
    return pathname === "/account/listings/new" || pathname.startsWith("/account/listings/new/");
  }
  if (href === "/account" || href === "/auth/sign-in") {
    if (pathname.startsWith("/account/messages") || pathname.startsWith("/account/listings/new")) {
      return false;
    }
    return pathname === "/account" || pathname.startsWith("/account/") || pathname.startsWith("/auth/sign-in");
  }

  return pathname === href;
}

interface NavItem {
  label: string;
  href: string;
  icon: typeof House;
  isPrimary?: boolean;
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const { user, isLoading, unreadMessagesCount } = useAuth();

  if (!shouldShowBottomNav(pathname)) {
    return null;
  }

  const navItems: NavItem[] = [
    { label: "Home", href: "/", icon: House },
    { label: "Search", href: "/search", icon: Search },
    { label: "Sell", href: "/account/listings/new", icon: Plus, isPrimary: true },
    { label: "Chats", href: "/account/messages", icon: MessageCircle },
    isLoading
      ? { label: "Checking session…", href: "#session-loading", icon: UserRound }
      : user
      ? { label: "Account", href: "/account", icon: UserRound }
      : { label: "Sign In", href: "/auth/sign-in", icon: UserRound },
  ];

  return (
    <>
      {/* Spacer in document flow on mobile to prevent content overlap */}
      <div
        className="h-[calc(4rem+1px+env(safe-area-inset-bottom,0px))] sm:hidden shrink-0 pointer-events-none"
        aria-hidden="true"
      />
      <nav
        aria-label="Mobile bottom navigation"
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-surface/95 backdrop-blur-xs pb-[env(safe-area-inset-bottom)] sm:hidden"
      >
        <ul className="grid h-16 grid-cols-5 items-center px-1" role="list">
          {navItems.map((item) => {
            const active = isRouteActive(item.href, pathname);
            if (item.href === "#session-loading") return <li key="session-loading" className="text-center text-[10px]" role="status">Checking session…</li>;

            if (item.isPrimary) {
              return (
                <li key={item.href} className="flex justify-center">
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    aria-label="Sell - Post a listing"
                    className="group flex min-h-[44px] min-w-[44px] flex-1 flex-col items-center justify-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-500"
                  >
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full bg-action-600 text-white shadow-xs transition-transform hover:bg-action-700 active:scale-95 ${
                        active ? "ring-2 ring-action-600 ring-offset-2" : ""
                      }`}
                    >
                      <Plus className="h-5 w-5 stroke-[2.5]" aria-hidden="true" />
                    </div>
                    <span className="mt-0.5 text-[10px] font-semibold text-action-700 dark:text-action-400">
                      {item.label}
                    </span>
                  </Link>
                </li>
              );
            }

            const Icon = item.icon;
            const isChats = item.href === "/account/messages";
            const showUnreadBadge = isChats && user && (unreadMessagesCount ?? 0) > 0;

            return (
              <li key={item.href} className="flex justify-center">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  aria-label={
                    showUnreadBadge
                      ? `${item.label} (${unreadMessagesCount} unread)`
                      : item.label
                  }
                  className={`relative flex min-h-[44px] min-w-[44px] flex-1 flex-col items-center justify-center rounded-lg py-1 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                    active
                      ? "font-semibold text-brand-600 dark:text-brand-300"
                      : "font-medium text-muted hover:text-foreground"
                  }`}
                >
                  <div className="relative">
                    <Icon
                      className={`h-5 w-5 ${
                        active ? "text-brand-600 dark:text-brand-300" : "text-muted"
                      }`}
                      aria-hidden="true"
                    />
                    {showUnreadBadge && (
                      <span className="absolute -top-1.5 -right-2.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-action-600 px-1 text-[9px] font-bold text-white shadow-xs">
                        {(unreadMessagesCount ?? 0) > 9 ? "9+" : unreadMessagesCount}
                      </span>
                    )}
                  </div>
                  <span className="mt-1 text-[10px] leading-none">
                    {item.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
