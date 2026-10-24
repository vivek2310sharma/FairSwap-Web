import type { MacroCategory } from "@/lib/listings/macro-category";

/**
 * First-screen Post Ad catalogue. Presentation only: it never creates category
 * IDs, never authorizes a write, and the existing server/RLS gates stay
 * authoritative. Every choice is resolved against runtime capabilities.
 */

export type Locale = "en" | "hi";
export type LocalizedText = { en: string; hi?: string };
export const localize = (text: LocalizedText, locale: Locale = "en") => text[locale] ?? text.en;

export type FamilyState = "off" | "draft" | "live";
export interface PostAdCapabilities {
  twoWheelers: FamilyState;
  cars: FamilyState;
  property: FamilyState;
  /** Keys of loaded, eligible Goods categories (slug, else slugified name), e.g. "electronics". */
  goodsCategories: readonly string[];
  /** Exact loaded Property contract paths as "<group>/<leaf>", e.g. "PG & Co-living/Boys PG". */
  propertyPaths: readonly string[];
}

export type Readiness = "available" | "draft-only" | "coming-soon" | "unavailable";

export type SubRoute =
  /** General (broad) Goods continuation only; the unchanged form is where the category is chosen. */
  | { kind: "goods"; key: string }
  | { kind: "vehicles"; family: "two-wheelers" | "cars" }
  | { kind: "property"; paths: readonly string[] }
  | { kind: "none" }
  /** Live-animal trade: no route, and no promise that one will exist. */
  | { kind: "blocked" };

export interface SubCategory {
  id: string;
  label: string;
  aliases?: readonly string[];
  group?: string;
  route: SubRoute;
}

export type TrustStatus = "coming-soon" | "planned" | "available";
export interface TrustInfo {
  status: TrustStatus;
  /** The capability, without status wording. */
  message: string;
  /** Shown while status is not "available". */
  disclaimer: string;
}

export interface MainCategory {
  id: string;
  label: LocalizedText;
  description: string;
  icon: "mobile" | "vehicle" | "property" | "appliance" | "computer" | "furniture" | "fashion" | "books" | "pets" | "services" | "jobs";
  aliases?: readonly string[];
  subs: readonly SubCategory[];
  trust: TrustInfo;
  hideComingSoonBadge?: boolean;
}

const none = { kind: "none" } as const;
const goods = (key: string): SubRoute => ({ kind: "goods", key });
const rent = (...paths: string[]): SubRoute => ({ kind: "property", paths });
const RES = "Residential for Rent/";
const PG = "PG & Co-living/";

export const POST_AD_CATALOGUE: readonly MainCategory[] = [
  {
    id: "mobiles", label: { en: "Mobiles & Tablets", hi: "मोबाइल और टैबलेट" }, icon: "mobile",
    description: "Phones, accessories and tablets.",
    aliases: ["phone", "smartphone", "cellphone"],
    trust: { status: "coming-soon", message: "IMEI and device authenticity checks", disclaimer: "FairSwap does not currently check IMEI or device authenticity." },
    subs: [
      { id: "mobile-phones", label: "Mobile Phones", aliases: ["iphone", "samsung", "redmi", "oneplus", "vivo", "oppo", "realme", "android", "smartphone"], route: none },
      { id: "mobile-accessories", label: "Mobile Accessories", aliases: ["charger", "earphones", "earbuds", "cover", "case", "power bank"], route: none },
      { id: "tablets", label: "Tablets", aliases: ["ipad", "tab"], route: none },
      { id: "general-electronics", label: "General Electronics", aliases: ["electronics", "phone", "mobile", "iphone", "samsung", "tablet", "ipad", "laptop", "camera", "tv"], route: goods("electronics") },
    ],
  },
  {
    id: "vehicles", label: { en: "Vehicles", hi: "वाहन" }, icon: "vehicle",
    description: "Cars, bikes, scooters and more.",
    aliases: ["vehicle", "gaadi", "gadi"],
    trust: { status: "coming-soon", message: "RC and ownership verification", disclaimer: "FairSwap does not currently verify vehicle ownership documents." },
    subs: [
      { id: "cars", label: "Cars", aliases: ["car", "hatchback", "sedan", "suv", "maruti", "swift", "alto", "hyundai", "tata", "honda city"], route: { kind: "vehicles", family: "cars" } },
      { id: "two-wheelers", label: "Motorcycles & Scooters", aliases: ["activa", "royal enfield", "bullet", "bike", "scooter", "scooty", "motorcycle", "splendor", "pulsar", "two wheeler", "tvs", "bajaj", "hero"], route: { kind: "vehicles", family: "two-wheelers" } },
      { id: "bicycles", label: "Bicycles", aliases: ["cycle", "bicycle", "mtb", "gear cycle"], route: none },
      { id: "vehicle-parts", label: "Spare Parts & Accessories", aliases: ["tyre", "tire", "helmet", "battery", "spare"], route: none },
      { id: "commercial-vehicles", label: "Commercial & Other Vehicles", aliases: ["truck", "auto", "rickshaw", "e-rickshaw", "tractor", "tempo", "van"], route: none },
    ],
  },
  {
    id: "property", label: { en: "Property", hi: "प्रॉपर्टी" }, icon: "property",
    description: "Rent or sell homes, shops and land.",
    aliases: ["real estate", "flat", "house", "room", "rent", "to let"],
    trust: { status: "coming-soon", message: "Ownership and document verification", disclaimer: "FairSwap does not currently verify property ownership or documents." },
    subs: [
      { id: "rent-houses", group: "For Rent", label: "Houses & Apartments", aliases: ["flat", "bhk", "1bhk", "2bhk", "apartment", "house", "rent"], route: rent(RES + "Apartment or Flat", RES + "Independent House or Villa", RES + "Builder Floor", RES + "Studio Apartment") },
      { id: "rent-commercial", group: "For Rent", label: "Shops & Offices", aliases: ["shop", "office", "showroom", "godown"], route: none },
      { id: "rent-pg", group: "For Rent", label: "PG & Guest Houses", aliases: ["pg", "paying guest", "hostel", "guest house", "co-living"], route: rent(PG + "Boys PG", PG + "Girls PG", PG + "Co-living Spaces", PG + "Hostels") },
      { id: "rent-land", group: "For Rent", label: "Land & Plots", aliases: ["plot", "land"], route: none },
      { id: "rent-flatmates", group: "For Rent", label: "Flatmates & Shared Rooms", aliases: ["flatmate", "roommate", "shared room", "sharing"], route: rent(PG + "Flatmates & Shared Rooms") },
      { id: "sale-houses", group: "For Sale", label: "Houses & Apartments", aliases: ["buy flat", "sell house", "resale"], route: none },
      { id: "sale-commercial", group: "For Sale", label: "Shops & Offices", route: none },
      { id: "sale-land", group: "For Sale", label: "Land & Plots", route: none },
    ],
  },
  {
    id: "appliances", label: { en: "Home Electronics & Appliances", hi: "होम इलेक्ट्रॉनिक्स और उपकरण" }, icon: "appliance",
    description: "TVs, fridges, ACs and kitchen appliances.",
    aliases: ["appliance", "home appliance", "electronics"],
    trust: { status: "coming-soon", message: "Product authenticity checks", disclaimer: "FairSwap does not currently check product authenticity." },
    subs: [
      { id: "tv-audio", label: "TVs & Audio", aliases: ["tv", "television", "led", "speaker", "home theatre", "soundbar"], route: none },
      { id: "kitchen", label: "Kitchen Appliances", aliases: ["mixer", "grinder", "microwave", "oven", "induction", "gas stove", "chimney"], route: none },
      { id: "fridge", label: "Refrigerators", aliases: ["fridge", "refrigerator", "freezer", "godrej", "double door"], route: none },
      { id: "ac", label: "Air Conditioners", aliases: ["ac", "air conditioner", "split ac", "window ac", "cooler"], route: none },
      { id: "washing", label: "Washing Machines", aliases: ["washing machine", "washer", "front load", "top load"], route: none },
      { id: "other-appliances", label: "Other Home Appliances", aliases: ["fan", "geyser", "heater", "iron", "vacuum", "water purifier", "ro"], route: none },
      { id: "general-electronics-tv", label: "General Electronics", aliases: ["electronics", "tv", "television", "speaker"], route: goods("electronics") },
      { id: "general-appliances", label: "General Home Appliances", aliases: ["home appliances", "appliance", "fridge", "refrigerator", "ac", "washing machine", "mixer", "microwave"], route: goods("home-appliances") },
    ],
  },
  {
    id: "computers", label: { en: "Computers & Cameras", hi: "कंप्यूटर और कैमरा" }, icon: "computer",
    description: "Laptops, cameras, games and accessories.",
    aliases: ["computer"],
    trust: { status: "coming-soon", message: "Device and serial-number checks", disclaimer: "FairSwap does not currently check device serial numbers." },
    subs: [
      { id: "laptops", label: "Computers & Laptops", aliases: ["laptop", "macbook", "desktop", "pc", "dell", "hp", "lenovo", "notebook"], route: none },
      { id: "cameras", label: "Cameras & Lenses", aliases: ["camera", "dslr", "canon", "nikon", "lens", "gopro"], route: none },
      { id: "games", label: "Games & Entertainment", aliases: ["playstation", "ps4", "ps5", "xbox", "console", "video game"], route: none },
      { id: "computer-accessories", label: "Computer Accessories", aliases: ["keyboard", "mouse", "webcam", "router", "pendrive"], route: none },
      { id: "storage", label: "Hard Disks & Storage", aliases: ["hard disk", "hdd", "ssd", "pen drive", "memory card"], route: none },
      { id: "printers-monitors", label: "Printers & Monitors", aliases: ["printer", "monitor", "scanner", "projector"], route: none },
      { id: "general-electronics-pc", label: "General Electronics", aliases: ["electronics", "laptop", "computer", "camera", "printer", "monitor"], route: goods("electronics") },
    ],
  },
  {
    id: "furniture", label: { en: "Furniture & Home", hi: "फर्नीचर और घर" }, icon: "furniture",
    description: "Sofas, beds, tables and household items.",
    aliases: ["furniture", "household"],
    trust: { status: "coming-soon", message: "Better condition and pickup safeguards", disclaimer: "FairSwap does not currently inspect items or arrange pickup." },
    subs: [
      { id: "sofa-dining", label: "Sofas & Dining", aliases: ["sofa", "couch", "dining table", "diwan"], route: none },
      { id: "beds-wardrobes", label: "Beds & Wardrobes", aliases: ["bed", "mattress", "wardrobe", "almirah", "cupboard", "cot"], route: none },
      { id: "decor-garden", label: "Home Decor & Garden", aliases: ["decor", "plant", "pot", "garden", "painting", "curtain"], route: none },
      { id: "kids-furniture", label: "Kids Furniture", aliases: ["cradle", "baby bed", "study table"], route: none },
      { id: "tables-chairs", label: "Tables & Chairs", aliases: ["table", "chair", "desk", "office chair", "stool"], route: none },
      { id: "other-household", label: "Other Household Items", aliases: ["utensils", "household", "storage"], route: none },
      { id: "general-furniture", label: "General Furniture", aliases: ["furniture", "sofa", "bed", "table", "chair", "wardrobe"], route: goods("furniture") },
    ],
  },
  {
    id: "fashion", label: { en: "Fashion", hi: "फैशन" }, icon: "fashion",
    description: "Clothing for men, women and kids.",
    aliases: ["clothes", "clothing", "dress", "saree", "kurta", "shoes", "jeans"],
    trust: { status: "coming-soon", message: "Brand authenticity checks", disclaimer: "FairSwap does not currently check brand authenticity." },
    subs: [
      { id: "mens", label: "Men's Clothing", aliases: ["shirt", "kurta", "jeans", "suit", "sherwani"], route: none },
      { id: "womens", label: "Women's Clothing", aliases: ["saree", "lehenga", "dress", "kurti", "salwar"], route: none },
      { id: "kids-clothing", label: "Kids' Clothing", aliases: ["baby clothes", "school uniform", "frock"], route: none },
    ],
  },
  {
    id: "hobbies", label: { en: "Books, Sports & Hobbies", hi: "किताबें, खेल और शौक" }, icon: "books",
    description: "Books, fitness, instruments and sports gear.",
    aliases: ["hobby", "sports"],
    trust: { status: "coming-soon", message: "Better condition and ad evidence guidance", disclaimer: "FairSwap does not currently verify item condition." },
    subs: [
      { id: "books", label: "Books", aliases: ["textbook", "novel", "ncert", "study material", "notes"], route: goods("books") },
      { id: "gym", label: "Gym & Fitness", aliases: ["dumbbell", "treadmill", "gym", "exercise", "yoga mat"], route: none },
      { id: "instruments", label: "Musical Instruments", aliases: ["guitar", "harmonium", "tabla", "keyboard piano", "piano", "violin", "drum"], route: none },
      { id: "sports-equipment", label: "Sports Equipment", aliases: ["cricket bat", "bat", "football", "badminton", "racket", "carrom"], route: none },
      { id: "other-hobbies", label: "Other Hobbies", aliases: ["collectibles", "coins", "stamps", "craft"], route: none },
      { id: "general-hobbies", label: "General Hobbies", aliases: ["hobbies", "guitar", "instrument", "games", "collectibles"], route: goods("hobbies") },
    ],
  },
  {
    id: "pets", label: { en: "Pets", hi: "पालतू जानवर" }, icon: "pets",
    description: "Pet food, accessories and supplies.",
    aliases: ["pet", "animal", "puppy", "cat", "bird"],
    hideComingSoonBadge: true,
    trust: { status: "coming-soon", message: "Safer, policy-compliant pet-related ad safeguards", disclaimer: "FairSwap does not currently offer pet ads." },
    subs: [
      { id: "fish", label: "Fish & Aquariums", aliases: ["fish", "aquarium", "fish tank"], route: { kind: "blocked" } },
      { id: "pet-supplies", label: "Pet Food & Accessories", aliases: ["dog food", "cat food", "leash", "cage", "pet bed"], route: none },
      { id: "dogs", label: "Dogs", aliases: ["dog", "puppy", "labrador", "pug"], route: { kind: "blocked" } },
      { id: "other-pets", label: "Other Pets", aliases: ["cat", "kitten", "bird", "parrot", "rabbit"], route: { kind: "blocked" } },
    ],
  },
  {
    id: "services", label: { en: "Services", hi: "सेवाएँ" }, icon: "services",
    description: "Movers, classes, repairs and more.",
    aliases: ["service"],
    trust: { status: "coming-soon", message: "Service-provider verification", disclaimer: "FairSwap does not currently verify service providers." },
    subs: [
      { id: "packers", label: "Packers & Movers", aliases: ["shifting", "relocation", "movers"], route: none },
      { id: "education", label: "Education & Classes", aliases: ["tuition", "coaching", "classes", "tutor"], route: none },
      { id: "travel", label: "Tours & Travel", aliases: ["tour", "taxi", "cab", "travel agent"], route: none },
      { id: "repair", label: "Electronics Repair & Services", aliases: ["mobile repair", "laptop repair", "ac repair", "service centre"], route: none },
      { id: "health-beauty", label: "Health & Beauty", aliases: ["salon", "spa", "makeup", "yoga"], route: none },
      { id: "renovation", label: "Home Renovation & Repair", aliases: ["plumber", "electrician", "carpenter", "painter", "interior"], route: none },
      { id: "cleaning", label: "Cleaning & Pest Control", aliases: ["maid", "deep cleaning", "pest control", "sofa cleaning"], route: none },
      { id: "legal", label: "Legal & Documentation Services", aliases: ["lawyer", "notary", "gst", "agreement", "documentation"], route: none },
      { id: "other-services", label: "Other Services", aliases: ["freelance", "event", "catering"], route: none },
    ],
  },
  {
    id: "jobs", label: { en: "Jobs", hi: "नौकरियाँ" }, icon: "jobs",
    description: "Job openings and hiring.",
    aliases: ["job", "hiring", "vacancy", "career", "work"],
    trust: { status: "coming-soon", message: "Employer verification and fraud-resistant job ads", disclaimer: "FairSwap does not currently verify employers." },
    subs: [],
  },
];

const familyOf = (caps: PostAdCapabilities, family: "two-wheelers" | "cars") =>
  family === "cars" ? caps.cars : caps.twoWheelers;
const fromFamily = (state: FamilyState): Readiness =>
  state === "live" ? "available" : state === "draft" ? "draft-only" : "coming-soon";

/** The only place a choice becomes actionable. Destination macro is the existing contract. */
export function resolveSub(sub: SubCategory, caps: PostAdCapabilities): { readiness: Readiness; macro?: MacroCategory } {
  const r = sub.route;
  switch (r.kind) {
    case "goods": return caps.goodsCategories.includes(r.key) ? { readiness: "available", macro: "goods" } : { readiness: "coming-soon" };
    case "vehicles": {
      const readiness = fromFamily(familyOf(caps, r.family));
      return readiness === "coming-soon" ? { readiness } : { readiness, macro: "vehicles" };
    }
    case "property": {
      const readiness = caps.property !== "off" && r.paths.some(x => caps.propertyPaths.includes(x))
        ? fromFamily(caps.property) : "coming-soon";
      return readiness === "coming-soon" ? { readiness } : { readiness, macro: "property" };
    }
    case "blocked": return { readiness: "unavailable" };
    default: return { readiness: "coming-soon" };
  }
}

export function isMainActionable(main: MainCategory, caps: PostAdCapabilities) {
  return main.subs.some(s => resolveSub(s, caps).macro !== undefined);
}

export interface SearchHit { main: MainCategory; sub?: SubCategory }

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9ऀ-ॿ]+/g, " ").trim();
function termMatches(term: string, q: string) {
  const t = norm(term);
  return t === q || t.startsWith(q) || (q.includes(" ") ? t.includes(q) : t.split(" ").some(w => w.startsWith(q)));
}

/** Local keyword search. Returns every plausible choice rather than guessing one. */
export function searchCatalogue(query: string, catalogue: readonly MainCategory[] = POST_AD_CATALOGUE): SearchHit[] {
  const q = norm(query);
  if (q.length < 2) return [];
  const hits: SearchHit[] = [];
  for (const main of catalogue) {
    const mainTerms = [main.label.en, main.label.hi ?? "", ...(main.aliases ?? [])];
    const mainHit = mainTerms.some(t => t && termMatches(t, q));
    const subHits = main.subs.filter(s => [s.label, ...(s.aliases ?? [])].some(t => termMatches(t, q)));
    if (subHits.length) subHits.forEach(sub => hits.push({ main, sub }));
    else if (mainHit) hits.push({ main });
  }
  return hits;
}

/** Static contract paths, used only by the isolated preview flow that has no loaded references. */
export const PREVIEW_PROPERTY_PATHS = [
  RES + "Apartment or Flat", RES + "Independent House or Villa", RES + "Builder Floor", RES + "Studio Apartment",
  PG + "Boys PG", PG + "Girls PG", PG + "Co-living Spaces", PG + "Hostels", PG + "Flatmates & Shared Rooms",
] as const;

/**
 * Fallback for callers that only know the legacy per-macro booleans. Presence is
 * never treated as publication readiness: families are at most "draft".
 */
export function capabilitiesFromAvailability(a: { goods: boolean; vehicles: boolean; property: boolean }): PostAdCapabilities {
  return {
    goodsCategories: a.goods ? ["electronics", "home-appliances", "furniture", "books", "hobbies"] : [],
    twoWheelers: a.vehicles ? "draft" : "off",
    cars: a.vehicles ? "draft" : "off",
    property: a.property ? "draft" : "off",
    propertyPaths: a.property ? PREVIEW_PROPERTY_PATHS : [],
  };
}

/** Goods category key: persisted slug when present, else the slugified name. */
export function goodsCategoryKey(c: { name: string; slug?: string | null }): string {
  return (c.slug ?? c.name).toLowerCase().replace(/&/g, " ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
