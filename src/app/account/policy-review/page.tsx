import { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { checkPolicyAcceptanceStatus } from "@/lib/compliance/policy-acceptance";
import { sanitizeRedirectPath } from "@/lib/security/redirect";
import { PolicyReviewForm } from "./policy-review-form";
import { LEGAL_POLICY } from "@/lib/compliance/legal-policy";
import { signOutAction } from "@/app/auth/actions";

export const metadata: Metadata = {
  title: "Review Updated Policies | FairSwap",
  description: "Review and accept the FairSwap Public Beta terms, policies, and age confirmation.",
};

interface PolicyReviewPageProps {
  searchParams: Promise<{ next?: string }>;
}

export default async function PolicyReviewPage({ searchParams }: PolicyReviewPageProps) {
  const resolvedSearchParams = await searchParams;
  const rawNext = resolvedSearchParams?.next;
  const safeNext = sanitizeRedirectPath(rawNext, "/account");

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect(`/auth/sign-in?next=/account/policy-review`);
  }

  const check = await checkPolicyAcceptanceStatus(supabase);

  // If the user already has current acceptance, redirect directly to their destination
  if (check.status === "current") {
    redirect(safeNext);
  }

  // Restrained temporary error if status check failed (e.g. database/network glitch)
  // Do not present consent form when acceptance state cannot be determined reliably
  if (check.status === "error") {
    return (
      <main className="mx-auto max-w-xl px-4 py-12">
        <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-6 shadow-sm sm:p-10">
          <div className="mb-4">
            <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 ring-1 ring-amber-600/20">
              Temporary Service Notice
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
            Unable to Verify Policy Status
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-gray-600">
            We are temporarily unable to verify your policy acceptance records. To protect your
            account and avoid duplicate consent entries, re-acceptance is paused until the service is
            available.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <Link
              href={`/account/policy-review${rawNext ? `?next=${encodeURIComponent(rawNext)}` : ""}`}
              className="inline-flex justify-center items-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
            >
              Retry
            </Link>
            <Link
              href="/"
              className="inline-flex justify-center items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
            >
              Browse Public Ads
            </Link>
          </div>
          <div className="mt-6 border-t border-amber-200/60 pt-4 flex flex-col items-center gap-2 text-xs text-gray-500">
            <p>You can still exercise your data rights or contact support:</p>
            <div className="flex gap-4">
              <Link href="/account/privacy" className="font-semibold text-emerald-700 hover:underline">
                Privacy & Data Rights
              </Link>
              <Link href="/account/support" className="font-semibold text-emerald-700 hover:underline">
                Support & Appeals
              </Link>
            </div>
            <form action={signOutAction} className="mt-2">
              <button
                type="submit"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 underline focus:outline-none"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-10">
        <div className="mb-6">
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-600/20">
            Public Beta Compliance Notice
          </span>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            Review Updated FairSwap Policies
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-gray-600">
            FairSwap has established its authoritative Public Beta baseline policies (version{" "}
            <strong>{LEGAL_POLICY.termsVersion}</strong>). To continue using authenticated platform
            features, existing pilot users must review and accept the updated Terms of Service and
            Acceptable Use Policy, acknowledge the Privacy Policy, and confirm they meet the
            minimum age requirement.
          </p>
          <div className="mt-4 rounded-lg bg-gray-50 p-3 text-xs text-gray-500 border border-gray-100">
            Your original pilot policy acceptance record remains preserved. This re-acceptance will
            be recorded separately as versioned policy evidence.
          </div>
        </div>

        <PolicyReviewForm nextTarget={safeNext} />
      </div>
    </main>
  );
}
