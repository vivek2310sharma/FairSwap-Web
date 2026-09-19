import { createHmac, timingSafeEqual } from "node:crypto";

const DEFAULT_TOLERANCE_SECONDS = 5 * 60;
const MIN_SECRET_BYTES = 24;
const MAX_SECRET_BYTES = 64;
const MAX_MESSAGE_ID_LENGTH = 200;

export type ResendWebhookVerificationResult =
  | {
      ok: true;
      messageId: string;
      timestamp: number;
    }
  | {
      ok: false;
      reason:
        | "missing_headers"
        | "invalid_headers"
        | "invalid_timestamp"
        | "stale_timestamp"
        | "invalid_secret"
        | "invalid_signature";
    };

function getHeader(headers: Headers, primary: string, fallback: string): string | null {
  return headers.get(primary) ?? headers.get(fallback);
}

function decodeSigningSecret(secret: string): Buffer | null {
  const trimmed = secret.trim();
  const encoded = trimmed.startsWith("whsec_") ? trimmed.slice("whsec_".length) : trimmed;

  if (!encoded) return null;

  try {
    const decoded = Buffer.from(encoded, "base64");
    if (decoded.length < MIN_SECRET_BYTES || decoded.length > MAX_SECRET_BYTES) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Verifies Resend/Svix-compatible webhook signatures against the exact raw body.
 *
 * Resend currently sends svix-id / svix-timestamp / svix-signature headers.
 * The Standard Webhooks equivalents are accepted as a compatibility fallback.
 */
export function verifyResendWebhookSignature(options: {
  payload: string;
  headers: Headers;
  secret: string;
  nowSeconds?: number;
  toleranceSeconds?: number;
}): ResendWebhookVerificationResult {
  const {
    payload,
    headers,
    secret,
    nowSeconds = Math.floor(Date.now() / 1000),
    toleranceSeconds = DEFAULT_TOLERANCE_SECONDS,
  } = options;

  const messageId = getHeader(headers, "svix-id", "webhook-id");
  const timestampHeader = getHeader(headers, "svix-timestamp", "webhook-timestamp");
  const signatureHeader = getHeader(headers, "svix-signature", "webhook-signature");

  if (!messageId || !timestampHeader || !signatureHeader) {
    return { ok: false, reason: "missing_headers" };
  }

  if (
    messageId.length > MAX_MESSAGE_ID_LENGTH ||
    messageId.includes(".") ||
    !/^[A-Za-z0-9_-]+$/.test(messageId)
  ) {
    return { ok: false, reason: "invalid_headers" };
  }

  const timestamp = Number(timestampHeader);
  if (!Number.isInteger(timestamp) || timestamp <= 0) {
    return { ok: false, reason: "invalid_timestamp" };
  }

  if (Math.abs(nowSeconds - timestamp) > toleranceSeconds) {
    return { ok: false, reason: "stale_timestamp" };
  }

  const signingKey = decodeSigningSecret(secret);
  if (!signingKey) {
    return { ok: false, reason: "invalid_secret" };
  }

  const signedContent = `${messageId}.${timestampHeader}.${payload}`;
  const expected = createHmac("sha256", signingKey).update(signedContent, "utf8").digest();

  const signatures = signatureHeader
    .split(/\s+/)
    .map((entry) => entry.trim())
    .filter(Boolean);

  for (const entry of signatures) {
    const commaIndex = entry.indexOf(",");
    if (commaIndex <= 0) continue;

    const version = entry.slice(0, commaIndex);
    const encodedSignature = entry.slice(commaIndex + 1);
    if (version !== "v1" || !encodedSignature) continue;

    try {
      const candidate = Buffer.from(encodedSignature, "base64");
      if (candidate.length === expected.length && timingSafeEqual(candidate, expected)) {
        return { ok: true, messageId, timestamp };
      }
    } catch {
      // Ignore malformed candidate signatures and continue checking rotations.
    }
  }

  return { ok: false, reason: "invalid_signature" };
}
