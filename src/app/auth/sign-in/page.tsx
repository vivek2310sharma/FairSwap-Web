"use client";

import { Suspense, useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { z } from "zod";
import {
  signInAction,
  sendEmailOtpAction,
  verifyEmailOtpAction,
} from "../actions";
import { NEUTRAL_OTP_ACKNOWLEDGEMENT } from "@/lib/auth/constants";
import { sanitizeRedirectPath } from "@/lib/security/redirect";
import { AuthCloseLink } from "@/components/auth/AuthCloseLink";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { HELP_CENTRE_URL } from "@/lib/help-centre";

const EmailSchema = z.string().email("Please provide a valid email address.");

type ActiveNotice = {
  type: "error" | "status";
  message: string;
} | null;

function isNextRedirectError(err: unknown): boolean {
  if (typeof err === "object" && err !== null && "digest" in err) {
    const digest = (err as { digest?: unknown }).digest;
    return (
      typeof digest === "string" &&
      (digest.startsWith("NEXT_REDIRECT") || digest.startsWith("NEXT_ROUTER_STATE"))
    );
  }
  return false;
}

function SignInForm() {
  const searchParams = useSearchParams();
  const next = sanitizeRedirectPath(searchParams.get("next"), "/account");
  const errorParam = searchParams.get("error");
  const messageParam = searchParams.get("message");
  const initialEmail = searchParams.get("email") || "";
  const initialStepParam = searchParams.get("step");
  const initialStep: "email" | "password" | "otp" =
    initialStepParam === "otp" && initialEmail
      ? "otp"
      : initialEmail
      ? "password"
      : "email";

  const [step, setStep] = useState<"email" | "password" | "otp">(initialStep);
  const [email, setEmail] = useState(initialEmail);
  const [emailError, setEmailError] = useState<string | null>(null);

  // In-flight operation state
  const [isSignInPending, setIsSignInPending] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyOtpPending, setIsVerifyOtpPending] = useState(false);

  // Scoped notice state
  const [activeNotice, setActiveNotice] = useState<ActiveNotice>(null);

  // Cooldown state per normalized email
  const [cooldowns, setCooldowns] = useState<Record<string, number>>({});
  const [now, setNow] = useState(() => Date.now());

  // Generation / attempt tracking ref
  const attemptRef = useRef(0);
  const stepRef = useRef(step);
  const emailRef = useRef(email);

  // In-flight per-email send tracking: Map of normalized email -> unique send request id
  const inFlightSendsRef = useRef<Map<string, number>>(new Map());
  const sendRequestIdRef = useRef(0);

  useEffect(() => {
    stepRef.current = step;
    emailRef.current = email;
  }, [step, email]);

  // DOM input focus refs
  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const tokenInputRef = useRef<HTMLInputElement>(null);

  // Focus management on step transitions
  useEffect(() => {
    if (step === "email") {
      emailInputRef.current?.focus();
    } else if (step === "password") {
      passwordInputRef.current?.focus();
    } else if (step === "otp") {
      tokenInputRef.current?.focus();
    }
  }, [step]);

  const emailKey = email.trim().toLowerCase();
  const currentExpiry = cooldowns[emailKey] || 0;
  const remainingSeconds = currentExpiry > now ? Math.ceil((currentExpiry - now) / 1000) : 0;

  // Maintain ticker only while active cooldown is running for current email
  useEffect(() => {
    const targetExpiry = cooldowns[emailKey] || 0;
    if (targetExpiry > Date.now()) {
      const interval = setInterval(() => {
        const current = Date.now();
        setNow(current);
        if (current >= targetExpiry) {
          clearInterval(interval);
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [cooldowns, emailKey]);

  const handleContinue = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const rawEmail = emailInputRef.current?.value || email;
    const trimmed = rawEmail.trim();
    const result = EmailSchema.safeParse(trimmed);
    if (!result.success) {
      setEmailError(result.error.errors[0]?.message || "Please provide a valid email address.");
      emailInputRef.current?.focus();
      return;
    }
    const targetKey = trimmed.toLowerCase();
    setEmail(trimmed);
    setEmailError(null);
    setActiveNotice(null);
    setNow(Date.now());
    setIsSendingOtp(inFlightSendsRef.current.has(targetKey));
    attemptRef.current += 1;
    setStep("password");
  };

  const handleChangeEmail = () => {
    attemptRef.current += 1;
    setActiveNotice(null);
    setEmailError(null);
    setNow(Date.now());
    setIsSendingOtp(false);
    setIsSignInPending(false);
    setIsVerifyOtpPending(false);
    setStep("email");
  };

  const handleSwitchToPassword = () => {
    attemptRef.current += 1;
    setActiveNotice(null);
    setNow(Date.now());
    setIsSendingOtp(inFlightSendsRef.current.has(email.trim().toLowerCase()));
    setIsSignInPending(false);
    setIsVerifyOtpPending(false);
    setStep("password");
  };

  const handlePasswordSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSignInPending) return;

    const trimmed = email.trim();
    const currentEmailKey = trimmed.toLowerCase();
    const currentAttempt = ++attemptRef.current;

    setActiveNotice(null);
    setIsSignInPending(true);

    const fd = new FormData(e.currentTarget);
    const passVal = passwordInputRef.current?.value || (fd.get("password") as string) || "";
    fd.set("password", passVal);
    fd.set("email", trimmed);
    fd.set("next", next);

    try {
      const res = await signInAction(null, fd);

      // Verify that this attempt is still active and valid for the current UI context
      if (
        attemptRef.current !== currentAttempt ||
        stepRef.current !== "password" ||
        emailRef.current.trim().toLowerCase() !== currentEmailKey
      ) {
        return;
      }

      if (res?.error) {
        setActiveNotice({ type: "error", message: res.error });
        passwordInputRef.current?.focus();
      }
    } catch (thrown) {
      if (isNextRedirectError(thrown)) {
        throw thrown;
      }
      if (
        attemptRef.current === currentAttempt &&
        stepRef.current === "password" &&
        emailRef.current.trim().toLowerCase() === currentEmailKey
      ) {
        setActiveNotice({
          type: "error",
          message: "An unexpected error occurred. Please try again.",
        });
      }
    } finally {
      setIsSignInPending(false);
    }
  };

  const handleSendOtp = async () => {
    const rawEmail = emailInputRef.current?.value || email;
    const trimmed = rawEmail.trim();
    const result = EmailSchema.safeParse(trimmed);
    if (!result.success) {
      setEmailError("Please provide a valid email address.");
      setStep("email");
      emailInputRef.current?.focus();
      return;
    }

    const targetEmailKey = trimmed.toLowerCase();

    // If a send for this specific email is already in flight, do not dispatch another simultaneous request
    if (inFlightSendsRef.current.has(targetEmailKey)) {
      setStep("otp");
      setIsSendingOtp(true);
      return;
    }

    // Check cooldown using fresh timestamp
    const nowTime = Date.now();
    const targetExpiry = cooldowns[targetEmailKey] || 0;
    const currentRemaining = targetExpiry > nowTime ? Math.ceil((targetExpiry - nowTime) / 1000) : 0;
    if (currentRemaining > 0) {
      setStep("otp");
      return;
    }

    const currentAttempt = ++attemptRef.current;
    const currentSendRequestId = ++sendRequestIdRef.current;
    inFlightSendsRef.current.set(targetEmailKey, currentSendRequestId);

    setEmail(trimmed);
    setEmailError(null);
    setActiveNotice(null);
    setStep("otp");
    setIsSendingOtp(true);

    const fd = new FormData();
    fd.append("email", trimmed);
    fd.append("next", next);

    try {
      const res = await sendEmailOtpAction(null, fd);

      const completionTime = Date.now();
      // Synchronize clock and preserve per-email cooldown on accepted request or rate limiting
      if (res?.success) {
        const expiry = completionTime + 60000;
        setNow(completionTime);
        setCooldowns((prev) => ({ ...prev, [targetEmailKey]: expiry }));
      } else if (res?.rateLimited) {
        // Respect provider rate-limiting backoff using structured action field
        const expiry = completionTime + 60000;
        setNow(completionTime);
        setCooldowns((prev) => ({ ...prev, [targetEmailKey]: expiry }));
      }

      // Check if this attempt is still the active UI context
      if (
        attemptRef.current !== currentAttempt ||
        stepRef.current !== "otp" ||
        emailRef.current.trim().toLowerCase() !== targetEmailKey
      ) {
        return;
      }

      if (res?.success) {
        setActiveNotice({
          type: "status",
          message: res.message || NEUTRAL_OTP_ACKNOWLEDGEMENT,
        });
        tokenInputRef.current?.focus();
      } else if (res?.error) {
        setActiveNotice({
          type: "error",
          message: res.error,
        });
      }
    } catch (thrown) {
      if (isNextRedirectError(thrown)) {
        throw thrown;
      }
      if (
        attemptRef.current === currentAttempt &&
        stepRef.current === "otp" &&
        emailRef.current.trim().toLowerCase() === targetEmailKey
      ) {
        setActiveNotice({
          type: "error",
          message: "Unable to send verification code at this time. Please try again later.",
        });
      }
    } finally {
      // Release only this specific operation's ownership
      if (inFlightSendsRef.current.get(targetEmailKey) === currentSendRequestId) {
        inFlightSendsRef.current.delete(targetEmailKey);
        // Only set isSendingOtp to false if currently active email in UI has no in-flight send
        const currentActiveEmailKey = emailRef.current.trim().toLowerCase();
        if (!inFlightSendsRef.current.has(currentActiveEmailKey)) {
          setIsSendingOtp(false);
        }
      }
    }
  };

  const handleVerifyOtpSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isVerifyOtpPending) return;

    const trimmed = email.trim();
    const currentEmailKey = trimmed.toLowerCase();
    const currentAttempt = ++attemptRef.current;

    setActiveNotice(null);
    setIsVerifyOtpPending(true);

    const fd = new FormData(e.currentTarget);
    const tokenVal = tokenInputRef.current?.value || (fd.get("token") as string) || "";
    fd.set("token", tokenVal);
    fd.set("email", trimmed);
    fd.set("next", next);

    try {
      const res = await verifyEmailOtpAction(null, fd);

      if (
        attemptRef.current !== currentAttempt ||
        stepRef.current !== "otp" ||
        emailRef.current.trim().toLowerCase() !== currentEmailKey
      ) {
        return;
      }

      if (res?.error) {
        setActiveNotice({
          type: "error",
          message: res.error,
        });
        tokenInputRef.current?.focus();
      }
    } catch (thrown) {
      if (isNextRedirectError(thrown)) {
        throw thrown;
      }
      if (
        attemptRef.current === currentAttempt &&
        stepRef.current === "otp" &&
        emailRef.current.trim().toLowerCase() === currentEmailKey
      ) {
        setActiveNotice({
          type: "error",
          message: "An unexpected error occurred. Please try again.",
        });
      }
    } finally {
      setIsVerifyOtpPending(false);
    }
  };

  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <div className="relative rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <AuthCloseLink />
        <h1 className="pr-10 text-2xl font-bold text-gray-900">Sign in to FairSwap</h1>
        <p className="mt-2 text-sm text-gray-600">
          Don&apos;t have an account yet?{" "}
          <Link href="/auth/sign-up" className="font-semibold text-emerald-700 hover:text-emerald-800">
            Create account
          </Link>
        </p>

        {errorParam === "invalid_token" && (
          <div
            role="alert"
            aria-live="assertive"
            className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
          >
            The confirmation or reset link was invalid or has expired. Please request a new one.
          </div>
        )}

        {messageParam === "confirm_continue" && (
          <div
            role="status"
            aria-live="polite"
            className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800"
          >
            Please sign in to continue. If you have just confirmed your email, your account is ready to use.
          </div>
        )}

        {messageParam === "password_reset_success" && (
          <div
            role="alert"
            aria-live="assertive"
            className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
          >
            Your password has been successfully updated. You may now sign in.
          </div>
        )}

        {activeNotice?.type === "error" && (
          <div
            role="alert"
            aria-live="assertive"
            className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            {activeNotice.message}
          </div>
        )}

        {step === "email" && (
          <form onSubmit={handleContinue} noValidate className="mt-6 space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Enter your email address
              </label>
              <input
                ref={emailInputRef}
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError(null);
                }}
                required
                autoComplete="email"
                disabled={isSignInPending || isSendingOtp}
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50"
                placeholder="you@example.com"
              />
              {emailError && (
                <p className="mt-1.5 text-xs text-red-600" role="alert">
                  {emailError}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSignInPending || isSendingOtp}
              className="w-full rounded-md bg-emerald-700 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50"
            >
              Continue
            </button>
          </form>
        )}

        {step === "password" && (
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3.5 py-2.5 text-sm border border-gray-200">
              <span className="font-medium text-gray-900 truncate mr-2">{email}</span>
              <button
                type="button"
                onClick={handleChangeEmail}
                disabled={isSignInPending}
                className="shrink-0 text-xs font-semibold text-emerald-700 hover:text-emerald-800 focus:outline-none focus:underline disabled:opacity-50"
              >
                Change
              </button>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <input type="hidden" name="email" value={email} />
              <input type="hidden" name="next" value={next} />

              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    Password
                  </label>
                  <Link
                    href="/auth/forgot-password"
                    tabIndex={isSignInPending ? -1 : undefined}
                    aria-disabled={isSignInPending}
                    className={`text-xs font-medium text-emerald-700 hover:text-emerald-800 ${
                      isSignInPending ? "pointer-events-none opacity-50" : ""
                    }`}
                  >
                    Forgot password?
                  </Link>
                </div>
                <PasswordInput
                  ref={passwordInputRef}
                  id="password"
                  name="password"
                  required
                  disabled={isSignInPending}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                />
              </div>

              <button
                type="submit"
                disabled={isSignInPending}
                className="w-full rounded-md bg-emerald-700 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {isSignInPending ? "Signing in..." : "Sign In"}
              </button>
            </form>

            <div className="pt-2 text-center border-t border-gray-100">
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={isSendingOtp || isSignInPending}
                className="text-xs font-medium text-emerald-700 hover:text-emerald-800 focus:outline-none focus:underline disabled:opacity-50"
              >
                {isSendingOtp ? "Sending verification code..." : "Email me a one-time code instead"}
              </button>
            </div>
          </div>
        )}

        {step === "otp" && (
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3.5 py-2.5 text-sm border border-gray-200">
              <span className="font-medium text-gray-900 truncate mr-2">{email}</span>
              <button
                type="button"
                onClick={handleChangeEmail}
                disabled={isVerifyOtpPending}
                className="shrink-0 text-xs font-semibold text-emerald-700 hover:text-emerald-800 focus:outline-none focus:underline disabled:opacity-50"
              >
                Change
              </button>
            </div>

            {activeNotice?.type === "status" && (
              <div
                role="status"
                aria-live="polite"
                className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
              >
                {activeNotice.message}
              </div>
            )}

            <form onSubmit={handleVerifyOtpSubmit} className="space-y-4">
              <input type="hidden" name="email" value={email} />
              <input type="hidden" name="next" value={next} />

              <div>
                <label htmlFor="token" className="block text-sm font-medium text-gray-700">
                  Verification Code
                </label>
                <input
                  ref={tokenInputRef}
                  id="token"
                  name="token"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  autoComplete="one-time-code"
                  disabled={isVerifyOtpPending}
                  className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50"
                  placeholder="123456"
                />
                <p className="mt-1 text-xs text-gray-500">
                  {isSendingOtp
                    ? "Sending verification code..."
                    : "If you receive a code, enter the 6-digit code here."}
                </p>
              </div>

              <button
                type="submit"
                disabled={isVerifyOtpPending}
                className="w-full rounded-md bg-emerald-700 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {isVerifyOtpPending ? "Verifying..." : "Verify & Continue"}
              </button>
            </form>

            <div className="flex items-center justify-between pt-2 text-xs">
              <button
                type="button"
                onClick={handleSwitchToPassword}
                disabled={isVerifyOtpPending}
                className="font-medium text-emerald-700 hover:text-emerald-800 focus:outline-none focus:underline disabled:opacity-50"
              >
                Sign in with password instead
              </button>
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={isSendingOtp || isVerifyOtpPending || remainingSeconds > 0}
                className="font-medium text-gray-600 hover:text-gray-900 focus:outline-none focus:underline disabled:opacity-50"
              >
                {isSendingOtp
                  ? "Sending code..."
                  : remainingSeconds > 0
                  ? `Resend code (${remainingSeconds}s)`
                  : "Resend code"}
              </button>
            </div>
          </div>
        )}
        <p className="mt-6 border-t border-gray-100 pt-4 text-center text-sm text-gray-600">
          Trouble accessing your account?{" "}
          <a href={HELP_CENTRE_URL} className="font-semibold text-emerald-700 underline hover:text-emerald-800">
            Visit the Help Centre
          </a>
        </p>
      </div>
    </main>
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-md px-4 py-12 text-center text-gray-600">
          Loading sign in...
        </div>
      }
    >
      <SignInForm />
    </Suspense>
  );
}
