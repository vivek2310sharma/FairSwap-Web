"use client";
import { useRouter } from "next/navigation";
import { chatCopy } from "@/lib/chat-v2/copy";
import type { ChatError } from "@/lib/chat-v2/contracts";

export function ChatV2Failure({ error }: { error: ChatError }) {
  const router = useRouter(), copy = chatCopy();
  return <div role="alert" className="rounded-xl border border-border p-5"><p>{copy[error]}</p><button className="mt-3 rounded-xl border border-border px-4 py-2 underline" onClick={() => router.refresh()}>{copy.retry}</button></div>;
}
