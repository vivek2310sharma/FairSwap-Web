"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function MFAContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/admin";

  const [loading, setLoading] = useState(true);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    async function checkMFA() {
      const supabase = createClient();
      const { data: aalData, error: aalError } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

      if (aalError) {
        setError(aalError.message);
        setLoading(false);
        return;
      }

      // If already at AAL2, redirect to target
      if (aalData.currentLevel === "aal2") {
        router.push(next);
        return;
      }

      // Check existing enrolled factors
      const { data: factorsData, error: factorsError } =
        await supabase.auth.mfa.listFactors();

      if (factorsError) {
        setError(factorsError.message);
        setLoading(false);
        return;
      }

      const totpFactor = factorsData.totp.find((f) => f.status === "verified");

      if (totpFactor) {
        setFactorId(totpFactor.id);
        setLoading(false);
      } else {
        // Enroll a new TOTP factor
        const { data: enrollData, error: enrollError } =
          await supabase.auth.mfa.enroll({
            factorType: "totp",
            issuer: "FairSwap Staff",
          });

        if (enrollError) {
          setError(enrollError.message);
          setLoading(false);
          return;
        }

        setFactorId(enrollData.id);
        setQrCode(enrollData.totp.qr_code);
        setSecret(enrollData.totp.secret);
        setLoading(false);
      }
    }

    checkMFA();
  }, [next, router]);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!factorId || !verifyCode) return;

    setIsVerifying(true);
    setError(null);

    const supabase = createClient();
    const { error: challengeError } = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code: verifyCode,
    });

    if (challengeError) {
      setError("Invalid verification code. Please check your authenticator app.");
      setIsVerifying(false);
      return;
    }

    router.push(next);
    router.refresh();
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center text-gray-600">
        Loading two-factor authentication...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-bold text-gray-900">Staff Two-Factor Authentication</h1>
        <p className="mt-2 text-sm text-gray-600">
          Privileged staff access requires TOTP Multi-Factor Authentication (AAL2).
        </p>

        {error && (
          <div
            role="alert"
            className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {qrCode && (
          <div className="mt-6 text-center">
            <p className="text-sm font-semibold text-gray-800">1. Scan this QR Code</p>
            <p className="mt-1 text-xs text-gray-500">
              Use Google Authenticator, Authy, or another TOTP app.
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrCode}
              alt="MFA QR Code"
              className="mx-auto mt-3 h-48 w-48 border border-gray-200 p-2"
            />
            {secret && (
              <p className="mt-2 font-mono text-xs text-gray-600">
                Secret: <span className="select-all font-bold">{secret}</span>
              </p>
            )}
          </div>
        )}

        <form onSubmit={handleVerify} className="mt-6 space-y-4">
          <div>
            <label htmlFor="totpCode" className="block text-sm font-medium text-gray-700">
              {qrCode ? "2. Enter the 6-digit code" : "Enter the 6-digit code from your authenticator app"}
            </label>
            <input
              id="totpCode"
              type="text"
              required
              maxLength={6}
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ""))}
              placeholder="123456"
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-center text-xl tracking-widest text-gray-900 placeholder:text-gray-500 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <button
            type="submit"
            disabled={isVerifying || verifyCode.length !== 6}
            className="w-full rounded-md bg-emerald-600 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {isVerifying ? "Verifying..." : "Verify & Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function MFAPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-md px-4 py-16 text-center text-gray-600">
          Loading two-factor authentication...
        </div>
      }
    >
      <MFAContent />
    </Suspense>
  );
}
