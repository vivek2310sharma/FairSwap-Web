import { chatCopy } from "@/lib/chat-v2/copy";
export function ChatV2Loading() {
  return <main aria-busy="true" className="flex-1 p-6"><p role="status">{chatCopy().loading}</p></main>;
}
