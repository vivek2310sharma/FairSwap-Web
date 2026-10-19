import { createClient } from "@supabase/supabase-js";
import { validateLocalTestEnvironment, testUserRegistry } from "../tests/helpers/local-test-guard";
import { LEGAL_POLICY } from "../src/lib/compliance/legal-policy";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
const SERVICE_KEY =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

export async function seedNavigationListings() {
  if (typeof globalThis.WebSocket === "undefined") {
    globalThis.WebSocket = require("ws");
  }
  validateLocalTestEnvironment({ supabaseUrl: SUPABASE_URL });

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const sellerEmail = `e2e_nav_seed_${Date.now()}@fairswap.local`;
  const { data: created, error: createErr } = await supabase.auth.admin.createUser({
    email: sellerEmail,
    password: "TestPassword123!",
    email_confirm: true,
    user_metadata: {
      display_name: "E2E Nav Seller",
      terms_accepted: "true",
      terms_version: LEGAL_POLICY.termsVersion,
      privacy_policy_version: LEGAL_POLICY.privacyVersion,
      acceptable_use_version: LEGAL_POLICY.acceptableUseVersion,
      age_confirmed: "true",
      minimum_age_confirmed: LEGAL_POLICY.minimumAge,
    },
  });

  if (createErr || !created.user) {
    throw createErr || new Error(`Failed to create test seller ${sellerEmail}`);
  }

  const userId = created.user.id;
  testUserRegistry.register(userId);

  const { data: cat } = await supabase.from("categories").select("id").eq("slug", "electronics").limit(1).single();
  const { data: city } = await supabase.from("cities").select("id").limit(1).single();

  if (!cat || !city) {
      throw new Error("Missing seeded categories or cities in the database.");
  }

  const { data: listing, error: listingErr } = await supabase.from("listings").insert({
    seller_id: userId,
    title: "C++ & 100% 👍 Developer Laptop",
    description: "High quality test listing for navigation e2e.",
    category_id: cat.id,
    city_id: city.id,
    price_paise: 450000,
    price_type: "fixed",
    condition: "new"
  }).select("id").single();

  if (listingErr || !listing) {
      throw listingErr || new Error("Failed to create draft listing.");
  }

  const listingId = listing.id;

  const { error: activateErr } = await supabase.from("listings").update({
      status: "active",
      published_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30 * 86400 * 1000).toISOString(),
  }).eq("id", listingId);

  if (activateErr) {
      throw activateErr;
  }

  // Verify the anonymous `search_public_listings` RPC returns the seeded listing
  const anonClient = createClient(SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0");
  const { data: searchResult, error: searchErr } = await anonClient.rpc("search_public_listings", {
      query: "Developer Laptop",
      category_slug: null,
      city_id: null,
      locality_id: null,
      condition: null,
      price_min: null,
      price_max: null,
      sort: "newest",
      page: 1,
      per_page: 12,
  });

  if (searchErr || !searchResult || searchResult.items.length === 0) {
      throw new Error("Failed to verify seeded listing using search_public_listings RPC.");
  }

  return { userId, listingId };
}

export async function cleanupNavigationListings() {
  if (typeof globalThis.WebSocket === "undefined") {
    globalThis.WebSocket = require("ws");
  }
    validateLocalTestEnvironment({ supabaseUrl: SUPABASE_URL });

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
    });

    for (const userId of testUserRegistry.getRegisteredIds()) {
        await supabase.from("listings").delete().eq("seller_id", userId);
    }

    await testUserRegistry.cleanupTrackedUsers(supabase, { supabaseUrl: SUPABASE_URL });
}