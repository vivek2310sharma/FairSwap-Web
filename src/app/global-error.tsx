"use client";

import { useEffect, useState } from "react";
import { formatUserReference } from "@/lib/logger/correlation";

export default function GlobalError({
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
    if (error.digest || !clientEventId) {
      return;
    }

    try {
      const payload = JSON.stringify({
        client_event_id: clientEventId,
        error_name: (error.name || "GlobalError").slice(0, 100),
        error_message: (error.message || "Critical unhandled application error").slice(0, 500),
        component_stack: error.stack ? error.stack.slice(0, 2000) : undefined,
      });

      if (typeof navigator !== "undefined" && navigator.sendBeacon) {
        const blob = new Blob([payload], { type: "application/json" });
        navigator.sendBeacon("/api/monitoring/client-error", blob);
      }
    } catch {
      // Defensive no-op
    }
  }, [error, clientEventId]);

  return (
    <html lang="en">
      <body style={{
        margin: 0,
        padding: "2rem",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        backgroundColor: "#f9fafb",
        color: "#111827",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
      }}>
        <div style={{
          maxWidth: "28rem",
          width: "100%",
          padding: "2.5rem 2rem",
          borderRadius: "1rem",
          backgroundColor: "#ffffff",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
          border: "1px solid #e5e7eb",
          textAlign: "center",
        }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>
            Application Error
          </h1>
          <p style={{ fontSize: "0.925rem", color: "#4b5563", marginBottom: "1.5rem" }}>
            A critical error occurred. Please try reloading the page.
          </p>
          <div style={{
            backgroundColor: "#f3f4f6",
            padding: "0.75rem 1rem",
            borderRadius: "0.5rem",
            marginBottom: "1.75rem",
            fontFamily: "monospace",
            fontSize: "0.85rem",
            color: "#374151",
          }}>
            <span style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "#6b7280", display: "block" }}>
              Incident Reference
            </span>
            <strong>{referenceId}</strong>
          </div>
          <button
            onClick={() => reset()}
            style={{
              padding: "0.625rem 1.5rem",
              borderRadius: "0.5rem",
              backgroundColor: "#2563eb",
              color: "#ffffff",
              fontWeight: 500,
              fontSize: "0.875rem",
              border: "none",
              cursor: "pointer",
            }}
          >
            Reload Application
          </button>
        </div>
      </body>
    </html>
  );
}
