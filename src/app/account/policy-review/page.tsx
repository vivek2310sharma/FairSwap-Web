import { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { checkPolicyAcceptanceStatus } from "@/lib/compliance/policy-acceptance";
import { sanitizeRedirectPath } from "@/lib/security/redirect";
import { PolicyReviewForm } from "./policy-review-form";
import { LEGAL_POLICY } from "@/lib/compliance/legal-policy";

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
            Historical pilot records remain securely archived in FairSwap&apos;s immutable audit log.
            Your re-acceptance will be recorded as append-only compliance evidence.
          </div>
        </div>

        <PolicyReviewForm nextTarget={safeNext} />
      </div>
    </main>
  );
}
