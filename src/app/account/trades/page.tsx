import Link from "next/link";
import { redirect } from "next/navigation";
import { Package, ShoppingBag } from "lucide-react";
import { AccountPageShell } from "@/components/account/AccountPageShell";
import { getAccountCopy } from "@/lib/account/copy";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "My trades — FairSwap" };

interface TradesPageProps {
  searchParams: Promise<{ tab?: string | string[] }>;
}

export default async function TradesPage({ searchParams }: TradesPageProps) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect("/auth/sign-in?next=/account/trades");

  const { tab } = await searchParams;
  const activeTab = tab === "bought" ? "bought" : "sold";
  const copy = getAccountCopy();
  const t = copy.trades;
  const Icon = activeTab === "sold" ? Package : ShoppingBag;

  return (
    <AccountPageShell title={t.title} description={t.subtitle} width="lg">
      <div className="mb-6 rounded-2xl border border-border bg-card p-4">
        <span className="inline-flex rounded-full bg-action-100 px-2 py-0.5 text-xs font-semibold text-action-800 dark:bg-action-900 dark:text-action-100">{copy.comingSoon}</span>
        <p className="mt-2 text-sm text-muted">{t.unavailable}</p>
      </div>
      <nav aria-label={t.tabsLabel} className="mb-6 flex gap-2 border-b border-border">
        {(["sold", "bought"] as const).map((value) => (
          <Link
            key={value}
            href={`/account/trades?tab=${value}`}
            aria-current={activeTab === value ? "page" : undefined}
            className={`inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-t-md border-b-2 px-4 py-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-action-500 ${activeTab === value ? "border-action-600 text-action-700 dark:border-action-400 dark:text-action-300" : "border-transparent text-muted hover:border-border hover:text-foreground"}`}
          >
            {t[value]}
          </Link>
        ))}
      </nav>
      <section aria-labelledby="trades-empty-heading" className="rounded-2xl border border-border bg-card px-4 py-10 text-center sm:px-6">
        <Icon aria-hidden="true" className="mx-auto mb-4 h-10 w-10 text-muted" />
        <h2 id="trades-empty-heading" className="text-lg font-semibold text-foreground">{activeTab === "sold" ? t.soldTitle : t.boughtTitle}</h2>
        <p className="mx-auto mt-2 max-w-lg text-sm text-muted">{activeTab === "sold" ? t.soldBody : t.boughtBody}</p>
      </section>
    </AccountPageShell>
  );
}
