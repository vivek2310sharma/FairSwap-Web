/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import crypto from "crypto";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
const ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

function createJwtClient(
  userId: string,
  email: string,
  expOffsetSec: number = 3600
): SupabaseClient<Database> {
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
    exp: now + expOffsetSec,
    iat: now - 60,
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

describe("Milestone 1.6 Reliability & Failure Injection", () => {
  let isSupabaseOnline = false;
  let serviceClient: SupabaseClient<Database>;
  let buyer: { id: string; email: string };
  let seller: { id: string; email: string };
  let buyerClient: SupabaseClient<Database>;
  let conversationId: string;

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

    async function ensureUser(email: string) {
      const { data: existing } = await serviceClient.auth.admin.listUsers({
        perPage: 1000,
      });
      let user = existing?.users.find((u) => u.email === email);
      if (!user) {
        const { data: created, error } = await serviceClient.auth.admin.createUser({
          email,
          password: "Password123!",
          email_confirm: true,
        });
        if (error) {
          if (error.message?.includes("already been registered")) {
            const { data: retryData } = await serviceClient.auth.admin.listUsers({
              perPage: 1000,
            });
            user = retryData?.users.find((u) => u.email === email);
            if (!user) throw new Error(`User ${email} exists but cannot be found`);
          } else {
            throw error;
          }
        } else if (!created.user) {
          throw new Error("Failed user creation");
        } else {
          user = created.user;
        }
      }
      await serviceClient
        .from("user_accounts")
        .update({ account_status: "active" })
        .eq("user_id", user.id);
      await serviceClient.from("profiles").upsert({
        id: user.id,
        display_name: email.split("@")[0],
      });
      return { id: user.id, email: user.email! };
    }

    buyer = await ensureUser("rel_buyer_16@fairswap.local");
    seller = await ensureUser("rel_seller_16@fairswap.local");
    buyerClient = createJwtClient(buyer.id, buyer.email);

    // Setup active listing and conversation
    const { data: cat } = await serviceClient.from("categories").select("id").limit(1).single();
    const { data: city } = await serviceClient.from("cities").select("id").limit(1).single();

    const { data: listing } = await serviceClient
      .from("listings")
      .insert({
        seller_id: seller.id,
        category_id: cat!.id,
        city_id: city!.id,
        title: "Reliability Test Item",
        slug: `rel-item-${Date.now()}`,
        description: "Test listing for reliability verification",
        price_paise: 25000,
        price_type: "fixed",
        condition: "good",
      })
      .select("id")
      .single();

    await serviceClient.from("listings").update({ status: "active" }).eq("id", listing!.id);

    // Start conversation
    const startRes = await buyerClient.rpc("start_conversation" as any, {
      listing_id: listing!.id,
      content: "Hello from reliability test",
      client_request_id: `init-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    });

    if (startRes.error) throw startRes.error;
    const initData = startRes.data as any;
    conversationId = initData?.conversation_id;
    if (!conversationId) throw new Error("Failed to obtain conversation_id");
  });

  it("handles duplicate client_request_id idempotently without inserting duplicate messages", async () => {
    if (!isSupabaseOnline) return;

    const duplicateRequestId = `idemp-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    // First send
    const { data: res1, error: err1 } = await buyerClient.rpc("send_message" as any, {
      conversation_id: conversationId,
      content: "Idempotency test payload",
      client_request_id: duplicateRequestId,
    });
    expect(err1).toBeNull();
    const msg1 = (res1 as any)?.message || res1;
    expect(msg1).toBeTruthy();

    // Duplicate send with exact same client_request_id
    const { data: res2, error: err2 } = await buyerClient.rpc("send_message" as any, {
      conversation_id: conversationId,
      content: "Idempotency test payload",
      client_request_id: duplicateRequestId,
    });
    expect(err2).toBeNull();
    const msg2 = (res2 as any)?.message || res2;
    expect(msg2).toBeTruthy();

    // Must return the exact same message ID
    expect(msg2.id).toBe(msg1.id);

    // Verify DB count has exactly 1 row for this client_request_id
    const { data: rows } = await serviceClient
      .from("messages")
      .select("id")
      .eq("client_request_id", duplicateRequestId);

    expect(rows).not.toBeNull();
    expect(rows!.length).toBe(1);
  });

  it("rejects operations cleanly when session is expired (expired JWT)", async () => {
    if (!isSupabaseOnline) return;

    // Create client with token expired 1 hour ago
    const expiredClient = createJwtClient(buyer.id, buyer.email, -3600);

    const { error } = await expiredClient.rpc("send_message" as any, {
      conversation_id: conversationId,
      content: "Should fail due to expired token",
      client_request_id: `exp-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    });

    expect(error).not.toBeNull();
  });

  it("rejects messages exceeding max content length limit (2000 chars)", async () => {
    if (!isSupabaseOnline) return;

    const oversizeContent = "A".repeat(2001);
    const { error } = await buyerClient.rpc("send_message" as any, {
      conversation_id: conversationId,
      content: oversizeContent,
      client_request_id: `oversize-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    });

    expect(error).not.toBeNull();
    expect(error?.message).toMatch(/Message length must be between 1 and 2000 characters/i);
  });

  it("prohibits suspended user from sending messages", async () => {
    if (!isSupabaseOnline) return;

    // Suspend buyer
    await serviceClient
      .from("user_accounts")
      .update({ account_status: "suspended" })
      .eq("user_id", buyer.id);

    const { error } = await buyerClient.rpc("send_message" as any, {
      conversation_id: conversationId,
      content: "Attempt from suspended account",
      client_request_id: `susp-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    });

    expect(error).not.toBeNull();
    expect(error?.message).toMatch(/Account restricted: messaging requires active account/i);

    // Reinstate buyer
    await serviceClient
      .from("user_accounts")
      .update({ account_status: "active" })
      .eq("user_id", buyer.id);
  });
});
