/** The only trust badge for DigiLocker verification. Wording is fixed; no subtitle or secondary text.
 *  Render only from a database-backed verified projection, never from query parameters or client state. */
export const DIGILOCKER_BADGE_LABEL = "Verified with DigiLocker";
/** Official DigiLocker logo asset (supplied from the DigiLocker brand kit; not authored here). */
export const DIGILOCKER_LOGO_SRC = "/brand/digilocker-logo.svg";

export function DigiLockerBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-0.5 text-xs font-semibold text-foreground ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- fixed static SVG, no optimisation needed */}
      <img src={DIGILOCKER_LOGO_SRC} alt="" width={16} height={16} className="h-4 w-4" />
      <span>{DIGILOCKER_BADGE_LABEL}</span>
    </span>
  );
}
