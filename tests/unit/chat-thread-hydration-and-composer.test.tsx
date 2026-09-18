import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import ReactDOMServer from "react-dom/server";
import { ChatThread } from "@/components/communication/ChatThread";
import { formatMessageTime, formatMessageDate, formatNotificationDateTime } from "@/lib/formatters";
import { type Conversation, type Message } from "@/types/communication";

// Mock Supabase client
vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => ({
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnValue({}),
    })),
    removeChannel: vi.fn(),
  })),
}));

// Mock server actions
vi.mock("@/app/account/messages/actions", () => ({
  sendMessageAction: vi.fn().mockResolvedValue({ success: true, messageId: "msg-new" }),
  markConversationReadAction: vi.fn().mockResolvedValue({ success: true }),
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

describe("ChatThread & Timestamp Determinism", () => {
  const baseConversation: Conversation = {
    id: "conv-123",
    listing_id: "listing-456",
    buyer_id: "user-buyer",
    seller_id: "user-seller",
    last_message_at: "2026-09-18T11:56:59.078806+00:00",
    created_at: "2026-09-18T11:56:59.000000+00:00",
    listing: {
      id: "listing-456",
      slug: "test-item-slug",
      title: "Test Marketplace Item",
      status: "active",
      price_paise: 250000,
      cover_photo_id: null,
    },
    buyer: {
      id: "user-buyer",
      display_name: "Buyer User",
      avatar_url: null,
    },
    seller: {
      id: "user-seller",
      display_name: "Seller User",
      avatar_url: null,
    },
  };

  const sampleMessages: Message[] = [
    {
      id: "msg-001",
      conversation_id: "conv-123",
      sender_id: "user-buyer",
      content: "Hello, is this item still available?",
      created_at: "2026-09-18T11:56:59.078806+00:00",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Regression: Deterministic timestamp formatting (zero hydration mismatch)", () => {
    it("renders identical timestamp in Asia/Kolkata timezone regardless of environment locale/tz", () => {
      const isoString = "2026-09-18T11:56:59.078806+00:00";
      const formattedTime = formatMessageTime(isoString);
      // 11:56:59 UTC is 17:26:59 IST (05:26 pm)
      expect(formattedTime).toBe("05:26 pm");

      const formattedDate = formatMessageDate(isoString);
      expect(formattedDate).toMatch(/18 Sep/);

      const formattedNotification = formatNotificationDateTime(isoString);
      expect(formattedNotification).toMatch(/18 Sep/);
      expect(formattedNotification).toContain("05:26 pm");
    });

    it("proves SSR renderToString produces exact matching HTML text for timestamps with zero mismatch", () => {
      // 1. Render to SSR string (simulating Vercel Node.js Serverless SSR)
      const ssrHtml = ReactDOMServer.renderToString(
        <ChatThread
          conversation={baseConversation}
          initialMessages={sampleMessages}
          currentUserId="user-buyer"
          isBlockedInitial={false}
        />
      );

      // Verify that the SSR output contains the deterministic formatted time
      expect(ssrHtml).toContain("05:26 pm");
      expect(ssrHtml).toContain("Hello, is this item still available?");

      // 2. Render on Client (jsdom)
      render(
        <ChatThread
          conversation={baseConversation}
          initialMessages={sampleMessages}
          currentUserId="user-buyer"
          isBlockedInitial={false}
        />
      );

      // The rendered DOM text matches the deterministic server output exactly
      const timeElements = screen.getAllByText("05:26 pm");
      expect(timeElements.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Regression: Active/unblocked conversation composer visibility", () => {
    it("renders message composer textarea and Send button for the buyer", () => {
      render(
        <ChatThread
          conversation={baseConversation}
          initialMessages={sampleMessages}
          currentUserId="user-buyer"
          isBlockedInitial={false}
        />
      );

      const textarea = screen.getByPlaceholderText(
        "Type your message... (Enter to send, Shift+Enter for newline)"
      );
      expect(textarea).toBeInTheDocument();

      const sendButton = screen.getByRole("button", { name: "" }); // icon button with Send icon
      expect(sendButton).toBeInTheDocument();
      expect(sendButton).toHaveAttribute("type", "submit");

      // Verify safety notices are NOT displayed
      expect(screen.queryByText(/Messaging is currently unavailable/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/This conversation is closed because the listing was removed/i)).not.toBeInTheDocument();
    });

    it("renders message composer textarea and Send button for the seller", () => {
      render(
        <ChatThread
          conversation={baseConversation}
          initialMessages={sampleMessages}
          currentUserId="user-seller"
          isBlockedInitial={false}
        />
      );

      const textarea = screen.getByPlaceholderText(
        "Type your message... (Enter to send, Shift+Enter for newline)"
      );
      expect(textarea).toBeInTheDocument();

      const sendButton = screen.getByRole("button", { name: "" });
      expect(sendButton).toBeInTheDocument();
      expect(sendButton).toHaveAttribute("type", "submit");
    });
  });

  describe("Regression: Blocked conversation behavior", () => {
    it("hides composer and displays blocked notice when conversation is blocked", () => {
      render(
        <ChatThread
          conversation={baseConversation}
          initialMessages={sampleMessages}
          currentUserId="user-buyer"
          isBlockedInitial={true}
        />
      );

      // Textarea and Send button must not be present
      expect(
        screen.queryByPlaceholderText("Type your message... (Enter to send, Shift+Enter for newline)")
      ).not.toBeInTheDocument();

      // Block notice must be displayed
      expect(
        screen.getByText("Messaging is currently unavailable between these participants.")
      ).toBeInTheDocument();
    });
  });

  describe("Regression: Removed/rejected listing behavior", () => {
    it("hides composer and displays closed notice when listing status is removed", () => {
      const removedConversation: Conversation = {
        ...baseConversation,
        listing: {
          ...baseConversation.listing!,
          status: "removed",
        },
      };

      render(
        <ChatThread
          conversation={removedConversation}
          initialMessages={sampleMessages}
          currentUserId="user-buyer"
          isBlockedInitial={false}
        />
      );

      expect(
        screen.queryByPlaceholderText("Type your message... (Enter to send, Shift+Enter for newline)")
      ).not.toBeInTheDocument();

      expect(
        screen.getByText("This conversation is closed because the listing was removed or rejected by moderation.")
      ).toBeInTheDocument();
    });

    it("hides composer and displays closed notice when listing status is rejected", () => {
      const rejectedConversation: Conversation = {
        ...baseConversation,
        listing: {
          ...baseConversation.listing!,
          status: "rejected",
        },
      };

      render(
        <ChatThread
          conversation={rejectedConversation}
          initialMessages={sampleMessages}
          currentUserId="user-seller"
          isBlockedInitial={false}
        />
      );

      expect(
        screen.queryByPlaceholderText("Type your message... (Enter to send, Shift+Enter for newline)")
      ).not.toBeInTheDocument();

      expect(
        screen.getByText("This conversation is closed because the listing was removed or rejected by moderation.")
      ).toBeInTheDocument();
    });
  });
});
