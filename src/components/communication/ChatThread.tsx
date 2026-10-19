"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Send,
  ShieldAlert,
  Flag,
  AlertCircle,
  ExternalLink,
  Info,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { type Conversation, type Message } from "@/types/communication";
import { sendMessageAction, markConversationReadAction } from "@/app/account/messages/actions";
import { formatMessageTime } from "@/lib/formatters";
import { ReportDialog } from "./ReportDialog";
import { BlockDialog } from "./BlockDialog";

interface ChatThreadProps {
  conversation: Conversation;
  initialMessages: Message[];
  currentUserId: string;
  isBlockedInitial?: boolean;
}

export function ChatThread({
  conversation,
  initialMessages,
  currentUserId,
  isBlockedInitial = false,
}: ChatThreadProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isBlocked, setIsBlocked] = useState(isBlockedInitial);

  // Dialog states
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState<{
    type: "listing" | "user" | "message";
    id: string;
    name?: string;
  }>({ type: "user", id: "" });
  const [blockModalOpen, setBlockModalOpen] = useState(false);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  const isBuyer = conversation.buyer_id === currentUserId;
  const counterparty = isBuyer ? conversation.seller : conversation.buyer;
  const counterpartyId = isBuyer ? conversation.seller_id : conversation.buyer_id;
  const counterpartyName = counterparty?.display_name || "Deleted User";

  // Auto-scroll to bottom of messages container
  const scrollToBottom = (smooth = true) => {
    if (messagesContainerRef.current) {
      if (typeof messagesContainerRef.current.scrollTo === "function") {
        messagesContainerRef.current.scrollTo({
          top: messagesContainerRef.current.scrollHeight,
          behavior: smooth ? "smooth" : ("instant" as ScrollBehavior),
        });
      } else {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      }
    } else if (typeof messagesEndRef.current?.scrollIntoView === "function") {
      messagesEndRef.current.scrollIntoView({
        behavior: smooth ? "smooth" : "auto",
        block: "nearest",
      });
    }
  };

  useEffect(() => {
    scrollToBottom(false);
  }, []);

  const hasMarkedInitialRead = useRef(false);
  useEffect(() => {
    if (!hasMarkedInitialRead.current && initialMessages.length > 0) {
      hasMarkedInitialRead.current = true;
      const latestMsg = initialMessages[initialMessages.length - 1];
      if (latestMsg.sender_id !== currentUserId) {
        markConversationReadAction(conversation.id, latestMsg.id);
      }
    }
  }, [conversation.id, currentUserId, initialMessages]);

  useEffect(() => {
    // Subscribe to real-time message stream
    const channel = supabase
      .channel(`chat:${conversation.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversation.id}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            // Deduplicate
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });

          // If incoming message is from counterparty, mark read
          if (newMsg.sender_id !== currentUserId) {
            markConversationReadAction(conversation.id, newMsg.id);
          }

          setTimeout(() => scrollToBottom(true), 50);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversation.id, currentUserId, supabase]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = inputText.trim();
    if (!clean || isSending) return;

    setErrorMessage(null);
    setIsSending(true);

    const clientRequestId = crypto.randomUUID();

    try {
      const result = await sendMessageAction(conversation.id, clean, clientRequestId);

      if (result.error) {
        setErrorMessage(result.error);
      } else {
        if (result.messageId) {
          const localMsg: Message = {
            id: result.messageId,
            conversation_id: conversation.id,
            sender_id: currentUserId,
            content: clean,
            client_request_id: clientRequestId,
            created_at: new Date().toISOString(),
          };
          setMessages((prev) => {
            if (prev.some((m) => m.id === localMsg.id)) return prev;
            return [...prev, localMsg];
          });
        }
        setInputText("");
        setTimeout(() => scrollToBottom(true), 50);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to send message. Please check your network.";
      setErrorMessage(msg);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const openReportForMessage = (messageId: string) => {
    setReportTarget({
      type: "message",
      id: messageId,
      name: `Message in this conversation`,
    });
    setReportModalOpen(true);
  };

  const openReportForUser = () => {
    if (!counterpartyId) return;
    setReportTarget({
      type: "user",
      id: counterpartyId,
      name: counterpartyName,
    });
    setReportModalOpen(true);
  };

  const isListingClosed =
    conversation.listing?.status === "removed" || conversation.listing?.status === "rejected";

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
      {/* Thread Header */}
      <div className="flex items-center justify-between border-b border-border p-4 shrink-0 bg-card">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 font-bold text-brand-900 dark:bg-brand-950 dark:text-brand-300">
            {counterpartyName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <span>{counterpartyName}</span>
              {isBuyer ? (
                <span className="rounded-md bg-surface px-1.5 py-0.5 text-[10px] font-medium text-muted">
                  Seller
                </span>
              ) : (
                <span className="rounded-md bg-surface px-1.5 py-0.5 text-[10px] font-medium text-muted">
                  Buyer
                </span>
              )}
            </h2>
            {conversation.listing && (
              <Link
                href={`/listings/${conversation.listing.slug || conversation.listing.id}`}
                className="inline-flex items-center gap-1 text-xs text-muted hover:text-action-600 truncate max-w-xs sm:max-w-md"
              >
                <span>Re: {conversation.listing.title}</span>
                <ExternalLink className="h-3 w-3 shrink-0" />
              </Link>
            )}
          </div>
        </div>

        {/* Safety & Action Controls */}
        <div className="flex items-center gap-1">
          {counterpartyId && (
            <>
              <button
                type="button"
                onClick={openReportForUser}
                title="Report User"
                aria-label="Report User"
                className="rounded-lg p-2 text-muted hover:bg-surface hover:text-foreground"
              >
                <Flag className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setBlockModalOpen(true)}
                title="Block User"
                aria-label="Block User"
                className="rounded-lg p-2 text-muted hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
              >
                <ShieldAlert className="h-4 w-4" aria-hidden="true" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Listing Notice Banner */}
      {conversation.listing && (
        <div className="border-b border-border bg-surface/40 px-4 py-2 flex items-center justify-between text-xs text-muted shrink-0">
          <div className="flex items-center gap-2 truncate">
            <span className="font-semibold text-foreground">
              {conversation.listing.price_paise !== null
                ? `₹${(conversation.listing.price_paise / 100).toLocaleString("en-IN")}`
                : "Free"}
            </span>
            <span>&bull;</span>
            <span className="uppercase font-medium text-[10px] tracking-wider">
              Status: {conversation.listing.status}
            </span>
          </div>
          {isListingClosed && (
            <span className="text-amber-700 dark:text-amber-400 font-semibold text-[11px]">
              Listing closed
            </span>
          )}
        </div>
      )}

      {/* Message Stream */}
      <div ref={messagesContainerRef} className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-muted">
            No messages exchanged yet. Send the first message below.
          </div>
        ) : (
          messages.map((msg) => {
            const isSelf = msg.sender_id === currentUserId;
            const isDeletedActor = !msg.sender_id;

            return (
              <div
                key={msg.id}
                className={`flex flex-col group ${isSelf ? "items-end" : "items-start"}`}
              >
                <div className="flex items-end gap-1.5 max-w-[85%] sm:max-w-[70%]">
                  <div
                    className={`rounded-2xl px-4 py-2.5 text-xs leading-relaxed ${
                      isSelf
                        ? "bg-action-600 text-white rounded-br-xs"
                        : "bg-surface border border-border text-foreground rounded-bl-xs"
                    }`}
                  >
                    {isDeletedActor && (
                      <div className="mb-1 flex items-center gap-1 text-[10px] font-semibold text-muted">
                        <Info className="h-3 w-3" />
                        <span>Deleted User</span>
                      </div>
                    )}
                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                  </div>

                  {!isSelf && (
                    <button
                      type="button"
                      onClick={() => openReportForMessage(msg.id)}
                      title="Report Message"
                      aria-label="Report Message"
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted hover:text-amber-600"
                    >
                      <Flag className="h-3 w-3" aria-hidden="true" />
                    </button>
                  )}
                </div>

                <span className="mt-1 px-1 text-[10px] text-muted">
                  {formatMessageTime(msg.created_at)}
                </span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error Notice */}
      {errorMessage && (
        <div className="mx-4 mb-2 flex items-center gap-2 rounded-xl border border-rose-300 bg-rose-50 p-2.5 text-xs text-rose-800 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-200 shrink-0">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Input Area */}
      {isBlocked ? (
        <div className="shrink-0 border-t border-border bg-surface p-4 text-center text-xs text-muted">
          Messaging is currently unavailable between these participants.
        </div>
      ) : isListingClosed ? (
        <div className="shrink-0 border-t border-border bg-surface p-4 text-center text-xs text-muted">
          This conversation is closed because the listing was removed or rejected by moderation.
        </div>
      ) : (
        <form onSubmit={handleSend} className="shrink-0 border-t border-border bg-card p-3">
          <div className="flex items-end gap-2">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={2}
              maxLength={2000}
              placeholder="Type your message... (Enter to send, Shift+Enter for newline)"
              className="flex-1 resize-none rounded-xl border border-border bg-surface p-2.5 text-xs text-foreground placeholder:text-muted focus:outline-hidden focus:ring-2 focus:ring-action-500"
            />
            <button
              type="submit"
              aria-label="Send message"
              disabled={isSending || !inputText.trim()}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-action-600 text-white shadow-xs hover:bg-action-700 disabled:opacity-40"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <div className="mt-1.5 flex justify-between px-1 text-[10px] text-muted">
            <span>Press Enter to send</span>
            <span>{inputText.length} / 2000</span>
          </div>
        </form>
      )}

      {/* Report Modal */}
      <ReportDialog
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        targetType={reportTarget.type}
        targetId={reportTarget.id}
        targetName={reportTarget.name}
      />

      {/* Block Modal */}
      {counterpartyId && (
        <BlockDialog
          isOpen={blockModalOpen}
          onClose={() => setBlockModalOpen(false)}
          targetUserId={counterpartyId}
          targetUserName={counterpartyName}
          onBlocked={() => setIsBlocked(true)}
        />
      )}
    </div>
  );
}
