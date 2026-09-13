import { AlertTriangle } from "lucide-react";

export function DevelopmentNotice() {
  return (
    <div
      role="status"
      className="rounded-lg border border-notice-border bg-notice-bg px-4 py-3"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle
          className="mt-0.5 h-5 w-5 shrink-0 text-notice-border"
          aria-hidden="true"
        />
        <div>
          <p className="text-sm font-semibold text-notice-text">
            Development Foundation
          </p>
          <p className="mt-1 text-sm text-notice-text">
            Accounts, listings, and communication are not connected yet. This is
            a local development build demonstrating the FairSwap layout and
            design system.
          </p>
        </div>
      </div>
    </div>
  );
}
