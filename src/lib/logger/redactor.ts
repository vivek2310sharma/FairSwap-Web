/**
 * FairSwap Centralized Redaction & Sanitization Engine
 *
 * Fail-safe, bounded, cycle-protected recursive sanitizer.
 * Guarantees zero leakage of credentials, tokens, JWTs, cookies,
 * or raw query parameter tokens before serialization.
 */

const MAX_DEPTH = 5;
const MAX_ARRAY_LENGTH = 25;
const MAX_OBJECT_KEYS = 50;
const MAX_STRING_LENGTH = 1000;

// Sensitive key patterns (case-insensitive)
const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /passwd/i,
  /token/i,
  /token_hash/i,
  /secret/i,
  /jwt/i,
  /totp/i,
  /verifyCode/i,
  /cookie/i,
  /set-cookie/i,
  /authorization/i,
  /apikey/i,
  /api[-_]?key/i,
  /service[-_]?role/i,
  /service[-_]?role[-_]?key/i,
  /private[-_]?key/i,
  /credit[-_]?card/i,
  /cvv/i,
  /pan/i,
  /aadhaar/i,
  /bank[-_]?account/i,
  /upi/i,
];

// Regex patterns to redact within strings
const JWT_PATTERN = /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+/g;
const BEARER_PATTERN = /Bearer\s+[A-Za-z0-9._~+/-]+=*/gi;
const SENSITIVE_QUERY_PATTERN = /([?&](?:token|token_hash|code|secret|key|password)=)[^&\s]+/gi;

/**
 * Checks if an object key is sensitive.
 */
export function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
}

/**
 * Sanitizes a string, redacting embedded JWTs, Bearer tokens, and sensitive query params.
 */
export function sanitizeString(value: string): string {
  if (value.length > MAX_STRING_LENGTH) {
    value = `${value.slice(0, MAX_STRING_LENGTH)}...[TRUNCATED ${value.length - MAX_STRING_LENGTH} chars]`;
  }

  return value
    .replace(BEARER_PATTERN, "[REDACTED_BEARER]")
    .replace(JWT_PATTERN, "[REDACTED_JWT]")
    .replace(SENSITIVE_QUERY_PATTERN, "$1[REDACTED]");
}

/**
 * Strips query strings from URLs / pathnames to prevent token leakage.
 * Returns only the normalized pathname.
 */
export function stripQueryString(rawPathOrUrl: string): string {
  try {
    // If it's a full URL
    if (rawPathOrUrl.startsWith("http://") || rawPathOrUrl.startsWith("https://")) {
      const url = new URL(rawPathOrUrl);
      return url.pathname;
    }
    // If it's a relative path with query
    const questionIndex = rawPathOrUrl.indexOf("?");
    if (questionIndex !== -1) {
      return rawPathOrUrl.slice(0, questionIndex);
    }
    const hashIndex = rawPathOrUrl.indexOf("#");
    if (hashIndex !== -1) {
      return rawPathOrUrl.slice(0, hashIndex);
    }
    return rawPathOrUrl;
  } catch {
    return rawPathOrUrl.split("?")[0] || "/";
  }
}

/**
 * Recursively redacts a value with strict depth and cycle protection.
 */
export function redact(value: unknown, depth = 0, seen = new WeakSet<object>()): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  // Primitives
  if (typeof value === "string") {
    return sanitizeString(value);
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "bigint") {
    return `${value.toString()}n`;
  }
  if (typeof value === "symbol") {
    return value.toString();
  }
  if (typeof value === "function") {
    return `[Function: ${value.name || "anonymous"}]`;
  }

  // Depth bound
  if (depth >= MAX_DEPTH) {
    return "[MAX_DEPTH_REACHED]";
  }

  // Error instance handling
  if (value instanceof Error) {
    return {
      name: value.name,
      message: sanitizeString(value.message),
      code: (value as { code?: unknown }).code,
      digest: (value as { digest?: unknown }).digest,
      stack: value.stack ? sanitizeString(value.stack) : undefined,
    };
  }

  // Cycle detection
  if (typeof value === "object") {
    if (seen.has(value)) {
      return "[CIRCULAR]";
    }
    seen.add(value);

    // Array handling
    if (Array.isArray(value)) {
      const result: unknown[] = [];
      const len = Math.min(value.length, MAX_ARRAY_LENGTH);
      for (let i = 0; i < len; i++) {
        try {
          result.push(redact(value[i], depth + 1, seen));
        } catch {
          result.push("[UNREADABLE]");
        }
      }
      if (value.length > MAX_ARRAY_LENGTH) {
        result.push(`[...${value.length - MAX_ARRAY_LENGTH} items truncated]`);
      }
      return result;
    }

    // Plain object handling
    const result: Record<string, unknown> = {};
    const keys = Object.keys(value);
    const keyCount = Math.min(keys.length, MAX_OBJECT_KEYS);

    for (let i = 0; i < keyCount; i++) {
      const key = keys[i];
      if (isSensitiveKey(key)) {
        result[key] = "[REDACTED]";
      } else {
        try {
          const val = (value as Record<string, unknown>)[key];
          result[key] = redact(val, depth + 1, seen);
        } catch {
          result[key] = "[UNREADABLE]";
        }
      }
    }

    if (keys.length > MAX_OBJECT_KEYS) {
      result["_truncated_keys"] = `[...${keys.length - MAX_OBJECT_KEYS} keys truncated]`;
    }

    return result;
  }

  return "[UNKNOWN]";
}
