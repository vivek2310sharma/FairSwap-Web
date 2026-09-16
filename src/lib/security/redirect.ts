/**
 * Centralized open redirect defense.
 * Validates and sanitizes untrusted redirect targets (e.g., `next` parameters).
 * Ensures targets are strictly relative, non-protocol-relative, contain no backslashes
 * (which WHATWG URL parser normalizes to forward slashes), and do not encode schemes.
 */
export function sanitizeRedirectPath(
  url: string | null | undefined,
  fallback = "/account"
): string {
  if (!url || typeof url !== "string") {
    return fallback;
  }

  const trimmed = url.trim();
  if (!trimmed) {
    return fallback;
  }

  // Reject CRLF, null bytes, or tab injection
  if (/[\r\n\t\0]/.test(trimmed)) {
    return fallback;
  }

  // Attempt decode to detect URL-encoded bypasses (%2F%2F, %5C, etc.)
  let decoded = trimmed;
  try {
    decoded = decodeURIComponent(trimmed);
  } catch {
    return fallback;
  }

  // Reject decoded control characters
  if (/[\r\n\t\0]/.test(decoded)) {
    return fallback;
  }

  // Backslashes in paths cause WHATWG URL normalization to slash (e.g., `/\evil.com` -> `https://evil.com/`)
  if (decoded.includes("\\")) {
    return fallback;
  }

  // Must start with exactly one forward slash; disallow protocol-relative (`//`)
  if (!decoded.startsWith("/") || decoded.startsWith("//")) {
    return fallback;
  }

  // Check the raw trimmed string as well
  const pathPart = trimmed.split(/[?#]/)[0];
  if (pathPart.includes("\\") || !trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return fallback;
  }

  try {
    // Parse against a dummy base origin to verify strict pathname structure
    const dummyOrigin = "https://fairswap.local";
    const parsed = new URL(trimmed, dummyOrigin);

    // If origin changed, it's an external URL (e.g. `https://evil.com`)
    if (parsed.origin !== dummyOrigin) {
      return fallback;
    }

    // Must be a relative path
    if (!parsed.pathname.startsWith("/") || parsed.pathname.startsWith("//")) {
      return fallback;
    }

    return parsed.pathname + parsed.search + parsed.hash;
  } catch {
    return fallback;
  }
}
