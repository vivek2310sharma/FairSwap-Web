"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

interface AuthState {
  user: User | null;
  isLoading: boolean;
  unreadMessagesCount: number;
  unreadNotificationsCount: number;
  refreshUnreadCounts: () => Promise<void>;
  signOut: () => Promise<void>;
}
const AuthContext = createContext<AuthState | undefined>(undefined);
const validCount = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= 0;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [supabase] = useState(createClient);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [counts, setCounts] = useState({ messages: 0, notifications: 0 });
  const identity = useRef<string | null>(null);
  const generation = useRef(0);
  const active = useRef(false);
  const pending = useRef<Promise<void> | null>(null);
  const refreshQueued = useRef(false);
  const rpcUnavailable = useRef(false);
  const pathname = usePathname();
  const navigating = useRef(false);
  const discardPrivatePage = useCallback(() => {
    if (navigating.current) return;
    navigating.current = true;
    // A document navigation intentionally discards cached private RSC/page state.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/");
  }, []);

  const refreshUnreadCounts = useCallback(async () => {
    const userId = identity.current;
    if (!active.current || !userId) return;
    if (pending.current) { refreshQueued.current = true; return pending.current; }
    const version = generation.current;
    const request = (async () => {
      do {
        refreshQueued.current = false;
        let messages = 0;
        let notifications = 0;
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

  useEffect(() => {
    active.current = true;
    // Keep the callback synchronous: Supabase invokes it while holding its auth lock.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active.current) return;
      const next = session?.user ?? null;
      const signedOut = _event === "SIGNED_OUT" && identity.current !== null;
      if (identity.current !== (next?.id ?? null)) {
        generation.current++;
        pending.current = null;
        identity.current = next?.id ?? null;
        setCounts({ messages: 0, notifications: 0 });
      }
      setUser(next);
      setIsLoading(false);
      if (signedOut) discardPrivatePage();
    });
    return () => {
      active.current = false;
      // This ref is a request generation counter, not a DOM ref.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      generation.current++;
      pending.current = null;
      subscription.unsubscribe();
    };
  }, [supabase, discardPrivatePage]);

  const userId = user?.id;
  useEffect(() => {
    void refreshUnreadCounts();
  }, [userId, pathname, refreshUnreadCounts]);

  useEffect(() => {
    if (!userId) return;
    // One subscription for notification changes, including reads in other tabs.
    const channel = supabase.channel(`unread-notifications:${userId}`).on("postgres_changes", {
      event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}`,
    }, () => { void refreshUnreadCounts(); }).on("postgres_changes", {
      event: "*", schema: "public", table: "conversation_read_states", filter: `user_id=eq.${userId}`,
    }, () => { void refreshUnreadCounts(); }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [supabase, userId, refreshUnreadCounts]);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    generation.current++;
    identity.current = null;
    pending.current = null;
    setUser(null);
    setCounts({ messages: 0, notifications: 0 });
    discardPrivatePage();
  }, [supabase, discardPrivatePage]);

  return <AuthContext.Provider value={{ user, isLoading, unreadMessagesCount: counts.messages,
    unreadNotificationsCount: counts.notifications, refreshUnreadCounts, signOut }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
