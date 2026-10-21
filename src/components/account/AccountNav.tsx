"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HELP_CENTRE_URL } from "@/lib/help-centre";
import {
  LayoutDashboard,
  ShoppingBag,
  Heart,
  MessageSquare,
  Bell,
  Settings,
  BookOpen,
} from "lucide-react";

const accountNavItems = [
  { label: "Overview", href: "/account", icon: LayoutDashboard, exact: true },
  { label: "My Listings", href: "/account/listings", icon: ShoppingBag, exact: false },
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

  return (
    <nav
      aria-label="Account navigation"
      className="border-b border-border bg-background"
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
          <li className="flex-shrink-0">
            <a
              href={HELP_CENTRE_URL}
              className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap text-muted hover:bg-surface hover:text-foreground min-h-[44px] sm:min-h-[38px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <BookOpen className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
              Help Centre
            </a>
          </li>
        </ul>
      </div>
    </nav>
  );
}
