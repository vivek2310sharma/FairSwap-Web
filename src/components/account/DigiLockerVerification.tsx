"use client";

import { useState } from "react";
import Link from "next/link";
import { ShieldCheck, AlertCircle, Loader2 } from "lucide-react";
import { DigiLockerBadge } from "@/components/idv/DigiLockerBadge";
import { digiLockerCopy, type DigiLockerLocale } from "@/lib/idv/digilocker-copy";

type ResultKey = keyof (typeof digiLockerCopy)["en"]["results"];

interface Props {
  verified: boolean;
  result?: string;
  showRequiredNotice?: boolean;
  locale?: DigiLockerLocale;
}

const PROVIDER_ORIGIN = "https://digilocker.meripehchaan.gov.in";

export function DigiLockerVerification({ verified: initialVerified, result, showRequiredNotice, locale = "en" }: Props) {
  const c = digiLockerCopy[locale];
  // Only the authenticated Backend status (server-rendered `verified`, or the start API's alreadyVerified) can show
  // the Verified state. The `dl` callback query parameter is a notification only and is trivially forgeable.
  const [verified, setVerified] = useState(initialVerified === true);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resultMessage =
    result === "verified" ? c.pending : result && result in c.results ? c.results[result as ResultKey] : null;

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/idv/digilocker/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consentAcknowledged: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.alreadyVerified) { setVerified(true); return; }
      if (res.ok && typeof data.redirectUrl === "string" && data.redirectUrl.startsWith(`${PROVIDER_ORIGIN}/`)) {
        window.location.assign(data.redirectUrl);
        return;
      }
      setError(res.status === 503 ? c.unavailable : data.recoveryHint ? c.results.unavailable : c.results.failed);
    } catch {
      setError(c.results.provider_error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main id="verification-content" className="mx-auto w-full max-w-xl px-4 py-6">
      {verified ? (
        <p role="status"><DigiLockerBadge /></p>
      ) : (
        <>
          <h1 className="flex items-center gap-2 text-xl font-semibold">
            <ShieldCheck aria-hidden="true" size={22} /> {c.heading}
          </h1>
          <p className="mt-3">{c.body}</p>
          {showRequiredNotice && <p className="mt-3 text-sm">{c.required}</p>}
          {(resultMessage || error) && (
            <p role="alert" className="mt-4 flex gap-2 rounded-lg border p-3 text-sm">
              <AlertCircle aria-hidden="true" size={18} className="shrink-0" /> {error ?? resultMessage}
            </p>
          )}
          <label className="mt-5 flex items-start gap-3 text-sm">
            <input type="checkbox" className="mt-1 h-5 w-5" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span>{c.consent}</span>
          </label>
          <button
            type="button"
            onClick={start}
            disabled={!consent || busy}
            className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-black px-4 py-3 font-medium text-white disabled:opacity-50"
          >
            {busy && <Loader2 aria-hidden="true" size={18} className="animate-spin" />}
            {busy ? c.working : c.button}
          </button>
          <p className="mt-4 text-sm"><Link href="/account/support" className="underline">{c.recovery}</Link></p>
        </>
      )}
    </main>
  );
}
