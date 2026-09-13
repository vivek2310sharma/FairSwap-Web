"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatUserReference } from "@/lib/logger/correlation";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [clientEventId] = useState(() => (error.digest ? null : crypto.randomUUID()));
  const referenceId = error.digest
    ? formatUserReference(error.digest)
    : clientEventId
    ? formatUserReference(clientEventId)
    : "ref_unknown";

  useEffect(() => {
    // If Next.js provided a server digest, it is already captured server-side in onRequestError
    if (error.digest || !clientEventId) {
      return;
    }

    // Best-effort reporting to ingestion endpoint (isolated from audit logs, fail-safe)
    try {
      const payload = JSON.stringify({
        client_event_id: clientEventId,
        error_name: (error.name || "ClientError").slice(0, 100),
        error_message: (error.message || "An unexpected error occurred").slice(0, 500),
        component_stack: error.stack ? error.stack.slice(0, 2000) : undefined,
        pathname: typeof window !== "undefined" ? window.location.pathname.slice(0, 200) : undefined,
        user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 300) : undefined,
      });

      if (typeof navigator !== "undefined" && navigator.sendBeacon) {
        const blob = new Blob([payload], { type: "application/json" });
        navigator.sendBeacon("/api/monitoring/client-error", blob);
      } else {
        fetch("/api/monitoring/client-error", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
          keepalive: true,
        }).catch(() => {
          // Failure to report must never break the UI
        });
      }
    } catch {
      // Defensive no-op
    }
  }, [error, clientEventId]);

  return (
    <div style={{
      minHeight: "70vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "2rem 1rem",
    }}>
      <div style={{
        maxWidth: "28rem",
        width: "100%",
        padding: "2.5rem 2rem",
        borderRadius: "1rem",
        backgroundColor: "var(--card-bg, #ffffff)",
        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
        border: "1px solid var(--border-color, #e5e7eb)",
        textAlign: "center",
      }}>
        <div style={{
          width: "3.5rem",
          height: "3.5rem",
          borderRadius: "50%",
          backgroundColor: "#fee2e2",
          color: "#dc2626",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 1.5rem auto",
          fontSize: "1.75rem",
          fontWeight: 700,
        }}>
          !
        </div>

        <h1 style={{
          fontSize: "1.5rem",
          fontWeight: 700,
          color: "var(--foreground, #111827)",
          marginBottom: "0.5rem",
        }}>
          Something went wrong
        </h1>

        <p style={{
          fontSize: "0.925rem",
          color: "var(--muted-foreground, #4b5563)",
          marginBottom: "1.5rem",
          lineHeight: 1.5,
        }}>
          We encountered an unexpected issue while processing your request. Please try again or provide the reference ID below to support.
        </p>

        <div style={{
          backgroundColor: "#f3f4f6",
          padding: "0.75rem 1rem",
          borderRadius: "0.5rem",
          marginBottom: "1.75rem",
          fontFamily: "monospace",
          fontSize: "0.85rem",
          color: "#374151",
          wordBreak: "break-all",
        }}>
          <span style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "#6b7280", display: "block", marginBottom: "0.25rem" }}>
            Incident Reference
          </span>
          <strong>{referenceId}</strong>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
          <button
            onClick={() => reset()}
            style={{
              padding: "0.625rem 1.25rem",
              borderRadius: "0.5rem",
              backgroundColor: "#2563eb",
              color: "#ffffff",
              fontWeight: 500,
              fontSize: "0.875rem",
              border: "none",
              cursor: "pointer",
              transition: "background-color 0.15s ease",
            }}
          >
            Try Again
          </button>
          <Link
            href="/"
            style={{
              padding: "0.625rem 1.25rem",
              borderRadius: "0.5rem",
              backgroundColor: "#ffffff",
              color: "#374151",
              fontWeight: 500,
              fontSize: "0.875rem",
              border: "1px solid #d1d5db",
              textDecoration: "none",
              display: "inline-block",
            }}
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
