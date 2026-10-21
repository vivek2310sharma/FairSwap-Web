import Link from "next/link";
import { ShieldAlert, QrCode, UserCheck, Banknote } from "lucide-react";
import { trustStripEn, TrustStripItem } from "@/lib/trust-strip";

const iconMap: Record<string, React.ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>> = {
  ShieldAlert,
  QrCode,
  UserCheck,
  Banknote,
};

export function TrustStrip() {
  const { heading, ctaText, items } = trustStripEn;

  return (
    <section
      aria-labelledby="trust-strip-heading"
      className="border-y border-border bg-surface/50 py-8 sm:py-10"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-border/60">
          <div>
            <h2
              id="trust-strip-heading"
              className="text-xl font-bold tracking-tight text-foreground sm:text-2xl"
            >
              {heading}
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-muted">
              Peer-to-peer safety guidance for Indian marketplace buyers and sellers.
            </p>
          </div>
          <div>
            <Link
              href="/safety"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3.5 py-2 text-xs font-semibold text-foreground shadow-2xs hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 transition-colors"
            >
              <span>{ctaText}</span>
            </Link>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 min-[520px]:grid-cols-2 lg:grid-cols-4">
          {items.map((item: TrustStripItem) => {
            const Icon = iconMap[item.icon] || ShieldAlert;
            return (
              <div
                key={item.id}
                className="flex flex-col rounded-xl border border-border/80 bg-background p-4 shadow-2xs transition-colors hover:border-brand-300 dark:hover:border-brand-700"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-action-600 dark:bg-brand-950 dark:text-brand-400">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <h3 className="text-sm font-semibold leading-snug text-foreground">
                    {item.title}
                  </h3>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
