import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import type { Database } from "../src/types/database";

try {
  const proc = process as unknown as { loadEnvFile?: (path?: string) => void };
  if (typeof proc.loadEnvFile === "function") {
    proc.loadEnvFile(".env.local");
  }
} catch {
  // Ignore if file not found
}

// Fail-closed local safety validation
export function validateSeedTarget(url: string) {
  const allowedHosts = ["127.0.0.1", "localhost"];
  try {
    const parsed = new URL(url);
    if (!allowedHosts.includes(parsed.hostname)) {
      throw new Error(
        `CRITICAL SAFETY REJECTION: Seed script refused non-local target host "${parsed.hostname}". Allowed targets: ${allowedHosts.join(", ")}`
      );
    }
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("CRITICAL SAFETY REJECTION")) {
      throw err;
    }
    throw new Error(`Invalid Supabase URL: ${url}`);
  }
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
  validateSeedTarget(supabaseUrl);

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    console.error("SUPABASE_SERVICE_ROLE_KEY is required for seeding");
    process.exit(1);
  }

  const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log("Starting synthetic listing seed against local environment...");

  // 1. Ensure test seller user
  const sellerEmail = "seller_pilot@fairswap.local";
  const sellerPassword = "TestSellerPassword123!";

  let sellerId: string;
  const { data: existingUser } = await supabase.auth.admin.listUsers();
  const found = existingUser?.users.find((u) => u.email === sellerEmail);

  if (found) {
    sellerId = found.id;
    console.log(`Using existing test seller account: ${sellerId}`);
  } else {
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: sellerEmail,
      password: sellerPassword,
      email_confirm: true,
      user_metadata: {
        display_name: "Anita Sharma",
        terms_version: "2026-09-01",
        privacy_policy_version: "2026-09-01",
      },
    });

    if (createError || !newUser.user) {
      console.error("Failed to create test seller:", createError);
      process.exit(1);
    }
    sellerId = newUser.user.id;
    console.log(`Created test seller account: ${sellerId}`);
  }

  // 2. Fetch reference data: categories and city/localities
  const { data: categories } = await supabase.from("categories").select("id, slug");
  const { data: cities } = await supabase.from("cities").select("id, slug").eq("slug", "jaipur").single();
  const { data: localities } = await supabase.from("localities").select("id, slug").eq("city_id", cities?.id || "");

  if (!categories || !cities || !localities || localities.length === 0) {
    console.error("Reference categories/locations not found. Ensure migrations 4 is applied.");
    process.exit(1);
  }

  const catMap = Object.fromEntries(categories.map((c) => [c.slug, c.id]));
  const jaipurId = cities.id;

  // 3. Define 30 synthetic listings
  const items = [
    // Electronics
    { title: "Sony WH-1000XM4 Noise Canceling Headphones", cat: "electronics", price: 1499900, condition: "like_new", attrs: { brand: "Sony", model: "WH-1000XM4" }, status: "active" },
    { title: "Apple MacBook Air M1 256GB Space Gray", cat: "electronics", price: 5499900, condition: "good", attrs: { brand: "Apple", model: "MacBook Air M1", storage_gb: 256 }, status: "active" },
    { title: "Samsung 27-inch 4K UHD IPS Monitor", cat: "electronics", price: 1850000, condition: "like_new", attrs: { brand: "Samsung", model: "U27R550" }, status: "active" },
    { title: "Logitech MX Master 3S Wireless Mouse", cat: "electronics", price: 650000, condition: "like_new", attrs: { brand: "Logitech", model: "MX Master 3S" }, status: "active" },
    { title: "Kindle Paperwhite 10th Gen 8GB with Cover", cat: "electronics", price: 550000, condition: "good", attrs: { brand: "Amazon", model: "Paperwhite 10", storage_gb: 8 }, status: "reserved" },
    { title: "Canon EOS 1500D DSLR Camera with 18-55mm Lens", cat: "electronics", price: 2400000, condition: "good", attrs: { brand: "Canon", model: "EOS 1500D" }, status: "paused" },

    // Furniture
    { title: "Solid Sheesham Wood 4-Seater Dining Table Set", cat: "furniture", price: 1600000, condition: "good", attrs: { material: "wood", dimensions: "120x80x75" }, status: "active" },
    { title: "Ergonomic High-Back Mesh Office Chair with Lumbar Support", cat: "furniture", price: 450000, condition: "like_new", attrs: { material: "fabric" }, status: "active" },
    { title: "3-Seater Fabric Sofa in Charcoal Grey", cat: "furniture", price: 1200000, condition: "good", attrs: { material: "fabric" }, status: "active" },
    { title: "Engineered Wood Study Desk with Bookshelf", cat: "furniture", price: 320000, condition: "good", attrs: { material: "wood", dimensions: "100x50x120" }, status: "pending_review" },
    { title: "Queen Size Metal Bed Frame with Wooden Slats", cat: "furniture", price: 750000, condition: "good", attrs: { material: "metal" }, status: "sold" },

    // Home Appliances
    { title: "LG 260L Double Door Inverter Refrigerator", cat: "home-appliances", price: 1750000, condition: "good", attrs: { appliance_type: "cooling", brand: "LG" }, status: "active" },
    { title: "IFB 6.5kg Front Load Fully Automatic Washing Machine", cat: "home-appliances", price: 1450000, condition: "good", attrs: { appliance_type: "laundry", brand: "IFB" }, status: "active" },
    { title: "Philips Digital Air Fryer 4.1L 1400W", cat: "home-appliances", price: 420000, condition: "like_new", attrs: { appliance_type: "kitchen", brand: "Philips" }, status: "active" },
    { title: "Bajaj 15L Storage Water Heater Geyser", cat: "home-appliances", price: 350000, condition: "good", attrs: { appliance_type: "heating", brand: "Bajaj" }, status: "expired" },
    { title: "Morphy Richards 24L Convection Microwave Oven", cat: "home-appliances", price: 580000, condition: "fair", attrs: { appliance_type: "kitchen", brand: "Morphy Richards" }, status: "active" },

    // Bicycles & Sports
    { title: "Decathlon B'Twin Riverside 120 Hybrid Cycle", cat: "bicycles-sports", price: 850000, condition: "good", attrs: { type: "hybrid", frame_size: "Medium" }, status: "active" },
    { title: "Firefox Target 21-Speed Mountain Bike 29T", cat: "bicycles-sports", price: 1100000, condition: "like_new", attrs: { type: "mountain", frame_size: "Large" }, status: "active" },
    { title: "Adjustable Cast Iron Dumbbells Set 20kg with Case", cat: "bicycles-sports", price: 280000, condition: "good", attrs: { type: "road" }, status: "active" },
    { title: "Yonex Astrox 77 Badminton Racket with Full Cover", cat: "bicycles-sports", price: 420000, condition: "like_new", attrs: { type: "road" }, status: "pending_review" },
    { title: "Cosco Table Tennis Racket and 6-Ball Set", cat: "bicycles-sports", price: 60000, condition: "new", attrs: { type: "kids" }, status: "draft" },

    // Books
    { title: "Atomic Habits by James Clear (Hardcover)", cat: "books", price: 35000, condition: "like_new", attrs: { author: "James Clear", language: "English", isbn: "9781847941831" }, status: "active" },
    { title: "The Psychology of Money by Morgan Housel", cat: "books", price: 20000, condition: "good", attrs: { author: "Morgan Housel", language: "English", isbn: "9789390166268" }, status: "active" },
    { title: "NCERT Class 11 and 12 Physics & Chemistry Books", cat: "books", price: 50000, condition: "fair", attrs: { author: "NCERT", language: "English" }, status: "active" },
    { title: "Premchand Ki Lokpriya Kahaniyan (Hindi)", cat: "books", price: 15000, condition: "new", attrs: { author: "Munshi Premchand", language: "Hindi" }, status: "active" },
    { title: "Sapiens: A Brief History of Humankind", cat: "books", price: 28000, condition: "good", attrs: { author: "Yuval Noah Harari", language: "English" }, status: "active" },

    // Hobbies
    { title: "Yamaha F280 Acoustic Guitar Natural Finish", cat: "hobbies", price: 650000, condition: "like_new", attrs: { hobby_type: "Musical Instrument" }, status: "active" },
    { title: "Casio CT-S200 Portable Electronic Keyboard 61-Key", cat: "hobbies", price: 720000, condition: "good", attrs: { hobby_type: "Musical Instrument" }, status: "active" },
    { title: "Professional Tournament Wooden Chess Board Set with Weighted Pieces", cat: "hobbies", price: 180000, condition: "new", attrs: { hobby_type: "Board Games" }, status: "rejected" },
    { title: "Winsor & Newton Cotman Watercolor Half Pan Studio Set", cat: "hobbies", price: 220000, condition: "like_new", attrs: { hobby_type: "Art Supplies" }, status: "draft" },
  ];

  console.log(`Seeding ${items.length} synthetic marketplace listings...`);

  let count = 0;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const catId = catMap[item.cat];
    const locId = localities[i % localities.length].id;

    // Generate synthetic test image fixture (licensed/CC0 public domain synthetic pattern)
    const colorR = (i * 37) % 255;
    const colorG = (i * 73) % 255;
    const colorB = (i * 109) % 255;

    const testImageBuffer = await sharp({
      create: {
        width: 800,
        height: 600,
        channels: 3,
        background: { r: colorR, g: colorG, b: colorB },
      },
    })
      .jpeg()
      .toBuffer();

    // 1. Insert listing
    const { data: newListing, error: listError } = await supabase
      .from("listings")
      .insert({
        seller_id: sellerId,
        title: item.title,
        description: `Authentic, well-maintained ${item.title}. Tested and thoroughly inspected. Available for immediate local pickup in Jaipur.`,
        category_id: catId,
        city_id: jaipurId,
        locality_id: locId,
        condition: item.condition as Database["public"]["Enums"]["listing_condition_enum"],
        price_type: "fixed",
        price_paise: item.price,
        pin_code: "302017",
        category_attributes: item.attrs as unknown as Database["public"]["Tables"]["listings"]["Insert"]["category_attributes"],
      })
      .select("id")
      .single();

    if (listError || !newListing) {
      console.error(`Error inserting listing "${item.title}":`, listError);
      continue;
    }

    const listingId = newListing.id;

    // 2. Insert media record
    const { data: mediaRecord } = await supabase
      .from("listing_media")
      .insert({
        listing_id: listingId,
        original_filename: `synthetic-fixture-${i + 1}.jpg`,
        content_type: "image/jpeg",
        file_size_bytes: testImageBuffer.length,
      })
      .select("id")
      .single();

    if (mediaRecord) {
      const mediaId = mediaRecord.id;
      const origPath = `${listingId}/${mediaId}/original.jpg`;
      const thumbPath = `${listingId}/${mediaId}/thumb.webp`;
      const mediumPath = `${listingId}/${mediaId}/medium.webp`;
      const largePath = `${listingId}/${mediaId}/large.webp`;

      // Upload original and derivatives to local storage
      await supabase.storage.from("listing-originals").upload(origPath, testImageBuffer, { contentType: "image/jpeg", upsert: true });

      const thumbBuf = await sharp(testImageBuffer).resize(200, 200, { fit: "cover" }).webp().toBuffer();
      const mediumBuf = await sharp(testImageBuffer).resize(800, 800, { fit: "inside" }).webp().toBuffer();
      const largeBuf = await sharp(testImageBuffer).resize(1400, 1400, { fit: "inside" }).webp().toBuffer();

      await supabase.storage.from("listing-derivatives").upload(thumbPath, thumbBuf, { contentType: "image/webp", upsert: true });
      await supabase.storage.from("listing-derivatives").upload(mediumPath, mediumBuf, { contentType: "image/webp", upsert: true });
      await supabase.storage.from("listing-derivatives").upload(largePath, largeBuf, { contentType: "image/webp", upsert: true });

      // Record ready in DB
      await supabase.rpc("record_media_processing_result", {
        media_id: mediaId,
        paths: { original: origPath, thumbnail: thumbPath, medium: mediumPath, large: largePath },
        dimensions: { width: 800, height: 600 },
        status: "ready",
        error: undefined,
      });

      // Set cover photo
      await supabase.from("listings").update({ cover_photo_id: mediaId }).eq("id", listingId);
    }

    // 3. Set desired lifecycle status
    if (item.status === "active") {
      await supabase
        .from("listings")
        .update({
          status: "active",
          published_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 30 * 86400 * 1000).toISOString(),
        })
        .eq("id", listingId);
    } else if (item.status === "pending_review") {
      await supabase
        .from("listings")
        .update({
          status: "pending_review",
          submitted_at: new Date().toISOString(),
        })
        .eq("id", listingId);
    } else if (item.status === "reserved") {
      await supabase
        .from("listings")
        .update({
          status: "reserved",
          published_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 30 * 86400 * 1000).toISOString(),
        })
        .eq("id", listingId);
    } else if (item.status === "paused") {
      await supabase
        .from("listings")
        .update({
          status: "paused",
          published_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 30 * 86400 * 1000).toISOString(),
        })
        .eq("id", listingId);
    } else if (item.status === "sold") {
      await supabase
        .from("listings")
        .update({
          status: "sold",
          published_at: new Date(Date.now() - 5 * 86400 * 1000).toISOString(),
          sold_at: new Date().toISOString(),
        })
        .eq("id", listingId);
    } else if (item.status === "expired") {
      await supabase
        .from("listings")
        .update({
          status: "expired",
          published_at: new Date(Date.now() - 35 * 86400 * 1000).toISOString(),
          expires_at: new Date(Date.now() - 5 * 86400 * 1000).toISOString(),
        })
        .eq("id", listingId);
    } else if (item.status === "rejected") {
      await supabase
        .from("listings")
        .update({
          status: "rejected",
          rejection_reason: "Price does not match typical market valuation for condition.",
        })
        .eq("id", listingId);
    }

    count++;
  }

  console.log(`Successfully seeded ${count} synthetic listings with fixture images.`);
}

if (process.argv[1] && process.argv[1].endsWith("seed-listings.ts")) {
  main().catch((err) => {
    console.error("Fatal seeding error:", err);
    process.exit(1);
  });
}
