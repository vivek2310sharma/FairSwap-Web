import { MessageSquareText } from "lucide-react";
import { getAccountCopy } from "@/lib/account/copy";

export function SellerRatingsPlaceholder() {
  const copy = getAccountCopy("en").seller;
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-14 text-center">
      <MessageSquareText className="mx-auto h-10 w-10 text-muted opacity-60" aria-hidden="true" />
      <h2 className="mt-4 text-lg font-bold text-foreground">{copy.ratingsTitle}</h2>
      <p className="mt-1 text-sm font-semibold text-action-600">{copy.comingSoon}</p>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted">{copy.ratingsBody}</p>
    </div>
  );
}
