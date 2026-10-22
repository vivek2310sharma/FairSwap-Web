"use client";

import { useCallback, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { Notification } from "@/types/communication";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/app/account/notifications/actions";
import { sanitizeRedirectPath } from "@/lib/security/redirect";

export const NOTIFICATION_UPDATE_ERROR =
  "We could not update your notifications. Please try again.";

type ActionResult =
  | {
      success?: boolean;
      error?: string;
      requiresPolicyReview?: boolean;
      redirectTo?: string;
    }
  | null
  | undefined;

export interface NotificationErrorAction {
  href: string;
  label: string;
}

/**
 * The server guard can answer with a redirect (policy re-acceptance or sign-in). Only those two
 * in-app destinations are honoured, and only after the shared redirect sanitiser accepts them.
 */
function resolveErrorAction(result: ActionResult): NotificationErrorAction | null {
  const target = result?.redirectTo;
  if (!target) return null;

  const safe = sanitizeRedirectPath(target, "");
  if (!safe) return null;

  const path = safe.split(/[?#]/)[0];
  if (path === "/account/policy-review") return { href: safe, label: "Review policies" };
  if (path === "/auth/sign-in") return { href: safe, label: "Sign in" };
  return null;
}

/**
 * Optimistic "mark as read" for notification lists.
 *
 * Mutations never overlap: while any single mark-read is in flight, mark-all is blocked, and while
 * mark-all is in flight every single mark-read is blocked. Without that, a failing single request
 * could roll a notification back to "unread" after a successful mark-all had already read it.
 * The UI mirrors this with `isBusy` / `isMarkAllDisabled`, so no control looks clickable and does
 * nothing.
 *
 * The UI updates immediately; if the server action reports anything other than `success: true`
 * (an RPC error, a policy redirect, or a thrown network error) the change is rolled back and an
 * error is exposed. Rollback only reverts the exact timestamp this call wrote, so a Realtime insert
 * or a later successful update is never overwritten. Repeated clicks while a request is in flight
 * are ignored. Raw server messages are never surfaced.
 */
export function useNotificationReadState(
  notifications: Notification[],
  setNotifications: Dispatch<SetStateAction<Notification[]>>
) {
  const pendingOne = useRef(new Set<string>());
  const pendingAll = useRef(false);
  const [pendingIds, setPendingIds] = useState<ReadonlySet<string>>(new Set());
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorAction, setErrorAction] = useState<NotificationErrorAction | null>(null);

  const fail = useCallback((result: ActionResult) => {
    const action = resolveErrorAction(result);
    setErrorAction(action);
    // A redirect means the server guard produced the message itself (policy review / sign-in).
    setError(action && result?.error ? result.error : NOTIFICATION_UPDATE_ERROR);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
    setErrorAction(null);
  }, []);

  const markOne = useCallback(
    async (id: string) => {
      const target = notifications.find((n) => n.id === id);
      if (!target || target.read_at) return;
      if (pendingAll.current || pendingOne.current.has(id)) return;

      pendingOne.current.add(id);
      setPendingIds(new Set(pendingOne.current));
      clearError();

      const stamp = new Date().toISOString();
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: stamp } : n)));

      let result: ActionResult;
      try {
        result = (await markNotificationReadAction(id)) as ActionResult;
      } catch {
        result = null;
      }

      if (result?.success !== true) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id && n.read_at === stamp ? { ...n, read_at: null } : n))
        );
        fail(result);
      }

      pendingOne.current.delete(id);
      setPendingIds(new Set(pendingOne.current));
    },
    [notifications, setNotifications, fail, clearError]
  );

  const markAll = useCallback(async () => {
    // Never start while a single mark-read is still in flight (see the hook comment).
    if (pendingAll.current || pendingOne.current.size > 0) return;
    const unreadIds = new Set(notifications.filter((n) => !n.read_at).map((n) => n.id));
    if (unreadIds.size === 0) return;

    pendingAll.current = true;
    setIsMarkingAll(true);
    clearError();

    const stamp = new Date().toISOString();
    setNotifications((prev) =>
      prev.map((n) => (unreadIds.has(n.id) && !n.read_at ? { ...n, read_at: stamp } : n))
    );

    let result: ActionResult;
    try {
      result = (await markAllNotificationsReadAction()) as ActionResult;
    } catch {
      result = null;
    }

    if (result?.success !== true) {
      setNotifications((prev) =>
        prev.map((n) => (unreadIds.has(n.id) && n.read_at === stamp ? { ...n, read_at: null } : n))
      );
      fail(result);
    }

    pendingAll.current = false;
    setIsMarkingAll(false);
  }, [notifications, setNotifications, fail, clearError]);

  return {
    markOne,
    markAll,
    error,
    errorAction,
    dismissError: clearError,
    isPending: (id: string) => pendingIds.has(id),
    isMarkingAll,
    /** True while any mutation is in flight. */
    isBusy: isMarkingAll || pendingIds.size > 0,
    /** Disable "Mark all read" while it, or any single mark-read, is running. */
    isMarkAllDisabled: isMarkingAll || pendingIds.size > 0,
    /** Disable a single "Mark read" while that item, or a mark-all, is running. */
    isMarkOneDisabled: (id: string) => isMarkingAll || pendingIds.has(id),
  };
}
