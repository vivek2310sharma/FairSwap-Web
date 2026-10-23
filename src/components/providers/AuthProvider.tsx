"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { navigateAfterSessionChange } from "@/lib/navigation/session-change";
import { createClient } from "@/lib/supabase/client";

interface AuthState {
  user: User | null;
  isLoading: boolean;
  unreadMessagesCount: number | null;
  unreadNotificationsCount: number | null;
  refreshUnreadCounts: () => Promise<void>;
  signOut: () => Promise<void>;
}
const AuthContext = createContext<AuthState | undefined>(undefined);
const validCount = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= 0;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [supabase] = useState(createClient);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [counts, setCounts] = useState<{ messages: number | null; notifications: number | null }>({ messages: null, notifications: null });
  const [invalidating, setInvalidating] = useState(false);
  const identity = useRef<string | null>(null);
  const generation = useRef(0);
  const active = useRef(false);
  const pending = useRef<Promise<void> | null>(null);
  const refreshQueued = useRef(false);
  const rpcUnavailable = useRef(false);
  const pathname = usePathname();
  const previousPathname = useRef(pathname);
  const authRevision = useRef(0);
  const navigating = useRef(false);
  const discardPrivatePage = useCallback(() => {
    if (navigating.current) return;
    navigating.current = true;
    setInvalidating(true);
    navigateAfterSessionChange();
  }, []);

  const refreshUnreadCounts = useCallback(async () => {
    const userId = identity.current;
    if (!active.current || !userId) return;
    if (pending.current) { refreshQueued.current = true; return pending.current; }
    const version = generation.current;
    const request = (async () => {
      do {
        refreshQueued.current = false;
        let messages: number | null = null;
        let notifications: number | null = null;
        try {
          if (!rpcUnavailable.current) {
            const { data, error } = await supabase.rpc("get_unread_counts");
            const raw = Array.isArray(data) ? data[0] : data;
            if (!error && raw && validCount(raw.unread_messages) && validCount(raw.unread_notifications)) {
              messages = raw.unread_messages;
              notifications = raw.unread_notifications;
            } else if (error?.code === "PGRST202" || error?.code === "42883") {
              rpcUnavailable.current = true;
            } else {
              throw new Error("Unread counts unavailable");
            }
          }
          if (!active.current || generation.current !== version || identity.current !== userId) return;
          if (rpcUnavailable.current) {
            // Exact owner-scoped notification count. Chat badges are omitted without
            // the aggregate RPC rather than downloading private message history or
            // issuing a request per conversation. RLS remains authoritative.
            const { count, error } = await supabase.from("notifications")
              .select("id", { count: "exact", head: true }).eq("user_id", userId).is("read_at", null);
            if (!error && validCount(count)) notifications = count;
          }
        } catch {
          // Network/auth errors fail closed; never retain a stale private count.
        }
        if (active.current && generation.current === version && identity.current === userId) {
          setCounts({ messages, notifications });
        }
      } while (refreshQueued.current && active.current && generation.current === version);
    })();
    pending.current = request;
    try { await request; } finally { if (pending.current === request) pending.current = null; }
  }, [supabase]);

  const applyUser = useCallback((next: User | null) => {
    if (!active.current) return;
    const previousId = identity.current;
    const nextId = next?.id ?? null;
    const privateSessionChanged = previousId !== null && previousId !== nextId;
    if (identity.current !== (next?.id ?? null)) {
      generation.current++;
      pending.current = null;
      identity.current = next?.id ?? null;
      setCounts({ messages: null, notifications: null });
    }
    if (privateSessionChanged) {
      // Hide all old server-rendered children before leaving this document.
      active.current = false;
      setUser(null);
      discardPrivatePage();
      return;
    }
    setUser(next);
    setIsLoading(false);
  }, [discardPrivatePage]);

  useEffect(() => {
    active.current = true;
    // Keep the callback synchronous: Supabase invokes it while holding its auth lock.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      authRevision.current++;
      applyUser(session?.user ?? null);
    });
    return () => {
      active.current = false;
      // This ref is a request generation counter, not a DOM ref.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      generation.current++;
      pending.current = null;
      subscription.unsubscribe();
    };
  }, [supabase, applyUser]);

  useEffect(() => {
    const previous = previousPathname.current;
    previousPathname.current = pathname;
    if (previous !== "/auth/sign-in" || pathname === previous) return;

    // Server Action redirects update cookies without emitting a browser auth event.
    // Read the SSR cookie storage once for either password or email OTP login.
    // This is presentation state only; server authorization remains authoritative.
    const revision = authRevision.current;
    let cancelled = false;
    void supabase.auth.getSession().then(({ data, error }) => {
      if (!cancelled && active.current && authRevision.current === revision && !error) {
        applyUser(data.session?.user ?? null);
      }
    }).catch(() => { /* Keep unknown session state on a failed read; never poll. */ });
    return () => { cancelled = true; };
  }, [pathname, supabase, applyUser]);

  const userId = user?.id;
  useEffect(() => {
    void refreshUnreadCounts();
  }, [userId, pathname, refreshUnreadCounts]);

  useEffect(() => {
    if (!userId) return;
    // INSERT/UPDATE only: Realtime DELETE events cannot enforce row SELECT RLS.
    const channel = supabase.channel(`unread-notifications:${userId}`);
    for (const table of ["notifications", "unread_count_signals"]) {
      for (const event of ["INSERT", "UPDATE"] as const) {
        channel.on("postgres_changes", { event, schema: "public", table,
          filter: `user_id=eq.${userId}` }, () => { void refreshUnreadCounts(); });
      }
    }
    channel.subscribe((status) => {
      // Close the initial snapshot/subscription gap and recover missed events.
      if (status === "SUBSCRIBED") void refreshUnreadCounts();
    });
    return () => { void supabase.removeChannel(channel); };
  }, [supabase, userId, refreshUnreadCounts]);

  const signOut = useCallback(async () => {
    authRevision.current++;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    generation.current++;
    identity.current = null;
    pending.current = null;
    setUser(null);
    setCounts({ messages: null, notifications: null });
    discardPrivatePage();
  }, [supabase, discardPrivatePage]);

  if (invalidating) return <p role="status" className="p-4">Updating session…</p>;

  return <AuthContext.Provider value={{ user, isLoading, unreadMessagesCount: counts.messages,
    unreadNotificationsCount: counts.notifications, refreshUnreadCounts, signOut }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
