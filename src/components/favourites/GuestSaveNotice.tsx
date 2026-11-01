"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { subscribeGuestSaveEvents, type GuestSaveEvent } from "@/lib/favourites/guest";
import { SAVED_IDS_LIMIT } from "@/lib/favourites/types";

const VISIBLE_MS = 6000;

function message(event: GuestSaveEvent): string {
  if (event.kind === "limit") return `You can save up to ${SAVED_IDS_LIMIT} ads on this device. Remove one to save another.`;
  if (event.kind === "removed") return event.persistent ? "Removed from saved on this device." : "Removed from this visit's saved ads.";
  return event.persistent
    ? "Saved on this device. Sign in later to add it to your account."
    : "Saved for this visit only. Your browser is blocking device storage.";
}

/** Mounted once in the root layout. Uses a bare aria-live region (no role) so it never collides with page-level status regions. Announces device-save feedback; it never blocks the page or asks for a sign-in. */
export function GuestSaveNotice() {
  const [event, setEvent] = useState<GuestSaveEvent | null>(null);

  useEffect(() => subscribeGuestSaveEvents(setEvent), []);
  useEffect(() => {
    if (!event) return;
    const timer = window.setTimeout(() => setEvent(null), VISIBLE_MS);
    return () => window.clearTimeout(timer);
  }, [event]);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-40 flex justify-center px-4 md:bottom-6" aria-live="polite" aria-atomic="true" data-testid="guest-save-notice">
      {event && (
        <div className="pointer-events-auto flex max-w-md flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl border border-border bg-card px-4 py-2.5 text-sm text-foreground shadow-lg">
          <span>{message(event)}</span>
          {event.kind !== "removed" && <Link href="/saved" className="font-semibold text-link underline">View saved</Link>}
        </div>
      )}
    </div>
  );
}
