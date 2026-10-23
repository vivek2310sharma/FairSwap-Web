import { Clock, CheckCircle2, AlertCircle } from "lucide-react";
import type { SupportTicketStatus } from "@/types/communication";

const BADGES: Record<
  SupportTicketStatus,
  { label: string; className: string; icon: "clock" | "alert" | "check" | null }
> = {
  open: {
    label: "Open",
    className: "bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/50 dark:text-blue-200 dark:border-blue-800",
    icon: "clock",
  },
  in_progress: {
    label: "In progress",
    className: "bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/50 dark:text-amber-100 dark:border-amber-800",
    icon: "clock",
  },
  awaiting_user: {
    label: "Waiting for your reply",
    className: "bg-purple-50 text-purple-900 border-purple-200 dark:bg-purple-950/50 dark:text-purple-100 dark:border-purple-800",
    icon: "alert",
  },
  resolved: {
    label: "Resolved",
    className: "bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-100 dark:border-emerald-800",
    icon: "check",
  },
  closed: {
    label: "Closed",
    className: "bg-neutral-100 text-neutral-700 border-neutral-300 dark:bg-neutral-800 dark:text-neutral-200 dark:border-neutral-600",
    icon: null,
  },
};

export function SupportStatusBadge({ status }: { status: string }) {
  const badge = BADGES[status as SupportTicketStatus];
  if (!badge) return null;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${badge.className}`}
    >
      {badge.icon === "clock" ? <Clock className="h-3 w-3" aria-hidden="true" /> : null}
      {badge.icon === "alert" ? <AlertCircle className="h-3 w-3" aria-hidden="true" /> : null}
      {badge.icon === "check" ? <CheckCircle2 className="h-3 w-3" aria-hidden="true" /> : null}
      {badge.label}
    </span>
  );
}
