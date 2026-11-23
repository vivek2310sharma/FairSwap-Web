import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { digiLockerCopy } from "@/lib/idv/digilocker-copy";
import { isDigiLockerEnabled } from "@/lib/idv/digilocker";
import { isMyDigiLockerVerified } from "@/lib/idv/digilocker-badge-server";
import { safeVerificationReturnPath } from "@/lib/idv/return-path";
import { DigiLockerVerification } from "@/components/account/DigiLockerVerification";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Identity Verification — FairSwap",
  description: "Verify your identity via DigiLocker on FairSwap India.",
};

interface VerificationPageProps {
  searchParams: Promise<{
    dl?: string;
    required?: string;
    context?: string;
    next?: string;
  }>;
}

export default async function VerificationPage({ searchParams }: VerificationPageProps) {
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData?.user) {
    redirect("/auth/sign-in?next=/account/verification");
  }

  const { dl, required, next } = await searchParams;
  const locale = "en" as const;

  // DigiLocker direct account verification (one-time). When enabled it replaces the document-based hub.
  if (isDigiLockerEnabled()) {
    // Server-authoritative: get_my_marketplace_access().digilocker_verified. The `dl` query parameter is never proof.
    const verified = await isMyDigiLockerVerified(supabase);
    return <DigiLockerVerification verified={verified} result={dl} showRequiredNotice={required === "1"} locale={locale} returnTo={safeVerificationReturnPath(next)} />;
  }

  // DigiLocker is the only verification journey. The legacy document-based hub is not reachable from here.
  return (
    <main id="verification-content" className="mx-auto w-full max-w-xl px-4 py-6">
      <h1 className="text-xl font-semibold">{digiLockerCopy[locale].heading}</h1>
      <p role="status" className="mt-3">{digiLockerCopy[locale].unavailable}</p>
    </main>
  );
}
