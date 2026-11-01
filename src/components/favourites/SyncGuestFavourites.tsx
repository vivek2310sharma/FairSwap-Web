"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { syncGuestFavouritesAction } from "@/app/account/favourites/actions";
import { buttonVariants } from "@/components/ui/button";
import { clearGuestFavourites, removeGuestFavourites, useGuestFavourites } from "@/lib/favourites/guest";

/**
 * Account favourites page only. Offers, never performs, the device-to-account sync: the visitor must press the button,
 * and only ids the server confirmed are removed from the device. A shared-device visitor can discard the device saves instead.
 */
export function SyncGuestFavourites() {
  const ids = useGuestFavourites();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sync = () => {
    setError(null);
    setNotice(null);
    start(async () => {
      const result = await syncGuestFavouritesAction([...ids]);
      if (!result.success) {
        if (result.redirectTo) router.push(result.redirectTo);
        else setError(result.error ?? "Could not sync saved ads");
        return;
      }
      removeGuestFavourites(result.syncedIds ?? []);
      const parts = [`${result.added ?? 0} added to your account`];
      if (result.alreadySaved) parts.push(`${result.alreadySaved} already saved`);
      if (result.skipped) parts.push(`${result.skipped} no longer available and kept on this device`);
      setNotice(`${parts.join(", ")}.`);
      router.refresh();
    });
  };

  if (ids.length === 0 && !notice) return null;
  return (
    <section aria-labelledby="device-saves-heading" className="mb-8 rounded-2xl border border-border bg-card p-5">
      <h2 id="device-saves-heading" className="text-sm font-bold text-foreground">Saved on this device</h2>
      {ids.length > 0 && (
        <>
          <p className="mt-1 text-xs text-muted">
            {ids.length} {ids.length === 1 ? "ad is" : "ads are"} saved in this browser, not in your account. Add them to your account only if this is your own device.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={sync} disabled={pending} aria-busy={pending} className={buttonVariants({ variant: "primary" })}>
              {pending ? "Adding…" : "Add to my account"}
            </button>
            <button type="button" onClick={() => { clearGuestFavourites(); setNotice("Device saves cleared."); }} disabled={pending} className={buttonVariants({ variant: "secondary" })}>
              Clear device saves
            </button>
          </div>
        </>
      )}
      {notice && <p role="status" className="mt-3 text-xs text-foreground">{notice}</p>}
      {error && <p role="alert" className="mt-3 text-xs text-red-700">{error}</p>}
    </section>
  );
}
