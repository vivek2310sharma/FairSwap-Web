import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { resolveCorrelationId } from "@/lib/logger/correlation";
import { sendOperationsEmailAlert } from "@/lib/monitoring/operations-alert";
import { verifyResendWebhookSignature } from "@/lib/monitoring/resend-webhook";

export const runtime = "nodejs";

const MAX_PAYLOAD_BYTES = 64 * 1024;

const ACTIONABLE_EVENTS = new Set([
  "email.bounced",
  "email.complained",
  "email.delivery_delayed",
  "email.failed",
  "email.suppressed",
]);

const resendEventSchema = z
  .object({
    type: z.string().min(1).max(100),
    created_at: z.string().min(1).max(100),
    data: z
      .object({
        email_id: z.string().min(1).max(200),
        bounce: z
          .object({
            type: z.string().max(100).optional(),
            subType: z.string().max(100).optional(),
          })
          .passthrough()
          .optional(),
      })
      .passthrough(),
  })
  .passthrough();

function jsonResponse(
  body: Record<string, unknown>,
  status: number,
  correlationId: string
): NextResponse {
  const response = NextResponse.json(body, { status });
  response.headers.set("x-request-id", correlationId);
  return response;
}

export async function POST(request: NextRequest) {
  const correlationId = resolveCorrelationId();
  const operation = "POST /api/monitoring/resend";

  const signingSecret = process.env.RESEND_WEBHOOK_SECRET?.trim();
  if (!signingSecret) {
    logger.error("email.resend_webhook_not_configured", undefined, {
      request_id: correlationId,
      operation,
      details: { missing: "RESEND_WEBHOOK_SECRET" },
    });
    return jsonResponse({ error: "Webhook unavailable" }, 503, correlationId);
  }

  const contentLength = request.headers.get("content-length");
  if (contentLength && Number(contentLength) > MAX_PAYLOAD_BYTES) {
    logger.warn("email.resend_webhook_payload_too_large", {
      request_id: correlationId,
      operation,
    });
    return jsonResponse({ error: "Payload too large" }, 413, correlationId);
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return jsonResponse({ error: "Invalid body" }, 400, correlationId);
  }

  if (Buffer.byteLength(rawBody, "utf8") > MAX_PAYLOAD_BYTES) {
    return jsonResponse({ error: "Payload too large" }, 413, correlationId);
  }

  const verification = verifyResendWebhookSignature({
    payload: rawBody,
    headers: request.headers,
    secret: signingSecret,
  });

  if (!verification.ok) {
    logger.warn("email.resend_webhook_signature_rejected", {
      request_id: correlationId,
      operation,
      details: { reason: verification.reason },
    });
    return jsonResponse({ error: "Invalid webhook signature" }, 401, correlationId);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return jsonResponse({ error: "Malformed JSON" }, 400, correlationId);
  }

  const eventResult = resendEventSchema.safeParse(parsed);
  if (!eventResult.success) {
    logger.warn("email.resend_webhook_schema_rejected", {
      request_id: correlationId,
      operation,
      details: { provider_event_id: verification.messageId },
    });
    return jsonResponse({ error: "Invalid webhook payload" }, 400, correlationId);
  }

  const event = eventResult.data;
  const bounceType = event.data.bounce?.type;
  const bounceSubtype = event.data.bounce?.subType;

  const safeDetails = {
    provider: "resend",
    provider_event_id: verification.messageId,
    event_type: event.type,
    email_id: event.data.email_id,
    occurred_at: event.created_at,
    bounce_type: bounceType,
    bounce_subtype: bounceSubtype,
  };

  if (!ACTIONABLE_EVENTS.has(event.type)) {
    logger.info("email.resend_event_received", {
      request_id: correlationId,
      operation,
      details: safeDetails,
    });
    return jsonResponse({ received: true, actionable: false }, 200, correlationId);
  }

  const severity = event.type === "email.delivery_delayed" ? "warning" : "error";

  if (severity === "warning") {
    logger.warn("email.delivery_issue", {
      request_id: correlationId,
      operation,
      details: safeDetails,
    });
  } else {
    logger.error("email.delivery_issue", undefined, {
      request_id: correlationId,
      operation,
      details: safeDetails,
    });
  }

  const alertResult = await sendOperationsEmailAlert({
    severity,
    eventType: event.type,
    emailId: event.data.email_id,
    providerEventId: verification.messageId,
    occurredAt: event.created_at,
    bounceType,
    bounceSubtype,
  });

  if (!alertResult.ok) {
    logger.error("email.operations_alert_delivery_failed", undefined, {
      request_id: correlationId,
      operation,
      details: {
        provider: "resend",
        provider_event_id: verification.messageId,
        event_type: event.type,
        alert_failure_reason: alertResult.reason,
        alert_status: alertResult.status,
      },
    });

    // Resend retries failed webhook deliveries. Returning 503 prevents an
    // actionable email-delivery event from being silently acknowledged when
    // the operator alert could not be delivered.
    return jsonResponse(
      { received: true, actionable: true, alerted: false },
      503,
      correlationId
    );
  }

  logger.info("email.operations_alert_delivered", {
    request_id: correlationId,
    operation,
    details: {
      provider: "resend",
      provider_event_id: verification.messageId,
      event_type: event.type,
    },
  });

  return jsonResponse(
    { received: true, actionable: true, alerted: true },
    200,
    correlationId
  );
}
