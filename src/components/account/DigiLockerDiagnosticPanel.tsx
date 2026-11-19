"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import type { DiagView } from "@/lib/idv/digilocker-diagnostic";

// Owner-only Stage diagnostic (English only by design: internal tool, not user-facing product copy).
const OUTCOME_TEXT: Record<DiagView["outcome"], string> = {
  VERIFIED: "VERIFIED — Aadhaar-verified assurance proven by a signature-verified ID token",
  UNCONFIRMED: "UNCONFIRMED — assurance could not be proven",
  NOT_VERIFIED: "NOT VERIFIED — the provider did not assert Aadhaar-verified assurance",
  CANCELLED: "CANCELLED — sign-in was cancelled or denied",
  FAILED: "FAILED",
};

const START_ERRORS: Record<string, string> = {
  FORBIDDEN: "This account is not an authorized diagnostic tester.",
  UNAUTHORIZED: "Please sign in again.",
  RATE_LIMIT_EXCEEDED: "Too many attempts. Try again later.",
  NOT_FOUND: "The diagnostic is not enabled.",
};

export function DigiLockerDiagnosticPanel({ consumeResult }: { consumeResult: () => Promise<DiagView | null> }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DiagView | null>(null);
  const consumed = useRef(false);

  useEffect(() => {
    if (consumed.current) return; // single read: the server deletes the sealed result on first consumption
    consumed.current = true;
    consumeResult().then((r) => { if (r) setResult(r); }).catch(() => {});
  }, [consumeResult]);

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/idv/digilocker/diagnostic/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const data = (await res.json().catch(() => ({}))) as { redirectUrl?: string; error?: string };
      if (res.ok && typeof data.redirectUrl === "string") {
        window.location.assign(data.redirectUrl);
        return;
      }
      setError(START_ERRORS[data.error ?? ""] ?? "Could not start the diagnostic.");
    } catch {
      setError("Could not start the diagnostic.");
    }
    setBusy(false);
  }

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-6">
      <h1 className="text-xl font-semibold">DigiLocker OIDC diagnostic (Stage)</h1>
      <p className="mt-2 text-sm">
        Diagnostic only. It does not verify your FairSwap account, link an identity or issue a badge.
      </p>

      {result && (
        <section aria-labelledby="dl-diag-result" role="status" className="mt-5 rounded-lg border p-4">
          <h2 id="dl-diag-result" className="font-semibold" data-testid="dl-diag-outcome">{OUTCOME_TEXT[result.outcome]}</h2>
          {result.code && <p className="mt-1 break-words text-sm">Code: {result.code}</p>}
          {result.endpoints && (
            <p className="mt-1 text-sm">Endpoints: authorize v{result.endpoints.authorize}, token v{result.endpoints.token}</p>
          )}
          {result.checks && (
            <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
              <dt>Signature</dt><dd>{result.checks.signature}</dd>
              <dt>Issuer</dt><dd>{result.checks.issuer}</dd>
              <dt>Audience</dt><dd>{result.checks.audience ? "ok" : "failed"}</dd>
              <dt>Expiry</dt><dd>{result.checks.expiry ? "ok" : "failed"}</dd>
              <dt>Subject</dt><dd>{result.checks.subject ? "ok" : "failed"}</dd>
              <dt>Issued at</dt><dd>{result.checks.issuedAt ? "ok" : "failed"}</dd>
              <dt>Nonce</dt><dd>{result.checks.nonce}</dd>
              <dt>ACR</dt><dd>{result.checks.acr}</dd>
            </dl>
          )}
        </section>
      )}

      {error && <p role="alert" className="mt-4 rounded-lg border p-3 text-sm">{error}</p>}

      <button
        type="button"
        onClick={start}
        disabled={busy}
        className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-black px-4 py-3 font-medium text-white disabled:opacity-50"
      >
        {busy && <Loader2 aria-hidden="true" size={18} className="animate-spin" />}
        {result ? "Test DigiLocker again" : "Test DigiLocker"}
      </button>
      <p className="mt-3 text-xs">To test the other DigiLocker account, sign out of DigiLocker when prompted and run the test again.</p>
    </main>
  );
}
