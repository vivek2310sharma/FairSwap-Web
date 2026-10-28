"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  ShieldAlert,
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Lock,
  Loader2,
} from "lucide-react";
import { getAccountCopy, type AccountLocale } from "@/lib/account/copy";

export type VerificationState =
  | "coming_soon"
  | "not_verified"
  | "consent_required"
  | "redirecting"
  | "in_progress"
  | "verified"
  | "failed"
  | "cancelled"
  | "expired"
  | "revoked"
  | "unable_to_verify";

interface VerificationHubProps {
  initialState: VerificationState;
  attemptId?: string | null;
  verifiedAt?: string | null;
  validUntil?: string | null;
  revocationReason?: string | null;
  isFeatureEnabled?: boolean;
  locale?: AccountLocale;
  callbackState?: string;
}

export function VerificationHub({
  initialState = "coming_soon",
  attemptId: initialAttemptId,
  verifiedAt,
  validUntil,
  revocationReason,
  isFeatureEnabled = false,
  locale = "en",
  callbackState,
}: VerificationHubProps) {
  const copy = getAccountCopy(locale);
  const v = copy.verification;
  const s = v.states;
  const a = v.actions;

  const [state, setState] = useState<VerificationState>(
    !isFeatureEnabled && (initialState === "not_verified" || initialState === "in_progress" || initialState === "coming_soon")
      ? "coming_soon"
      : initialState
  );
  const [activeAttemptId, setActiveAttemptId] = useState<string | null>(initialAttemptId || null);
  const [selectedCategory, setSelectedCategory] = useState<"aadhaar_kyc" | "pan_card" | "driving_licence">("aadhaar_kyc");
  const [consentChecked, setConsentChecked] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Nonce-bound one-shot completion controller
  // Tracks already attempted or in-flight callback state nonces across renders and Strict Mode invocations
  const completedStatesRef = useRef<Set<string>>(new Set());
  const isCompletingRef = useRef(false);

  // Helper: Refresh authoritative verification state from backend
  const refreshAuthoritativeState = async () => {
    try {
      const res = await fetch("/api/idv/status");
      if (res.ok) {
        const data = await res.json();
        if (data.status === "verified") {
          setState("verified");
        } else if (data.status === "revoked") {
          setState("revoked");
        } else if (data.status === "expired") {
          setState("expired");
        } else if (data.status === "in_progress") {
          setState("in_progress");
          if (data.attemptId) setActiveAttemptId(data.attemptId);
        } else if (data.status === "not_started") {
          setState("not_verified");
        }
      }
    } catch {
      // Non-fatal background refresh error
    }
  };

  // If returning from DigiLocker with a state nonce and in_progress, trigger backend completion
  // Recovers the originating attempt from authenticated server-side state if activeAttemptId is null.
  useEffect(() => {
    if (
      !isFeatureEnabled ||
      !callbackState ||
      state !== "in_progress" ||
      completedStatesRef.current.has(callbackState) ||
      isCompletingRef.current
    ) {
      return;
    }

    // Mark nonce as claimed immediately to avoid duplicate dispatch or infinite retry loops
    completedStatesRef.current.add(callbackState);
    isCompletingRef.current = true;
    setIsCompleting(true);
    setActionError(null);

    let isSubscribed = true;

    async function completeVerification() {
      try {
        // Authoritative category resolution: the backend resolves the consented category from the original attempt.
        // Client-side React state is not relied upon across full-redirect returns.
        const payload: Record<string, unknown> = {
          state: callbackState,
          attemptId: activeAttemptId || undefined,
        };

        const res = await fetch("/api/idv/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          // Rule: Refresh verification state from authoritative backend; do not rely solely on HTTP response
          await refreshAuthoritativeState();
        } else {
          const errData = await res.json().catch(() => ({}));
          if (isSubscribed) {
            if (res.status === 410 || errData.error === "ATTEMPT_EXPIRED") {
              setState("expired");
            } else if (res.status === 422 || errData.error === "EVIDENCE_VALIDATION_FAILED") {
              setState("unable_to_verify");
            } else if (
              errData.error === "REVOKED_VERIFICATION_REACTIVATION_FORBIDDEN" ||
              errData.error === "CONSENT_WITHDRAWN_REACTIVATION_FORBIDDEN"
            ) {
              setState("revoked");
            } else {
              setState("failed");
            }
            setActionError(errData.message || null);
          }
        }
      } catch {
        if (isSubscribed) {
          setState("failed");
        }
      } finally {
        isCompletingRef.current = false;
        if (isSubscribed) {
          setIsCompleting(false);
        }
      }
    }

    void completeVerification();

    return () => {
      isSubscribed = false;
    };
  }, [isFeatureEnabled, callbackState, state, activeAttemptId]);

  // Status polling for in_progress sessions (including interrupted sessions)
  useEffect(() => {
    if (!isFeatureEnabled || state !== "in_progress" || isCompleting) {
      return;
    }

    let isMounted = true;
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/idv/status");
        if (!isMounted || !res.ok) return;
        const data = await res.json();
        if (data.status === "verified") {
          setState("verified");
        } else if (data.status === "expired") {
          setState("expired");
        } else if (data.status === "revoked") {
          setState("revoked");
        } else if (data.status === "failed") {
          setState("failed");
        }
      } catch {
        // Polling failure is non-fatal
      }
    }, 4000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isFeatureEnabled, state, isCompleting]);

  // If feature is disabled, new verification shows coming_soon,
  // but existing verified badges, revoked states, or expired badges remain visible
  // with accessible consent-withdrawal control preserved.
  const hasExistingRecord = state === "verified" || state === "revoked" || state === "expired";
  const effectiveState = !isFeatureEnabled && !hasExistingRecord ? "coming_soon" : state;

  const handleStartFlow = async () => {
    if (!isFeatureEnabled) return;
    if (!consentChecked) {
      setActionError(s.consentRequired.title);
      return;
    }

    setIsStarting(true);
    setActionError(null);

    try {
      const res = await fetch("/api/idv/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consentAcknowledged: true,
          docCategory: selectedCategory,
          policyVersion: "v1.0",
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setActionError(errData.message || errData.error || s.failed.title);
        setIsStarting(false);
        return;
      }

      const data = await res.json();
      if (data.attemptId) {
        setActiveAttemptId(data.attemptId);
      }

      if (data.redirectUrl) {
        setState("redirecting");
        window.location.href = data.redirectUrl;
      } else {
        setState("in_progress");
        setIsStarting(false);
      }
    } catch {
      setActionError(s.failed.body);
      setIsStarting(false);
    }
  };

  const handleWithdrawConsent = async () => {
    if (isWithdrawing) return;
    setIsWithdrawing(true);
    setActionError(null);
    try {
      const res = await fetch("/api/idv/withdraw", { method: "POST" });
      if (res.ok) {
        // Refresh authoritative state from backend
        await refreshAuthoritativeState();
        setState("revoked");
      } else {
        const err = await res.json().catch(() => ({}));
        setActionError(err.message || s.failed.title);
      }
    } catch {
      setActionError(s.failed.title);
    } finally {
      setIsWithdrawing(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8 sm:px-6">
      {/* Back to Account Link */}
      <Link
        href="/account"
        className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-action-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-500 dark:text-action-300"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        <span>{copy.backToAccount}</span>
      </Link>

      {/* Main Verification Card */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        {/* Header Icon + Title */}
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-action-100 text-action-800 dark:bg-action-900 dark:text-action-100">
            {effectiveState === "verified" ? (
              <ShieldCheck className="h-6 w-6 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            ) : effectiveState === "failed" || effectiveState === "revoked" ? (
              <ShieldAlert className="h-6 w-6 text-red-600 dark:text-red-400" aria-hidden="true" />
            ) : effectiveState === "in_progress" || effectiveState === "redirecting" ? (
              <Loader2 className="h-6 w-6 animate-spin text-action-600" aria-hidden="true" />
            ) : (
              <ShieldCheck className="h-6 w-6" aria-hidden="true" />
            )}
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-foreground sm:text-2xl">
              {effectiveState === "coming_soon"
                ? s.comingSoon.title
                : effectiveState === "verified"
                ? s.verified.title
                : effectiveState === "in_progress"
                ? s.inProgress.title
                : effectiveState === "redirecting"
                ? s.redirecting.title
                : effectiveState === "failed"
                ? s.failed.title
                : effectiveState === "cancelled"
                ? s.cancelled.title
                : effectiveState === "expired"
                ? s.expired.title
                : effectiveState === "revoked"
                ? s.revoked.title
                : effectiveState === "unable_to_verify"
                ? s.unableToVerify.title
                : s.notVerified.title}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {effectiveState === "coming_soon"
                ? s.comingSoon.body
                : effectiveState === "verified"
                ? s.verified.body
                : effectiveState === "in_progress"
                ? s.inProgress.body
                : effectiveState === "redirecting"
                ? s.redirecting.body
                : effectiveState === "failed"
                ? s.failed.body
                : effectiveState === "cancelled"
                ? s.cancelled.body
                : effectiveState === "expired"
                ? s.expired.body
                : effectiveState === "revoked"
                ? s.revoked.body
                : effectiveState === "unable_to_verify"
                ? s.unableToVerify.body
                : s.notVerified.body}
            </p>
          </div>
        </div>

        {/* State-specific Body Details */}
        {effectiveState === "verified" && (
          <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
            <div className="flex items-center gap-2 font-semibold">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>{v.badges.verified} {a.activeBadge}</span>
            </div>
            {verifiedAt && (
              <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">
                {a.verifiedOn.replace("{date}", new Date(verifiedAt).toLocaleDateString(locale === "hi" ? "hi-IN" : "en-IN"))}
              </p>
            )}
            {validUntil && (
              <p className="mt-0.5 text-xs text-emerald-700 dark:text-emerald-300">
                {new Date(validUntil).toLocaleDateString(locale === "hi" ? "hi-IN" : "en-IN")}
              </p>
            )}
            <div className="mt-4 pt-3 border-t border-emerald-200 dark:border-emerald-800">
              <button
                type="button"
                onClick={handleWithdrawConsent}
                disabled={isWithdrawing}
                className="inline-flex min-h-[44px] items-center text-xs font-semibold text-red-700 hover:underline dark:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 rounded"
              >
                {isWithdrawing ? v.consent.withdrawing : v.consent.withdrawCta}
              </button>
            </div>
          </div>
        )}

        {effectiveState === "coming_soon" && (
          <div className="mt-6 rounded-xl border border-border/80 bg-background/60 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Lock className="h-4 w-4 text-muted" aria-hidden="true" />
              <span>{s.comingSoon.title}</span>
            </div>
            <p className="mt-1 text-xs text-muted leading-relaxed">
              {a.preparingNotice}
            </p>
            <div className="mt-5">
              <button
                type="button"
                disabled
                aria-disabled="true"
                className="inline-flex min-h-[44px] w-full cursor-not-allowed items-center justify-center rounded-lg bg-muted/40 px-6 py-2.5 text-sm font-semibold text-muted-foreground opacity-60"
              >
                <span>{v.cta} ({copy.comingSoon})</span>
              </button>
            </div>
          </div>
        )}

        {effectiveState === "not_verified" && (
          <div className="mt-6 space-y-4">
            <div className="rounded-xl border border-border p-4 bg-background/40 space-y-3">
              <label htmlFor="idv-category-select" className="block text-xs font-semibold text-foreground">
                {locale === "hi" ? "दस्तावेज़ श्रेणी चुनें:" : "Select identity document category:"}
              </label>
              <select
                id="idv-category-select"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as "aadhaar_kyc" | "pan_card" | "driving_licence")}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-action-500"
              >
                <option value="aadhaar_kyc">
                  {locale === "hi" ? "आधार (Aadhaar KYC via DigiLocker)" : "Aadhaar (UIDAI via DigiLocker)"}
                </option>
                <option value="pan_card" disabled>
                  {locale === "hi" ? "पैन कार्ड (PAN Card) - जल्द आ रहा है" : "PAN Card (Income Tax) - Coming soon"}
                </option>
                <option value="driving_licence" disabled>
                  {locale === "hi" ? "ड्राइविंग लाइसेंस (Driving Licence) - जल्द आ रहा है" : "Driving Licence (MoRTH) - Coming soon"}
                </option>
              </select>
              <p className="text-[11px] text-muted leading-relaxed">
                {locale === "hi"
                  ? "वर्तमान में केवल आधार सत्यापन समर्थित है। अन्य दस्तावेज़ श्रेणियों के लिए प्रामाणिकता सत्यापन अभी उपलब्ध नहीं है।"
                  : "Only Aadhaar verification is currently supported. Authenticity verification gates for other categories remain disabled until approved."}
              </p>
            </div>

            <div className="rounded-xl border border-border p-4 bg-background/40">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consentChecked}
                  onChange={(e) => setConsentChecked(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-border text-action-600 focus:ring-action-500"
                />
                <span className="text-xs leading-relaxed text-foreground/90">
                  {v.consent.notice}
                </span>
              </label>
            </div>

            {actionError && (
              <div role="alert" className="flex items-center gap-2 text-xs font-medium text-red-600 dark:text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleStartFlow}
              disabled={isStarting}
              className="inline-flex min-h-[44px] w-full items-center justify-center rounded-lg bg-action-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-action-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-500 focus-visible:ring-offset-2 disabled:opacity-50"
            >
              {isStarting ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{s.redirecting.title}</span>
                </span>
              ) : (
                <span>{v.cta}</span>
              )}
            </button>
          </div>
        )}

        {(effectiveState === "in_progress" || effectiveState === "redirecting") && (
          <div className="mt-6 flex flex-col items-center justify-center rounded-xl border border-border p-6 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-action-600 mb-3" />
            <p className="text-sm font-medium text-foreground">
              {effectiveState === "redirecting" ? s.redirecting.title : s.inProgress.title}
            </p>
            <p className="mt-1 text-xs text-muted max-w-sm">
              {effectiveState === "redirecting" ? s.redirecting.body : s.inProgress.body}
            </p>
          </div>
        )}

        {(effectiveState === "failed" ||
          effectiveState === "cancelled" ||
          effectiveState === "expired" ||
          effectiveState === "revoked" ||
          effectiveState === "unable_to_verify") && (
          <div className="mt-6 space-y-4">
            {revocationReason && (
              <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                {a.reasonLabel.replace("{reason}", revocationReason)}
              </p>
            )}
            {actionError && (
              <div role="alert" className="flex items-center gap-2 text-xs font-medium text-red-600 dark:text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                setActionError(null);
                setState("not_verified");
              }}
              className="inline-flex min-h-[44px] w-full items-center justify-center rounded-lg bg-action-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-action-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-500"
            >
              <span>{a.tryAgain}</span>
            </button>
          </div>
        )}

        {/* Safety Disclaimer */}
        <div className="mt-6 border-t border-border/60 pt-4 text-[11px] text-muted leading-relaxed">
          <p>{v.consent.terms}</p>
        </div>
      </div>
    </div>
  );
}

