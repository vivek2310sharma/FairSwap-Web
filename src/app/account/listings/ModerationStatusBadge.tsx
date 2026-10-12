"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface ModerationStatusBadgeProps {
  listingId: string;
  initialStatus: string;
  enhancedModerationEnabled?: boolean;
}

export function ModerationStatusBadge({
  listingId,
  initialStatus,
  enhancedModerationEnabled = false,
}: ModerationStatusBadgeProps) {
  // If enhanced moderation status is not enabled for the UI, render standard manual review status
  // without calling or polling unpromoted/unsupported RPCs.
  const isEnhancedActive =
    enhancedModerationEnabled ||
    process.env.NEXT_PUBLIC_ENABLE_ENHANCED_MODERATION_STATUS === "true";

  const [workflowState, setWorkflowState] = useState<string>(
    initialStatus === "pending_review" && isEnhancedActive ? "running" : initialStatus
  );
  const [message, setMessage] = useState<string | null>(
    initialStatus === "pending_review" && isEnhancedActive
      ? "Checking listing status..."
      : null
  );
  const [provenance, setProvenance] = useState<string | null>(null);

  useEffect(() => {
    // Only poll when listing is in pending_review AND enhanced moderation status is actively enabled
    if (initialStatus !== "pending_review" || !isEnhancedActive) return;

    let active = true;
    let pollCount = 0;
    const maxPolls = 60; // 4 minutes at 4s intervals
    const supabase = createClient();

    let inFlight = false;

    const fetchStatus = async () => {
      if (!active || inFlight) return;
      pollCount++;
      if (pollCount >= maxPolls) {
        active = false;
      }
      inFlight = true;

      try {
        const { data, error } = await supabase.rpc(
          "get_seller_moderation_workflow_status",
          { listing_id: listingId }
        );

        if (!active) return;

        if (error) {
          // If RPC is missing (PGRST202 or 404/42883), gracefully fall back to standard Under Review status
          // without displaying confusing error messages or polling repeatedly.
          if (
            error.code === "PGRST202" ||
            error.code === "42883" ||
            error.message?.includes("not found") ||
            error.message?.includes("function")
          ) {
            setWorkflowState("pending_review");
            setMessage(null);
            active = false;
            return;
          }

          setWorkflowState("unavailable");
          setMessage("Status temporarily unavailable. Please refresh.");
          return;
        }

        if (data) {
          setWorkflowState(data.workflow_state || "pending_review");
          setMessage(data.message || null);
          if (data.provenance) {
            setProvenance(data.provenance);
          }

          // If reached terminal states, stop polling
          if (["published", "rejected", "flagged", "escalated"].includes(data.workflow_state)) {
            active = false;
          }
        }
      } catch {
        if (active) {
          setWorkflowState("unavailable");
          setMessage("Status temporarily unavailable. Please refresh.");
        }
      } finally {
        inFlight = false;
      }
    };

    fetchStatus();
    const interval = setInterval(() => {
      if (active) {
        fetchStatus();
      } else {
        clearInterval(interval);
      }
    }, 4000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [listingId, initialStatus, isEnhancedActive]);

  if (initialStatus !== "pending_review" && workflowState !== "running") {
    return null;
  }

  let badgeColor = "bg-amber-100 text-amber-800 border-amber-300";
  let label = "Under Review";

  if (workflowState === "running") {
    badgeColor = "bg-blue-100 text-blue-800 border-blue-300 animate-pulse";
    label = "Checking...";
  } else if (workflowState === "flagged") {
    badgeColor = "bg-amber-100 text-amber-800 border-amber-300";
    label = "Pending Staff Review";
  } else if (workflowState === "published") {
    badgeColor = "bg-emerald-100 text-emerald-800 border-emerald-300";
    label = provenance === "automatic" ? "Auto-Approved" : "Live";
  } else if (workflowState === "retrying") {
    badgeColor = "bg-yellow-100 text-yellow-800 border-yellow-300";
    label = "Retrying Checks";
  } else if (workflowState === "rejected" || workflowState === "invalid_input") {
    badgeColor = "bg-red-100 text-red-800 border-red-300";
    label = "Changes Requested";
  } else if (workflowState === "unavailable") {
    badgeColor = "bg-gray-100 text-gray-700 border-gray-300";
    label = "Status Unavailable";
  }

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <div className="flex items-center gap-2">
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${badgeColor}`}
        >
          {label}
        </span>
      </div>
      {message && <p className="text-xs text-gray-500">{message}</p>}
    </div>
  );
}
