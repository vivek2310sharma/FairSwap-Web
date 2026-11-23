import Link from "next/link";
import { IDENTITY_REQUIRED_MESSAGE, IDENTITY_VERIFY_URL } from "@/lib/idv/gate";

/** Shown instead of an unexplained permission error when the Backend gate refuses an unverified user. UX only. */
export function IdentityRequiredCta() {
  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <span>{IDENTITY_REQUIRED_MESSAGE}</span>
      <Link href={IDENTITY_VERIFY_URL} className="font-semibold underline">Verify with DigiLocker</Link>
    </span>
  );
}

/** Renders a gate message as the CTA, anything else as plain text. */
export function GateAwareError({ message }: { message: string }) {
  return message === IDENTITY_REQUIRED_MESSAGE ? <IdentityRequiredCta /> : <>{message}</>;
}
