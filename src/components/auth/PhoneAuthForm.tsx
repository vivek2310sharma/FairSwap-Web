"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isE164PhoneNumber, normalizePhoneNumber } from "@/lib/auth/phone";
import { sanitizeRedirectPath } from "@/lib/security/redirect";

type PhoneAuthFormProps = {
  next?: string;
};

export function PhoneAuthForm({ next = "/account" }: PhoneAuthFormProps) {
  const [phone, setPhone] = useState("");
  const [pendingPhone, setPendingPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const safeNext = sanitizeRedirectPath(next, "/account");

  async function requestCode() {
    setError(null);
    const normalizedPhone = normalizePhoneNumber(phone);

    if (!isE164PhoneNumber(normalizedPhone)) {
      setError("Enter a full international phone number, including the + country code.");
      return;
    }

    setIsPending(true);
    const supabase = createClient();
    const { error: otpError } = await supabase.auth.signInWithOtp({
      phone: normalizedPhone,
      options: {
        shouldCreateUser: false,
      },
    });
    setIsPending(false);

    if (otpError) {
      setError("We could not send a sign-in code. Check the number and try again.");
      return;
    }

    setPendingPhone(normalizedPhone);
    setStep("otp");
  }

  async function verifyCode() {
    setError(null);
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
      type: "sms",
    });
    setIsPending(false);

    if (verifyError) {
      setError("That code is invalid or has expired. Request a new code and try again.");
      return;
    }

    window.location.assign(safeNext);
  }

  if (step === "otp") {
    return (
      <div className="space-y-3">
        <div>
          <label htmlFor="phone-otp" className="block text-sm font-medium text-gray-700">
            SMS verification code
          </label>
          <input
            id="phone-otp"
            value={otp}
            onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            placeholder="123456"
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={verifyCode}
          disabled={isPending}
          className="w-full rounded-md border border-gray-300 bg-white py-2.5 text-sm font-semibold text-gray-800 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {isPending ? "Verifying..." : "Verify & sign in"}
        </button>

        <button
          type="button"
          onClick={() => {
            setStep("phone");
            setOtp("");
            setError(null);
          }}
          className="w-full text-sm font-medium text-emerald-700 hover:text-emerald-800"
        >
          Use a different phone number
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <label htmlFor="phone-sign-in" className="block text-sm font-medium text-gray-700">
          Verified Phone Number
        </label>
        <input
          id="phone-sign-in"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          type="tel"
          autoComplete="tel"
          className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          placeholder="+4512345678"
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={requestCode}
        disabled={isPending}
        className="w-full rounded-md border border-gray-300 bg-white py-2.5 text-sm font-semibold text-gray-800 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50"
      >
        {isPending ? "Sending code..." : "Continue with phone"}
      </button>

      <p className="text-xs leading-5 text-gray-500">
        Phone sign-in only works for a verified phone number already attached to an existing FairSwap account.
      </p>
    </div>
  );
}
