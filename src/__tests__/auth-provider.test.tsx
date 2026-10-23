import { act, render, screen, waitFor, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "@/components/providers/AuthProvider";

const mock = vi.hoisted(() => ({
  listener: null as null | ((event: string, session: unknown) => void),
  rpc: vi.fn(), from: vi.fn(), signOut: vi.fn(), unsubscribe: vi.fn(),
  channel: vi.fn(), removeChannel: vi.fn(), pathname: "/search",
}));
vi.mock("next/navigation", () => ({ usePathname: () => mock.pathname }));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({
  rpc: mock.rpc, from: mock.from, channel: mock.channel, removeChannel: mock.removeChannel,
  auth: { signOut: mock.signOut, onAuthStateChange: (listener: typeof mock.listener) => {
    mock.listener = listener;
    return { data: { subscription: { unsubscribe: mock.unsubscribe } } };
  } },
}) }));
function Consumer() {
  const auth = useAuth();
  return <><p>{auth.isLoading ? "loading" : auth.user?.id ?? "guest"}</p>
    <p data-testid="counts">{auth.unreadMessagesCount}/{auth.unreadNotificationsCount}</p>
    <button onClick={() => void auth.refreshUnreadCounts()}>refresh</button>
    <button onClick={() => void auth.signOut().catch(() => {})}>logout</button></>;
}
const emit = (id: string | null) => act(() => { mock.listener?.(id ? "SIGNED_IN" : "SIGNED_OUT", id ? { user: { id } } : null); });
const mount = () => render(<AuthProvider><Consumer /></AuthProvider>);
beforeEach(() => {
  vi.clearAllMocks();
  mock.pathname = "/search";
  mock.rpc.mockResolvedValue({ data: { unread_messages: 3, unread_notifications: 25 }, error: null });
  mock.signOut.mockResolvedValue({ error: null });
  const channel = { on: vi.fn().mockReturnThis(), subscribe: vi.fn().mockReturnThis() };
  mock.channel.mockReturnValue(channel);
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
    expect(screen.getByTestId("counts")).toHaveTextContent("0/0");
    expect(screen.getByText("guest")).toBeInTheDocument();
    expect(mock.removeChannel).toHaveBeenCalledOnce();
  });
  it("does not leak one user's counts into another session", async () => {
    let resolve!: (value: unknown) => void;
    mock.rpc.mockImplementationOnce(() => new Promise(r => { resolve = r; }));
    mount(); emit("alice"); emit("bob");
    await waitFor(() => expect(screen.getByTestId("counts")).toHaveTextContent("3/25"));
    await act(async () => { resolve({ data: { unread_messages: 99, unread_notifications: 99 }, error: null }); });
    expect(screen.getByText("bob")).toBeInTheDocument();
    expect(screen.getByTestId("counts")).toHaveTextContent("3/25");
  });
  it("uses an owner-scoped count only for missing RPC and remembers its absence", async () => {
    mock.rpc.mockResolvedValue({ error: { code: "PGRST202" } });
    const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), is: vi.fn().mockResolvedValue({ count: 42, error: null }) };
    mock.from.mockReturnValue(query);
    mount(); emit("alice");
    await waitFor(() => expect(screen.getByTestId("counts")).toHaveTextContent("0/42"));
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
    expect(screen.getByTestId("counts")).toHaveTextContent("0/0");
    expect(mock.from).not.toHaveBeenCalled();
  });
  it("handles network rejection without an unhandled promise", async () => {
    mock.rpc.mockRejectedValue(new Error("offline"));
    mount(); emit("alice");
    await waitFor(() => expect(mock.rpc).toHaveBeenCalledOnce());
    expect(screen.getByTestId("counts")).toHaveTextContent("0/0");
  });
  it("clears identity and counts on confirmed sign-out", async () => {
    mount(); emit("alice");
    await waitFor(() => expect(screen.getByTestId("counts")).toHaveTextContent("3/25"));
    fireEvent.click(screen.getByText("logout"));
    await waitFor(() => expect(screen.getByText("guest")).toBeInTheDocument());
    expect(screen.getByTestId("counts")).toHaveTextContent("0/0");
  });
  it("fails closed when the fallback count request fails", async () => {
    mock.rpc.mockResolvedValue({ error: { code: "42883" } });
    const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), is: vi.fn().mockRejectedValue(new Error("offline")) };
    mock.from.mockReturnValue(query);
    mount(); emit("alice");
    await waitFor(() => expect(query.is).toHaveBeenCalledOnce());
    expect(screen.getByTestId("counts")).toHaveTextContent("0/0");
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
