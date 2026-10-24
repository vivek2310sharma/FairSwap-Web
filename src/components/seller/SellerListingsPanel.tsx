import Link from "next/link";
import { ShoppingBag, AlertTriangle } from "lucide-react";
import { ListingCard } from "@/components/listings/ListingCard";
import { getAccountCopy } from "@/lib/account/copy";
import type { SellerListingsParams, SellerListingsResult } from "@/types/listing";

interface SellerListingsPanelProps {
  basePath: string;
  params: SellerListingsParams;
  result: SellerListingsResult | null;
  /** True when filters were applied (or were malformed and therefore matched nothing). */
  filtered?: boolean;
}

const CONDITIONS = ["new", "like_new", "good", "fair", "poor"] as const;
const SORTS = ["newest", "oldest", "price_asc", "price_desc"] as const;

function buildHref(basePath: string, params: SellerListingsParams, page: number): string {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.category) search.set("category", params.category);
  if (params.condition) search.set("condition", params.condition);
  if (params.price_min !== undefined) search.set("price_min", String(params.price_min));
  if (params.price_max !== undefined) search.set("price_max", String(params.price_max));
  if (params.sort !== "newest") search.set("sort", params.sort);
  if (page > 1) search.set("page", String(page));
  const qs = search.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

const fieldClass =
  "w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-action-600";
const labelClass = "mb-1 block text-xs font-medium text-muted";
const pageLinkClass =
  "rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-surface";

export function SellerListingsPanel({ basePath, params, result, filtered = false }: SellerListingsPanelProps) {
  const copy = getAccountCopy("en").seller;
  const hasFilters = filtered || Boolean(
    params.q || params.category || params.condition || params.price_min !== undefined || params.price_max !== undefined
  );

  if (!result) {
    return (
      <div role="alert" className="rounded-2xl border border-border bg-card p-10 text-center">
        <AlertTriangle className="mx-auto h-10 w-10 text-muted opacity-60" aria-hidden="true" />
        <h2 className="mt-3 text-base font-semibold text-foreground">{copy.errorTitle}</h2>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted">{copy.errorBody}</p>
        <Link
          href={buildHref(basePath, params, params.page)}
          className="mt-4 inline-flex rounded-lg bg-action-600 px-4 py-2 text-sm font-semibold text-white hover:bg-action-700"
        >
          {copy.retry}
        </Link>
      </div>
    );
  }

  const showControls = result.total_count > 0 || hasFilters;

  return (
    <div>
      {showControls && (
        <form method="get" action={basePath} role="search" className="rounded-2xl border border-border bg-card p-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
            <div className="col-span-2">
              <label htmlFor="seller-q" className={labelClass}>{copy.searchLabel}</label>
              <input id="seller-q" name="q" type="search" maxLength={100} defaultValue={params.q} placeholder={copy.searchPlaceholder} className={fieldClass} />
            </div>
            <div>
              <label htmlFor="seller-category" className={labelClass}>{copy.category}</label>
              <select id="seller-category" name="category" defaultValue={params.category} className={fieldClass}>
                <option value="">{copy.allCategories}</option>
                {result.categories.map((c) => (
                  <option key={c.slug} value={c.slug}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="seller-condition" className={labelClass}>{copy.condition}</label>
              <select id="seller-condition" name="condition" defaultValue={params.condition ?? ""} className={fieldClass}>
                <option value="">{copy.anyCondition}</option>
                {CONDITIONS.map((c) => (
                  <option key={c} value={c}>{copy.conditions[c]}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="seller-pmin" className={labelClass}>{copy.priceMin}</label>
              <input id="seller-pmin" name="price_min" type="number" inputMode="numeric" min={0} max={100000000} defaultValue={params.price_min} className={fieldClass} />
            </div>
            <div>
              <label htmlFor="seller-pmax" className={labelClass}>{copy.priceMax}</label>
              <input id="seller-pmax" name="price_max" type="number" inputMode="numeric" min={0} max={100000000} defaultValue={params.price_max} className={fieldClass} />
            </div>
            <div className="col-span-2 lg:col-span-2">
              <label htmlFor="seller-sort" className={labelClass}>{copy.sort}</label>
              <select id="seller-sort" name="sort" defaultValue={params.sort} className={fieldClass}>
                {SORTS.map((s) => (
                  <option key={s} value={s}>{copy.sorts[s]}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2 flex items-end gap-2 lg:col-span-4 lg:justify-end">
              <button
                type="submit"
                className="rounded-lg bg-action-600 px-4 py-2 text-sm font-semibold text-white hover:bg-action-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action-600"
              >
                {copy.apply}
              </button>
              {hasFilters && (
                <Link href={basePath} className={pageLinkClass}>
                  {copy.clear}
                </Link>
              )}
            </div>
          </div>
        </form>
      )}

      {result.items.length > 0 ? (
        <>
          <ul className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-6">
            {result.items.map((listing) => (
              <li key={listing.id} className="flex flex-col [&>div]:flex-1">
                <ListingCard listing={listing} variant="compact" />
              </li>
            ))}
          </ul>

          {result.total_pages > 1 && (
            <nav aria-label="Pagination" className="mt-8 flex items-center justify-between gap-3">
              {result.page > 1 ? (
                <Link href={buildHref(basePath, params, result.page - 1)} rel="prev" className={pageLinkClass}>
                  {copy.previous}
                </Link>
              ) : (
                <span aria-hidden="true" className="px-4 py-2 text-sm text-transparent">{copy.previous}</span>
              )}
              <span className="text-sm text-muted">
                {copy.pageOf.replace("{page}", String(result.page)).replace("{total}", String(result.total_pages))}
              </span>
              {result.page < result.total_pages ? (
                <Link href={buildHref(basePath, params, result.page + 1)} rel="next" className={pageLinkClass}>
                  {copy.next}
                </Link>
              ) : (
                <span aria-hidden="true" className="px-4 py-2 text-sm text-transparent">{copy.next}</span>
              )}
            </nav>
          )}
        </>
      ) : (
        <div className="mt-6 rounded-2xl border border-border bg-card p-12 text-center">
          <ShoppingBag className="mx-auto h-12 w-12 text-muted opacity-40" aria-hidden="true" />
          <h2 className="mt-3 text-base font-semibold text-foreground">
            {hasFilters ? copy.noMatchTitle : copy.emptyTitle}
          </h2>
          <p className="mx-auto mt-1 max-w-sm text-xs text-muted">{hasFilters ? copy.noMatchBody : copy.emptyBody}</p>
        </div>
      )}
    </div>
  );
}
