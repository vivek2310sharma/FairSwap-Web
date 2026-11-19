// Pure helpers for the Stage DigiLocker diagnostic display. No secrets, no I/O. Safe in client components.

export type FieldState = "present" | "null" | "empty" | "absent";

export interface DecodedJwt {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  /** Whether a third (signature) segment exists. Its validity is reported by the Backend checks, not here. */
  hasSignature: boolean;
}

function decodeSegment(seg: string): Record<string, unknown> | null {
  if (!/^[A-Za-z0-9_-]+$/.test(seg)) return null;
  try {
    const b64 = seg.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((seg.length + 3) % 4);
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const j: unknown = JSON.parse(new TextDecoder().decode(bytes));
    return j && typeof j === "object" && !Array.isArray(j) ? (j as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** Decodes (does not verify) a compact JWT. Returns null when it is not a three-part JWT with JSON header and payload. */
export function decodeJwt(token: unknown): DecodedJwt | null {
  if (typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const header = decodeSegment(parts[0]);
  const payload = decodeSegment(parts[1]);
  return header && payload ? { header, payload, hasSignature: parts[2].length > 0 } : null;
}

/** Distinguishes a key that is missing from one that is null or an empty string / array / object. */
export function fieldState(obj: Record<string, unknown> | null | undefined, key: string): FieldState {
  if (!obj || !Object.prototype.hasOwnProperty.call(obj, key)) return "absent";
  const v = obj[key];
  if (v === null) return "null";
  if (v === "" || (Array.isArray(v) && v.length === 0) || (typeof v === "object" && Object.keys(v as object).length === 0)) return "empty";
  return "present";
}

export function asObject(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

/** Exact rendering of a value: strings are shown JSON-quoted so "" and " " are visible; everything else as JSON. */
export const showValue = (v: unknown): string => (v === undefined ? "" : JSON.stringify(v, null, 2));

/** Fields the owner asked to see explicitly. Only looked up, never invented: a missing key is reported as absent. */
export const REQUESTED_FIELDS = ["acr", "digilockerid", "eaadhaar", "name", "dob"] as const;
