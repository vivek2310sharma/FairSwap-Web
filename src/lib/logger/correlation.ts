/**
 * FairSwap Correlation & Request ID Helpers
 *
 * Trust boundary invariant: Never blindly trust arbitrary incoming headers.
 * Validate format and bounds before preserving; otherwise generate cryptographically
 * random UUIDv4. Never use correlation IDs as security/auth evidence.
 */

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Bounded alphanumeric-with-hyphens ID format for trusted upstream infrastructure
const SAFE_ID_REGEX = /^[a-zA-Z0-9_-]{8,64}$/;

/**
 * Validates whether an incoming correlation identifier is safe and well-formed.
 */
export function isValidCorrelationId(id: unknown): id is string {
  if (typeof id !== "string") return false;
  const trimmed = id.trim();
  if (trimmed.length < 8 || trimmed.length > 64) return false;
  return UUID_REGEX.test(trimmed) || SAFE_ID_REGEX.test(trimmed);
}

/**
 * Sanitizes and bounds an externally supplied caller request ID.
 * Returns the bounded string if valid, or undefined if invalid or missing.
 * This value is strictly untrusted diagnostic metadata and NEVER authoritative.
 */
export function sanitizeUpstreamRequestId(candidate?: string | null): string | undefined {
  if (candidate && isValidCorrelationId(candidate)) {
    return candidate.trim();
  }
  return undefined;
}

/**
 * Resolves FairSwap's authoritative correlation ID.
 *
 * Trust boundary invariant:
 * Ordinary browser/client callers are NOT trusted request-ID issuers.
 * Always generates a fresh, authoritative cryptographically strong UUIDv4 server-side.
 * External caller-supplied IDs are NEVER adopted as the authoritative correlation ID.
 *
 * (Upstream IDs are only adopted if explicit options.isTrustedInfrastructure === true
 * configured for verified internal infrastructure proxies).
 */
export function resolveCorrelationId(
  candidate?: string | null,
  options?: { isTrustedInfrastructure?: boolean }
): string {
  if (options?.isTrustedInfrastructure && candidate && isValidCorrelationId(candidate)) {
    return candidate.trim();
  }
  return crypto.randomUUID();
}

/**
 * Generates a fresh cryptographically strong UUID correlation identifier.
 */
export function generateCorrelationId(): string {
  return crypto.randomUUID();
}

/**
 * Generates a client-side telemetry event ID.
 */
export function generateClientEventId(): string {
  return `evt_${crypto.randomUUID()}`;
}

/**
 * Formats a safe, non-technical reference ID suitable for displaying to users.
 * Example: "ref_c7a8b9e0"
 */
export function formatUserReference(id: string): string {
  const cleanId = id.replace(/[^a-zA-Z0-9]/g, "");
  const prefix = cleanId.slice(0, 8);
  return `ref_${prefix || "unknown"}`;
}
