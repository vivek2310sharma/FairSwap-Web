import { describe, it, expect, beforeAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
const ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

describe("Milestone 1.3 Direct-API RLS, Lifecycle & Binding Amendments", () => {
  let isSupabaseOnline = false;
  let serviceClient: SupabaseClient<Database>;
  let sellerClient: SupabaseClient<Database>;
  let otherSellerClient: SupabaseClient<Database>;
  let moderatorClient: SupabaseClient<Database>;

  let sellerUser: { id: string; email: string };

  let testCategoryId: string;
  let testCityId: string;

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

    // Fetch reference category and city
    const { data: cat } = await serviceClient.from("categories").select("id").limit(1).single();
    testCategoryId = cat!.id;

    const { data: city } = await serviceClient.from("cities").select("id").limit(1).single();
    testCityId = city!.id;

    // Helper to create test user with active account
    async function setupTestUser(email: string, role?: string) {
      const { data: existing } = await serviceClient.auth.admin.listUsers({ perPage: 1000 });
      let user = existing?.users.find((u) => u.email === email);

      if (!user) {
        const { data: created } = await serviceClient.auth.admin.createUser({
          email,
          password: "TestPassword123!",
          email_confirm: true,
          user_metadata: {
            display_name: email.split("@")[0],
            terms_version: "2026-09-01",
            privacy_policy_version: "2026-09-01",
          },
        });
        if (created?.user) {
          user = created.user;
        } else {
          const { data: retryList } = await serviceClient.auth.admin.listUsers({ perPage: 1000 });
          user = retryList?.users.find((u) => u.email === email);
        }
      } else {
        await serviceClient.auth.admin.updateUserById(user.id, {
          password: "TestPassword123!",
          email_confirm: true,
        });
      }

      if (!user) {
        throw new Error(`Failed to find or create test user: ${email}`);
      }

      if (role) {
        await serviceClient.from("staff_roles").upsert(
          { user_id: user.id, role: role as Database["public"]["Enums"]["staff_role_enum"] },
          { onConflict: "user_id" }
        );
      }

      const tempClient = createClient<Database>(SUPABASE_URL, ANON_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data: authData, error: signInError } = await tempClient.auth.signInWithPassword({
        email,
        password: "TestPassword123!",
      });

      if (signInError || !authData.session) {
        throw new Error(`Failed to sign in ${email}: ${signInError?.message}`);
      }

      const client = createClient<Database>(SUPABASE_URL, ANON_KEY, {
        global: {
          headers: {
            Authorization: `Bearer ${authData.session.access_token}`,
          },
        },
        auth: { autoRefreshToken: false, persistSession: false },
      });

      return { user: { id: user.id, email: user.email! }, client };
    }

    const s1 = await setupTestUser("seller_rls_1@fairswap.local");
    sellerUser = s1.user;
    sellerClient = s1.client;

    const s2 = await setupTestUser("seller_rls_2@fairswap.local");
    otherSellerClient = s2.client;

    const m1 = await setupTestUser("moderator_rls_1@fairswap.local", "moderator");
    moderatorClient = m1.client;
  });

  function checkPrerequisite() {
    return isSupabaseOnline;
  }

  // 1. Binding Amendment 5: Anonymous Database Privileges Tightened
  it("test_anonymous_listing_select_denied", async () => {
    if (!checkPrerequisite()) return;
    const anonClient = createClient(SUPABASE_URL, ANON_KEY);
    const { data, error } = await anonClient.from("listings").select("id, title");
    // Anonymous access is revoked at table level in 1.3
    expect(error).not.toBeNull();
    expect(data).toBeNull();
  });

  // 2. Binding Amendment 6: Storage Fully Server-Mediated
  it("test_direct_client_storage_denied", async () => {
    if (!checkPrerequisite()) return;
    // Authenticated client attempt to write to listing-originals directly must fail
    const dummyBuffer = Buffer.from("dummy data");
    const { error: uploadError } = await sellerClient.storage
      .from("listing-originals")
      .upload("unauthorized-path.jpg", dummyBuffer);

    expect(uploadError).not.toBeNull();

    // Authenticated client attempt to download from private bucket without signed URL must fail
    const { error: downloadError } = await sellerClient.storage
      .from("listing-originals")
      .download("unauthorized-path.jpg");

    expect(downloadError).not.toBeNull();
  });

  // 3. Trusted fields cannot be forged via direct INSERT
  it("test_trusted_fields_rejected_or_overwritten_on_insert", async () => {
    if (!checkPrerequisite()) return;
    // Attempting to insert into columns not granted (status, revision, seller_id) fails at column grant level
    const { error: forgedColumnError } = await sellerClient
      .from("listings")
      .insert({
        title: "Forged Status Item",
        category_id: testCategoryId,
        city_id: testCityId,
        status: "active",
      });

    expect(forgedColumnError).not.toBeNull();
    expect(forgedColumnError?.code).toBe("42501"); // PostgreSQL privilege error

    // Inserting only granted user-editable columns succeeds and trigger populates trusted fields
    const { data: legitimateInsert, error: legitError } = await sellerClient
      .from("listings")
      .insert({
        title: "Legitimate Draft Item",
        category_id: testCategoryId,
        city_id: testCityId,
        price_type: "fixed",
        price_paise: 50000,
        condition: "good",
      })
      .select("id, seller_id, status, revision, cover_photo_id")
      .single();

    expect(legitError).toBeNull();
    expect(legitimateInsert?.seller_id).toBe(sellerUser.id);
    expect(legitimateInsert?.status).toBe("draft");
    expect(legitimateInsert?.revision).toBe(1);
    expect(legitimateInsert?.cover_photo_id).toBeNull();
  });

  // 4. Binding Amendment 1: Closed Paused-Listing Moderation Bypass
  it("test_paused_listing_material_edit_triggers_rereview", async () => {
    if (!checkPrerequisite()) return;

    // Step A: Create listing and make it active (simulating approved state)
    const { data: newListing } = await sellerClient
      .from("listings")
      .insert({
        title: "Initial Approved Phone",
        category_id: testCategoryId,
        city_id: testCityId,
        price_type: "fixed",
        price_paise: 500000,
        condition: "good",
      })
      .select("id")
      .single();

    const listingId = newListing!.id;

    // Elevate to active via service role
    await serviceClient
      .from("listings")
      .update({
        status: "active",
        published_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 86400 * 1000).toISOString(),
      })
      .eq("id", listingId);

    // Step B: Seller pauses the listing
    const { error: pauseError } = await sellerClient.rpc("seller_transition_listing", {
      listing_id: listingId,
      action: "pause",
    });
    expect(pauseError).toBeNull();

    const { data: pausedRow } = await sellerClient
      .from("listings")
      .select("status, revision")
      .eq("id", listingId)
      .single();
    expect(pausedRow?.status).toBe("paused");
    const preEditRevision = pausedRow!.revision;

    // Step C: Seller performs a material edit while in paused state
    const { error: editError } = await sellerClient
      .from("listings")
      .update({
        title: "Materially Modified Phone While Paused",
        price_paise: 200000,
      })
      .eq("id", listingId);
    expect(editError).toBeNull();

    // Verify listing is now pending_review with incremented revision
    const { data: reReviewRow } = await sellerClient
      .from("listings")
      .select("status, revision")
      .eq("id", listingId)
      .single();

    expect(reReviewRow?.status).toBe("pending_review");
    expect(reReviewRow?.revision).toBe(preEditRevision + 1);

    // Step D: Seller tries to resume directly to active to bypass review -> MUST BE DENIED
    const { error: resumeError } = await sellerClient.rpc("seller_transition_listing", {
      listing_id: listingId,
      action: "resume",
    });

    expect(resumeError).not.toBeNull();
    expect(resumeError?.message).toMatch(/only paused listings can be resumed/i);
  });

  // 5. Binding Amendment 2: Documented rejected -> draft Edit Transition
  it("test_rejected_listing_edit_transitions_to_draft_and_clears_reason", async () => {
    if (!checkPrerequisite()) return;

    // Create listing and reject it
    const { data: newListing } = await sellerClient
      .from("listings")
      .insert({
        title: "Will Be Rejected Item",
        category_id: testCategoryId,
        city_id: testCityId,
        condition: "poor",
      })
      .select("id")
      .single();

    const listingId = newListing!.id;

    // Put into pending_review, then reject via serviceClient
    await serviceClient
      .from("listings")
      .update({
        status: "rejected",
        rejection_reason: "Item condition description does not match photographs.",
      })
      .eq("id", listingId);

    const { data: rejectedRow } = await sellerClient
      .from("listings")
      .select("status, revision, rejection_reason")
      .eq("id", listingId)
      .single();

    expect(rejectedRow?.status).toBe("rejected");
    expect(rejectedRow?.rejection_reason).toBe("Item condition description does not match photographs.");
    const preEditRevision = rejectedRow!.revision;

    // Seller makes an allowed edit to the rejected listing
    const { error: editError } = await sellerClient
      .from("listings")
      .update({
        title: "Corrected Title for Item",
        description: "Updated detailed description of the item.",
      })
      .eq("id", listingId);

    expect(editError).toBeNull();

    // Verify DB transition: status -> 'draft', revision incremented, rejection_reason cleared
    const { data: updatedRow } = await sellerClient
      .from("listings")
      .select("status, revision, rejection_reason")
      .eq("id", listingId)
      .single();

    expect(updatedRow?.status).toBe("draft");
    expect(updatedRow?.revision).toBe(preEditRevision + 1);
    expect(updatedRow?.rejection_reason).toBeNull();

    // Verify historical rejection reason is preserved in listing_status_transitions
    const { data: transitions } = await sellerClient
      .from("listing_status_transitions")
      .select("to_status, reason")
      .eq("listing_id", listingId)
      .eq("to_status", "rejected");

    expect(transitions).toHaveLength(1);
    expect(transitions![0].reason).toBe("Item condition description does not match photographs.");
  });

  // 6. Binding Amendment 3: Direct Data API DELETE on listing_media is DENIED
  it("test_direct_data_api_media_delete_denied", async () => {
    if (!checkPrerequisite()) return;

    // Create a listing and media record
    const { data: newListing } = await sellerClient
      .from("listings")
      .insert({
        title: "Media Test Item",
        category_id: testCategoryId,
        city_id: testCityId,
      })
      .select("id")
      .single();

    const listingId = newListing!.id;

    const { data: newMedia } = await sellerClient
      .from("listing_media")
      .insert({
        listing_id: listingId,
        original_filename: "test.jpg",
        content_type: "image/jpeg",
        file_size_bytes: 1024,
      })
      .select("id")
      .single();

    const mediaId = newMedia!.id;

    // Direct Data API delete attempt by owner MUST FAIL
    const { error: deleteError } = await sellerClient
      .from("listing_media")
      .delete()
      .eq("id", mediaId);

    expect(deleteError).not.toBeNull();

    // Authorized server deletion flow via service-role RPC MUST SUCCEED
    const { error: serverDeleteError } = await serviceClient.rpc("delete_listing_media_internal", {
      listing_id: listingId,
      media_id: mediaId,
    });

    expect(serverDeleteError).toBeNull();

    // Verify media is deleted
    const { data: checkMedia } = await sellerClient
      .from("listing_media")
      .select("id")
      .eq("id", mediaId);
    expect(checkMedia).toHaveLength(0);
  });

  // 7. Service-Role-Only RPCs Reject Authenticated/Anon Callers
  it("test_service_role_rpcs_reject_authenticated_callers", async () => {
    if (!checkPrerequisite()) return;

    // seller attempts to call record_media_processing_result
    const { error: rpc1Error } = await sellerClient.rpc("record_media_processing_result", {
      media_id: "00000000-0000-0000-0000-000000000001",
      paths: {},
      dimensions: {},
      status: "ready",
      error: undefined,
    });
    expect(rpc1Error).not.toBeNull();

    // seller attempts to call expire_listing
    const { error: rpc2Error } = await sellerClient.rpc("expire_listing", {
      listing_id: "00000000-0000-0000-0000-000000000001",
    });
    expect(rpc2Error).not.toBeNull();

    // seller attempts to call delete_listing_media_internal directly
    const { error: rpc3Error } = await sellerClient.rpc("delete_listing_media_internal", {
      listing_id: "00000000-0000-0000-0000-000000000001",
      media_id: "00000000-0000-0000-0000-000000000001",
    });
    expect(rpc3Error).not.toBeNull();
  });

  // 8. Photo Reorder on Active Listing Triggers Re-Review
  it("test_photo_reorder_triggers_rereview_for_active_listing", async () => {
    if (!checkPrerequisite()) return;

    // Create listing
    const { data: listing } = await sellerClient
      .from("listings")
      .insert({
        title: "Photo Reorder Item",
        category_id: testCategoryId,
        city_id: testCityId,
      })
      .select("id")
      .single();

    const listingId = listing!.id;

    // Add two media rows
    const { data: m1 } = await sellerClient
      .from("listing_media")
      .insert({
        listing_id: listingId,
        original_filename: "m1.jpg",
        content_type: "image/jpeg",
        file_size_bytes: 1000,
      })
      .select("id")
      .single();

    await sellerClient
      .from("listing_media")
      .insert({
        listing_id: listingId,
        original_filename: "m2.jpg",
        content_type: "image/jpeg",
        file_size_bytes: 1000,
      });

    // Make listing active
    await serviceClient
      .from("listings")
      .update({
        status: "active",
        published_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 86400 * 1000).toISOString(),
      })
      .eq("id", listingId);

    const { data: activeRow } = await sellerClient
      .from("listings")
      .select("status, revision")
      .eq("id", listingId)
      .single();
    const preReorderRev = activeRow!.revision;

    // Update display_order of m1
    const { error: reorderError } = await sellerClient
      .from("listing_media")
      .update({ display_order: 5 })
      .eq("id", m1!.id);

    expect(reorderError).toBeNull();

    // Listing must transition to pending_review and increment revision
    const { data: rereviewRow } = await sellerClient
      .from("listings")
      .select("status, revision")
      .eq("id", listingId)
      .single();

    expect(rereviewRow?.status).toBe("pending_review");
    expect(rereviewRow?.revision).toBe(preReorderRev + 1);
  });

  // 9. Renewal limit is strictly 3
  it("test_renewal_limit_enforced_at_3", async () => {
    if (!checkPrerequisite()) return;

    const { data: listing } = await sellerClient
      .from("listings")
      .insert({
        title: "Expiring Item",
        category_id: testCategoryId,
        city_id: testCityId,
      })
      .select("id")
      .single();

    const listingId = listing!.id;

    // Set to expired with renewal_count = 3
    await serviceClient
      .from("listings")
      .update({
        status: "expired",
        renewal_count: 3,
      })
      .eq("id", listingId);

    // Attempt renew
    const { error: renewError } = await sellerClient.rpc("seller_transition_listing", {
      listing_id: listingId,
      action: "renew",
    });

    expect(renewError).not.toBeNull();
    expect(renewError?.message).toMatch(/renewal limit of 3 reached/i);
  });

  // 10. Self-approval denied
  it("test_self_approval_denied_for_moderator_listing", async () => {
    if (!checkPrerequisite()) return;

    // Moderator creates a listing
    const { data: modListing } = await moderatorClient
      .from("listings")
      .insert({
        title: "Moderator's Own Listing",
        category_id: testCategoryId,
        city_id: testCityId,
      })
      .select("id")
      .single();

    const listingId = modListing!.id;

    await serviceClient
      .from("listings")
      .update({ status: "pending_review" })
      .eq("id", listingId);

    // Moderator tries to approve own listing
    const { error: approveError } = await moderatorClient.rpc("moderate_listing", {
      listing_id: listingId,
      action: "approve",
    });

    expect(approveError).not.toBeNull();
    expect(approveError?.message).toMatch(/cannot review their own listing/i);
  });

  // 11. Cross-owner edit denied
  it("test_cross_owner_listing_edit_denied", async () => {
    if (!checkPrerequisite()) return;

    const { data: listing } = await sellerClient
      .from("listings")
      .insert({
        title: "Owner 1 Private Item",
        category_id: testCategoryId,
        city_id: testCityId,
      })
      .select("id")
      .single();

    // Other seller tries to update Owner 1's listing
    await otherSellerClient
      .from("listings")
      .update({ title: "Hacked Title" })
      .eq("id", listing!.id);

    // In PostgREST, updating a row not matching RLS updates 0 rows
    const { data: check } = await sellerClient
      .from("listings")
      .select("title")
      .eq("id", listing!.id)
      .single();

    expect(check?.title).toBe("Owner 1 Private Item");
  });

  // 12. Suspended seller listings hidden from visibility check
  it("test_suspended_seller_listings_hidden_from_visibility_check", async () => {
    if (!checkPrerequisite()) return;

    const { data: listing } = await sellerClient
      .from("listings")
      .insert({
        title: "Active Listing Before Suspension",
        category_id: testCategoryId,
        city_id: testCityId,
      })
      .select("id")
      .single();

    const listingId = listing!.id;

    // Make active
    await serviceClient
      .from("listings")
      .update({
        status: "active",
        expires_at: new Date(Date.now() + 30 * 86400 * 1000).toISOString(),
      })
      .eq("id", listingId);

    // Initial check: visible
    const { data: visibleBefore } = await serviceClient.rpc("is_listing_publicly_visible", {
      listing_id: listingId,
    });
    expect(visibleBefore).toBe(true);

    // Suspend the seller account
    await serviceClient
      .from("user_accounts")
      .update({ account_status: "suspended" })
      .eq("user_id", sellerUser.id);

    // Visibility check now returns false!
    const { data: visibleAfter } = await serviceClient.rpc("is_listing_publicly_visible", {
      listing_id: listingId,
    });
    expect(visibleAfter).toBe(false);

    // Restore seller account to active
    await serviceClient
      .from("user_accounts")
      .update({ account_status: "active" })
      .eq("user_id", sellerUser.id);
  });

  // 13. Photo Limit Boundary Enforcement: 8 Accepted, 9 Rejected
  it("test_photo_limit_enforced_at_boundary_8_accepted_9_rejected", async () => {
    if (!checkPrerequisite()) return;

    // Create a new draft listing under sellerClient
    const { data: newListing, error: createError } = await sellerClient
      .from("listings")
      .insert({
        title: "Photo Boundary Test Listing",
        category_id: testCategoryId,
        city_id: testCityId,
        condition: "like_new",
      })
      .select("id")
      .single();

    expect(createError).toBeNull();
    const listingId = newListing!.id;

    // Insert 8 photos sequentially - all 8 must succeed
    for (let i = 1; i <= 8; i++) {
      const { error: photoError } = await sellerClient
        .from("listing_media")
        .insert({
          listing_id: listingId,
          original_filename: `boundary_photo_${i}.jpg`,
          content_type: "image/jpeg",
          file_size_bytes: 1024 * i,
        });

      expect(photoError).toBeNull();
    }

    // Verify exactly 8 rows exist in listing_media
    const { data: photos, error: countError } = await sellerClient
      .from("listing_media")
      .select("id")
      .eq("listing_id", listingId);

    expect(countError).toBeNull();
    expect(photos).toHaveLength(8);

    // Attempt to insert the 9th photo - MUST BE REJECTED by trigger
    const { error: ninthPhotoError } = await sellerClient
      .from("listing_media")
      .insert({
        listing_id: listingId,
        original_filename: "boundary_photo_9_rejected.jpg",
        content_type: "image/jpeg",
        file_size_bytes: 1024,
      });

    expect(ninthPhotoError).not.toBeNull();
    expect(ninthPhotoError?.message).toMatch(/maximum 8 photos per listing exceeded/i);

    // Verify media count remains exactly 8
    const { data: photosAfter } = await sellerClient
      .from("listing_media")
      .select("id")
      .eq("listing_id", listingId);

    expect(photosAfter).toHaveLength(8);
  });

  // 14. Location Administration RPC Authorization Check
  it("test_location_admin_rpc_rejects_unauthorized_callers", async () => {
    if (!checkPrerequisite()) return;

    // Non-admin seller attempts to create a city
    const { error: sellerError } = await sellerClient.rpc("admin_manage_location", {
      action: "create_city",
      name: "Unauthorized City",
      state: "DL",
      slug: "unauth-city",
    });

    expect(sellerError).not.toBeNull();
    expect(sellerError?.message).toMatch(/must be active administrator with AAL2 MFA/i);

    // Moderator (without administrator role) attempts to create a locality
    const { error: modError } = await moderatorClient.rpc("admin_manage_location", {
      action: "create_locality",
      city_id: testCityId,
      name: "Unauthorized Locality",
      slug: "unauth-locality",
    });

    expect(modError).not.toBeNull();
    expect(modError?.message).toMatch(/must be active administrator with AAL2 MFA/i);
  });
});
