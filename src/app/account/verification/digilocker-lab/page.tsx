import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { LAB_PAGE_PATH, isDigiLockerLabEnabled } from "@/lib/idv/digilocker-lab";
import { DigiLockerLabPanel } from "@/components/account/DigiLockerLabPanel";
import { consumeLabResultAction } from "./actions";

export const dynamic = "force-dynamic"; // never cached or prerendered

export const metadata: Metadata = {
  title: "DigiLocker Identity Lab (Stage) — FairSwap",
  robots: { index: false, follow: false },
};

// STAGE-ONLY. 404 unless enabled on a non-Production deployment that targets FairSwapTest. Tester authorization is
// enforced by the Backend. This page never shows values, links an identity or issues a FairSwap badge.
export default async function DigiLockerLabPage() {
  if (!isDigiLockerLabEnabled()) notFound();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) redirect(`/auth/sign-in?next=${encodeURIComponent(LAB_PAGE_PATH)}`);
  return <DigiLockerLabPanel consumeResult={consumeLabResultAction} />;
}
