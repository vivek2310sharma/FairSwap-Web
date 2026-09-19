"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isE164PhoneNumber, normalizePhoneNumber } from "@/lib/auth/phone";

type PhoneVerificationFormProps = {
  currentPhone?: string | null;
};

export function PhoneVerificationForm({ currentPhone }: PhoneVerificationFormProps) {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [pendingPhone, setPendingPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function requestVerification() {
    setError(null);
    setMessage(null);

    const normalizedPhone = normalizePhoneNumber(phone);
    if (!isE164PhoneNumber(normalizedPhone)) {
      setError("Enter a full international phone number, including the + country code.");
      return;
    }

    if (currentPhone && normalizedPhone === currentPhone) {
      setError("That phone number is already verified on this account.");
      return;
    }

    setIsPending(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({
      phone: normalizedPhone,
    });
    setIsPending(false);

    if (updateError) {
      setError("We could not send a verification code. Please try again.");
      return;
    }

    setPendingPhone(normalizedPhone);
    setStep("otp");
    setMessage("Verification code sent by SMS.");
  }

  async function verifyPhone() {
    setError(null);
    setMessage(null);
    const token = otp.trim();

    if (!/^\d{6}$/.test(token)) {
      setError("Enter the 6-digit code sent to your phone.");
      return;
    }

    setIsPending(true);
    const supabase = createClient();
    const { error: verifyError } = await supabase.auth.verifyOtp({
      phone: pendingPhone,
      token,
      type: "phone_change",
    });
    setIsPending(false);

    if (verifyError) {
      setError("That code is invalid or has expired. Request a new code and try again.");
      return;
    }

    setPhone("");
    setOtp("");
    setPendingPhone("");
    setStep("phone");
    setMessage("Phone number verified. You can now use it for SMS sign-in.");
    router.refresh();
  }

  return (
    <div className="mt-4 space-y-4">
      {currentPhone && (
        <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
          <span className="font-semibold">Verified:</span> {currentPhone}
        </div>
      )}

      {step === "phone" ? (
        <div className="space-y-3">
          <div>
            <label htmlFor="security-phone" className="block text-sm font-medium text-gray-700">
              {currentPhone ? "New phone number" : "Phone number"}
            </label>
            <input
              id="security-phone"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              type="tel"
              autoComplete="tel"
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              placeholder="+4512345678"
            />
          </div>

          <button
            type="button"
            onClick={requestVerification}
            disabled={isPending}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {isPending ? "Sending code..." : currentPhone ? "Verify new number" : "Verify phone number"}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            Enter the SMS code sent to <span className="font-semibold text-gray-900">{pendingPhone}</span>.
          </p>
          <div>
            <label htmlFor="security-phone-otp" className="block text-sm font-medium text-gray-700">
              Verification code
            </label>
            <input
              id="security-phone-otp"
              value={otp}
              onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              placeholder="123456"
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={verifyPhone}
              disabled={isPending}
              className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {isPending ? "Verifying..." : "Verify phone"}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep("phone");
                setOtp("");
                setError(null);
                setMessage(null);
              }}
              className="text-sm font-medium text-emerald-700 hover:text-emerald-800"
            >
              Change number
            </button>
          </div>
        </div>
      )}

      {message && (
        <p role="status" className="text-sm text-emerald-700">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}

      <p className="text-xs leading-5 text-gray-500">
        Use the international format beginning with + and your country code. FairSwap does not create accounts from phone sign-in.
      </p>
    </div>
  );
}
