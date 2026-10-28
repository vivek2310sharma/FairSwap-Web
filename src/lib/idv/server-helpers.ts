import "server-only";

export const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
};

/**
 * Validates request origin against the expected application host.
 * Protects cookie-authenticated mutation endpoints against CSRF.
 */
export function validateSameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) {
    // If origin is missing, check fetch metadata (sec-fetch-site)
    const secFetchSite = req.headers.get("sec-fetch-site");
    if (secFetchSite && secFetchSite !== "same-origin" && secFetchSite !== "none") {
      return false;
    }
    // Allow non-browser or direct requests without origin only if sec-fetch-site is not cross-site
    return true;
  }

  try {
    const reqUrl = new URL(req.url);
    const originUrl = new URL(origin);
    return originUrl.origin === reqUrl.origin;
  } catch {
    return false;
  }
}

/**
 * Resolves the Supabase Edge Function base URL.
 * Strictly prevents localhost fallback in production environments.
 */
export function getEdgeFunctionsBaseUrl(): string {
  const customUrl = process.env.SUPABASE_FUNCTIONS_URL;
  if (customUrl && customUrl.trim()) {
    return customUrl.trim();
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (supabaseUrl && supabaseUrl.trim()) {
    return `${supabaseUrl.replace(/\/+$/, "")}/functions/v1`;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL in production environment");
  }

  return "http://127.0.0.1:54321/functions/v1";
}

/**
 * Validates that an external redirect URL points to an approved provider origin.
 */
export function validateProviderRedirectUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== "https:") return false;
    const hostname = parsed.hostname.toLowerCase();
    return (
      hostname === "setu.co" ||
      hostname.endsWith(".setu.co") ||
      hostname === "digilocker.gov.in" ||
      hostname.endsWith(".digilocker.gov.in")
    );
  } catch {
    return false;
  }
}

/**
 * Checks whether an identity verification badge projection is currently active and unexpired.
 */
export function isBadgeValid(
  badgeIssued?: boolean | null,
  status?: string | null,
  validUntil?: string | null
): boolean {
  if (badgeIssued !== true || status !== "verified") return false;
  if (!validUntil) return true;
  const time = new Date(validUntil).getTime();
  return Number.isFinite(time) && time > Date.now();
}

/**
 * Checks whether an expiration timestamp has passed.
 */
export function checkIsExpired(validUntilStr: unknown): boolean {
  if (!validUntilStr || typeof validUntilStr !== "string") return false;
  const time = new Date(validUntilStr).getTime();
  return Number.isFinite(time) && time <= Date.now();
}
