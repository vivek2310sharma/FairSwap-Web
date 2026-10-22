import Link from "next/link";
import { AlertCircle } from "lucide-react";
import type { NotificationErrorAction } from "./useNotificationReadState";

interface NotificationErrorNoticeProps {
  message: string;
  /** Present when the server guard sent the user somewhere actionable (policy review, sign-in). */
  action?: NotificationErrorAction | null;
  className?: string;
}

/** Accessible error banner shared by the notification bell and list. */
export function NotificationErrorNotice({ message, action, className = "" }: NotificationErrorNoticeProps) {
  return (
    <div
      role="alert"
      className={`flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900 dark:border-red-800 dark:bg-red-950/50 dark:text-red-100 ${className}`}
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>
        {message}
        {action ? (
          <Link
            href={action.href}
            className="mt-1 block min-h-[44px] py-2 font-semibold underline"
          >
            {action.label}
          </Link>
        ) : null}
      </span>
    </div>
  );
}
