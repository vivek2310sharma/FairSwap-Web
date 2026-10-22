"use client";

import { useCallback, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { Notification } from "@/types/communication";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/app/account/notifications/actions";

export const NOTIFICATION_UPDATE_ERROR =
  "We could not update your notifications. Please try again.";

type ActionResult = { success?: boolean } | null | undefined;

/**
 * Optimistic "mark as read" for notification lists.
 *
 * The UI updates immediately; if the server action reports anything other than `success: true`
 * (an RPC error, a policy redirect, or a thrown network error) the change is rolled back and a
 * generic error is exposed. Rollback only reverts the exact timestamp this call wrote, so a
 * Realtime insert or a later successful update is never overwritten. Repeated clicks while a
 * request is in flight are ignored. Raw server messages are never surfaced.
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

  const markOne = useCallback(
    async (id: string) => {
      const target = notifications.find((n) => n.id === id);
      if (!target || target.read_at) return;
      if (pendingAll.current || pendingOne.current.has(id)) return;

      pendingOne.current.add(id);
      setPendingIds(new Set(pendingOne.current));
      setError(null);

      const stamp = new Date().toISOString();
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: stamp } : n)));

      let ok = false;
      try {
        const result = (await markNotificationReadAction(id)) as ActionResult;
        ok = result?.success === true;
      } catch {
        ok = false;
      }

      if (!ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id && n.read_at === stamp ? { ...n, read_at: null } : n))
        );
        setError(NOTIFICATION_UPDATE_ERROR);
      }

      pendingOne.current.delete(id);
      setPendingIds(new Set(pendingOne.current));
    },
    [notifications, setNotifications]
  );

  const markAll = useCallback(async () => {
    if (pendingAll.current) return;
    const unreadIds = new Set(notifications.filter((n) => !n.read_at).map((n) => n.id));
    if (unreadIds.size === 0) return;

    pendingAll.current = true;
    setIsMarkingAll(true);
    setError(null);

    const stamp = new Date().toISOString();
    setNotifications((prev) =>
      prev.map((n) => (unreadIds.has(n.id) && !n.read_at ? { ...n, read_at: stamp } : n))
    );

    let ok = false;
    try {
      const result = (await markAllNotificationsReadAction()) as ActionResult;
      ok = result?.success === true;
    } catch {
      ok = false;
    }

    if (!ok) {
      setNotifications((prev) =>
        prev.map((n) => (unreadIds.has(n.id) && n.read_at === stamp ? { ...n, read_at: null } : n))
      );
      setError(NOTIFICATION_UPDATE_ERROR);
    }

    pendingAll.current = false;
    setIsMarkingAll(false);
  }, [notifications, setNotifications]);

  return {
    markOne,
    markAll,
    error,
    dismissError: () => setError(null),
    isPending: (id: string) => pendingIds.has(id),
    isMarkingAll,
  };
}
