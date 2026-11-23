import Link from "next/link";
import { DIGILOCKER_ICON_SRC } from "@/components/idv/DigiLockerBadge";
import { digiLockerCopy, type DigiLockerLocale } from "@/lib/idv/digilocker-copy";
import { identityVerifyHref, type IdentityGateContext } from "@/lib/idv/return-path";

/**
 * Verification-required interstitial for posting and messaging. Presentation only: the Backend triggers are the
 * enforcement. No hooks, no animation, no third-party assets, so it renders on the server and in client components.
 */
export function IdentityRequiredScreen({
  context,
  returnTo,
  locale = "en",
  compact = false,
}: {
  context: IdentityGateContext;
  returnTo?: string | null;
  locale?: DigiLockerLocale;
  compact?: boolean;
}) {
  const c = digiLockerCopy[locale];
  const text = c.gate[context];
  const id = `identity-required-${context}`;
  const Heading = compact ? "h2" : "h1";
  return (
    <section
      aria-labelledby={id}
      data-testid="identity-required-screen"
      className={`mx-auto flex w-full max-w-md flex-col items-center px-4 text-center ${compact ? "py-6" : "min-h-[60vh] justify-center py-12"}`}
    >
      <div className={`flex items-center justify-center rounded-full bg-surface ${compact ? "h-20 w-20" : "h-28 w-28"}`}>
        {/* eslint-disable-next-line @next/next/no-img-element -- fixed static brand icon, no optimisation needed */}
        <img src={DIGILOCKER_ICON_SRC} alt="" width={compact ? 40 : 56} height={compact ? 36 : 50} className="h-auto" />
      </div>
      <Heading id={id} className="mt-6 text-xl font-semibold text-foreground sm:text-2xl">
        {text.title}
      </Heading>
      <p className="mt-3 text-sm text-muted sm:text-base">{text.body}</p>
      <Link
        href={identityVerifyHref(context, returnTo)}
        className="mt-6 inline-flex min-h-12 w-full max-w-xs items-center justify-center rounded-full bg-action-600 px-6 py-3 text-base font-semibold text-white hover:bg-action-700 focus:outline-hidden focus:ring-2 focus:ring-action-500 focus:ring-offset-2"
      >
        Verify with DigiLocker
      </Link>
    </section>
  );
}
