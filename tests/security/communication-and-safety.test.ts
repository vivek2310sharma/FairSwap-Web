import { describe, it, expect, beforeAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { orchestrateAccountDeletion } from "@/lib/privacy/deletion-orchestrator";
import crypto from "crypto";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
const ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

// Ensure environment variable is set for orchestrator
process.env.SUPABASE_SERVICE_ROLE_KEY = SERVICE_KEY;
process.env.NEXT_PUBLIC_SUPABASE_URL = SUPABASE_URL;

function createAal2Client(userId: string, email: string): SupabaseClient<Database> {
  const secret = "super-secret-jwt-token-with-at-least-32-characters-long";
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: "supabase-demo",
    sub: userId,
    aud: "authenticated",
    role: "authenticated",
    email,
    aal: "aal2",
    exp: now + 3600,
    iat: now,
  };
  const b64Header = Buffer.from(JSON.stringify(header)).toString("base64url");
  const b64Payload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", secret)
    .update(`${b64Header}.${b64Payload}`)
    .digest("base64url");
  const token = `${b64Header}.${b64Payload}.${signature}`;

  return createClient<Database>(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

describe("Milestone 1.5 Communication, Safety, Moderation & Privacy Fulfillment", () => {
  let isSupabaseOnline = false;
  let serviceClient: SupabaseClient<Database>;
  let buyerClient: SupabaseClient<Database>;
  let sellerClient: SupabaseClient<Database>;
  let outsiderClient: SupabaseClient<Database>;
  let adminAal2Client: SupabaseClient<Database>;

  let buyerUser: { id: string; email: string };
  let sellerUser: { id: string; email: string };
  let outsiderUser: { id: string; email: string };
  let adminUser: { id: string; email: string };

  let activeListingId: string;
  let conversationId: string;
  let firstMessageId: string;
  let secondMessageId: string;

  beforeAll(async () => {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
        headers: { apikey: ANON_KEY },
      });
      isSupabaseOnline = res.ok || res.status === 401;
    } catch {
      isSupabaseOnline = false;
    }

    if (!isSupabaseOnline) return;

    serviceClient = createClient<Database>(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    async function setupTestUser(email: string, role?: string) {
      const { data: existing } = await serviceClient.auth.admin.listUsers();
      let user = existing?.users.find((u) => u.email === email);

      if (!user) {
        const { data: created, error } = await serviceClient.auth.admin.createUser({
          email,
          password: "TestPassword123!",
          email_confirm: true,
          user_metadata: { display_name: email.split("@")[0] },
        });
        if (error || !created.user) throw error || new Error("Failed to create user");
        user = created.user;
      }

      await serviceClient
        .from("user_accounts")
        .upsert({
          user_id: user.id,
          account_status: "active",
          terms_version: "v1.0",
          privacy_policy_version: "v1.0",
          terms_accepted_at: new Date().toISOString(),
        });

      if (role) {
        await serviceClient.from("staff_roles").upsert({
          user_id: user.id,
          role: role as Database["public"]["Enums"]["staff_role_enum"],
          assigned_by: null,
        });
      }

      const client = createClient<Database>(SUPABASE_URL, ANON_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      const { data: authData, error: signInError } = await client.auth.signInWithPassword({
        email,
        password: "TestPassword123!",
      });

      if (signInError) throw signInError;
      return { user: { id: user.id, email: user.email! }, client, session: authData.session };
    }

    const runId = Date.now();
    const b = await setupTestUser(`m15_buyer_${runId}@example.com`);
    buyerUser = b.user;
    buyerClient = b.client;

    const s = await setupTestUser(`m15_seller_${runId}@example.com`);
    sellerUser = s.user;
    sellerClient = s.client;

    const o = await setupTestUser(`m15_outsider_${runId}@example.com`);
    outsiderUser = o.user;
    outsiderClient = o.client;

    const a = await setupTestUser(`m15_admin_${runId}@example.com`, "administrator");
    adminUser = a.user;
    adminAal2Client = createAal2Client(adminUser.id, adminUser.email);

    // Create active listing owned by seller
    const { data: cat } = await serviceClient.from("categories").select("id").limit(1).single();
    const { data: city } = await serviceClient.from("cities").select("id").limit(1).single();

    const { data: listing, error: lErr } = await serviceClient
      .from("listings")
      .insert({
        seller_id: sellerUser.id,
        category_id: cat!.id,
        city_id: city!.id,
        title: "Milestone 1.5 Safety Item",
        slug: `m15-item-${Date.now()}`,
        status: "active",
      })
      .select("id")
      .single();

    if (lErr || !listing) throw lErr || new Error("Failed to create test listing");
    activeListingId = listing.id;

    // Ensure status is active in DB
    await serviceClient
      .from("listings")
      .update({ status: "active" })
      .eq("id", activeListingId);
  });

  describe("1. Messaging & Invariants", () => {
    it("prevents self-chat (seller cannot start conversation with own listing)", async () => {
      if (!isSupabaseOnline) return;

      const { data, error } = await sellerClient.rpc("start_conversation", {
        listing_id: activeListingId,
        content: "Hello self",
        client_request_id: `req-${Date.now()}`,
      });

      expect(error).not.toBeNull();
      expect(data).toBeNull();
    });

    it("allows buyer to start conversation and creates initial message", async () => {
      if (!isSupabaseOnline) return;

      const { data, error } = await buyerClient.rpc("start_conversation", {
        listing_id: activeListingId,
        content: "Is this item still available?",
        client_request_id: `req-${Date.now()}`,
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      const res = data as Record<string, string> | string;
      conversationId = typeof res === "object" ? res.conversation_id || res.id : res;

      // Verify message was created
      const { data: msgs } = await buyerClient
        .from("messages")
        .select("id, content, sender_id")
        .eq("conversation_id", conversationId);

      expect(msgs).toBeDefined();
      expect(msgs!.length).toBeGreaterThanOrEqual(1);
      expect(msgs![0].content).toBe("Is this item still available?");
      expect(msgs![0].sender_id).toBe(buyerUser.id);
      firstMessageId = msgs![0].id;
    });

    it("prevents outsiders from reading participant conversation", async () => {
      if (!isSupabaseOnline) return;

      const { data: convs } = await outsiderClient
        .from("conversations")
        .select("id")
        .eq("id", conversationId);

      expect(convs || []).toHaveLength(0);

      const { data: msgs } = await outsiderClient
        .from("messages")
        .select("id")
        .eq("conversation_id", conversationId);

      expect(msgs || []).toHaveLength(0);
    });

    it("prevents outsider from sending message to another user's conversation", async () => {
      if (!isSupabaseOnline) return;

      const { error } = await outsiderClient.rpc("send_message", {
        conversation_id: conversationId,
        content: "I am injecting myself into your chat",
        client_request_id: `inj-${Date.now()}`,
      });

      expect(error).not.toBeNull();
    });

    it("handles sender-scoped idempotent message submission", async () => {
      if (!isSupabaseOnline) return;

      const clientRequestId = `req-idemp-${Date.now()}`;

      // First submission
      const { data: msg1, error: err1 } = await sellerClient.rpc("send_message", {
        conversation_id: conversationId,
        content: "Yes, it is available!",
        client_request_id: clientRequestId,
      });

      expect(err1).toBeNull();
      expect(msg1).toBeDefined();
      const res1 = msg1 as Record<string, string> | string;
      secondMessageId = typeof res1 === "object" ? res1.message_id || res1.id : res1;

      // Duplicate submission with same client_request_id
      const { data: msg2, error: err2 } = await sellerClient.rpc("send_message", {
        conversation_id: conversationId,
        content: "Yes, it is available!",
        client_request_id: clientRequestId,
      });

      expect(err2).toBeNull();
      const res2 = msg2 as Record<string, string> | string;
      const secondCallId = typeof res2 === "object" ? res2.message_id || res2.id : res2;
      expect(secondCallId).toBe(secondMessageId);

      // Verify total messages count in conversation
      const { data: allMsgs } = await serviceClient
        .from("messages")
        .select("id")
        .eq("conversation_id", conversationId);

      expect(allMsgs).toBeDefined();
      expect(allMsgs!.length).toBeGreaterThanOrEqual(2);
    });

    it("enforces monotonic read state advancement and prevents cross-conversation pointers", async () => {
      if (!isSupabaseOnline) return;

      // Buyer marks second message as read
      const { error: markErr1 } = await buyerClient.rpc("mark_conversation_read", {
        conversation_id: conversationId,
        message_id: secondMessageId,
      });
      expect(markErr1).toBeNull();

      // Verify read pointer is at secondMessageId
      const { data: state1 } = await buyerClient
        .from("conversation_read_states")
        .select("last_read_message_id")
        .eq("conversation_id", conversationId)
        .single();

      expect(state1?.last_read_message_id).toBe(secondMessageId);

      // Delayed / older read request (pointing back to firstMessageId) must be a no-op
      const { error: markErr2 } = await buyerClient.rpc("mark_conversation_read", {
        conversation_id: conversationId,
        message_id: firstMessageId,
      });
      expect(markErr2).toBeNull();

      // Verify read pointer did NOT move backward
      const { data: state2 } = await buyerClient
        .from("conversation_read_states")
        .select("last_read_message_id")
        .eq("conversation_id", conversationId)
        .single();

      expect(state2?.last_read_message_id).toBe(secondMessageId);
    });
  });

  describe("2. Bidirectional User Blocking", () => {
    it("prevents messaging when buyer blocks seller", async () => {
      if (!isSupabaseOnline) return;

      // Buyer blocks seller
      const { error: blockErr } = await buyerClient.rpc("block_user", {
        blocked_user_id: sellerUser.id,
        reason: "spam",
      });
      expect(blockErr).toBeNull();

      // Seller attempts to send message -> blocked
      const { error: sendErr1 } = await sellerClient.rpc("send_message", {
        conversation_id: conversationId,
        content: "Can you hear me?",
        client_request_id: `blk-${Date.now()}`,
      });
      expect(sendErr1).not.toBeNull();

      // Buyer also cannot send to seller while block is active
      const { error: sendErr2 } = await buyerClient.rpc("send_message", {
        conversation_id: conversationId,
        content: "Blocked you",
        client_request_id: `blk-buyer-${Date.now()}`,
      });
      expect(sendErr2).not.toBeNull();

      // Blocked seller cannot query block rows to detect block direction
      const { data: blocks } = await sellerClient.from("user_blocks").select("*");
      expect(blocks || []).toHaveLength(0);

      // Unblock to restore normal communication
      const { error: unblockErr } = await buyerClient.rpc("unblock_user", {
        blocked_user_id: sellerUser.id,
      });
      expect(unblockErr).toBeNull();
    });
  });

  describe("3. In-App Notifications", () => {
    it("disallows client from directly inserting notifications via RLS", async () => {
      if (!isSupabaseOnline) return;

      const { error } = await buyerClient.from("notifications").insert({
        user_id: buyerUser.id,
        type: "listing_approved",
        title: "Forged Notification",
        body: "I am forging an approval",
      });

      expect(error).not.toBeNull();
    });

    it("allows user to read and mark their own notifications read", async () => {
      if (!isSupabaseOnline) return;

      // Check notification received by seller from buyer's message
      const { data: notifs } = await sellerClient
        .from("notifications")
        .select("id, type, read_at")
        .eq("user_id", sellerUser.id);

      expect(notifs).toBeDefined();
      if (notifs && notifs.length > 0) {
        const notifId = notifs[0].id;

        const { error: markErr } = await sellerClient.rpc("mark_notification_read", {
          notification_id: notifId,
        });
        expect(markErr).toBeNull();

        const { data: updated } = await sellerClient
          .from("notifications")
          .select("read_at")
          .eq("id", notifId)
          .single();

        expect(updated?.read_at).not.toBeNull();
      }
    });

    it("disallows authenticated users from directly updating notifications via raw table UPDATE", async () => {
      if (!isSupabaseOnline) return;

      const { data: notifs } = await sellerClient
        .from("notifications")
        .select("id")
        .eq("user_id", sellerUser.id)
        .limit(1);

      if (notifs && notifs.length > 0) {
        const notifId = notifs[0].id;

        // Raw UPDATE read_at
        const { error: updateErr1 } = await sellerClient
          .from("notifications")
          .update({ read_at: new Date().toISOString() })
          .eq("id", notifId);
        expect(updateErr1).not.toBeNull();

        // Raw UPDATE title/body
        const { error: updateErr2 } = await sellerClient
          .from("notifications")
          .update({ title: "Hacked title", body: "Forged content" })
          .eq("id", notifId);
        expect(updateErr2).not.toBeNull();

        // Raw UPDATE user_id
        const { error: updateErr3 } = await sellerClient
          .from("notifications")
          .update({ user_id: buyerUser.id })
          .eq("id", notifId);
        expect(updateErr3).not.toBeNull();
      }
    });

    it("enforces cross-user notification isolation (User B cannot SELECT or mark read User A's notification)", async () => {
      if (!isSupabaseOnline) return;

      // Insert a fresh unread notification for seller
      const { data: freshNotif, error: insErr } = await serviceClient
        .from("notifications")
        .insert({
          user_id: sellerUser.id,
          type: "listing_approved",
          title: "Fresh Unread Notification",
          body: "Testing cross-user isolation",
        })
        .select("id")
        .single();

      expect(insErr).toBeNull();
      const sellerNotifId = freshNotif!.id;

      // Outsider cannot SELECT seller's notification
      const { data: outsiderView } = await outsiderClient
        .from("notifications")
        .select("id")
        .eq("id", sellerNotifId);
      expect(outsiderView || []).toHaveLength(0);

      // Outsider attempts to mark seller's notification read
      await outsiderClient.rpc("mark_notification_read", {
        notification_id: sellerNotifId,
      });

      // Verify seller's notification was NOT marked read by outsider
      const { data: sellerView } = await sellerClient
        .from("notifications")
        .select("read_at")
        .eq("id", sellerNotifId)
        .single();
      expect(sellerView?.read_at).toBeNull();
    });
  });

  describe("4. Reporting & Case-Scoped Evidence", () => {
    let reportId: string;

    it("allows participant to report a message in their conversation", async () => {
      if (!isSupabaseOnline) return;

      const { data, error } = await buyerClient.rpc("create_report", {
        target_type: "message",
        target_id: secondMessageId,
        reason: "inappropriate_content",
        details: "Sender used offensive language",
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      reportId = data as string;
    });

    it("prohibits outsiders from reporting arbitrary message IDs", async () => {
      if (!isSupabaseOnline) return;

      const { error } = await outsiderClient.rpc("create_report", {
        target_type: "message",
        target_id: secondMessageId,
        reason: "harassment",
        details: "Reporting a message I cannot see",
      });

      expect(error).not.toBeNull();
    });

    it("never leaks reporter identity to reported user", async () => {
      if (!isSupabaseOnline) return;

      const { data: reports } = await sellerClient
        .from("reports")
        .select("reporter_id")
        .eq("id", reportId);

      expect(reports || []).toHaveLength(0);
    });

    it("provides case-scoped evidence access to admin with audit log", async () => {
      if (!isSupabaseOnline) return;

      const { data: evidence, error } = await adminAal2Client.rpc("admin_get_report_evidence", {
        report_id: reportId,
      });

      expect(error).toBeNull();
      expect(evidence).toBeDefined();
      expect(typeof evidence).toBe("object");
      const evObj = evidence as Record<string, unknown>;
      expect(evObj).toHaveProperty("reported_message");
      expect(evObj).toHaveProperty("preceding_context");

      // Verify audit trail entry was created
      const { data: auditLogs } = await serviceClient
        .from("audit_logs")
        .select("action, target_id")
        .eq("target_id", reportId);

      expect(auditLogs && auditLogs.length > 0).toBe(true);
    });

    it("notifies reporter when report is resolved, and replay is idempotent without duplicate notifications", async () => {
      if (!isSupabaseOnline) return;

      // Count initial report_update notifications for buyer
      const { data: initialNotifs } = await buyerClient
        .from("notifications")
        .select("id")
        .eq("user_id", buyerUser.id)
        .eq("type", "report_update");
      const initialCount = initialNotifs?.length || 0;

      // Moderator resolves report
      const { error: resErr } = await adminAal2Client.rpc("admin_resolve_report", {
        report_id: reportId,
        new_status: "resolved",
        resolution_notes: "Reviewed message, policy violation confirmed.",
      });
      expect(resErr).toBeNull();

      // Exactly 1 new report_update notification for buyer
      const { data: afterNotifs } = await buyerClient
        .from("notifications")
        .select("id, title, body")
        .eq("user_id", buyerUser.id)
        .eq("type", "report_update");
      expect(afterNotifs?.length).toBe(initialCount + 1);

      // Verify no staff internal notes leaked in notification body
      const latestNotif = afterNotifs![afterNotifs!.length - 1];
      expect(latestNotif.body).not.toContain("policy violation confirmed");

      // Idempotent replay: resolve again with same terminal status
      const { error: replayErr } = await adminAal2Client.rpc("admin_resolve_report", {
        report_id: reportId,
        new_status: "resolved",
        resolution_notes: "Replaying resolution notes.",
      });
      expect(replayErr).toBeNull();

      // Count of notifications must NOT increase
      const { data: replayNotifs } = await buyerClient
        .from("notifications")
        .select("id")
        .eq("user_id", buyerUser.id)
        .eq("type", "report_update");
      expect(replayNotifs?.length).toBe(initialCount + 1);
    });
  });

  describe("5. Support Tickets & Appeals", () => {
    let ticketId: string;

    it("allows customer to create support ticket", async () => {
      if (!isSupabaseOnline) return;

      const { data, error } = await buyerClient.rpc("create_support_ticket", {
        category: "general",
        subject: "Question about listing safety",
        message: "How does FairSwap verify seller identity?",
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      ticketId = data as string;
    });

    it("isolates internal notes so customer cannot see them", async () => {
      if (!isSupabaseOnline) return;

      // Staff adds internal note using adminAal2Client
      const { error: noteErr } = await adminAal2Client.rpc("admin_add_ticket_internal_note", {
        ticket_id: ticketId,
        content: "CONFIDENTIAL: Customer seems legitimate, verify ID badge.",
      });
      expect(noteErr).toBeNull();

      // Customer queries messages for this ticket
      const { data: customerView } = await buyerClient
        .from("support_messages")
        .select("id, content, is_internal_note")
        .eq("ticket_id", ticketId);

      // Must NOT contain the internal note
      const hasInternal = customerView?.some((m) => m.is_internal_note);
      expect(hasInternal).toBe(false);
      expect(customerView?.some((m) => m.content.includes("CONFIDENTIAL"))).toBe(false);
    });

    it("allows suspended users to submit moderation appeals", async () => {
      if (!isSupabaseOnline) return;

      // Temporarily suspend outsider
      await serviceClient
        .from("user_accounts")
        .update({ account_status: "suspended" })
        .eq("user_id", outsiderUser.id);

      // Suspended outsider cannot send messages
      const { error: msgErr } = await outsiderClient.rpc("send_message", {
        conversation_id: conversationId,
        content: "Trying to message while suspended",
        client_request_id: `susp-${Date.now()}`,
      });
      expect(msgErr).not.toBeNull();

      // But CAN submit moderation appeal
      const { data: appealId, error: appealErr } = await outsiderClient.rpc(
        "create_support_ticket",
        {
          category: "moderation_appeal",
          subject: "Appeal for account suspension",
          message: "Please reconsider my suspension, I did not violate policies.",
        }
      );

      expect(appealErr).toBeNull();
      expect(appealId).toBeDefined();

      // Restore outsider account status
      await serviceClient
        .from("user_accounts")
        .update({ account_status: "active" })
        .eq("user_id", outsiderUser.id);
    });
  });

  describe("6. Real Supabase Auth Deletion Fulfillment & FK Safety", () => {
    it("completes full account deletion for a user with realistic history without FK violations", async () => {
      if (!isSupabaseOnline) return;

      // Create a doomed user with realistic history
      const doomedEmail = `m15_doomed_${Date.now()}@example.com`;
      const { data: created, error: createErr } = await serviceClient.auth.admin.createUser({
        email: doomedEmail,
        password: "TestPassword123!",
        email_confirm: true,
        user_metadata: { display_name: "Doomed User" },
      });
      expect(createErr).toBeNull();
      const doomedId = created.user!.id;

      await serviceClient.from("user_accounts").insert({
        user_id: doomedId,
        account_status: "active",
        terms_version: "v1.0",
        privacy_policy_version: "v1.0",
        terms_accepted_at: new Date().toISOString(),
      });

      const doomedClient = createClient<Database>(SUPABASE_URL, ANON_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      await doomedClient.auth.signInWithPassword({
        email: doomedEmail,
        password: "TestPassword123!",
      });

      // Give doomed user listings, media, conversations, messages, favourites, reports
      const { data: cat } = await serviceClient.from("categories").select("id").limit(1).single();
      const { data: city } = await serviceClient.from("cities").select("id").limit(1).single();

      const { data: doomedListing } = await serviceClient
        .from("listings")
        .insert({
          seller_id: doomedId,
          category_id: cat!.id,
          city_id: city!.id,
          title: "Doomed Listing",
          slug: `doomed-item-${Date.now()}`,
          status: "active",
        })
        .select("id")
        .single();

      await serviceClient
        .from("listings")
        .update({ status: "active" })
        .eq("id", doomedListing!.id);

      await serviceClient.from("listing_media").insert({
        listing_id: doomedListing!.id,
        uploader_id: doomedId,
        original_storage_path: "doomed/original.jpg",
        thumbnail_storage_path: "doomed/thumb.jpg",
        processing_status: "ready",
        content_type: "image/jpeg",
        file_size_bytes: 1024,
        original_filename: "original.jpg",
      });

      await serviceClient.from("listing_status_transitions").insert({
        listing_id: doomedListing!.id,
        actor_id: doomedId,
        from_status: "draft",
        to_status: "active",
        actor_kind: "seller",
        revision_at_transition: 1,
      });

      // Add conversation & message with counterparty (buyerUser)
      const { data: doomedConv } = await serviceClient
        .from("conversations")
        .insert({
          listing_id: doomedListing!.id,
          buyer_id: buyerUser.id,
          seller_id: doomedId,
        })
        .select("id")
        .single();

      const { data: doomedMsg, error: doomedMsgErr } = await serviceClient
        .from("messages")
        .insert({
          conversation_id: doomedConv!.id,
          sender_id: doomedId,
          content: "Historical message from doomed user",
          client_request_id: crypto.randomUUID(),
        })
        .select("id")
        .single();

      expect(doomedMsgErr).toBeNull();

      // Submit privacy deletion request as the doomed user
      const { data: privReq, error: reqErr } = await doomedClient
        .from("privacy_requests")
        .insert({
          request_type: "delete_account",
          status: "pending",
        })
        .select("id")
        .single();

      expect(reqErr).toBeNull();
      const requestId = privReq!.id;

      // Orchestrate account deletion using privileged orchestrator
      const result = await orchestrateAccountDeletion(requestId);
      expect(result.success).toBe(true);

      // Verify Supabase Auth user is deleted
      const { data: authUser } = await serviceClient.auth.admin.getUserById(doomedId);
      expect(authUser.user).toBeNull();

      // Verify counterparty conversation survives
      const { data: survivingConv } = await serviceClient
        .from("conversations")
        .select("id, seller_id, buyer_id")
        .eq("id", doomedConv!.id)
        .single();

      expect(survivingConv).toBeDefined();
      expect(survivingConv?.buyer_id).toBe(buyerUser.id);
      expect(survivingConv?.seller_id).toBeNull(); // Nullified via ON DELETE SET NULL!

      // Verify counterparty message survives
      const { data: survivingMsg } = await serviceClient
        .from("messages")
        .select("id, sender_id, content")
        .eq("id", doomedMsg!.id)
        .single();

      expect(survivingMsg).toBeDefined();
      expect(survivingMsg?.sender_id).toBeNull(); // Nullified via ON DELETE SET NULL!
      expect(survivingMsg?.content).toBe("Historical message from doomed user");

      // Verify retry is safe and idempotent
      const retryResult = await orchestrateAccountDeletion(requestId);
      expect(retryResult.success).toBe(true);
    });
  });

  describe("7. RPC-Only Mutation Boundaries & Direct DML Defense", () => {
    it("prohibits raw table INSERT of conversations with forged participants", async () => {
      if (!isSupabaseOnline) return;

      const { error } = await buyerClient.from("conversations").insert({
        listing_id: activeListingId,
        buyer_id: outsiderUser.id,
        seller_id: sellerUser.id,
      });
      expect(error).not.toBeNull();
    });

    it("prohibits raw table UPDATE of a conversation's listing/buyer/seller IDs", async () => {
      if (!isSupabaseOnline) return;

      const { error } = await buyerClient
        .from("conversations")
        .update({ buyer_id: outsiderUser.id, seller_id: outsiderUser.id })
        .eq("id", conversationId);
      expect(error).not.toBeNull();
    });

    it("prohibits raw table INSERT of messages with forged sender ID", async () => {
      if (!isSupabaseOnline) return;

      const { error } = await buyerClient.from("messages").insert({
        conversation_id: conversationId,
        sender_id: sellerUser.id,
        content: "Forged message claiming to be from seller",
        client_request_id: crypto.randomUUID(),
      });
      expect(error).not.toBeNull();
    });

    it("prohibits raw table UPDATE of an existing message", async () => {
      if (!isSupabaseOnline) return;

      const { error } = await buyerClient
        .from("messages")
        .update({ content: "Tampered historical content" })
        .eq("id", firstMessageId);
      expect(error).not.toBeNull();
    });

    it("prohibits raw table INSERT or UPDATE of conversation_read_states", async () => {
      if (!isSupabaseOnline) return;

      const { error: insErr } = await buyerClient.from("conversation_read_states").insert({
        conversation_id: conversationId,
        user_id: buyerUser.id,
        last_read_message_id: firstMessageId,
      });
      expect(insErr).not.toBeNull();

      const { error: updErr } = await buyerClient
        .from("conversation_read_states")
        .update({ last_read_message_id: firstMessageId })
        .eq("conversation_id", conversationId);
      expect(updErr).not.toBeNull();
    });

    it("prohibits raw table INSERT or UPDATE of user_blocks outside approved RPC", async () => {
      if (!isSupabaseOnline) return;

      const { error: insErr } = await buyerClient.from("user_blocks").insert({
        blocker_id: buyerUser.id,
        blocked_id: outsiderUser.id,
        reason: "arbitrary block insert",
      });
      expect(insErr).not.toBeNull();

      const { error: updErr } = await buyerClient
        .from("user_blocks")
        .update({ reason: "tampered reason" })
        .eq("blocker_id", buyerUser.id);
      expect(updErr).not.toBeNull();
    });

    it("prohibits raw table INSERT of reports with custom status or staff fields", async () => {
      if (!isSupabaseOnline) return;

      const { error } = await buyerClient.from("reports").insert({
        reporter_id: buyerUser.id,
        target_type: "user",
        target_id: sellerUser.id,
        reason: "harassment",
        status: "resolved",
        resolution_notes: "Auto-resolving my own report",
      });
      expect(error).not.toBeNull();
    });

    it("prohibits raw table UPDATE of reports to modify staff fields", async () => {
      if (!isSupabaseOnline) return;

      const { error } = await buyerClient
        .from("reports")
        .update({ status: "resolved", resolution_notes: "Tampering report status" })
        .eq("reporter_id", buyerUser.id);
      expect(error).not.toBeNull();
    });

    it("prohibits raw table INSERT of support_messages with is_internal_note = true", async () => {
      if (!isSupabaseOnline) return;

      const { error } = await buyerClient.from("support_messages").insert({
        ticket_id: crypto.randomUUID(),
        sender_id: buyerUser.id,
        content: "Attempting to inject an internal staff note",
        is_internal_note: true,
      });
      expect(error).not.toBeNull();
    });

    it("prohibits raw table INSERT or UPDATE of support_tickets to set priority or staff status", async () => {
      if (!isSupabaseOnline) return;

      const { error: insErr } = await buyerClient.from("support_tickets").insert({
        user_id: buyerUser.id,
        category: "general",
        subject: "Direct ticket insert test",
        priority: "urgent",
        status: "closed",
      });
      expect(insErr).not.toBeNull();

      const { error: updErr } = await buyerClient
        .from("support_tickets")
        .update({ priority: "urgent", status: "closed" })
        .eq("user_id", buyerUser.id);
      expect(updErr).not.toBeNull();
    });
  });
});
