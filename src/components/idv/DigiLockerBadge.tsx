/** The only trust badge for DigiLocker verification. Wording is fixed; no subtitle or secondary text.
 *  Render only from a database-backed verified projection, never from query parameters or client state. */
export const DIGILOCKER_BADGE_LABEL = "Verified with DigiLocker";
/** DigiLocker icon (glyph only, no wordmark or tagline), cropped unchanged from the supplied DigiLocker logo. */
export const DIGILOCKER_ICON_SRC = "/brand/digilocker-icon.png";

export function DigiLockerBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-0.5 text-xs font-semibold text-foreground ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- fixed 16px static icon, no optimisation needed */}
      <img src={DIGILOCKER_ICON_SRC} alt="" width={18} height={16} className="h-4 w-auto" />
      <span>{DIGILOCKER_BADGE_LABEL}</span>
    </span>
  );
}
