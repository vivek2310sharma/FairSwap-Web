import { CONDITIONS } from "@/lib/listings/mobiles/contract";
import { postingText, type PostingLocale } from "@/lib/listings/mobiles/locale";
export type MobileDetails={model:string;storage:string;ram?:string|null;condition?:string|null;included:string[];warranty_until?:string|null};
/** Shared buyer/preview facts. All evidence is explicitly seller-declared. */
export default function MobileListingDetails({details,locale="en"}:{details:MobileDetails;locale?:PostingLocale}) {
 const t=(text:string)=>postingText(locale,text);
 return <section className="space-y-3 rounded-xl border border-gray-200 p-4" aria-label="Mobile phone details">
  <h2 className="font-semibold">{details.model}</h2>
  <p>{t(details.storage)}{details.ram?` · ${details.ram} RAM`:""}{details.condition?` · ${t(CONDITIONS[details.condition as keyof typeof CONDITIONS]??details.condition)}`:""}</p>
  <p className="font-medium">{t("Pickup only")}</p>
  <ul className="flex flex-wrap gap-2">{details.included.map(item=><li key={item} className="rounded-full bg-emerald-50 px-3 py-1 text-sm">{t(item)} · {t("seller-declared")}{item==="Under warranty"&&details.warranty_until?` (${details.warranty_until.slice(0,7)})`:""}</li>)}</ul>
  <p className="text-xs text-gray-600">{t("FairSwap does not currently verify IMEI, device authenticity, ownership or warranty.")}</p>
 </section>;
}
