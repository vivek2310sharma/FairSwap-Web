"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  unreadMessagesCount: number;
  unreadNotificationsCount: number;
  refreshUnreadCounts: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

  const supabase = createClient();
  const pathname = usePathname();

  const fetchUnreadCounts = useCallback(
    async (userId: string) => {
      try {
        // Attempt primary contract RPC: get_unread_counts
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: rpcData, error: rpcError } = await (supabase.rpc as any)(
          "get_unread_counts"
        );

        if (!rpcError && rpcData) {
          const raw = rpcData as Record<string, unknown>;
          const messages =
            typeof raw.unread_messages === "number"
              ? raw.unread_messages
              : typeof raw.messages === "number"
              ? raw.messages
              : 0;
          const notifications =
            typeof raw.unread_notifications === "number"
              ? raw.unread_notifications
              : typeof raw.notifications === "number"
              ? raw.notifications
              : 0;
          setUnreadMessagesCount(messages);
          setUnreadNotificationsCount(notifications);
          return;
        }

        // Safe degradation fallback if RPC is not deployed
        // 1. Unread notifications count
        const { count: notifCount, error: notifError } = await supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .is("read_at", null);

        if (!notifError && typeof notifCount === "number") {
          setUnreadNotificationsCount(notifCount);
        } else {
          setUnreadNotificationsCount(0);
        }

        // 2. Unread messages count (fallback query over conversations & read states)
        const { data: convs, error: convError } = await supabase
          .from("conversations")
          .select("id")
          .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`);

        if (!convError && convs && convs.length > 0) {
          const convIds = convs.map((c) => c.id);
          const { data: readStates } = await supabase
            .from("conversation_read_states")
            .select("conversation_id, last_read_at")
            .eq("user_id", userId)
            .in("conversation_id", convIds);

          const readStateMap = new Map(
            (readStates || []).map((rs) => [
              rs.conversation_id,
              rs.last_read_at,
            ])
          );

          let unreadConvCount = 0;
          for (const convId of convIds) {
            const lastReadAt = readStateMap.get(convId);
            let q = supabase
              .from("messages")
              .select("id", { count: "exact", head: true })
              .eq("conversation_id", convId)
              .neq("sender_id", userId);

            if (lastReadAt) {
              q = q.gt("created_at", lastReadAt);
            }

            const { count: msgCount } = await q;
            if (msgCount && msgCount > 0) {
              unreadConvCount++;
            }
          }
          setUnreadMessagesCount(unreadConvCount);
        } else {
          setUnreadMessagesCount(0);
        }
      } catch {
        // Degrade safely on any unexpected error without breaking UI
        setUnreadMessagesCount(0);
        setUnreadNotificationsCount(0);
      }
    },
    [supabase]
  );

  const refreshUnreadCounts = useCallback(async () => {
    if (user) {
      await fetchUnreadCounts(user.id);
    }
  }, [user, fetchUnreadCounts]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setUnreadMessagesCount(0);
    setUnreadNotificationsCount(0);
  }, [supabase]);

  useEffect(() => {
    let mounted = true;

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) return;
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        setIsLoading(false);

        if (currentUser) {
          fetchUnreadCounts(currentUser.id);
        } else {
          setUnreadMessagesCount(0);
          setUnreadNotificationsCount(0);
        }
      }
    );

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [supabase, fetchUnreadCounts]);

  useEffect(() => {
    let mounted = true;

    if (user) {
      Promise.resolve().then(() => {
        if (mounted) {
          fetchUnreadCounts(user.id);
        }
      });
    }

    return () => {
      mounted = false;
    };
  }, [pathname, user, fetchUnreadCounts]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        unreadMessagesCount,
        unreadNotificationsCount,
        refreshUnreadCounts,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
