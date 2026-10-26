import React from "react";
import { beforeEach, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import { ChatV2Inbox } from "@/components/communication/ChatV2Inbox";
import { inboxRequestSchema } from "@/lib/chat-v2/contracts";
import { ids, inbox, message } from "./chat-v2-fixtures";
const mocks = vi.hoisted(() => ({ load: vi.fn(), push: vi.fn() }));
vi.mock("@/lib/chat-v2/actions", () => ({ loadChatInbox: mocks.load }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("next/link", () => ({ default: ({ children, ...props }: React.ComponentProps<"a">) => <a {...props}>{children}</a> }));
beforeEach(() => { cleanup(); vi.resetAllMocks(); mocks.load.mockResolvedValue({ data: inbox }); });
it("displays authoritative totals, listing facts and safe thumbnail fallback", () => {
  render(<ChatV2Inbox request={inboxRequestSchema.parse({})} initial={{ data: inbox }} />);
  expect(screen.getByText("All (127)")).toBeInTheDocument(); expect(screen.getByText("Buying (120)")).toBeInTheDocument();
  expect(screen.getByText(/₹2,500/)).toBeInTheDocument(); expect(screen.getByLabelText("2 unread messages")).toBeInTheDocument();
  expect(screen.getByRole("img", { name: "No photo" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /Seller One/ })).toHaveAttribute("href", expect.stringContaining(`/messages/${ids.conversation}`));
});
it("navigates seller groups to listing drilldown, keeping individual buyer links", () => {
  const group = { ...inbox.items[0], is_selling: true, is_group: true, enquiry_count: 3, conversation_id: null };
  const { rerender } = render(<ChatV2Inbox request={inboxRequestSchema.parse({ tab: "selling" })} initial={{ data: { ...inbox, items: [group] } }} />);
  expect(screen.getByRole("link", { name: /3 enquiries/ })).toHaveAttribute("href", `/account/messages?tab=selling&listing_id=${ids.listing}`);
  rerender(<ChatV2Inbox key="drilldown" request={inboxRequestSchema.parse({ tab: "selling", listingId: ids.listing })} initial={{ data: inbox }} />);
  expect(screen.getByRole("link", { name: /Seller One/ }).getAttribute("href")).toContain(`listing_id=${ids.listing}`);
  expect(screen.getByRole("link", { name: "All selling ads" })).toHaveAttribute("href", "/account/messages?tab=selling");
});
it("submits encoded search and unread filters through navigation", () => {
  render(<ChatV2Inbox request={inboxRequestSchema.parse({})} initial={{ data: inbox }} />);
  fireEvent.change(screen.getByLabelText("Search names or ads"), { target: { value: "bike & city" } });
  fireEvent.click(screen.getByRole("button", { name: "Search" }));
  expect(mocks.push).toHaveBeenLastCalledWith("/account/messages?tab=all&q=bike+%26+city");
  fireEvent.click(screen.getByLabelText("Unread only"));
  expect(mocks.push).toHaveBeenLastCalledWith("/account/messages?tab=all&q=bike+%26+city&unread=true");
});
it("passes cursor tuples when loading more and resets the window on realtime refresh", async () => {
  const cursor = { at: message.created_at, id: ids.conversation };
  mocks.load.mockResolvedValueOnce({ data: { ...inbox, items: [{ ...inbox.items[0], id: ids.next, conversation_id: ids.next }] } });
  render(<ChatV2Inbox request={inboxRequestSchema.parse({})} initial={{ data: { ...inbox, has_more: true, next_cursor: cursor } }} />);
  fireEvent.click(screen.getByRole("button", { name: "Load more conversations" }));
  await waitFor(() => expect(mocks.load).toHaveBeenCalledWith(expect.objectContaining({ cursor })));
  await waitFor(() => expect(screen.getAllByRole("link", { name: /Seller One/ })).toHaveLength(2));
  fireEvent(window, new Event("fairswap:chat-v2-inbox-refresh"));
  await waitFor(() => expect(screen.getAllByRole("link", { name: /Seller One/ })).toHaveLength(1));
  expect(mocks.load).toHaveBeenLastCalledWith(expect.objectContaining({ cursor: null }));
});
it.each(["all", "buying", "selling"] as const)("has a specific %s empty state", tab => {
  render(<ChatV2Inbox request={inboxRequestSchema.parse({ tab })} initial={{ data: { ...inbox, items: [] } }} />);
  expect(screen.getByText(tab === "all" ? /No conversations yet/ : tab === "buying" ? /No buying conversations/ : /No selling enquiries/)).toBeInTheDocument();
});
it("shows an explicit authorization error and retry state", async () => {
  render(<ChatV2Inbox request={inboxRequestSchema.parse({})} initial={{ error: "forbidden" }} />);
  expect(screen.getByRole("alert")).toHaveTextContent("do not have access");
  fireEvent.click(screen.getByRole("button", { name: "Retry" }));
  await waitFor(() => expect(screen.getByText("All (127)")).toBeInTheDocument());
});
it("clears previously displayed private rows when authorization is revoked", async () => {
  mocks.load.mockResolvedValue({ error: "forbidden" });
  render(<ChatV2Inbox request={inboxRequestSchema.parse({})} initial={{ data: inbox }} />);
  fireEvent(window, new Event("fairswap:chat-v2-inbox-refresh"));
  await waitFor(() => expect(screen.queryByRole("link", { name: /Seller One/ })).not.toBeInTheDocument());
  expect(screen.getByRole("alert")).toHaveTextContent("do not have access");
});
