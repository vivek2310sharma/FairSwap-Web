"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Bell,
  Check,
  CheckCheck,
  MessageSquare,
  Tag,
  AlertTriangle,
  LifeBuoy,
  ShieldAlert,
  ArrowRight,
} from "lucide-react";
import { type Notification } from "@/types/communication";
import { formatNotificationDateTime } from "@/lib/formatters";
import { resolveNotificationLink } from "@/lib/notifications/links";
import { useNotificationReadState } from "./useNotificationReadState";
import { NotificationErrorNotice } from "./NotificationErrorNotice";

interface NotificationListProps {
  initialNotifications: Notification[];
}

function NotificationIcon({ type }: { type: string }) {
  const className = "h-5 w-5";
  switch (type) {
    case "new_message":
      return <MessageSquare className={className} aria-hidden="true" />;
    case "listing_approved":
      return <Tag className={className} aria-hidden="true" />;
    case "listing_rejected":
      return <AlertTriangle className={className} aria-hidden="true" />;
    case "support_reply":
      return <LifeBuoy className={className} aria-hidden="true" />;
    case "report_update":
      return <ShieldAlert className={className} aria-hidden="true" />;
    default:
      return <Bell className={className} aria-hidden="true" />;
  }
}

export function NotificationList({ initialNotifications }: NotificationListProps) {
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  const { markOne, markAll, error, errorAction, isMarkAllDisabled, isMarkOneDisabled } =
    useNotificationReadState(
      notifications,
      setNotifications
    );

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2">
        <div className="text-sm text-muted dark:text-neutral-300">
          {unreadCount > 0 ? (
            <span>
              You have <span className="font-semibold text-foreground">{unreadCount}</span> unread{" "}
              {unreadCount === 1 ? "notification" : "notifications"}
            </span>
          ) : (
            <span>All caught up! No unread notifications.</span>
          )}
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={() => void markAll()}
            disabled={isMarkAllDisabled}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-background disabled:opacity-60"
          >
            <CheckCheck className="h-3.5 w-3.5 text-action-700 dark:text-action-300" aria-hidden="true" />
            <span>Mark all read</span>
          </button>
        )}
      </div>

      {error ? <NotificationErrorNotice message={error} action={errorAction} /> : null}

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card p-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface text-muted dark:text-neutral-300">
            <Bell className="h-6 w-6" aria-hidden="true" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-foreground">No notifications yet</h3>
          <p className="mt-1 text-sm text-muted dark:text-neutral-300">
            When you receive inquiries, messages, or moderation updates, they will appear here.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
          {notifications.map((n) => {
            const isUnread = !n.read_at;
            const targetLink = resolveNotificationLink(n.link);

            return (
              <li
                key={n.id}
                className={`flex items-start gap-4 p-4 transition-colors sm:p-5 ${
                  isUnread ? "bg-action-50/60 dark:bg-action-900/20" : ""
                }`}
              >
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-action-50 text-action-700 dark:bg-action-900/40 dark:text-action-300">
                  <NotificationIcon type={n.type} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h4
                      className={`text-sm text-foreground ${isUnread ? "font-semibold" : "font-medium"}`}
                    >
                      {n.title}
                    </h4>
                    <span className="shrink-0 text-xs text-muted dark:text-neutral-300">
                      {formatNotificationDateTime(n.created_at)}
                    </span>
                  </div>

                  <p className="mt-1 text-sm leading-relaxed text-muted dark:text-neutral-300">{n.body}</p>

                  <div className="mt-2 flex flex-wrap items-center gap-x-4">
                    {targetLink && (
                      <Link
                        href={targetLink}
                        onClick={() => {
                          void markOne(n.id);
                        }}
                        className="inline-flex min-h-[44px] items-center gap-1 text-sm font-semibold text-brand-link hover:underline"
                      >
                        <span>View Details</span>
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </Link>
                    )}

                    {isUnread && (
                      <button
                        type="button"
                        onClick={() => void markOne(n.id)}
                        disabled={isMarkOneDisabled(n.id)}
                        className="inline-flex min-h-[44px] items-center gap-1 text-sm text-muted hover:text-foreground disabled:opacity-60 dark:text-neutral-300"
                      >
                        <Check className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Mark read</span>
                      </button>
                    )}
                  </div>
                </div>

                {isUnread && (
                  <span
                    className="mt-2 h-2 w-2 shrink-0 rounded-full bg-action-600"
                    role="img"
                    aria-label="Unread"
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
