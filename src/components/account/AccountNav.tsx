"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingBag,
  Heart,
  MessageSquare,
  Bell,
  UserCircle,
  Shield,
  Lock,
  LifeBuoy,
  X,
} from "lucide-react";

const accountNavItems = [
  { label: "Overview", href: "/account", icon: LayoutDashboard, exact: true },
  { label: "My Listings", href: "/account/listings", icon: ShoppingBag, exact: false },
  { label: "Favourites", href: "/account/favourites", icon: Heart, exact: false },
  { label: "Messages", href: "/account/messages", icon: MessageSquare, exact: false },
  { label: "Notifications", href: "/account/notifications", icon: Bell, exact: false },
  { label: "Profile", href: "/account/profile", icon: UserCircle, exact: false },
  { label: "Security", href: "/account/security", icon: Shield, exact: false },
  { label: "Privacy", href: "/account/privacy", icon: Lock, exact: false },
  { label: "Support", href: "/account/support", icon: LifeBuoy, exact: false },
] as const;

function isActive(pathname: string, href: string, exact: boolean): boolean {
  if (exact) {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(href + "/");
}

export function AccountNav() {
  const pathname = usePathname();

  return (
    <div className="border-b border-border bg-background">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <nav
          aria-label="Account navigation"
          className="min-w-0 flex-1"
        >
          <ul
            className="flex gap-1 overflow-x-auto py-1 scrollbar-none"
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
                      transition-colors whitespace-nowrap
                      ${
                        active
                          ? "bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"
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
        </nav>
        <div className="flex-shrink-0 border-l border-border/60 pl-2 sm:pl-3">
          <Link
            href="/"
            aria-label="Close account"
            title="Close account"
            className="inline-flex items-center justify-center rounded-md p-1.5 text-muted transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
}
