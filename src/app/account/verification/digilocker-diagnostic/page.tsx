import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import {
  DIAG_PAGE_PATH, DIAG_RESULT_COOKIE, isDigiLockerDiagEnabled, readDiagResultCookie,
} from "@/lib/idv/digilocker-diagnostic";
import { DigiLockerDiagnosticPanel } from "@/components/account/DigiLockerDiagnosticPanel";

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
  const result = readDiagResultCookie((await cookies()).get(DIAG_RESULT_COOKIE)?.value);
  return <DigiLockerDiagnosticPanel result={result} />;
}
