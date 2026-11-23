"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import type { LabView } from "@/lib/idv/digilocker-lab";
import { asObject, decodeJwt, showValue } from "@/lib/idv/digilocker-diagnostic-decode";

const AUTO_CLEAR_MS = 5 * 60 * 1000;

// Stage-only owner tool. Values render only after explicit reveal; no logs, persistence or analytics.
const OUTCOME_TEXT: Record<LabView["outcome"], string> = {
  VERIFIED: "Signed assurance proven: a signature-verified ID token asserts acr=aadhaar",
  UNCONFIRMED: "Unconfirmed: assurance could not be proven",
  NOT_VERIFIED: "Not proven: the provider did not assert acr=aadhaar",
  CANCELLED: "Cancelled or denied at the provider",
  FAILED: "Failed",
};

const ERROR_TEXT: Record<string, string> = {
  INVALID_RESULT: "The Backend result did not match the expected format and was discarded.",
  INVALID_CONTRACT: "The Backend response did not match the Lab contract and was discarded.",
  INVALID_CALLBACK: "The provider callback was incomplete or malformed.",
  INVALID_PROVIDER_REDIRECT: "The provider redirect was not the expected Lab redirect.",
  STATE_INVALID: "This browser did not start this sign-in (state mismatch).",
  STATE_EXPIRED: "The sign-in attempt expired. Start again.",
  STATE_ALREADY_USED: "This sign-in attempt was already used. Start again.",
  FORBIDDEN: "This account is not an authorized Lab tester.",
  UNAUTHORIZED: "Please sign in again.",
  RATE_LIMIT_EXCEEDED: "Too many attempts. Try again later.",
  NOT_FOUND: "The Lab is not enabled.",
  LAB_NOT_CONFIGURED: "The Lab provider is not configured yet.",
  PROVIDER_DENIED: "Sign-in was denied at the provider.",
  PROVIDER_ERROR: "The provider reported an error.",
  TOKEN_EXCHANGE_FAILED: "The provider token exchange failed.",
  RESPONSE_TOO_LARGE: "The sanitized result was too large to display.",
  EDGE_FUNCTION_UNAVAILABLE: "The Backend is unavailable.",
  START_FAILED: "Could not start the Lab.",
};

const PRESENCE_ROWS = ["digilockerid", "eaadhaar", "masked_aadhaar", "name", "dob", "gender"] as const;
const PRESENCE_TEXT: Record<string, string> = {
  present: "present", absent: "absent", empty: "present but empty", null: "present but null", invalid: "present but invalid",
};

function NameTypeTable({ label, rows, testId }: { label: string; rows: LabView["idTokenClaims"]; testId: string }) {
  return (
    <div className="mt-4" data-testid={testId}>
      <h3 className="text-sm font-medium">{label}</h3>
      {rows.length === 0 ? <p className="mt-1 text-sm">None reported.</p> : (
        <table className="mt-1 w-full text-left text-sm">
          <thead><tr><th className="pr-2">Name</th><th>Type</th></tr></thead>
          <tbody>{rows.map((r) => <tr key={r.name}><td className="pr-2 break-all">{r.name}</td><td>{r.type}</td></tr>)}</tbody>
        </table>
      )}
    </div>
  );
}

export function LabResultView({ result, onClear }: { result: LabView; onClear: () => void }) {
  const [revealValues, setRevealValues] = useState(false);
  const c = result.checks;
  const tokenJson = asObject(result.raw?.tokenResponse.json);
  const decoded = decodeJwt(tokenJson?.["id_token"]);
  return (
    <section aria-labelledby="dl-lab-result" role="status" className="mt-5 rounded-lg border p-4">
      <h2 id="dl-lab-result" className="font-semibold" data-testid="dl-lab-outcome">{OUTCOME_TEXT[result.outcome]}</h2>
      <p className="mt-1 text-xs">Results are temporary and only visible to this authorized Test user. No identity badge is issued.</p>
      {result.errorCode && <p className="mt-2 break-words text-sm" data-testid="dl-lab-error">{ERROR_TEXT[result.errorCode] ?? "Failed."}</p>}
      <p className="mt-2 text-sm" data-testid="dl-lab-http">Token endpoint status: {result.httpStatusBucket === "none" ? "no response" : result.httpStatusBucket}</p>

      <table className="mt-3 w-full text-left text-sm" data-testid="dl-lab-checks">
        <thead><tr><th className="pr-2">Check</th><th>Result</th></tr></thead>
        <tbody>
          <tr><td className="pr-2">Signature</td><td>{c.signature}</td></tr>
          <tr><td className="pr-2">Issuer</td><td>{c.issuer}</td></tr>
          <tr><td className="pr-2">Audience</td><td>{c.audience}</td></tr>
          <tr><td className="pr-2">Nonce</td><td>{c.nonce}</td></tr>
          <tr><td className="pr-2">Expiry</td><td>{c.expiry}</td></tr>
          <tr><td className="pr-2">Issued at</td><td>{c.issuedAt}</td></tr>
          <tr><td className="pr-2">acr=aadhaar</td><td>{c.acr === "aadhaar" ? "present (aadhaar)" : c.acr}</td></tr>
        </tbody>
      </table>

      <div className="mt-4" data-testid="dl-lab-presence">
        <h3 className="text-sm font-medium">Requested fields</h3>
        <table className="mt-1 w-full text-left text-sm">
          <tbody>{PRESENCE_ROWS.map((k) => <tr key={k}><td className="pr-2">{k}</td><td>{PRESENCE_TEXT[result.presence[k]]}</td></tr>)}</tbody>
        </table>
      </div>

      <NameTypeTable label="Token response fields" rows={result.tokenResponseFields} testId="dl-lab-token-fields" />
      <NameTypeTable label="ID token claims" rows={result.idTokenClaims} testId="dl-lab-claims" />
      {result.rawOmitted && <p role="alert" className="mt-4 text-sm">The raw response exceeded the secure one-time display limit and was discarded. The summary is preserved.</p>}
      {result.raw && (
        <div className="mt-4 border-t pt-4">
          <p className="text-sm font-semibold">Sensitive response values</p>
          <p className="mt-1 text-xs">Includes identity details and bearer tokens. Only reveal privately. Do not copy into chat, screenshots or logs. This view clears when you leave or press Clear result.</p>
          <button type="button" onClick={() => setRevealValues((v) => !v)}
            aria-expanded={revealValues}
            className="mt-2 min-h-11 w-full rounded-lg border px-4 py-2 text-sm font-medium"
            data-testid="dl-lab-reveal">
            {revealValues ? "Hide response values" : "Reveal all response values"}
          </button>
          {revealValues && (
            <div className="mt-3 space-y-3" data-testid="dl-lab-raw-values">
              <div>
                <h3 className="text-sm font-semibold">Complete token response (JSON, includes tokens)</h3>
                <pre className="mt-1 max-h-80 overflow-auto whitespace-pre-wrap break-all rounded border p-3 text-xs">{showValue(result.raw.tokenResponse.json)}</pre>
              </div>
              {result.raw.tokenResponse.text !== null && (
                <div>
                  <h3 className="text-sm font-semibold">Provider response text</h3>
                  <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap break-all rounded border p-3 text-xs">{result.raw.tokenResponse.text}</pre>
                </div>
              )}
              {decoded && (
                <>
                  <div>
                    <h3 className="text-sm font-semibold">Decoded ID token header</h3>
                    <pre className="mt-1 max-h-60 overflow-auto whitespace-pre-wrap break-all rounded border p-3 text-xs">{showValue(decoded.header)}</pre>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">Decoded ID token claims (actual values)</h3>
                    <pre className="mt-1 max-h-96 overflow-auto whitespace-pre-wrap break-all rounded border p-3 text-xs" data-testid="dl-lab-claim-values">{showValue(decoded.payload)}</pre>
                  </div>
                </>
              )}
              {!decoded && tokenJson?.["id_token"] !== undefined && <p className="text-sm">ID token could not be decoded.</p>}
            </div>
          )}
        </div>
      )}
      <p className="mt-4 text-xs">Provider login alone does not verify Aadhaar. An absent acr claim cannot prove Aadhaar assurance.</p>
      <button type="button" onClick={onClear} className="mt-4 min-h-11 w-full rounded-lg border px-4 py-2 text-sm font-medium">Clear result</button>
    </section>
  );
}

const START_ERRORS: Record<string, string> = {
  FORBIDDEN: ERROR_TEXT.FORBIDDEN, UNAUTHORIZED: ERROR_TEXT.UNAUTHORIZED, RATE_LIMIT_EXCEEDED: ERROR_TEXT.RATE_LIMIT_EXCEEDED,
  NOT_FOUND: ERROR_TEXT.NOT_FOUND, LAB_NOT_CONFIGURED: ERROR_TEXT.LAB_NOT_CONFIGURED,
};

export function DigiLockerLabPanel({ consumeResult }: { consumeResult: () => Promise<LabView | null> }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LabView | null>(null);
  const consumed = useRef(false);

  useEffect(() => {
    if (!result) return;
    const t = setTimeout(() => setResult(null), AUTO_CLEAR_MS);
    return () => clearTimeout(t);
  }, [result]);

  useEffect(() => {
    if (consumed.current) return; // single read: the server deletes the sealed result on first consumption
    consumed.current = true;
    consumeResult().then((r) => { if (r) setResult(r); }).catch(() => {});
  }, [consumeResult]);

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/idv/digilocker/lab/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const data = (await res.json().catch(() => ({}))) as { redirectUrl?: string; error?: string };
      if (res.ok && typeof data.redirectUrl === "string") {
        window.location.assign(data.redirectUrl);
        return;
      }
      setError(START_ERRORS[data.error ?? ""] ?? "Could not start the Lab.");
    } catch {
      setError("Could not start the Lab.");
    }
    setBusy(false);
  }

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-6">
      <h1 className="text-xl font-semibold">DigiLocker Identity Lab (Stage)</h1>
      <p className="mt-2 text-sm">
        Diagnostic only. It does not verify your FairSwap account, link a DigiLocker identity or issue a badge.
      </p>

      {result && <LabResultView result={result} onClear={() => setResult(null)} />}

      {error && <p role="alert" className="mt-4 rounded-lg border p-3 text-sm">{error}</p>}

      <button
        type="button"
        onClick={start}
        disabled={busy}
        className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-black px-4 py-3 font-medium text-white disabled:opacity-50"
      >
        {busy && <Loader2 aria-hidden="true" size={18} className="animate-spin" />}
        {result ? "Run the Lab again" : "Run the Lab"}
      </button>
    </main>
  );
}
