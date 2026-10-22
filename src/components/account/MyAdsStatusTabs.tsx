import Link from "next/link";
import { MY_ADS_TABS, MyAdsTabKey, MyListingCounts } from "@/lib/listings/my-ads";

interface MyAdsStatusTabsProps {
  activeTab: MyAdsTabKey;
  counts: MyListingCounts;
}

export function MyAdsStatusTabs({ activeTab, counts }: MyAdsStatusTabsProps) {
  return (
    <nav
      aria-label="My Ads Status Navigation"
      className="border-b border-gray-200"
    >
      <div
        role="tablist"
        aria-orientation="horizontal"
        className="flex space-x-2 overflow-x-auto pb-1 scrollbar-none sm:space-x-4"
      >
        {MY_ADS_TABS.map((tab) => {
          const isSelected = activeTab === tab.key;
          const count = counts[tab.key] ?? 0;
          const href = tab.key === "all" ? "/account/listings" : `/account/listings?status=${tab.key}`;

          return (
            <Link
              key={tab.key}
              id={`my-ads-tab-${tab.key}`}
              href={href}
              role="tab"
              aria-selected={isSelected}
              aria-controls={`my-ads-panel-${tab.key}`}
              tabIndex={isSelected ? 0 : -1}
              className={`inline-flex min-h-[44px] shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2 text-xs font-semibold sm:text-sm transition-colors focus:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ${
                isSelected
                  ? "border-emerald-600 text-emerald-700 font-bold"
                  : "border-transparent text-gray-600 hover:border-gray-300 hover:text-gray-900"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-bold transition-colors ${
                  isSelected
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                {count}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
