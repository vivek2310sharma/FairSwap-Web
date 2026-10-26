/**
 * Deterministic formatters for localized Indian marketplace presentation.
 * 
 * Invariant: Initial server HTML (Node.js/Vercel SSR in UTC) and client browser
 * hydration (any user timezone) must produce identical strings to prevent
 * React hydration mismatches (e.g. Minified React error #418).
 */

const MARKETPLACE_LOCALE = "en-IN";
const MARKETPLACE_TIMEZONE = "Asia/Kolkata";

/** Absolute IST labels include the year, avoiding clock-dependent SSR hydration. */
export function formatChatDateTime(value: string, locale: "en" | "hi" = "en", dateOnly = false): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(locale === "hi" ? "hi-IN" : MARKETPLACE_LOCALE, {
    timeZone: MARKETPLACE_TIMEZONE, day: "numeric", month: "short", year: "numeric",
    ...(dateOnly ? {} : { hour: "2-digit", minute: "2-digit" }),
  }).format(date);
}

/**
 * Formats an ISO date string into a deterministic time string (e.g. "05:26 pm").
 */
export function formatMessageTime(isoString: string): string {
  if (!isoString) return "";
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "";
    return date.toLocaleTimeString(MARKETPLACE_LOCALE, {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: MARKETPLACE_TIMEZONE,
    });
  } catch {
    return "";
  }
}

/**
 * Formats an ISO date string into a deterministic short date string (e.g. "18 Sep").
 */
export function formatMessageDate(isoString: string): string {
  if (!isoString) return "";
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "";
    return date.toLocaleDateString(MARKETPLACE_LOCALE, {
      month: "short",
      day: "numeric",
      timeZone: MARKETPLACE_TIMEZONE,
    });
  } catch {
    return "";
  }
}

/**
 * Formats an ISO date string into a deterministic date and time string (e.g. "18 Sep, 05:26 pm").
 */
export function formatNotificationDateTime(isoString: string): string {
  if (!isoString) return "";
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "";
    return date.toLocaleString(MARKETPLACE_LOCALE, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: MARKETPLACE_TIMEZONE,
    });
  } catch {
    return "";
  }
}
