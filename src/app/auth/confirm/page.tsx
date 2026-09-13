import Link from "next/link";

interface ConfirmPageProps {
  searchParams: Promise<{ email?: string }>;
}

export default async function ConfirmPage({ searchParams }: ConfirmPageProps) {
  const { email } = await searchParams;

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
          <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h1 className="mt-4 text-xl font-bold text-gray-900">Check your email</h1>
        <p className="mt-2 text-sm text-gray-600">
          We have sent a verification link to{" "}
          <span className="font-semibold text-gray-800">{email || "your email address"}</span>.
        </p>
        <p className="mt-3 text-xs text-gray-500">
          Click the link in the email to confirm your account and access FairSwap.
        </p>
        <div className="mt-6">
          <Link
            href="/auth/sign-in"
            className="inline-block rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
