import { sanitizeRedirectPath } from "@/lib/security/redirect";

const NESTED_PREFIXES = ["/account/messages/", "/listings/"] as const;

/**
 * Same-origin return destination after DigiLocker verification. Only the posting route, one conversation or a
 * listing page are accepted; anything else (external URLs, other app routes, malformed input) yields null.
 */
export function safeVerificationReturnPath(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 300) return null;
  const clean = sanitizeRedirectPath(value, "");
  if (!clean) return null;
  const path = clean.split(/[?#]/)[0];
  const ok = path === "/account/listings/new" || NESTED_PREFIXES.some((p) => path.startsWith(p) && path.length > p.length);
  return ok ? clean : null;
}

export type IdentityGateContext = "post" | "messages";

export function identityVerifyHref(context: IdentityGateContext, returnTo?: string | null): string {
  const params = new URLSearchParams({ required: "1", context });
  const safe = safeVerificationReturnPath(returnTo);
  if (safe) params.set("next", safe);
  return `/account/verification?${params.toString()}`;
}
