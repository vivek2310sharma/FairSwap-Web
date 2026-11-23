import "server-only";

export const DIGILOCKER_AUTHORIZE_ORIGIN = "https://digilocker.meripehchaan.gov.in";
export const DIGILOCKER_AUTHORIZE_PATH = "/public/oauth2/1/authorize";

/** Flag defaults OFF. Credentials live only in the Backend Edge environment; Web holds none. */
export function isDigiLockerEnabled(): boolean {
  return process.env.FAIRSWAP_DIGILOCKER_ENABLED === "true";
}

/** Only the documented MeriPehchaan authorize endpoint is an acceptable redirect target. */
export function isDigiLockerAuthorizeUrl(raw: unknown): raw is string {
  if (typeof raw !== "string") return false;
  try {
    const u = new URL(raw);
    return u.protocol === "https:" && u.origin === DIGILOCKER_AUTHORIZE_ORIGIN && u.pathname === DIGILOCKER_AUTHORIZE_PATH && !u.username && !u.password;
  } catch {
    return false;
  }
}

export type DigiLockerResult =
  | "verified" | "denied" | "already_linked" | "different_identity" | "unavailable" | "expired" | "provider_error" | "not_confirmed" | "failed";

/** Maps a Backend error code to a fixed result key. Provider strings are never echoed to the browser. */
export function resultForBackend(ok: boolean, code: unknown): DigiLockerResult {
  if (ok) return "verified";
  switch (code) {
    case "CONSENT_DENIED": return "denied";
    case "IDENTITY_ALREADY_LINKED": return "already_linked";
    case "ACCOUNT_LINKED_TO_OTHER_IDENTITY": return "different_identity";
    case "VERIFICATION_UNAVAILABLE":
    case "ACCOUNT_NOT_ELIGIBLE": return "unavailable";
    case "ATTEMPT_EXPIRED":
    case "STATE_ALREADY_USED":
    case "ATTEMPT_NOT_FOUND": return "expired";
    case "ID_TOKEN_INVALID":
    case "PROVIDER_REJECTED":
    case "ASSURANCE_NOT_PROVEN": // legacy code from older Backend deployments
      return "not_confirmed";
    case "PROVIDER_TIMEOUT":
    case "PROVIDER_UNAVAILABLE": return "provider_error";
    default: return "failed";
  }
}

export const STATE_PATTERN = /^[0-9a-f]{64}$/;
