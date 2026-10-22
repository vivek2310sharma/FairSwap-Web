import { sanitizeRedirectPath } from "@/lib/security/redirect";

/**
 * Backend (`app_security.create_notification`) stores a relative `link` on each notification:
 * `/listings/<slug>`, `/account/listings`, `/account/messages/<id>`, `/account/support/<id>`
 * and `/account/reports`. There is no `payload` column.
 *
 * `/account/reports` is written for report updates but Web has no page at that path, so it is
 * treated as "no destination" rather than rendering a link that ends in a 404.
 */
const UNAVAILABLE_DESTINATIONS = new Set(["/account/reports"]);

const ALLOWED_PREFIXES = ["/account/", "/listings/"] as const;

/** Returns a safe in-app path for a notification, or `null` when there is nothing valid to open. */
export function resolveNotificationLink(link: string | null | undefined): string | null {
  if (!link) return null;

  const safe = sanitizeRedirectPath(link, "");
  if (!safe) return null;

  const path = safe.split(/[?#]/)[0].replace(/\/+$/, "");
  if (UNAVAILABLE_DESTINATIONS.has(path)) return null;
  if (!ALLOWED_PREFIXES.some((prefix) => path.startsWith(prefix))) return null;

  return safe;
}
