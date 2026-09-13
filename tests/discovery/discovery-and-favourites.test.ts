import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/database";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
const ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

describe("Milestone 1.4 Discovery, Search, Visibility & Favourites Invariants", () => {
  let isSupabaseOnline = false;
  let serviceClient: ReturnType<typeof createClient<Database>>;
  let anonClient: ReturnType<typeof createClient<Database>>;
  let testUser1Id: string;
  let testUser2Id: string;
  let testUser1Client: ReturnType<typeof createClient<Database>>;
  let testUser2Client: ReturnType<typeof createClient<Database>>;

  interface RpcSearchResult {
    items: Array<{
      id: string;
      title: string;
      slug: string;
      price_paise?: number | null;
      category_id: string;
      city_id: string;
      locality_id: string;
    }>;
    total_count: number;
    page: number;
    per_page: number;
    total_pages: number;
  }

  let testCategoryId: string;
  let testCityId: string;
  let testLocalityId: string;

  let activeListing1Id: string;
  let activeListing1Slug: string;
  let activeListing2Id: string;
  let draftListingId: string;
  let pausedListingId: string;

  beforeAll(async () => {
    try {
      const res = await fetch(`${SUPABASE_URL}/health`);
      if (res.ok || res.status === 200) {
        isSupabaseOnline = true;
      }
    } catch {
      isSupabaseOnline = false;
      return;
    }

    serviceClient = createClient<Database>(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false },
    });
    anonClient = createClient<Database>(SUPABASE_URL, ANON_KEY, {
      auth: { persistSession: false },
    });

    // 1. Get or create category
    const { data: cat } = await serviceClient
      .from("categories")
      .select("id")
      .eq("slug", "electronics")
      .single();

    testCategoryId = cat?.id || "";

    // 2. Get city and locality
    const { data: city } = await serviceClient
      .from("cities")
      .select("id")
      .limit(1)
      .single();
    testCityId = city?.id || "";

    const { data: locality } = await serviceClient
      .from("localities")
      .select("id")
      .eq("city_id", testCityId)
      .limit(1)
      .single();
    testLocalityId = locality?.id || "";

    // 3. Create two confirmed test users
    const email1 = `test_buyer_14_${Date.now()}@fairswap.local`;
    const email2 = `test_buyer2_14_${Date.now()}@fairswap.local`;
    const password = "ValidPassword123!@#";

    const { data: authUser1 } = await serviceClient.auth.admin.createUser({
      email: email1,
      password,
      email_confirm: true,
      user_metadata: { display_name: "Buyer One" },
    });
    testUser1Id = authUser1.user?.id || "";

    const { data: authUser2 } = await serviceClient.auth.admin.createUser({
      email: email2,
      password,
      email_confirm: true,
      user_metadata: { display_name: "Buyer Two" },
    });
    testUser2Id = authUser2.user?.id || "";

    // Sign in user clients
    testUser1Client = createClient<Database>(SUPABASE_URL, ANON_KEY, {
      auth: { persistSession: false },
    });
    await testUser1Client.auth.signInWithPassword({ email: email1, password });

    testUser2Client = createClient<Database>(SUPABASE_URL, ANON_KEY, {
      auth: { persistSession: false },
    });
    await testUser2Client.auth.signInWithPassword({ email: email2, password });

    // 4. Create sample listings via service role
    // Active Listing 1 (Laptop)
    activeListing1Slug = `dell-xps-laptop-${Date.now()}`;
    const { data: l1 } = await serviceClient
      .from("listings")
      .insert({
        seller_id: testUser1Id,
        title: "Dell XPS 15 Ultra Laptop",
        description: "Excellent performance workstation with 32GB RAM and 4K display.",
        category_id: testCategoryId,
        city_id: testCityId,
        locality_id: testLocalityId,
        condition: "like_new",
        price_type: "fixed",
        price_paise: 8500000, // ₹85,000
        status: "active",
        slug: activeListing1Slug,
      })
      .select("id")
      .single();
    activeListing1Id = l1?.id || "";

    // Active Listing 2 (Phone)
    const { data: l2 } = await serviceClient
      .from("listings")
      .insert({
        seller_id: testUser1Id,
        title: "Apple iPhone 13 Pro 128GB",
        description: "Midnight black, immaculate condition with original box and cable.",
        category_id: testCategoryId,
        city_id: testCityId,
        locality_id: testLocalityId,
        condition: "good",
        price_type: "negotiable",
        price_paise: 4500000, // ₹45,000
        status: "active",
        slug: `iphone-13-pro-${Date.now()}`,
      })
      .select("id")
      .single();
    activeListing2Id = l2?.id || "";

    // Draft Listing (Unpublished)
    const { data: lDraft } = await serviceClient
      .from("listings")
      .insert({
        seller_id: testUser1Id,
        title: "Secret Draft Prototype Item",
        description: "This item should never appear in public discovery.",
        category_id: testCategoryId,
        city_id: testCityId,
        condition: "new",
        price_type: "fixed",
        price_paise: 100000,
        status: "draft",
        slug: `secret-draft-${Date.now()}`,
      })
      .select("id")
      .single();
    draftListingId = lDraft?.id || "";

    // Paused Listing
    const { data: lPaused } = await serviceClient
      .from("listings")
      .insert({
        seller_id: testUser1Id,
        title: "Temporarily Paused Vintage Camera",
        description: "Paused item withheld from public search.",
        category_id: testCategoryId,
        city_id: testCityId,
        condition: "fair",
        price_type: "fixed",
        price_paise: 500000,
        status: "paused",
        slug: `paused-camera-${Date.now()}`,
      })
      .select("id")
      .single();
    pausedListingId = lPaused?.id || "";
  });

  function checkPrereq() {
    return isSupabaseOnline && activeListing1Id && activeListing2Id;
  }

  // ===========================================================================
  // 1. Search RPC & Full-Text Search
  // ===========================================================================

  it("test_search_rpc_anonymous_user_flows", async () => {
    if (!checkPrereq()) return;

    // 1. Normal query as anonymous user
    const { data: normalData, error: normalErr } = await anonClient.rpc("search_public_listings", {
      query: "laptop",
    });
    expect(normalErr).toBeNull();
    const normalResult = normalData as unknown as RpcSearchResult;
    expect(normalResult.items.length).toBeGreaterThanOrEqual(1);
    expect(normalResult.items.some((i) => i.id === activeListing1Id)).toBe(true);

    // 2. Filtered query as anonymous user
    const { data: filteredData, error: filteredErr } = await anonClient.rpc("search_public_listings", {
      category_id: testCategoryId,
      price_min: 8000000,
    });
    expect(filteredErr).toBeNull();
    const filteredResult = filteredData as unknown as RpcSearchResult;
    expect(filteredResult.items.some((i) => i.id === activeListing1Id)).toBe(true);
    expect(filteredResult.items.some((i) => i.id === activeListing2Id)).toBe(false);

    // 3. No matching results query as anonymous user
    const { data: emptyData, error: emptyErr } = await anonClient.rpc("search_public_listings", {
      query: "xyznonexistentquery9999",
    });
    expect(emptyErr).toBeNull();
    const emptyResult = emptyData as unknown as RpcSearchResult;
    expect(emptyResult.items).toEqual([]);
    expect(emptyResult.total_count).toBe(0);
  });

  it("test_search_rpc_authenticated_user_flows", async () => {
    if (!checkPrereq()) return;

    // 1. Normal query as authenticated user
    const { data: normalData, error: normalErr } = await testUser1Client.rpc("search_public_listings", {
      query: "laptop",
    });
    expect(normalErr).toBeNull();
    const normalResult = normalData as unknown as RpcSearchResult;
    expect(normalResult.items.length).toBeGreaterThanOrEqual(1);

    // 2. Filtered query as authenticated user
    const { data: filteredData, error: filteredErr } = await testUser1Client.rpc("search_public_listings", {
      category_id: testCategoryId,
      price_max: 5000000,
    });
    expect(filteredErr).toBeNull();
    const filteredResult = filteredData as unknown as RpcSearchResult;
    expect(filteredResult.items.some((i) => i.id === activeListing2Id)).toBe(true);
    expect(filteredResult.items.some((i) => i.id === activeListing1Id)).toBe(false);

    // 3. No matching results query as authenticated user
    const { data: emptyData, error: emptyErr } = await testUser1Client.rpc("search_public_listings", {
      query: "xyznonexistentquery9999",
    });
    expect(emptyErr).toBeNull();
    const emptyResult = emptyData as unknown as RpcSearchResult;
    expect(emptyResult.items).toEqual([]);
    expect(emptyResult.total_count).toBe(0);
  });

  it("test_anonymous_cannot_access_internal_app_security_rpc", async () => {
    if (!checkPrereq()) return;

    // Attempting direct invocation of app_security.impl_search_public_listings via PostgREST
    const { error } = await anonClient.rpc(
      "impl_search_public_listings" as unknown as "search_public_listings",
      {}
    );
    expect(error).not.toBeNull();
    // PostgREST returns PGRST202 because app_security is unexposed to PostgREST
    expect(error?.code).toBe("PGRST202");
  });

  it("test_search_rpc_keyword_matching_and_ranking", async () => {
    if (!checkPrereq()) return;

    const { data, error } = await anonClient.rpc("search_public_listings", {
      query: "laptop",
    });

    expect(error).toBeNull();
    const result = data as unknown as RpcSearchResult;
    expect(result.items.length).toBeGreaterThanOrEqual(1);

    const match = result.items.find((i) => i.id === activeListing1Id);
    expect(match).toBeDefined();
    expect(match?.title).toContain("Dell XPS 15");
  });

  it("test_search_rpc_combined_filters_category_city_price", async () => {
    if (!checkPrereq()) return;

    // Filter for price >= ₹80,000 (8,000,000 paise)
    const { data: highPriceData, error } = await anonClient.rpc("search_public_listings", {
      category_id: testCategoryId,
      city_id: testCityId,
      price_min: 8000000,
    });

    expect(error).toBeNull();
    const highResult = highPriceData as unknown as RpcSearchResult;
    expect(highResult.items.some((i) => i.id === activeListing1Id)).toBe(true);
    expect(highResult.items.some((i) => i.id === activeListing2Id)).toBe(false);

    // Filter for price <= ₹50,000 (5,000,000 paise)
    const { data: lowPriceData } = await anonClient.rpc("search_public_listings", {
      category_id: testCategoryId,
      price_max: 5000000,
    });

    const lowResult = lowPriceData as unknown as RpcSearchResult;
    expect(lowResult.items.some((i) => i.id === activeListing2Id)).toBe(true);
    expect(lowResult.items.some((i) => i.id === activeListing1Id)).toBe(false);
  });

  it("test_search_rpc_stable_sorting_and_tie_breakers", async () => {
    if (!checkPrereq()) return;

    // Price asc
    const { data: ascData } = await anonClient.rpc("search_public_listings", {
      sort: "price_asc",
    });
    const ascItems = (ascData as unknown as RpcSearchResult).items;
    if (ascItems.length >= 2) {
      for (let i = 0; i < ascItems.length - 1; i++) {
        const p1 = ascItems[i].price_paise ?? 0;
        const p2 = ascItems[i + 1].price_paise ?? 0;
        expect(p1).toBeLessThanOrEqual(p2);
      }
    }

    // Price desc
    const { data: descData } = await anonClient.rpc("search_public_listings", {
      sort: "price_desc",
    });
    const descItems = (descData as unknown as RpcSearchResult).items;
    if (descItems.length >= 2) {
      for (let i = 0; i < descItems.length - 1; i++) {
        const p1 = descItems[i].price_paise ?? 0;
        const p2 = descItems[i + 1].price_paise ?? 0;
        expect(p1).toBeGreaterThanOrEqual(p2);
      }
    }
  });

  it("test_search_rpc_bounded_pagination_and_bounds", async () => {
    if (!checkPrereq()) return;

    const { data, error } = await anonClient.rpc("search_public_listings", {
      page: 1,
      per_page: 1,
    });

    expect(error).toBeNull();
    const result = data as unknown as RpcSearchResult;
    expect(result.items.length).toBe(1);
    expect(result.page).toBe(1);
    expect(result.per_page).toBe(1);
    expect(result.total_pages).toBeGreaterThanOrEqual(2);
  });

  it("test_search_rpc_zero_results_and_special_character_safety", async () => {
    if (!checkPrereq()) return;

    // Non-matching query
    const { data: emptyData, error: emptyError } = await anonClient.rpc("search_public_listings", {
      query: "xyznonexistent999superrandomword",
    });

    expect(emptyError).toBeNull();
    const emptyResult = emptyData as unknown as RpcSearchResult;
    expect(emptyResult.items).toEqual([]);
    expect(emptyResult.total_count).toBe(0);

    // SQL/punctuation query safety
    const { data: safeData, error: safeError } = await anonClient.rpc("search_public_listings", {
      query: "'; DROP TABLE listings; -- !@#$%^&*()",
    });

    expect(safeError).toBeNull();
    expect(safeData).toBeDefined();
  });

  // ===========================================================================
  // 2. Visibility Isolation & Anti-Leakage
  // ===========================================================================

  it("test_all_non_public_statuses_and_suspended_sellers_excluded_from_search", async () => {
    if (!checkPrereq()) return;

    // Create a temporary suspended seller
    const suspendedEmail = `suspended_${Date.now()}@example.com`;
    const { data: suspendedAuth } = await serviceClient.auth.admin.createUser({
      email: suspendedEmail,
      password: "Password123!",
      email_confirm: true,
    });
    const suspendedSellerId = suspendedAuth.user?.id;
    if (suspendedSellerId) {
      await serviceClient
        .from("user_accounts")
        .update({ account_status: "suspended" })
        .eq("user_id", suspendedSellerId);

      // Create an active listing by this suspended seller
      const { data: suspendedListing } = await serviceClient
        .from("listings")
        .insert({
          seller_id: suspendedSellerId,
          title: "Suspended Seller Prohibited Item",
          description: "This item must never appear in public discovery.",
          category_id: testCategoryId,
          city_id: testCityId,
          condition: "good",
          price_type: "fixed",
          price_paise: 200000,
          status: "active",
          slug: `suspended-item-${Date.now()}`,
        })
        .select("id")
        .single();

      // Search for this listing as anon
      const { data: searchSuspended } = await anonClient.rpc("search_public_listings", {
        query: "Suspended Seller Prohibited",
      });
      const suspendedResult = searchSuspended as unknown as RpcSearchResult;
      expect(suspendedResult.items.some((i) => i.id === suspendedListing?.id)).toBe(false);

      // Cleanup
      await serviceClient.auth.admin.deleteUser(suspendedSellerId);
    }

    // Create listings in all inactive statuses: pending_review, rejected, expired, sold
    const inactiveStatuses = ["pending_review", "rejected", "expired", "sold"] as const;
    for (const st of inactiveStatuses) {
      const { data: item } = await serviceClient
        .from("listings")
        .insert({
          seller_id: testUser1Id,
          title: `Status Check ${st} Item`,
          description: `Item in status ${st} that should not be visible.`,
          category_id: testCategoryId,
          city_id: testCityId,
          condition: "fair",
          price_type: "fixed",
          price_paise: 100000,
          status: st,
          slug: `status-check-${st}-${Date.now()}`,
        })
        .select("id")
        .single();

      const { data: res } = await anonClient.rpc("search_public_listings", {
        query: `Status Check ${st}`,
      });
      const parsed = res as unknown as RpcSearchResult;
      expect(parsed.items.some((i) => i.id === item?.id)).toBe(false);
    }
  });

  it("test_draft_and_paused_listings_never_returned_in_public_search", async () => {
    if (!checkPrereq()) return;

    const { data } = await anonClient.rpc("search_public_listings", {
      query: "Secret Draft",
    });

    const result = data as unknown as RpcSearchResult;
    expect(result.items.some((i) => i.id === draftListingId)).toBe(false);

    const { data: pausedData } = await anonClient.rpc("search_public_listings", {
      query: "Paused Vintage Camera",
    });
    const pausedResult = pausedData as unknown as RpcSearchResult;
    expect(pausedResult.items.some((i) => i.id === pausedListingId)).toBe(false);
  });

  it("test_is_listing_publicly_visible_truthfulness", async () => {
    if (!checkPrereq()) return;

    // Active listing -> visible
    const { data: activeVis } = await serviceClient.rpc("is_listing_publicly_visible", {
      listing_id: activeListing1Id,
    });
    expect(activeVis).toBe(true);

    // Draft listing -> NOT visible
    const { data: draftVis } = await serviceClient.rpc("is_listing_publicly_visible", {
      listing_id: draftListingId,
    });
    expect(draftVis).toBe(false);

    // Paused listing -> NOT visible
    const { data: pausedVis } = await serviceClient.rpc("is_listing_publicly_visible", {
      listing_id: pausedListingId,
    });
    expect(pausedVis).toBe(false);
  });

  // ===========================================================================
  // 3. Slug History & Redirection Rules
  // ===========================================================================

  it("test_slug_history_recorded_on_slug_change", async () => {
    if (!checkPrereq()) return;

    const oldSlug = activeListing1Slug;
    const newSlug = `dell-xps-15-renamed-${Date.now()}`;

    // Update slug
    const { error: updateError } = await serviceClient
      .from("listings")
      .update({ slug: newSlug })
      .eq("id", activeListing1Id);

    expect(updateError).toBeNull();

    // Verify old slug is recorded in listing_slug_history
    const { data: history } = await serviceClient
      .from("listing_slug_history")
      .select("slug, listing_id")
      .eq("listing_id", activeListing1Id)
      .eq("slug", oldSlug)
      .maybeSingle();

    expect(history).toBeDefined();
    expect(history?.slug).toBe(oldSlug);
  });

  // ===========================================================================
  // 4. Favourites Ownership, Cross-User Access & Inactive Item Protection
  // ===========================================================================

  it("test_user_can_favourite_active_listing", async () => {
    if (!checkPrereq()) return;

    // User 1 favourites Active Listing 2
    const { error } = await testUser1Client
      .from("favourites")
      .insert({
        user_id: testUser1Id,
        listing_id: activeListing2Id,
      });

    expect(error).toBeNull();

    // User 1 can see it
    const { data: favs } = await testUser1Client
      .from("favourites")
      .select("listing_id")
      .eq("user_id", testUser1Id);

    expect(favs?.some((f) => f.listing_id === activeListing2Id)).toBe(true);
  });

  it("test_favouriting_draft_or_hidden_listing_denied", async () => {
    if (!checkPrereq()) return;

    // User 1 tries to favourite a draft listing -> Must be rejected by RLS insert policy
    const { error } = await testUser1Client
      .from("favourites")
      .insert({
        user_id: testUser1Id,
        listing_id: draftListingId,
      });

    expect(error).not.toBeNull();
  });

  it("test_cross_user_favourite_isolation", async () => {
    if (!checkPrereq()) return;

    // User 2 cannot see User 1's favourites
    const { data: user2Favs } = await testUser2Client
      .from("favourites")
      .select("listing_id")
      .eq("user_id", testUser1Id);

    // RLS policy user_id = auth.uid() returns empty set
    expect(user2Favs).toEqual([]);

    // User 2 cannot delete User 1's favourite
    const { data: deleteAttempt } = await testUser2Client
      .from("favourites")
      .delete()
      .eq("user_id", testUser1Id)
      .eq("listing_id", activeListing2Id)
      .select();

    expect(deleteAttempt).toEqual([]);

    // User 1's favourite remains intact
    const { data: checkFav } = await testUser1Client
      .from("favourites")
      .select("listing_id")
      .eq("listing_id", activeListing2Id);

    expect(checkFav?.length).toBe(1);
  });

  it("test_user_can_remove_own_favourite", async () => {
    if (!checkPrereq()) return;

    const { error } = await testUser1Client
      .from("favourites")
      .delete()
      .eq("user_id", testUser1Id)
      .eq("listing_id", activeListing2Id);

    expect(error).toBeNull();

    const { data } = await testUser1Client
      .from("favourites")
      .select("listing_id")
      .eq("listing_id", activeListing2Id);

    expect(data).toEqual([]);
  });

  afterAll(async () => {
    if (!isSupabaseOnline || !serviceClient) return;

    try {
      if (testUser1Id) {
        await serviceClient.auth.admin.deleteUser(testUser1Id);
      }
      if (testUser2Id) {
        await serviceClient.auth.admin.deleteUser(testUser2Id);
      }
    } catch {
      // Best-effort cleanup
    }
  });
});

