import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { VerificationHub, type VerificationState } from "@/components/account/VerificationHub";
import type { AccountLocale } from "@/lib/account/copy";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Identity Verification — FairSwap",
  description: "Verify your identity via DigiLocker on FairSwap India.",
};

interface VerificationPageProps {
  searchParams: Promise<{
    state?: string;
    status?: string;
    error?: string;
    lang?: string;
  }>;
}

function checkIsExpired(validUntilStr: unknown): boolean {
  if (!validUntilStr || typeof validUntilStr !== "string") return false;
  const time = new Date(validUntilStr).getTime();
  return Number.isFinite(time) && time <= Date.now();
}

export default async function VerificationPage({ searchParams }: VerificationPageProps) {
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData?.user) {
    redirect("/auth/sign-in?next=/account/verification");
  }

  const { state: callbackState, status: callbackStatus, error: callbackError, lang } = await searchParams;

  // Resolve locale from query param or NEXT_LOCALE cookie, defaulting to en
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get("NEXT_LOCALE")?.value;
  const locale: AccountLocale = lang === "hi" || cookieLocale === "hi" ? "hi" : "en";

  // Feature gate check: default false across all environments until credentials & launch
  const isFeatureEnabled = process.env.FAIRSWAP_IDV_ENABLED === "true";

  let verificationState: VerificationState = "not_verified";
  let verifiedAt: string | null = null;
  let validUntil: string | null = null;
  let revocationReason: string | null = null;
  const activeAttemptId: string | null = null;

  try {
    const { data: idvData } = await supabase.rpc("get_my_identity_verification");
    if (idvData && typeof idvData === "object") {
      const rec = idvData as Record<string, unknown>;
      const isExpired = checkIsExpired(rec.valid_until);
      
      if (rec.status === "revoked") {
        verificationState = "revoked";
      } else if (isExpired || rec.status === "expired") {
        verificationState = "expired";
      } else if (rec.badge_issued === true && rec.status === "verified" && !isExpired) {
        verificationState = "verified";
      } else if (rec.status === "in_progress") {
        verificationState = "in_progress";
      } else if (rec.status === "failed") {
        verificationState = "failed";
      }
      verifiedAt = (rec.verified_at as string) || null;
      validUntil = (rec.valid_until as string) || null;
      revocationReason = (rec.revocation_reason as string) || null;
    }
  } catch {
    verificationState = "not_verified";
  }

  // Handle callback return from DigiLocker when user returns
  // Note: Never trust query parameters as proof of identity.
  // The client or server will invoke independent backend verification using the single-use state nonce.
  if (verificationState !== "verified" && isFeatureEnabled) {
    if (callbackError || callbackStatus === "failed" || callbackStatus === "cancelled") {
      verificationState = callbackStatus === "cancelled" ? "cancelled" : "failed";
    } else if (callbackState) {
      verificationState = "in_progress";
    }
  }

  return (
    <VerificationHub
      initialState={verificationState}
      attemptId={activeAttemptId}
      verifiedAt={verifiedAt}
      validUntil={validUntil}
      revocationReason={revocationReason}
      isFeatureEnabled={isFeatureEnabled}
      locale={locale}
      callbackState={callbackState}
    />
  );
}

