// Loopback-only synthetic API for automated UI contracts. No real account or database.
import http from "node:http";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const id = digit => `${digit.repeat(8)}-${digit.repeat(4)}-4${digit.repeat(3)}-8${digit.repeat(3)}-${digit.repeat(12)}`;
const user = id("1"), peer = id("2"), conversation = id("3"), listing = id("4"), message = id("5"), group = id("6"), listing2 = id("7");
const at = "2026-10-26T20:30:00.123456Z";
const listingData = { id: listing, title: "Blue bicycle", slug: "blue-bicycle", status: "active", price_paise: 250000, cover_photo_id: null };
const row = { id: conversation, conversation_id: conversation, listing_id: listing, is_group: false, enquiry_count: 1, unread_count: 1, is_selling: false, last_message_at: at, listing: listingData, peer_name: "Seller One", preview: "Hello buyer", preview_is_own: false };
const groupRow = { ...row, id: group, conversation_id: null, listing_id: listing2, is_group: true, enquiry_count: 2, is_selling: true, listing: { ...listingData, id: listing2, title: "Seller bicycle" }, peer_name: null };
const sent = new Map();
const server = http.createServer(async (req, res) => {
  try {
  res.setHeader("Content-Type", "application/json"); res.setHeader("Access-Control-Allow-Origin", "*"); res.setHeader("Access-Control-Allow-Headers", "*"); res.setHeader("Access-Control-Allow-Methods", "*");
  if (req.method === "OPTIONS") { res.end(); return; }
  const url = new URL(req.url, "http://127.0.0.1:35431");
  let raw = ""; for await (const chunk of req) { raw += chunk; if (raw.length > 8192) { res.writeHead(413); res.end(); return; } }
  let body; try { body = raw ? JSON.parse(raw) : {}; } catch { res.writeHead(400); res.end(); return; }
  const send = data => res.end(JSON.stringify(data));
  if (url.pathname === "/__reset") { sent.clear(); return send({ reset: true }); }
  if (url.pathname === "/auth/v1/user") return send({ id: user, aud: "authenticated", role: "authenticated", email: "fixture@example.invalid", app_metadata: {}, user_metadata: {}, identities: [], created_at: at });
  if (url.pathname.endsWith("/rpc/has_current_policy_acceptance")) return send(true);
  if (url.pathname.endsWith("/rpc/get_unread_counts")) return send({ unread_messages: 1, unread_notifications: 0 });
  if (url.pathname.endsWith("/rpc/chat_v2_inbox")) {
    if (body.query_text === "denied") { res.writeHead(403); return send({ code: "42501", message: "CHAT_ACCESS_DENIED" }); }
    let items = body.listing_id ? [{ ...groupRow, id: group, conversation_id: group, is_group: false, enquiry_count: 1, peer_name: "Buyer One" }, { ...groupRow, id: id("8"), conversation_id: id("8"), is_group: false, enquiry_count: 1, peer_name: "Buyer Two" }]
      : body.tab === "buying" ? [row] : body.tab === "selling" ? [groupRow] : [row, groupRow];
    if (body.query_text === "missing") items = [];
    return send({ items, counts: { all: 3, buying: 1, selling: 2 }, has_more: false, next_cursor: null });
  }
  if (url.pathname.endsWith("/rpc/chat_v2_messages")) {
    const items = [{ id: message, conversation_id: body.conversation_id, sender_id: peer, content: "Hello buyer", created_at: at, client_request_id: null }, ...[...sent.values()].filter(row => row.conversation_id === body.conversation_id)];
    return send({ items, has_more: false, next_cursor: null, peer_read_cursor: null });
  }
  if (url.pathname.endsWith("/rpc/mark_conversation_read")) return send(null);
  if (url.pathname.endsWith("/rpc/send_message")) {
    if (!sent.has(body.client_request_id)) sent.set(body.client_request_id, { id: body.client_request_id, conversation_id: body.conversation_id, sender_id: user, content: body.content, created_at: "2026-10-26T20:31:00Z", client_request_id: body.client_request_id });
    return send({ message_id: body.client_request_id });
  }
  if (url.pathname.endsWith("/conversations")) {
    const selected = url.searchParams.get("id")?.replace("eq.", "") ?? conversation;
    return send({ id: selected, listing_id: selected === conversation ? listing : listing2, buyer_id: selected === conversation ? user : peer, seller_id: selected === conversation ? peer : user, created_at: at, last_message_at: at, listing: listingData });
  }
  if (url.pathname.endsWith("/profiles")) return send([{ id: user, display_name: "Buyer One", avatar_url: null }, { id: peer, display_name: "Seller One", avatar_url: null }]);
  if (url.pathname.endsWith("/message_safety_findings")) return send([{ message_id: message, recipient_id: user, rule_version: "chat_india_v1", rule_ids: ["OTP_PIN"] }]);
  if (url.pathname.endsWith("/user_blocks")) return send([]);
  return send([]);
  } catch {
    // Navigations can abort an action/prefetch while its body is being read.
    // Keep the synthetic server alive without logging request bodies or cookies.
    if (!res.destroyed && !res.writableEnded) { res.statusCode = 500; res.end("{}"); }
  }
});
await new Promise((resolve, reject) => { server.once("error", reject); server.listen(35431, "127.0.0.1", resolve); });
const env = { ...process.env, FAIRSWAP_CHAT_V2_INBOX_ENABLED: "true", NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:35431", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "fixture-publishable-key", NEXT_TELEMETRY_DISABLED: "1" };
for (const key of Object.keys(env)) if (/SUPABASE_(SECRET|SERVICE_ROLE|ACCESS_TOKEN)|VERCEL_.*SECRET/.test(key)) delete env[key];
const child = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "start", "-H", "127.0.0.1", "-p", "35430"], { env, stdio: "inherit", windowsHide: true });
const stop = () => { child.kill(); server.close(); };
process.on("SIGTERM", stop); process.on("SIGINT", stop); child.on("exit", code => { console.log(`Chat fixture app exited: ${code ?? "signal"}`); server.close(); process.exitCode = code ?? 1; });
