"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Handshake,
  LayoutDashboard,
  ShoppingBag,
  Heart,
  MessageSquare,
  Bell,
  Settings,
} from "lucide-react";

import { getAccountCopy } from "@/lib/account/copy";

const accountNavItems = [
  { label: "Overview", href: "/account", icon: LayoutDashboard, exact: true },
  { label: "My ads", href: "/account/listings", icon: ShoppingBag, exact: false },
  { label: getAccountCopy().tiles.trades.title, href: "/account/trades", icon: Handshake, exact: false },
  { label: "Favourites", href: "/account/favourites", icon: Heart, exact: false },
  { label: "Messages", href: "/account/messages", icon: MessageSquare, exact: false },
  { label: "Notifications", href: "/account/notifications", icon: Bell, exact: false },
  { label: "Settings", href: "/account/settings", icon: Settings, exact: false },
] as const;

function isActive(pathname: string, href: string, exact: boolean): boolean {
  if (exact) {
    return pathname === href;
  }
  if (href === "/account/settings") {
    return (
      pathname === "/account/settings" ||
      pathname.startsWith("/account/settings/") ||
      pathname.startsWith("/account/profile") ||
      pathname.startsWith("/account/security") ||
      pathname.startsWith("/account/privacy")
    );
  }
  return pathname === href || pathname.startsWith(href + "/");
}

export function AccountNav() {
  const pathname = usePathname();

  // The overview already presents every destination as a tile.
  if (pathname === "/account") return null;

  return (
    <>
      <nav aria-label="Back to Account" className="border-b border-border bg-background sm:hidden">
        <div className="mx-auto max-w-7xl px-4">
          <Link
            href="/account"
            className="inline-flex min-h-[44px] items-center text-sm font-semibold text-action-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-500 dark:text-action-300"
          >
            Back to Account
          </Link>
        </div>
      </nav>
      <nav
        aria-label="Account navigation"
        className="hidden border-b border-border bg-background sm:block"
      >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <ul
          className="flex gap-1 overflow-x-auto py-1.5 scrollbar-none"
          role="list"
        >
          {accountNavItems.map((item) => {
            const active = isActive(pathname, item.href, item.exact);
            return (
              <li key={item.href} className="flex-shrink-0">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`
                    inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium
                    transition-colors whitespace-nowrap min-h-[44px] sm:min-h-[38px]
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500
                    ${
                      active
                        ? "bg-brand-50 text-brand-900 dark:bg-brand-900/30 dark:text-brand-300"
                        : "text-muted hover:bg-surface hover:text-foreground"
                    }
                  `}
                >
                  <item.icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
      </nav>
    </>
  );
}
