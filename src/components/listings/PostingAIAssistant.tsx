import { postingText, type PostingLocale } from "@/lib/listings/mobiles/locale";
export default function PostingAIAssistant({locale="en"}:{locale?:PostingLocale}) {
  const t=(text:string)=>postingText(locale,text);
  return <aside className="rounded-xl border border-emerald-200 bg-emerald-50 p-4" aria-label="AI assistant">
    <h2 className="font-semibold">{t("AI assistant")} <span className="ml-2 rounded-full bg-white px-2 py-1 text-xs">{t("Coming soon")}</span></h2>
    <p className="mt-2 text-sm">{t("Soon, FairSwap AI will help identify the right category and suggest listing details from your photos.")}</p>
    <p className="mt-2 text-xs text-gray-700">{t("Your photos are not analysed by AI yet.")}</p>
  </aside>;
}
