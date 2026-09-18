import { redirect } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { createClient } from "@/lib/supabase/server";
import { MessageSquare, ArrowRight, Tag } from "lucide-react";
import { formatMessageDate } from "@/lib/formatters";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Messages — FairSwap",
  description: "Your buyer and seller conversations on FairSwap.",
};

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab = "all" } = await searchParams;
  const supabase = await createClient();

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    redirect("/auth/sign-in?next=/account/messages");
  }

  const userId = userData.user.id;

  // Query conversations where user is buyer or seller
  const { data: convData } = await supabase
    .from("conversations")
    .select(`
      id,
      listing_id,
      buyer_id,
      seller_id,
      last_message_at,
      created_at,
      listing:listings (
        id,
        title,
        slug,
        status,
        price_paise,
        cover_photo_id
      )
    `)
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .order("last_message_at", { ascending: false })
    .limit(50);

  const rawConvs = convData || [];

  // Fetch profiles safely for all participants
  const userIds = Array.from(new Set(rawConvs.flatMap((c) => [c.buyer_id, c.seller_id]).filter(Boolean) as string[]));
  const { data: profileRows } = userIds.length > 0
    ? await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", userIds)
    : { data: [] };

  const profileMap = new Map((profileRows || []).map((p) => [p.id, p]));

  const conversations = rawConvs.map((c) => ({
    ...c,
    buyer: c.buyer_id ? profileMap.get(c.buyer_id) || { id: c.buyer_id, display_name: "Buyer", avatar_url: null } : null,
    seller: c.seller_id ? profileMap.get(c.seller_id) || { id: c.seller_id, display_name: "Seller", avatar_url: null } : null,
  }));

  const filtered = conversations.filter((c) => {
    if (tab === "buying") return c.buyer_id === userId;
    if (tab === "selling") return c.seller_id === userId;
    return true;
  });

  return (
    <>
      <Header />

      <main className="flex-1 bg-surface/20 py-8 sm:py-12">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
                <MessageSquare className="h-6 w-6 text-brand-600" />
                <span>Messages</span>
              </h1>
              <p className="mt-1 text-xs text-muted">
                Direct communications with buyers and sellers.
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center rounded-xl border border-border bg-surface p-1 text-xs font-semibold">
              <Link
                href="/account/messages?tab=all"
                className={`rounded-lg px-3 py-1.5 transition-colors ${
                  tab === "all"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted hover:text-foreground"
                }`}
              >
                All ({conversations.length})
              </Link>
              <Link
                href="/account/messages?tab=buying"
                className={`rounded-lg px-3 py-1.5 transition-colors ${
                  tab === "buying"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted hover:text-foreground"
                }`}
              >
                Buying ({conversations.filter((c) => c.buyer_id === userId).length})
              </Link>
              <Link
                href="/account/messages?tab=selling"
                className={`rounded-lg px-3 py-1.5 transition-colors ${
                  tab === "selling"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted hover:text-foreground"
                }`}
              >
                Selling ({conversations.filter((c) => c.seller_id === userId).length})
              </Link>
            </div>
          </div>

          {/* Conversations List */}
          <div className="mt-6 space-y-3">
            {filtered.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card p-12 text-center">
                <MessageSquare className="mx-auto h-12 w-12 text-muted/40" />
                <h2 className="mt-4 text-base font-bold text-foreground">No conversations found</h2>
                <p className="mt-1 text-xs text-muted max-w-sm mx-auto leading-relaxed">
                  {tab === "buying"
                    ? "You haven't contacted any sellers yet. Browse items and click 'Contact Seller'."
                    : tab === "selling"
                    ? "You haven't received any inquiries on your listings yet."
                    : "When you contact a seller or receive an inquiry on your listings, messages will appear here."}
                </p>
                <div className="mt-6">
                  <Link
                    href="/search"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-brand-500 shadow-xs"
                  >
                    <span>Browse Listings</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            ) : (
              filtered.map((conv) => {
                const isBuyer = conv.buyer_id === userId;
                const rawCounterparty = isBuyer ? conv.seller : conv.buyer;
                const counterparty = Array.isArray(rawCounterparty) ? rawCounterparty[0] : rawCounterparty;
                const counterpartyName = counterparty?.display_name || "Deleted User";
                const listing = Array.isArray(conv.listing) ? conv.listing[0] : conv.listing;

                return (
                  <Link
                    key={conv.id}
                    href={`/account/messages/${conv.id}`}
                    className="group block rounded-2xl border border-border bg-card p-4 shadow-xs transition hover:border-brand-300 hover:shadow-md dark:hover:border-brand-700"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-100 font-bold text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                          {counterpartyName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h2 className="text-sm font-bold text-foreground group-hover:text-brand-600 transition-colors">
                              {counterpartyName}
                            </h2>
                            <span className="rounded-md bg-surface px-1.5 py-0.5 text-[10px] font-medium text-muted">
                              {isBuyer ? "Seller" : "Buyer"}
                            </span>
                          </div>
                          {listing && (
                            <p className="mt-0.5 text-xs text-muted flex items-center gap-1.5 truncate max-w-sm sm:max-w-md">
                              <Tag className="h-3 w-3 shrink-0" />
                              <span className="truncate">{listing.title}</span>
                              <span>&bull;</span>
                              <span className="font-semibold text-foreground">
                                {listing.price_paise !== null
                                  ? `₹${(listing.price_paise / 100).toLocaleString("en-IN")}`
                                  : "Free"}
                              </span>
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[11px] text-muted">
                          {formatMessageDate(conv.last_message_at)}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
