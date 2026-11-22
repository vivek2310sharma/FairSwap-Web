import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import MacroCategorySelector from "@/components/listings/MacroCategorySelector";
import styles from "@/components/listings/posting/Posting.module.css";
import { createClient } from "@/lib/supabase/server";
import { sanitizeRedirectPath } from "@/lib/security/redirect";
import { identityGateLocale, needsIdentityVerification } from "@/lib/idv/gate-server";
import { IdentityRequiredScreen } from "@/components/idv/IdentityRequiredScreen";
import { loadGoodsBindings, loadGoodsDefinition } from "@/lib/listings/ordinary-goods/server";
import { loadTaxonomy } from "@/lib/listings/taxonomy-v2-server";
import { loadSpecialistBindings } from "@/lib/listings/posting-capabilities-server";
import { CANONICAL_POSTING_PATH, resolveCreationQuery } from "@/lib/listings/canonical-posting-route";
import { loadPostAdLocations } from "@/lib/listings/post-ad-locations";
import { isSellerWriteMaintenanceEnabled, SELLER_WRITE_MAINTENANCE_MESSAGE } from "@/lib/maintenance/seller-writes";

export const metadata: Metadata = { title: "Post an ad | FairSwap.in" };

export default async function NewListingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const isMaintenanceActive = isSellerWriteMaintenanceEnabled();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(await searchParams)) {
      if (Array.isArray(value)) {
        for (const item of value) query.append(key, item);
      } else if (value !== undefined) {
        query.append(key, value);
      }
    }
    const pathname = "/account/listings/new";
    const search = query.toString();
    const next = sanitizeRedirectPath(
      search ? `${pathname}?${search}` : pathname,
      pathname
    );
    const signInQuery = new URLSearchParams({ next });
    redirect(`/auth/sign-in?${signInQuery.toString()}`);
  }

  // Mandatory DigiLocker gate, UX only: status comes from the authenticated get_my_marketplace_access() RPC and is
  // shown BEFORE any ad data loads. The Backend triggers remain the enforcement for every create/draft/media write.
  if (await needsIdentityVerification(supabase)) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(await searchParams)) {
      if (Array.isArray(value)) for (const item of value) query.append(key, item);
      else if (value !== undefined) query.append(key, value);
    }
    const search = query.toString();
    return (
      <main id="posting-content">
        <IdentityRequiredScreen context="post" returnTo={search ? `/account/listings/new?${search}` : "/account/listings/new"} locale={await identityGateLocale()} />
      </main>
    );
  }

  const choice = resolveCreationQuery(await searchParams);
  if (choice.kind === "redirect") redirect(CANONICAL_POSTING_PATH);
  const bindingRequest = Promise.all([loadSpecialistBindings(supabase), loadGoodsBindings(supabase)])
    .then(([specialists, goods]) => ({ ...specialists, ...goods }));
  const [catalogue, bindings] = await Promise.all([
    loadTaxonomy(supabase, bindingRequest), bindingRequest,
  ]);
  const capabilities = {
    mobilePhones: !!bindings["specialist:phone"], tablets: !!bindings["specialist:tablet"],
    wearables: !!bindings["specialist:wearable"],
    cars: "off", twoWheelers: "off", property: "off", goodsCategories: [], propertyPaths: [],
  } as const;
  const back = <Link className={styles.back} href={CANONICAL_POSTING_PATH}><ArrowLeft size={18} aria-hidden="true"/> Categories</Link>;
  const unavailable = () => <main id="posting-content" className={styles.journey}>{back}<h1>This category isn’t available right now</h1><p role="status">Choose another category. Existing drafts remain in My ads.</p></main>;
  if (choice.kind === "chooser") return <main id="posting-content" className={styles.journey}>
    <Link href="/account/listings" className={styles.back}><ArrowLeft size={18} aria-hidden="true"/> My ads</Link>
    {isMaintenanceActive && <p role="alert" className={styles.errorBox}>{SELLER_WRITE_MAINTENANCE_MESSAGE}</p>}
    <MacroCategorySelector catalogue={catalogue} capabilities={capabilities} availability={{ goods: { available: true }, vehicles: { available: false, reason: "Unavailable" }, property: { available: false, reason: "Unavailable" } }}/>
  </main>;

  const selected = catalogue?.flatMap(group => group.subs).find(node => node.id === choice.slug);
  if (!selected || selected.route.kind === "none" || selected.route.kind === "blocked") return unavailable();
  // Load only the selected catalogue and form. Recheck its independent runtime
  // category binding before passing any data to a wizard. No raw-form fallback.
  const common = { ownerId: user.id, maintenance: isMaintenanceActive,
    maintenanceMessage: isMaintenanceActive ? SELLER_WRITE_MAINTENANCE_MESSAGE : undefined };
  let wizard;
  if (selected.route.kind === "mobile-phones") {
    const { loadMobileCatalogue } = await import("@/lib/listings/mobiles/server");
    const definition = await loadMobileCatalogue(supabase);
    if (!definition || definition.listing_category_id !== bindings["specialist:phone"]) return unavailable();
    const { default: Form } = await import("@/components/listings/MobilePhoneForm");
    const locations = await loadPostAdLocations(supabase);
    if (locations.status !== "ready") return <main id="posting-content" className={styles.journey}>{back}<p role="alert">We couldn’t load your area options. Please try again shortly.</p></main>;
    wizard = <Form key={user.id} {...common} catalogue={definition} cities={locations.cities}/>;
  } else if (selected.route.kind === "tablets") {
    const { loadTabletCatalogue } = await import("@/lib/listings/tablets/server");
    const definition = await loadTabletCatalogue(supabase);
    if (!definition || definition.listing_category_id !== bindings["specialist:tablet"]) return unavailable();
    const { default: Form } = await import("@/components/listings/TabletForm");
    const locations = await loadPostAdLocations(supabase);
    if (locations.status !== "ready") return <main id="posting-content" className={styles.journey}>{back}<p role="alert">We couldn’t load your area options. Please try again shortly.</p></main>;
    wizard = <Form key={user.id} {...common} catalogue={definition} cities={locations.cities}/>;
  } else if (selected.route.kind === "wearables") {
    const { loadWearableCatalogue } = await import("@/lib/listings/wearables/server");
    const definition = await loadWearableCatalogue(supabase);
    if (!definition || definition.listing_category_id !== bindings["specialist:wearable"]) return unavailable();
    const { default: Form } = await import("@/components/listings/WearableForm");
    const locations = await loadPostAdLocations(supabase);
    if (locations.status !== "ready") return <main id="posting-content" className={styles.journey}>{back}<p role="alert">We couldn’t load your area options. Please try again shortly.</p></main>;
    wizard = <Form key={user.id} {...common} catalogue={definition} cities={locations.cities}/>;
  } else if (selected.route.kind === "ordinary-goods") {
    const definition = await loadGoodsDefinition(supabase, choice.slug).catch(() => null);
    if (!definition || definition.category_id !== selected.route.categoryId) return unavailable();
    const [{ default: Form }, locations] = await Promise.all([
      import("@/components/listings/posting/OrdinaryGoodsForm"), loadPostAdLocations(supabase),
    ]);
    if (locations.status !== "ready") return <main id="posting-content" className={styles.journey}>{back}<p role="alert">We couldn’t load your area options. Please try again shortly.</p></main>;
    wizard = <Form key={`${user.id}:${choice.slug}:${definition.revision}`} {...common}
      definition={definition} label={selected.label} cities={locations.cities}/>;
  } else return unavailable();
  return <main id="posting-content" className={styles.journey}>{back}{wizard}</main>;
}
