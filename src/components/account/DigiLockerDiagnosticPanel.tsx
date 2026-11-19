"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import type { DiagView } from "@/lib/idv/digilocker-diagnostic";
import { REQUESTED_FIELDS, asObject, decodeJwt, fieldState, showValue } from "@/lib/idv/digilocker-diagnostic-decode";

const AUTO_CLEAR_MS = 10 * 60 * 1000;

function Json({ label, value, testId }: { label: string; value: unknown; testId?: string }) {
  return (
    <details open className="mt-3">
      <summary className="cursor-pointer text-sm font-medium">{label}</summary>
      <pre data-testid={testId} className="mt-1 overflow-x-auto whitespace-pre-wrap break-all rounded border p-2 text-xs">{showValue(value)}</pre>
    </details>
  );
}

/** Every key that exists, with its exact state (present, null or empty). Missing keys are not listed, so none is invented. */
function FieldTable({ label, obj, testId }: { label: string; obj: Record<string, unknown> | null; testId: string }) {
  if (!obj) return null;
  return (
    <div className="mt-3" data-testid={testId}>
      <h3 className="text-sm font-medium">{label}</h3>
      <table className="mt-1 w-full text-left text-xs">
        <thead><tr><th className="pr-2">Field</th><th className="pr-2">State</th><th>Value</th></tr></thead>
        <tbody>
          {Object.keys(obj).map((k) => (
            <tr key={k} className="align-top"><td className="pr-2 break-all">{k}</td><td className="pr-2">{fieldState(obj, k)}</td><td className="break-all whitespace-pre-wrap">{showValue(obj[k])}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

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

export function DiagnosticResultView({ result, onClear }: { result: DiagView; onClear: () => void }) {
  const raw = result.raw ?? null;
  const tok = raw?.tokenResponse ?? null;
  const tokenJson = asObject(tok?.json);
  const idTokenRaw = tokenJson?.["id_token"];
  const jwt = decodeJwt(idTokenRaw);
  const claims = jwt?.payload ?? null;
  const exp = claims?.["exp"];
  const expected = raw?.expected ?? null;
  const c = result.checks;
  return (
    <section aria-labelledby="dl-diag-result" role="status" className="mt-5 rounded-lg border p-4">
      <h2 id="dl-diag-result" className="font-semibold" data-testid="dl-diag-outcome">{OUTCOME_TEXT[result.outcome]}</h2>
      <p className="mt-1 text-xs">Unredacted provider data, shown once to the authorized tester. It is not stored; clear it when done.</p>
      {result.code && <p className="mt-1 break-words text-sm">Code: {result.code}</p>}
      {result.endpoints && <p className="mt-1 text-sm">Endpoints: authorize v{result.endpoints.authorize}, token v{result.endpoints.token}</p>}
      {result.rawOmitted && <p role="alert" className="mt-2 text-sm">The provider response was too large for the one-time result cookie and is not shown.</p>}

      {c && (
        <table className="mt-3 w-full text-left text-sm" data-testid="dl-diag-checks">
          <thead><tr><th className="pr-2">Check</th><th className="pr-2">Result</th><th>Actual / expected</th></tr></thead>
          <tbody>
            <tr><td className="pr-2">Signature</td><td className="pr-2">{c.signature}</td><td>alg {showValue(jwt?.header["alg"])}, kid {showValue(jwt?.header["kid"])}</td></tr>
            <tr><td className="pr-2">Issuer</td><td className="pr-2">{c.issuer}</td><td className="break-all">iss {showValue(claims?.["iss"])} / expected {showValue(expected?.issuer)}</td></tr>
            <tr><td className="pr-2">Audience</td><td className="pr-2">{c.audience ? "ok" : "failed"}</td><td className="break-all">aud {showValue(claims?.["aud"])}, azp {showValue(claims?.["azp"])} / expected {showValue(expected?.audience)}</td></tr>
            <tr><td className="pr-2">Expiry</td><td className="pr-2">{c.expiry ? "ok" : "failed"}</td><td>exp {showValue(exp)}{typeof exp === "number" ? ` (${new Date(exp * 1000).toISOString()})` : ""} / checked at {showValue(expected?.checkedAtEpoch)}</td></tr>
            <tr><td className="pr-2">Subject</td><td className="pr-2">{c.subject ? "ok" : "failed"}</td><td className="break-all">sub {showValue(claims?.["sub"])}</td></tr>
            <tr><td className="pr-2">Issued at</td><td className="pr-2">{c.issuedAt ? "ok" : "failed"}</td><td>iat {showValue(claims?.["iat"])}</td></tr>
            <tr><td className="pr-2">Nonce</td><td className="pr-2">{c.nonce}</td><td className="break-all">nonce {showValue(claims?.["nonce"])} / expected {showValue(expected?.nonce)}</td></tr>
            <tr><td className="pr-2">ACR</td><td className="pr-2">{c.acr}</td><td className="break-all">acr {fieldState(claims, "acr") === "absent" ? "(absent)" : showValue(claims?.["acr"])}</td></tr>
          </tbody>
        </table>
      )}

      {raw?.providerCallback && <Json label="Provider callback error" value={raw.providerCallback} testId="dl-diag-callback-error" />}
      {tok && (
        <>
          <p className="mt-3 text-sm" data-testid="dl-diag-http">Token endpoint: HTTP {tok.httpStatus}{tok.contentType ? `, ${tok.contentType}` : ""}</p>
          {tok.json !== null && tok.json !== undefined ? <Json label="Token response (complete JSON)" value={tok.json} testId="dl-diag-token-json" /> : null}
          {tok.text !== null && <Json label="Token response (not JSON, raw text)" value={tok.text} testId="dl-diag-token-text" />}
          {tok.json === null && tok.text === null && <p className="mt-1 text-sm">Token response body was the JSON value null.</p>}
        </>
      )}
      {tokenJson && (
        <div className="mt-3" data-testid="dl-diag-raw-tokens">
          <h3 className="text-sm font-medium">Raw tokens</h3>
          {(["id_token", "access_token", "refresh_token"] as const).map((k) => (
            <div key={k} className="mt-1">
              <div className="text-xs">{k}: {fieldState(tokenJson, k)}</div>
              {fieldState(tokenJson, k) === "present" && <code className="block break-all text-xs" data-testid={`dl-diag-${k}`}>{showValue(tokenJson[k])}</code>}
            </div>
          ))}
        </div>
      )}
      {tokenJson && <FieldTable label="Token response fields" obj={tokenJson} testId="dl-diag-token-fields" />}
      {idTokenRaw !== undefined && !jwt && <p role="alert" className="mt-3 text-sm">id_token could not be decoded as a JWT.</p>}
      {jwt && <Json label="Decoded ID token header" value={jwt.header} testId="dl-diag-header" />}
      {jwt && <Json label="Decoded ID token payload" value={jwt.payload} testId="dl-diag-payload" />}
      {jwt && <FieldTable label="ID token claims" obj={jwt.payload} testId="dl-diag-claims" />}
      {(tokenJson || claims) && (
        <div className="mt-3" data-testid="dl-diag-requested">
          <h3 className="text-sm font-medium">Requested fields (token response / ID token claims)</h3>
          <table className="mt-1 w-full text-left text-xs">
            <tbody>
              {REQUESTED_FIELDS.map((k) => (
                <tr key={k}><td className="pr-2">{k}</td><td className="pr-2">response: {fieldState(tokenJson, k)}</td><td>claims: {fieldState(claims, k)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <button type="button" onClick={onClear} className="mt-4 min-h-11 w-full rounded-lg border px-4 py-2 text-sm font-medium">Clear result</button>
    </section>
  );
}

export function DigiLockerDiagnosticPanel({ consumeResult }: { consumeResult: () => Promise<DiagView | null> }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DiagView | null>(null);
  const consumed = useRef(false);

  // One-time display: the result lives only in this component's memory; it is dropped on "Clear", after 10 minutes and on leaving the page.
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

      {result && <DiagnosticResultView result={result} onClear={() => setResult(null)} />}

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
