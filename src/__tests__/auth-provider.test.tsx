import { render, screen, waitFor, act, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuthProvider, useAuth } from "@/components/providers/AuthProvider";

const mockOnAuthStateChange = vi.fn();
const mockRpc = vi.fn();
const mockSignOut = vi.fn();
const mockFrom = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      onAuthStateChange: mockOnAuthStateChange,
      signOut: mockSignOut,
    },
    rpc: mockRpc,
    from: mockFrom,
  }),
}));

function TestConsumer() {
  const {
    user,
    isLoading,
    unreadMessagesCount,
    unreadNotificationsCount,
    signOut,
  } = useAuth();

  return (
    <div>
      <div data-testid="loading">{isLoading ? "loading" : "ready"}</div>
      <div data-testid="user">{user ? user.id : "signed-out"}</div>
      <div data-testid="unread-messages">{unreadMessagesCount}</div>
      <div data-testid="unread-notifications">{unreadNotificationsCount}</div>
      <button onClick={() => signOut()}>Sign Out</button>
    </div>
  );
}

describe("AuthProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOnAuthStateChange.mockReturnValue({
      data: {
        subscription: {
          unsubscribe: vi.fn(),
        },
      },
    });
  });

  it("throws an error when useAuth is used outside AuthProvider", () => {
    // Prevent React noise in console
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<TestConsumer />)).toThrow(
      "useAuth must be used within an AuthProvider"
    );
    consoleError.mockRestore();
  });

  it("initializes in signed-out state when no session exists", async () => {
    mockOnAuthStateChange.mockImplementation((callback) => {
      callback("INITIAL_SESSION", null);
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    expect(screen.getByTestId("loading")).toHaveTextContent("ready");
    expect(screen.getByTestId("user")).toHaveTextContent("signed-out");
    expect(screen.getByTestId("unread-messages")).toHaveTextContent("0");
    expect(screen.getByTestId("unread-notifications")).toHaveTextContent("0");
  });

  it("fetches unread counts via primary RPC when user is signed in", async () => {
    const fakeUser = { id: "user-123", email: "test@fairswap.in" };

    mockRpc.mockResolvedValue({
      data: { unread_messages: 3, unread_notifications: 5 },
      error: null,
    });

    mockOnAuthStateChange.mockImplementation((callback) => {
      callback("SIGNED_IN", { user: fakeUser });
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("user")).toHaveTextContent("user-123");
      expect(screen.getByTestId("unread-messages")).toHaveTextContent("3");
      expect(screen.getByTestId("unread-notifications")).toHaveTextContent("5");
    });

    expect(mockRpc).toHaveBeenCalledWith("get_unread_counts");
  });

  it("degrades safely to fallback queries when get_unread_counts RPC returns error", async () => {
    const fakeUser = { id: "user-456", email: "test2@fairswap.in" };

    // RPC fails (not deployed)
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: "function public.get_unread_counts() does not exist", code: "PGRST202" },
    });

    // Notifications fallback query mock
    const notifSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        is: vi.fn().mockResolvedValue({ count: 2, error: null }),
      }),
    });

    // Conversations fallback query mock
    const convsOr = vi.fn().mockResolvedValue({ data: [], error: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === "notifications") {
        return { select: notifSelect };
      }
      if (table === "conversations") {
        return {
          select: vi.fn().mockReturnValue({ or: convsOr }),
        };
      }
      return { select: vi.fn().mockResolvedValue({ data: [], error: null }) };
    });

    mockOnAuthStateChange.mockImplementation((callback) => {
      callback("SIGNED_IN", { user: fakeUser });
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("user")).toHaveTextContent("user-456");
      expect(screen.getByTestId("unread-notifications")).toHaveTextContent("2");
      expect(screen.getByTestId("unread-messages")).toHaveTextContent("0");
    });
  });

  it("clears user and unread counts upon signOut", async () => {
    const fakeUser = { id: "user-789" };
    mockSignOut.mockResolvedValue({});

    mockRpc.mockResolvedValue({
      data: { unread_messages: 1, unread_notifications: 1 },
      error: null,
    });

    let currentCallback: ((event: string, session: unknown) => void) | null = null;
    mockOnAuthStateChange.mockImplementation((callback) => {
      currentCallback = callback;
      callback("SIGNED_IN", { user: fakeUser });
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("user")).toHaveTextContent("user-789");
    });

    // When signing out, change what the mock callback will pass on subsequent calls if any
    mockOnAuthStateChange.mockImplementation((callback) => {
      callback("SIGNED_OUT", null);
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    const signOutBtn = screen.getByRole("button", { name: "Sign Out" });
    await act(async () => {
      fireEvent.click(signOutBtn);
      if (currentCallback) {
        currentCallback("SIGNED_OUT", null);
      }
    });

    await waitFor(() => {
      expect(screen.getByTestId("user")).toHaveTextContent("signed-out");
      expect(screen.getByTestId("unread-messages")).toHaveTextContent("0");
      expect(screen.getByTestId("unread-notifications")).toHaveTextContent("0");
    });
  });
});
