import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { DIAG_PAGE_PATH, isDigiLockerDiagEnabled } from "@/lib/idv/digilocker-diagnostic";
import { DigiLockerDiagnosticPanel } from "@/components/account/DigiLockerDiagnosticPanel";
import { consumeDiagnosticResult } from "./actions";

export const metadata: Metadata = {
  title: "DigiLocker diagnostic (Stage) — FairSwap",
  robots: { index: false, follow: false },
};

// STAGE-ONLY owner diagnostic. 404 unless enabled on a non-Production deployment that targets FairSwapTest.
// Tester authorization is enforced by the Backend; this page never shows or issues a FairSwap verification badge.
export default async function DigiLockerDiagnosticPage() {
  if (!isDigiLockerDiagEnabled()) notFound();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) redirect(`/auth/sign-in?next=${encodeURIComponent(DIAG_PAGE_PATH)}`);
  // The sealed result is never read here: the panel consumes it once through a Server Action, which verifies the
  // HMAC, user, session and expiry and deletes the cookie (Server Components cannot delete cookies).
  return <DigiLockerDiagnosticPanel consumeResult={consumeDiagnosticResult} />;
}
