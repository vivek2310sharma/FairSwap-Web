import { act, render, screen, waitFor, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "@/components/providers/AuthProvider";
import { Header } from "@/components/header";
import { MobileBottomNav } from "@/components/navigation/MobileBottomNav";

const mock = vi.hoisted(() => ({
  subscribe: vi.fn(), navigate: vi.fn(), events: [] as { config: Record<string, string>; callback: (payload?: unknown) => void }[],
  listener: null as null | ((event: string, session: unknown) => void),
  rpc: vi.fn(), from: vi.fn(), signOut: vi.fn(), getSession: vi.fn(), unsubscribe: vi.fn(),
  channel: vi.fn(), removeChannel: vi.fn(), pathname: "/search",
}));
vi.mock("@/lib/navigation/session-change", () => ({ navigateAfterSessionChange: mock.navigate }));
vi.mock("next/navigation", () => ({ usePathname: () => mock.pathname }));
vi.mock("next/image", () => ({ default: () => null }));
vi.mock("@/components/communication/NotificationBell", () => ({ NotificationBell: () => null }));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({
  rpc: mock.rpc, from: mock.from, channel: mock.channel, removeChannel: mock.removeChannel,
  auth: { signOut: mock.signOut, getSession: mock.getSession, onAuthStateChange: (listener: typeof mock.listener) => {
    mock.listener = listener;
    return { data: { subscription: { unsubscribe: mock.unsubscribe } } };
  } },
}) }));
function Consumer() {
  const auth = useAuth();
  return <><p>{auth.isLoading ? "loading" : auth.user?.id ?? "guest"}</p>
    <p data-testid="counts">{auth.unreadMessagesCount ?? "?"}/{auth.unreadNotificationsCount ?? "?"}</p>
    <button onClick={() => void auth.refreshUnreadCounts()}>refresh</button>
    <button onClick={() => void auth.signOut().catch(() => {})}>logout</button></>;
}
const emit = (id: string | null) => act(() => { mock.listener?.(id ? "SIGNED_IN" : "SIGNED_OUT", id ? { user: { id } } : null); });
const mount = () => render(<AuthProvider><Consumer /></AuthProvider>);
beforeEach(() => {
  vi.clearAllMocks();
  mock.pathname = "/search";
  mock.events = [];
  mock.rpc.mockResolvedValue({ data: { unread_messages: 3, unread_notifications: 25 }, error: null });
  mock.signOut.mockResolvedValue({ error: null });
  mock.getSession.mockResolvedValue({ data: { session: null }, error: null });
  const channel = { on: vi.fn().mockImplementation((_kind, config, callback) => { mock.events.push({ config, callback }); return channel; }), subscribe: mock.subscribe.mockReturnThis() };
  mock.channel.mockReturnValue(channel);
});

describe("server sign-in navigation", () => {
  it("updates desktop and mobile after the shared password/OTP server redirect without a browser auth event", async () => {
    mock.pathname = "/auth/sign-in";
    const view = render(<AuthProvider><Header /><MobileBottomNav /></AuthProvider>);
    emit(null);
    expect(screen.getByRole("link", { name: "Sign In" })).toBeInTheDocument();
    expect(mock.getSession).not.toHaveBeenCalled();
    mock.getSession.mockResolvedValue({ data: { session: { user: { id: "alice" } } }, error: null });
    mock.pathname = "/account";
    view.rerender(<AuthProvider><Header /><MobileBottomNav /></AuthProvider>);
    await waitFor(() => expect(screen.getAllByRole("link", { name: "Account" })).toHaveLength(2));
    expect(screen.queryByRole("link", { name: "Sign In" })).not.toBeInTheDocument();
    expect(mock.getSession).toHaveBeenCalledOnce();
    expect(mock.navigate).not.toHaveBeenCalled();
    mock.pathname = "/search";
    view.rerender(<AuthProvider><Header /><MobileBottomNav /></AuthProvider>);
    expect(mock.getSession).toHaveBeenCalledOnce();
  });

  it("ignores a cookie read overtaken by a cross-tab sign-out", async () => {
    let resolve!: (value: unknown) => void;
    mock.getSession.mockImplementationOnce(() => new Promise(r => { resolve = r; }));
    mock.pathname = "/auth/sign-in";
    const view = mount();
    emit(null);
    mock.pathname = "/account";
    view.rerender(<AuthProvider><Consumer /></AuthProvider>);
    emit(null);
    await act(async () => { resolve({ data: { session: { user: { id: "alice" } } }, error: null }); });
    expect(screen.getByText("guest")).toBeInTheDocument();
    expect(mock.rpc).not.toHaveBeenCalled();
  });

  it("contains failed cookie reads without publishing an identity", async () => {
    mock.getSession.mockRejectedValueOnce(new Error("offline"));
    mock.pathname = "/auth/sign-in";
    const view = mount();
    emit(null);
    mock.pathname = "/account";
    await act(async () => { view.rerender(<AuthProvider><Consumer /></AuthProvider>); });
    expect(screen.getByText("guest")).toBeInTheDocument();
    expect(mock.rpc).not.toHaveBeenCalled();
  });

  it("disables the styled desktop sign-out button while pending and allows retry on failure", async () => {
    let resolve!: (value: unknown) => void;
    mock.signOut.mockImplementationOnce(() => new Promise(r => { resolve = r; }));
    render(<AuthProvider><Header /></AuthProvider>);
    emit("alice");
    const button = screen.getByRole("button", { name: "Sign Out" });
    expect(button).toHaveClass("border", "bg-surface", "disabled:opacity-50");
    expect(button.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    fireEvent.click(button);
    expect(screen.getByRole("button", { name: "Signing out…" })).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    fireEvent.click(button);
    expect(mock.signOut).toHaveBeenCalledOnce();
    await act(async () => { resolve({ error: new Error("offline") }); });
    expect(screen.getByRole("button", { name: "Sign Out" })).toBeEnabled();
    expect(screen.getByRole("alert")).toHaveTextContent("Sign out failed");
    expect(mock.navigate).not.toHaveBeenCalled();
  });
});
describe("HDR-03 auth lifecycle", () => {
  it("hydrates without private guest reads and unsubscribes", async () => {
    const view = mount();
    expect(screen.getByText("loading")).toBeInTheDocument();
    emit(null);
    expect(screen.getByText("guest")).toBeInTheDocument();
    expect(mock.rpc).not.toHaveBeenCalled();
    expect(mock.from).not.toHaveBeenCalled();
    view.unmount();
    expect(mock.unsubscribe).toHaveBeenCalledOnce();
  });
  it("fetches once outside the auth callback and ignores repeated token events", async () => {
    mount();
    act(() => {
      mock.listener?.("SIGNED_IN", { user: { id: "alice" } });
      expect(mock.rpc).not.toHaveBeenCalled();
    });
    await waitFor(() => expect(screen.getByTestId("counts")).toHaveTextContent("3/25"));
    emit("alice");
    expect(mock.rpc).toHaveBeenCalledOnce();
  });
  it("ignores a late response after sign-out", async () => {
    let resolve!: (value: unknown) => void;
    mock.rpc.mockImplementation(() => new Promise(r => { resolve = r; }));
    mount(); emit("alice");
    emit(null);
    await act(async () => { resolve({ data: { unread_messages: 99, unread_notifications: 99 }, error: null }); });
    expect(screen.queryByTestId("counts")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Updating session");
    expect(mock.navigate).toHaveBeenCalledOnce();
    expect(mock.removeChannel).toHaveBeenCalledOnce();
  });
  it("discards old private children and fully navigates on direct A to B switch", async () => {
    let resolve!: (value: unknown) => void;
    mock.rpc.mockImplementationOnce(() => new Promise(r => { resolve = r; }));
    render(<AuthProvider><p>A private server payload</p><Consumer /></AuthProvider>);
    emit("alice");
    expect(mock.navigate).not.toHaveBeenCalled();
    emit("bob");
    expect(screen.queryByText("A private server payload")).not.toBeInTheDocument();
    expect(screen.queryByTestId("counts")).not.toBeInTheDocument();
    expect(mock.navigate).toHaveBeenCalledOnce();
    await act(async () => { resolve({ data: { unread_messages: 99, unread_notifications: 99 }, error: null }); });
    expect(screen.queryByText("99/99")).not.toBeInTheDocument();
    expect(mock.rpc).toHaveBeenCalledOnce();
  });
  it("uses an owner-scoped count only for missing RPC and remembers its absence", async () => {
    mock.rpc.mockResolvedValue({ error: { code: "PGRST202" } });
    const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), is: vi.fn().mockResolvedValue({ count: 42, error: null }) };
    mock.from.mockReturnValue(query);
    mount(); emit("alice");
    await waitFor(() => expect(screen.getByTestId("counts")).toHaveTextContent("?/42"));
    expect(mock.from).toHaveBeenCalledWith("notifications");
    expect(query.eq).toHaveBeenCalledWith("user_id", "alice");
    fireEvent.click(screen.getByText("refresh"));
    await waitFor(() => expect(mock.from).toHaveBeenCalledTimes(2));
    expect(mock.rpc).toHaveBeenCalledOnce();
  });
  it.each([
    { error: { code: "42501" } },
    { data: { unread_messages: -1, unread_notifications: 4 } },
    { data: { unread_messages: Infinity, unread_notifications: 4 } },
  ])("fails closed without fallback on invalid or unauthorized RPC results: %j", async result => {
    mock.rpc.mockResolvedValue(result);
    mount(); emit("alice");
    await waitFor(() => expect(mock.rpc).toHaveBeenCalledOnce());
    expect(screen.getByTestId("counts")).toHaveTextContent("?/?");
    expect(mock.from).not.toHaveBeenCalled();
  });
  it("handles network rejection without an unhandled promise", async () => {
    mock.rpc.mockRejectedValue(new Error("offline"));
    mount(); emit("alice");
    await waitFor(() => expect(mock.rpc).toHaveBeenCalledOnce());
    expect(screen.getByTestId("counts")).toHaveTextContent("?/?");
  });
  it("clears identity and counts on confirmed sign-out", async () => {
    mount(); emit("alice");
    await waitFor(() => expect(screen.getByTestId("counts")).toHaveTextContent("3/25"));
    fireEvent.click(screen.getByText("logout"));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Updating session"));
    expect(mock.navigate).toHaveBeenCalledOnce();
    expect(screen.queryByTestId("counts")).not.toBeInTheDocument();
  });
  it("fails closed when the fallback count request fails", async () => {
    mock.rpc.mockResolvedValue({ error: { code: "42883" } });
    const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), is: vi.fn().mockRejectedValue(new Error("offline")) };
    mock.from.mockReturnValue(query);
    mount(); emit("alice");
    await waitFor(() => expect(query.is).toHaveBeenCalledOnce());
    expect(screen.getByTestId("counts")).toHaveTextContent("?/?");
  });
  it("coalesces overlapping refreshes and runs one trailing refresh for mutations", async () => {
    let resolve!: (value: unknown) => void;
    mock.rpc.mockImplementationOnce(() => new Promise(r => { resolve = r; }));
    mount(); emit("alice");
    fireEvent.click(screen.getByText("refresh"));
    fireEvent.click(screen.getByText("refresh"));
    expect(mock.rpc).toHaveBeenCalledOnce();
    await act(async () => { resolve({ data: { unread_messages: 9, unread_notifications: 9 }, error: null }); });
    await waitFor(() => expect(screen.getByTestId("counts")).toHaveTextContent("3/25"));
    expect(mock.rpc).toHaveBeenCalledTimes(2);
  });
  it("preserves authenticated state when sign-out fails", async () => {
    mock.signOut.mockResolvedValue({ error: new Error("offline") });
    mount(); emit("alice");
    await waitFor(() => expect(screen.getByTestId("counts")).toHaveTextContent("3/25"));
    fireEvent.click(screen.getByText("logout"));
    await waitFor(() => expect(mock.signOut).toHaveBeenCalledOnce());
    expect(screen.getByText("alice")).toBeInTheDocument();
  });
});

it("initial hydration and repeated same-user token refreshes never navigate", async () => {
  mount();
  act(() => { mock.listener?.("INITIAL_SESSION", { user: { id: "alice" } }); });
  await waitFor(() => expect(screen.getByTestId("counts")).toHaveTextContent("3/25"));
  act(() => { mock.listener?.("TOKEN_REFRESHED", { user: { id: "alice" } }); });
  expect(mock.navigate).not.toHaveBeenCalled();
  expect(mock.rpc).toHaveBeenCalledOnce();
});
it("accepts a confirmed exact zero and array-shaped RPC result", async () => {
  mock.rpc.mockResolvedValue({ data: [{ unread_messages: 0, unread_notifications: 0 }], error: null });
  mount(); emit("alice");
  await waitFor(() => expect(screen.getByTestId("counts")).toHaveTextContent("0/0"));
});
it("refreshes on owner-only notification and minimal chat-signal events", async () => {
  mount(); emit("alice");
  await waitFor(() => expect(screen.getByTestId("counts")).toHaveTextContent("3/25"));
  expect(mock.events.map(e => e.config.table)).toEqual(["notifications", "notifications", "unread_count_signals", "unread_count_signals"]);
  expect(mock.events.map(e => e.config.event)).toEqual(["INSERT", "UPDATE", "INSERT", "UPDATE"]);
  expect(mock.events.every(e => e.config.filter === "user_id=eq.alice")).toBe(true);
  mock.rpc.mockResolvedValue({ data: { unread_messages: 4, unread_notifications: 26 }, error: null });
  await act(async () => { mock.events[2].callback(); });
  expect(screen.getByTestId("counts")).toHaveTextContent("4/26");
  mock.rpc.mockResolvedValue({ data: { unread_messages: 0, unread_notifications: 0 }, error: null });
  await act(async () => { mock.events[0].callback(); });
  expect(screen.getByTestId("counts")).toHaveTextContent("0/0");
});
it("ignores realtime events and pending responses after unmount", async () => {
  let resolve!: (value: unknown) => void;
  mock.rpc.mockImplementationOnce(() => new Promise(r => { resolve = r; }));
  const view = mount(); emit("alice");
  const event = mock.events[1].callback;
  view.unmount();
  await act(async () => { event(); resolve({ data: { unread_messages: 99, unread_notifications: 99 }, error: null }); });
  expect(mock.rpc).toHaveBeenCalledOnce();
  expect(mock.removeChannel).toHaveBeenCalledOnce();
});
it("clears previously known counts after a later RPC failure", async () => {
  mount(); emit("alice");
  await waitFor(() => expect(screen.getByTestId("counts")).toHaveTextContent("3/25"));
  mock.rpc.mockResolvedValue({ error: { code: "42501" } });
  await act(async () => { fireEvent.click(screen.getByText("refresh")); });
  expect(screen.getByTestId("counts")).toHaveTextContent("?/?");
  expect(mock.from).not.toHaveBeenCalled();
});

it("refreshes once on subscription establishment/reconnect without polling", async () => {
  mount(); emit("alice");
  await waitFor(() => expect(screen.getByTestId("counts")).toHaveTextContent("3/25"));
  mock.rpc.mockResolvedValue({ data: { unread_messages: 7, unread_notifications: 8 }, error: null });
  await act(async () => { mock.subscribe.mock.calls[0][0]("SUBSCRIBED"); });
  expect(screen.getByTestId("counts")).toHaveTextContent("7/8");
  expect(mock.rpc).toHaveBeenCalledTimes(2);
});
