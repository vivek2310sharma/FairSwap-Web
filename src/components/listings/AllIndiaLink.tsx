"use client";

import Link from "next/link";
import { LOCATION_PREFERENCE_KEY } from "@/lib/location/discovery";

/** Clears the URL area and the remembered area together, so the saved area cannot restore again. */
export function AllIndiaLink({ className, children }: { className?: string; children: React.ReactNode }) {
  return <Link href="/" className={className} onClick={() => {
    try { localStorage.removeItem(LOCATION_PREFERENCE_KEY); } catch { /* Storage may be disabled. */ }
  }}>{children}</Link>;
}
