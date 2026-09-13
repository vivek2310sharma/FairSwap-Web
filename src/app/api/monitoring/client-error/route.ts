import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { resolveCorrelationId, formatUserReference, sanitizeUpstreamRequestId } from "@/lib/logger/correlation";
import { stripQueryString } from "@/lib/logger/redactor";

const MAX_PAYLOAD_BYTES = 4096;

const clientErrorSchema = z
  .object({
    client_event_id: z.string().uuid(),
    error_name: z.string().min(1).max(100),
    error_message: z.string().min(1).max(500),
    component_stack: z.string().max(2000).optional(),
    pathname: z.string().max(200).optional(),
    user_agent: z.string().max(300).optional(),
  })
  .strict();

export async function POST(request: NextRequest) {
  const incomingId = request.headers.get("x-request-id");
  const upstreamRequestId = sanitizeUpstreamRequestId(incomingId);
  const correlationId = resolveCorrelationId();

  // 1. Same-Origin & Sec-Fetch validation
  const secFetchSite = request.headers.get("sec-fetch-site");
  if (secFetchSite === "cross-site") {
    logger.warn("client_reporting.cross_site_rejected", {
      request_id: correlationId,
      operation: "POST /api/monitoring/client-error",
    });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const origin = request.headers.get("origin");
  if (origin) {
    try {
      const originUrl = new URL(origin);
      const reqUrl = new URL(request.url);
      if (originUrl.host !== reqUrl.host) {
        logger.warn("client_reporting.origin_mismatch", {
          request_id: correlationId,
          operation: "POST /api/monitoring/client-error",
        });
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: "Invalid Origin" }, { status: 400 });
    }
  }

  // 2. Request body size check
  const contentLength = request.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > MAX_PAYLOAD_BYTES) {
    logger.warn("client_reporting.payload_too_large", {
      request_id: correlationId,
      operation: "POST /api/monitoring/client-error",
    });
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  let rawBodyText: string;
  try {
    rawBodyText = await request.text();
  } catch (err) {
    logger.warn("client_reporting.body_read_failed", {
      request_id: correlationId,
      error_code: (err as Error)?.name,
    });
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (rawBodyText.length > MAX_PAYLOAD_BYTES) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  // 3. Strict schema validation
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawBodyText);
  } catch {
    return NextResponse.json({ error: "Malformed JSON" }, { status: 400 });
  }

  const parseResult = clientErrorSchema.safeParse(parsedJson);
  if (!parseResult.success) {
    logger.warn("client_reporting.schema_validation_failed", {
      request_id: correlationId,
      error_code: "INVALID_CLIENT_PAYLOAD",
    });
    return NextResponse.json(
      { error: "Validation failed", details: parseResult.error.issues.map((i) => i.message) },
      { status: 400 }
    );
  }

  const data = parseResult.data;
  const safePathname = data.pathname ? stripQueryString(data.pathname) : undefined;
  const userRef = formatUserReference(data.client_event_id);

  // 4. Log defensive operational telemetry (strictly isolated from public.audit_logs)
  logger.error("client.unhandled_error", undefined, {
    request_id: correlationId,
    upstream_request_id: upstreamRequestId,
    client_event_id: data.client_event_id,
    route: safePathname,
    operation: `CLIENT_ERROR ${safePathname || ""}`,
    error_code: data.error_name,
    extra: {
      telemetry_source: "untrusted_client_reporting",
      message: data.error_message,
      component_stack: data.component_stack,
      user_agent: data.user_agent,
    },
  });

  const response = NextResponse.json(
    {
      received: true,
      client_event_id: data.client_event_id,
      reference_id: userRef,
    },
    { status: 200 }
  );
  response.headers.set("x-request-id", correlationId);
  return response;
}
