/**
 * FairSwap Logging & Monitoring Baseline - Log Schema & Types
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface StructuredError {
  name: string;
  message: string;
  code?: string | number;
  category?: "domain" | "system" | "network" | "security" | "database" | "unknown";
  digest?: string;
  stack?: string;
}

export interface LogContext {
  correlation_id?: string;
  request_id?: string;
  upstream_request_id?: string;
  error_digest?: string;
  client_event_id?: string;
  route?: string;
  operation?: string;
  duration_ms?: number;
  actor_id?: string;
  error_code?: string;
  details?: Record<string, unknown>;
  extra?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface StructuredLogRecord {
  timestamp: string;
  level: LogLevel;
  service: string;
  environment: string;
  event: string;
  correlation_id?: string;
  upstream_request_id?: string;
  error_digest?: string;
  client_event_id?: string;
  route?: string;
  operation?: string;
  duration_ms?: number;
  actor_id?: string;
  error_code?: string;
  details?: Record<string, unknown>;
  extra?: Record<string, unknown>;
  error?: StructuredError | null;
  release?: string;
  [key: string]: unknown;
}
