/**
 * FairSwap Zero-Dependency Structured Operational Logger
 *
 * Emits schema-compliant, single-line JSON records (NDJSON) to stdout/stderr.
 * Completely failure-isolated: logger exceptions will never interrupt customer operations.
 */

import { LogLevel, LogContext, StructuredLogRecord, StructuredError } from "./types";
import { redact, stripQueryString } from "./redactor";

const SERVICE_NAME = "fairswap-web";
const RELEASE = process.env.NEXT_PUBLIC_APP_VERSION || "fairswap@0.1.0";
const ENVIRONMENT = process.env.NODE_ENV || "development";

const LEVEL_SEVERITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function getMinLevel(): LogLevel {
  const envLevel = process.env.LOG_LEVEL?.toLowerCase() as LogLevel | undefined;
  if (envLevel && envLevel in LEVEL_SEVERITY) {
    return envLevel;
  }
  return ENVIRONMENT === "production" ? "info" : "debug";
}

function shouldLog(level: LogLevel): boolean {
  const minLevel = getMinLevel();
  return LEVEL_SEVERITY[level] >= LEVEL_SEVERITY[minLevel];
}

function formatStructuredError(err: unknown): StructuredError | null {
  if (!err) return null;

  if (err instanceof Error) {
    const errorObj: StructuredError = {
      name: err.name || "Error",
      message: err.message || "An unexpected error occurred",
    };
    const code = (err as { code?: unknown }).code;
    if (typeof code === "string" || typeof code === "number") {
      errorObj.code = code;
    }
    const digest = (err as { digest?: unknown }).digest;
    if (typeof digest === "string") {
      errorObj.digest = digest;
    }
    if (err.stack && ENVIRONMENT !== "production") {
      errorObj.stack = err.stack;
    }
    return errorObj;
  }

  if (typeof err === "string") {
    return {
      name: "Error",
      message: err,
    };
  }

  return {
    name: "UnknownError",
    message: String(err),
  };
}

/**
 * Builds and outputs a single-line structured JSON log record.
 */
function emit(
  level: LogLevel,
  event: string,
  errorObj?: StructuredError | null,
  context?: LogContext
): void {
  if (!shouldLog(level)) return;

  try {
    const correlationId = context?.correlation_id || context?.request_id;
    const sanitizedRoute = context?.route ? stripQueryString(context.route) : undefined;

    // Sanitize context details
    const sanitizedDetails = context?.details
      ? (redact(context.details) as Record<string, unknown>)
      : undefined;

    const record: StructuredLogRecord = {
      timestamp: new Date().toISOString(),
      level,
      service: SERVICE_NAME,
      environment: ENVIRONMENT,
      event,
      release: RELEASE,
    };

    if (correlationId) record.correlation_id = correlationId;
    if (context?.upstream_request_id) record.upstream_request_id = context.upstream_request_id;
    if (context?.error_digest) record.error_digest = context.error_digest;
    if (context?.client_event_id) record.client_event_id = context.client_event_id;
    if (sanitizedRoute) record.route = sanitizedRoute;
    if (context?.operation) record.operation = context.operation;
    if (typeof context?.duration_ms === "number") record.duration_ms = Math.round(context.duration_ms);
    if (context?.actor_id) record.actor_id = context.actor_id;
    if (sanitizedDetails) record.details = sanitizedDetails;
    if (errorObj) record.error = errorObj;

    const line = JSON.stringify(record);

    if (level === "error") {
      console.error(line);
    } else {
      console.log(line);
    }
  } catch (emitErr) {
    // Fail-safe fallback: Output a minimal panic log without throwing
    try {
      const fallback = JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "error",
        service: SERVICE_NAME,
        event: "logger.internal_emit_failure",
        error: {
          name: "LoggerEmitError",
          message: emitErr instanceof Error ? emitErr.message : "Failed to serialize log record",
        },
      });
      console.error(fallback);
    } catch {
      // Complete isolation: silence if even fallback fails
    }
  }
}

export const logger = {
  debug(event: string, context?: LogContext): void {
    emit("debug", event, null, context);
  },

  info(event: string, context?: LogContext): void {
    emit("info", event, null, context);
  },

  warn(event: string, context?: LogContext): void {
    emit("warn", event, null, context);
  },

  error(event: string, error?: unknown, context?: LogContext): void {
    const structuredErr = formatStructuredError(error);
    const errorDigest =
      context?.error_digest ||
      (error && typeof (error as { digest?: unknown }).digest === "string"
        ? ((error as { digest: string }).digest)
        : undefined);

    const mergedContext = errorDigest
      ? { ...context, error_digest: errorDigest }
      : context;

    emit("error", event, structuredErr, mergedContext);
  },
};
