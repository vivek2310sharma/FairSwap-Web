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

function createJwtClient(userId: string, email: string, aal: "aal1" | "aal2" = "aal2"): SupabaseClient<Database> {
  const secret = "super-secret-jwt-token-with-at-least-32-characters-long";
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: "supabase-demo",
    sub: userId,
    aud: "authenticated",
    role: "authenticated",
    email,
    aal,
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

describe("Milestone 1.6 User Moderation & Security Hardening", () => {
  let isSupabaseOnline = false;
  let serviceClient: SupabaseClient<Database>;
  let anonClient: SupabaseClient<Database>;

  let adminUser: { id: string; email: string };
  let modUser: { id: string; email: string };
  let staffModUser2: { id: string; email: string };
  let normalUser: { id: string; email: string };

  let adminAal2Client: SupabaseClient<Database>;
  let modAal2Client: SupabaseClient<Database>;
  let modAal1Client: SupabaseClient<Database>;
  let normalUserClient: SupabaseClient<Database>;

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
    anonClient = createClient<Database>(SUPABASE_URL, ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    async function ensureUser(email: string, role?: "administrator" | "moderator") {
      // First, try to find the user by iterating pages (handles >50 users)
      let user: { id: string; email?: string } | undefined;

      // Try direct lookup via listUsers with filter
      const { data: existing } = await serviceClient.auth.admin.listUsers({
        perPage: 1000,
      });
      user = existing?.users.find((u) => u.email === email);

      if (!user) {
        const { data: created, error } = await serviceClient.auth.admin.createUser({
          email,
          password: "Password123!",
          email_confirm: true,
          user_metadata: {
            display_name: email.split("@")[0],
            terms_accepted: "true",
            terms_version: "2026-09-18",
            privacy_policy_version: "2026-09-18",
            acceptable_use_version: "2026-09-18",
            age_confirmed: "true",
            minimum_age_confirmed: 18,
          },
        });
        if (error) {
          // Handle "already registered" — user exists but wasn't in the first page
          if (error.message?.includes("already been registered")) {
            // Re-fetch with larger page to find the user
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

      await serviceClient.from("user_accounts").upsert({
        user_id: user.id,
        account_status: "active",
        terms_version: "2026-09-18",
        privacy_policy_version: "2026-09-18",
        acceptable_use_version: "2026-09-18",
        age_confirmed_at: new Date().toISOString(),
        minimum_age_confirmed: 18,
        terms_accepted_at: new Date().toISOString(),
      });

      await serviceClient.from("profiles").upsert({
        id: user.id,
        display_name: email.split("@")[0],
      });

      if (role) {
        await serviceClient.from("staff_roles").upsert({
          user_id: user.id,
          role,
        });
      } else {
        await serviceClient.from("staff_roles").delete().eq("user_id", user.id);
      }

      return { id: user.id, email: user.email! };
    }

    adminUser = await ensureUser("sec_admin_16@fairswap.local", "administrator");
    modUser = await ensureUser("sec_mod_16@fairswap.local", "moderator");
    staffModUser2 = await ensureUser("sec_mod2_16@fairswap.local", "moderator");
    normalUser = await ensureUser("sec_normal_16@fairswap.local");

    adminAal2Client = createJwtClient(adminUser.id, adminUser.email, "aal2");
    modAal2Client = createJwtClient(modUser.id, modUser.email, "aal2");
    modAal1Client = createJwtClient(modUser.id, modUser.email, "aal1");
    normalUserClient = createJwtClient(normalUser.id, normalUser.email, "aal2");
  });

  // 1. Unauthenticated / Anon rejected
  it("rejects unauthenticated/anon caller from admin_update_user_account_status", async () => {
    if (!isSupabaseOnline) return;
    const { error } = await anonClient.rpc("admin_update_user_account_status" as any, {
      p_target_user_id: normalUser.id,
      p_new_status: "suspended",
      p_reason: "Valid moderation reason for testing",
    });
    expect(error).not.toBeNull();
  });

  // 2. Normal user rejected
  it("rejects non-staff authenticated user from admin_update_user_account_status", async () => {
    if (!isSupabaseOnline) return;
    const { error } = await normalUserClient.rpc("admin_update_user_account_status" as any, {
      p_target_user_id: normalUser.id,
      p_new_status: "suspended",
      p_reason: "Valid moderation reason for testing",
    });
    expect(error).not.toBeNull();
    expect(error?.message).toMatch(/Forbidden|not authenticated/i);
  });

  // 3. Staff without AAL2 (AAL1) rejected
  it("rejects moderator with only AAL1 assurance", async () => {
    if (!isSupabaseOnline) return;
    const { error } = await modAal1Client.rpc("admin_update_user_account_status" as any, {
      p_target_user_id: normalUser.id,
      p_new_status: "suspended",
      p_reason: "Valid moderation reason for testing",
    });
    expect(error).not.toBeNull();
    expect(error?.message).toMatch(/Forbidden: requires active administrator or moderator with AAL2/i);
  });

  // 4. Staff cannot modify own account status
  it("rejects staff attempting to alter own account status", async () => {
    if (!isSupabaseOnline) return;
    const { error } = await adminAal2Client.rpc("admin_update_user_account_status" as any, {
      p_target_user_id: adminUser.id,
      p_new_status: "suspended",
      p_reason: "Self moderation attempt is invalid",
    });
    expect(error).not.toBeNull();
    expect(error?.message).toMatch(/Forbidden: staff cannot alter own account status/i);
  });

  // 5. Reject NULL status
  it("rejects NULL status transition", async () => {
    if (!isSupabaseOnline) return;
    const { error } = await adminAal2Client.rpc("admin_update_user_account_status" as any, {
      p_target_user_id: normalUser.id,
      p_new_status: null,
      p_reason: "Valid moderation reason for testing",
    });
    expect(error).not.toBeNull();
    expect(error?.message).toMatch(/Invalid status transition/i);
  });

  // 6. Reject invalid status transitions (deletion_pending, deleted)
  it("rejects direct attempts to set deletion_pending or deleted", async () => {
    if (!isSupabaseOnline) return;
    const { error: errorDelPending } = await adminAal2Client.rpc("admin_update_user_account_status" as any, {
      p_target_user_id: normalUser.id,
      p_new_status: "deletion_pending",
      p_reason: "Attempting invalid deletion_pending transition",
    });
    expect(errorDelPending).not.toBeNull();
    expect(errorDelPending?.message).toMatch(/Invalid status transition/i);

    const { error: errorDeleted } = await adminAal2Client.rpc("admin_update_user_account_status" as any, {
      p_target_user_id: normalUser.id,
      p_new_status: "deleted",
      p_reason: "Attempting invalid deleted transition",
    });
    expect(errorDeleted).not.toBeNull();
    expect(errorDeleted?.message).toMatch(/Invalid status transition/i);
  });

  // 7. Reject NULL reason
  it("rejects NULL moderation reason", async () => {
    if (!isSupabaseOnline) return;
    const { error } = await adminAal2Client.rpc("admin_update_user_account_status" as any, {
      p_target_user_id: normalUser.id,
      p_new_status: "suspended",
      p_reason: null,
    });
    expect(error).not.toBeNull();
    expect(error?.message).toMatch(/Moderation reason must be between 10 and 500 characters/i);
  });

  // 8. Reject reason < 10 characters (even after whitespace trimming)
  it("rejects moderation reason with fewer than 10 characters after trimming", async () => {
    if (!isSupabaseOnline) return;
    const { error } = await adminAal2Client.rpc("admin_update_user_account_status" as any, {
      p_target_user_id: normalUser.id,
      p_new_status: "suspended",
      p_reason: "   short   ",
    });
    expect(error).not.toBeNull();
    expect(error?.message).toMatch(/Moderation reason must be between 10 and 500 characters/i);
  });

  // 9. Reject reason > 500 characters
  it("rejects moderation reason exceeding 500 characters", async () => {
    if (!isSupabaseOnline) return;
    const tooLong = "x".repeat(501);
    const { error } = await adminAal2Client.rpc("admin_update_user_account_status" as any, {
      p_target_user_id: normalUser.id,
      p_new_status: "suspended",
      p_reason: tooLong,
    });
    expect(error).not.toBeNull();
    expect(error?.message).toMatch(/Moderation reason must be between 10 and 500 characters/i);
  });

  // 10. Reject non-existent target user and verify ZERO audit logs created
  it("rejects non-existent target user and creates zero audit logs", async () => {
    if (!isSupabaseOnline) return;
    const fakeUserId = "00000000-0000-0000-0000-999999999999";
    const auditBefore = await serviceClient
      .from("audit_logs")
      .select("id")
      .eq("target_id", fakeUserId);

    const { error } = await adminAal2Client.rpc("admin_update_user_account_status" as any, {
      p_target_user_id: fakeUserId,
      p_new_status: "suspended",
      p_reason: "Valid reason but target user does not exist",
    });
    expect(error).not.toBeNull();
    expect(error?.message).toMatch(/Target user does not exist/i);

    const auditAfter = await serviceClient
      .from("audit_logs")
      .select("id")
      .eq("target_id", fakeUserId);
    expect(auditAfter.data?.length).toBe(auditBefore.data?.length);
  });

  // 11. Reject no-op status transition and verify ZERO audit logs created
  it("rejects no-op status transition and creates zero audit logs", async () => {
    if (!isSupabaseOnline) return;
    // ensure normalUser is active
    await serviceClient
      .from("user_accounts")
      .update({ account_status: "active" })
      .eq("user_id", normalUser.id);

    const auditBefore = await serviceClient
      .from("audit_logs")
      .select("id")
      .eq("target_id", normalUser.id);

    const { error } = await adminAal2Client.rpc("admin_update_user_account_status" as any, {
      p_target_user_id: normalUser.id,
      p_new_status: "active",
      p_reason: "Valid reason but account is already active",
    });
    expect(error).not.toBeNull();
    expect(error?.message).toMatch(/Target account already has status active/i);

    const auditAfter = await serviceClient
      .from("audit_logs")
      .select("id")
      .eq("target_id", normalUser.id);
    expect(auditAfter.data?.length).toBe(auditBefore.data?.length);
  });

  // 12. Moderator cannot modify ANY staff account
  it("rejects moderator attempting to modify another staff account", async () => {
    if (!isSupabaseOnline) return;
    // Ensure target staff is active
    await serviceClient
      .from("user_accounts")
      .update({ account_status: "active" })
      .eq("user_id", staffModUser2.id);

    const { error } = await modAal2Client.rpc("admin_update_user_account_status" as any, {
      p_target_user_id: staffModUser2.id,
      p_new_status: "suspended",
      p_reason: "Moderator attempting to suspend another staff member",
    });
    expect(error).not.toBeNull();
    expect(error?.message).toMatch(/Forbidden: moderators cannot modify staff accounts/i);
  });

  // 13. Successful suspension by Moderator with atomic audit log recording old_status, new_status, reason
  it("allows moderator to suspend regular user and logs old_status, new_status, reason", async () => {
    if (!isSupabaseOnline) return;
    // Ensure active
    await serviceClient
      .from("user_accounts")
      .update({ account_status: "active" })
      .eq("user_id", normalUser.id);

    const reason = "Suspended for repeated policy violations in marketplace chat";
    const { error } = await modAal2Client.rpc("admin_update_user_account_status" as any, {
      p_target_user_id: normalUser.id,
      p_new_status: "suspended",
      p_reason: reason,
    });
    expect(error).toBeNull();

    // Verify account mutated
    const { data: updatedAccount } = await serviceClient
      .from("user_accounts")
      .select("account_status")
      .eq("user_id", normalUser.id)
      .single();
    expect(updatedAccount?.account_status).toBe("suspended");

    // Verify audit log
    const { data: logs } = await serviceClient
      .from("audit_logs")
      .select("*")
      .eq("target_entity", "user_accounts")
      .eq("target_id", normalUser.id)
      .order("created_at", { ascending: false })
      .limit(1);

    expect(logs).not.toBeNull();
    expect(logs!.length).toBe(1);
    const log = logs![0];
    expect(log.action).toBe("user_account.status_update");
    expect(log.actor_id).toBe(modUser.id);
    const details = log.details as any;
    expect(details.old_status).toBe("active");
    expect(details.new_status).toBe("suspended");
    expect(details.reason).toBe(reason);
  });

  // 14. Administrator can modify staff accounts (e.g. suspend a moderator)
  it("allows administrator to suspend a staff member (except self)", async () => {
    if (!isSupabaseOnline) return;
    // Ensure staff member is active
    await serviceClient
      .from("user_accounts")
      .update({ account_status: "active" })
      .eq("user_id", staffModUser2.id);

    const reason = "Administrative disciplinary suspension of staff role";
    const { error } = await adminAal2Client.rpc("admin_update_user_account_status" as any, {
      p_target_user_id: staffModUser2.id,
      p_new_status: "suspended",
      p_reason: reason,
    });
    expect(error).toBeNull();

    const { data: updatedAccount } = await serviceClient
      .from("user_accounts")
      .select("account_status")
      .eq("user_id", staffModUser2.id)
      .single();
    expect(updatedAccount?.account_status).toBe("suspended");
  });

  // 15. Reinstate user by Moderator
  it("allows moderator to reinstate suspended user", async () => {
    if (!isSupabaseOnline) return;
    const reason = "Reinstated after successful appeal and policy review";
    const { error } = await modAal2Client.rpc("admin_update_user_account_status" as any, {
      p_target_user_id: normalUser.id,
      p_new_status: "active",
      p_reason: reason,
    });
    expect(error).toBeNull();

    const { data: updatedAccount } = await serviceClient
      .from("user_accounts")
      .select("account_status")
      .eq("user_id", normalUser.id)
      .single();
    expect(updatedAccount?.account_status).toBe("active");
  });

  // 16. Suspension hides public listings immediately
  it("verifies public listings disappear from public search and direct visibility when user is suspended", async () => {
    if (!isSupabaseOnline) return;
    // Ensure normalUser is active
    await serviceClient
      .from("user_accounts")
      .update({ account_status: "active" })
      .eq("user_id", normalUser.id);

    // Get a category and city for listing
    const { data: cat } = await serviceClient.from("categories").select("id").limit(1).single();
    const { data: city } = await serviceClient.from("cities").select("id").limit(1).single();

    // Create listing for normalUser
    const { data: listing, error: createError } = await serviceClient
      .from("listings")
      .insert({
        seller_id: normalUser.id,
        category_id: cat!.id,
        city_id: city!.id,
        title: "Suspension Test Item",
        slug: `suspension-test-${Date.now()}`,
        description: "Test description for suspension visibility check",
        price_paise: 50000,
        price_type: "fixed",
        condition: "good",
      })
      .select("id")
      .single();

    expect(createError).toBeNull();
    const listingId = listing!.id;

    // Trigger forces draft on insert, so set status to active
    await serviceClient
      .from("listings")
      .update({ status: "active" })
      .eq("id", listingId);

    // Direct check: visible when active
    const { data: isVisibleBefore } = await serviceClient.rpc("is_listing_publicly_visible", {
      listing_id: listingId,
    });
    expect(isVisibleBefore).toBe(true);

    // Suspend normalUser
    await modAal2Client.rpc("admin_update_user_account_status" as any, {
      p_target_user_id: normalUser.id,
      p_new_status: "suspended",
      p_reason: "Account suspended to verify listing hiding behavior",
    });

    // Direct check: immediately NOT visible when user is suspended
    const { data: isVisibleAfter } = await serviceClient.rpc("is_listing_publicly_visible", {
      listing_id: listingId,
    });
    expect(isVisibleAfter).toBe(false);

    // Cleanup: reinstate user
    await adminAal2Client.rpc("admin_update_user_account_status" as any, {
      p_target_user_id: normalUser.id,
      p_new_status: "active",
      p_reason: "Reinstating user after listing visibility test",
    });
  });

  // 17. Search RPC security boundaries
  it("enforces security boundaries on admin_search_users RPC", async () => {
    if (!isSupabaseOnline) return;

    // Anon cannot search
    const { error: anonError } = await anonClient.rpc("admin_search_users" as any, {
      p_query: "test",
    });
    expect(anonError).not.toBeNull();

    // Normal user cannot search
    const { error: userError } = await normalUserClient.rpc("admin_search_users" as any, {
      p_query: "test",
    });
    expect(userError).not.toBeNull();

    // Moderator with AAL1 cannot search
    const { error: aal1Error } = await modAal1Client.rpc("admin_search_users" as any, {
      p_query: "test",
    });
    expect(aal1Error).not.toBeNull();

    // Moderator with AAL2 can search
    const { data: modResults, error: modError } = await modAal2Client.rpc("admin_search_users" as any, {
      p_query: normalUser.email,
    });
    expect(modError).toBeNull();
    expect(modResults).not.toBeNull();
    const results = modResults as any[];
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.find((r) => r.user_id === normalUser.id)).toBeTruthy();
  });
});
