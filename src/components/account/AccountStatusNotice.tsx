import { ACCOUNT_COPY } from "@/lib/account/copy";
import type { AccountState } from "@/lib/account/overview";

const NOTICES: Partial<Record<AccountState, { title: string; body: string; tone: "warn" | "danger"; icon: string }>> = {
  unavailable: {
    title: ACCOUNT_COPY.notices.unavailableTitle,
    body: ACCOUNT_COPY.notices.unavailableBody,
    tone: "warn",
    icon: "⚠️",
  },
  suspended: {
    title: ACCOUNT_COPY.notices.suspendedTitle,
    body: ACCOUNT_COPY.notices.suspendedBody,
    tone: "danger",
    icon: "⚠️",
  },
  deletion_pending: {
    title: ACCOUNT_COPY.notices.deletionPendingTitle,
    body: ACCOUNT_COPY.notices.deletionPendingBody,
    tone: "warn",
    icon: "⏳",
  },
  deleted: {
    title: ACCOUNT_COPY.notices.deletedTitle,
    body: ACCOUNT_COPY.notices.deletedBody,
    tone: "danger",
    icon: "⚠️",
  },
};

const TONES = {
  warn: "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-100",
  danger: "border-red-300 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950/50 dark:text-red-100",
} as const;

/** Banner for non-active account states. Renders nothing for an active account. */
export function AccountStatusNotice({ state }: { state: AccountState }) {
  const notice = NOTICES[state];
  if (!notice) return null;

  return (
    <div role="alert" className={`rounded-xl border p-4 text-sm ${TONES[notice.tone]}`}>
      <div className="flex items-center gap-2 font-bold">
        <span aria-hidden="true">{notice.icon}</span> {notice.title}
      </div>
      <p className="mt-1">{notice.body}</p>
    </div>
  );
}
