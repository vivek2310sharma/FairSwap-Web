import { logger } from "@/lib/logger";
import { stripQueryString } from "@/lib/logger/redactor";
import { resolveCorrelationId, sanitizeUpstreamRequestId } from "@/lib/logger/correlation";

export async function register() {
  logger.info("service.started", {
    operation: "instrumentation.register",
  });
}

interface InstrumentationRequest {
  path: string;
  method: string;
  headers: Record<string, string | string[] | undefined>;
}

interface InstrumentationContext {
  routerKind: "Pages Router" | "App Router";
  routePath: string;
  routeType: "render" | "route" | "action" | "middleware";
  renderSource?: string;
  revalidateReason?: string;
  renderType?: string;
}

export async function onRequestError(
  err: unknown,
  request: InstrumentationRequest,
  context: InstrumentationContext
) {
  const errorObj = err as Error & { digest?: string };
  const errorDigest = errorObj?.digest;

  // Authoritative FairSwap correlation ID is server-owned; caller-supplied ID is untrusted metadata
  const rawRequestId = Array.isArray(request.headers["x-request-id"])
    ? request.headers["x-request-id"][0]
    : request.headers["x-request-id"];
  const upstreamRequestId = sanitizeUpstreamRequestId(rawRequestId);
  const requestId = resolveCorrelationId();

  // Strictly sanitize request path (strip query strings / auth callback tokens)
  const safePath = stripQueryString(request.path || context.routePath || "/");

  // Allowlist only safe diagnostic headers, never Authorization or Cookie
  const safeHeaders: Record<string, string> = {};
  if (typeof request.headers["user-agent"] === "string") {
    safeHeaders["user-agent"] = request.headers["user-agent"].slice(0, 200);
  }

  logger.error("nextjs.server_error", err, {
    request_id: requestId,
    upstream_request_id: upstreamRequestId,
    error_digest: errorDigest,
    route: safePath,
    operation: `${request.method || "UNKNOWN"} ${safePath}`,
    error_code: errorObj?.name || "UNHANDLED_SERVER_ERROR",
    extra: {
      route_type: context.routeType,
      router_kind: context.routerKind,
      render_source: context.renderSource,
      headers: safeHeaders,
    },
  });
}
