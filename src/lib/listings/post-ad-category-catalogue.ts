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
  mobilePhones?: boolean;
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
  | { kind: "mobile-phones" }
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
  hi?: string;
  guidance?: string;
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
    id: "mobiles", label: { en: "Mobiles & Tablets", hi: "मोबाइल और टैबलेट" },
    description: "Phones, accessories and tablets.",
    aliases: ["phone", "smartphone", "cellphone"],
    trust: { status: "available", message: "Have your bill and box ready — buyers trust them.", disclaimer: "FairSwap does not currently verify IMEI or device authenticity." },
    subs: [
      { id: "mobile-phones", label: "Mobile Phones", hi: "मोबाइल फोन", aliases: ["iphone", "samsung", "redmi", "oneplus", "vivo", "oppo", "realme", "android", "smartphone"], route: {kind:"mobile-phones"} },
      { id: "mobile-accessories", label: "Accessories", hi: "एक्सेसरीज़", aliases: ["charger", "earphones", "earbuds", "cover", "case", "power bank"], route: none },
      { id: "tablets", label: "Tablets", hi: "टैबलेट", aliases: ["ipad", "tab"], route: none },
      { id: "wearables", label: "Smartwatches & Wearables", hi: "स्मार्टवॉच और वियरेबल्स", aliases:["smartwatch","wearable"], route:none },
    ],
  },
  {
    id: "vehicles", label: { en: "Vehicles", hi: "वाहन" },
    description: "Cars, bikes, scooters and more.",
    aliases: ["vehicle", "gaadi", "gadi"],
    trust: { status: "coming-soon", message: "RC and ownership verification", disclaimer: "FairSwap does not currently verify vehicle ownership documents." },
    subs: [
      { id: "cars", label: "Cars", hi: "कारें", aliases: ["car", "hatchback", "sedan", "suv", "maruti", "swift", "alto", "hyundai", "tata", "honda city"], route: { kind: "vehicles", family: "cars" } },
      { id: "two-wheelers", label: "Motorcycles & Scooters", hi: "मोटरसाइकिल और स्कूटर", aliases: ["activa", "royal enfield", "bullet", "bike", "scooter", "scooty", "motorcycle", "splendor", "pulsar", "two wheeler", "tvs", "bajaj", "hero", "registered electric scooter", "e-scooty", "ई स्कूटी"], route: { kind: "vehicles", family: "two-wheelers" } },
      { id: "bicycles", label: "Bicycles", hi: "साइकिल", aliases: ["cycle", "bicycle", "mtb", "gear cycle"], route: none },
      { id: "electric-cycles", label: "Electric Cycles & Low-Speed EVs", hi: "इलेक्ट्रिक साइकिल और कम गति वाले ईवी", aliases: ["e cycle", "electric bicycle", "low speed", "e-scooty", "ई स्कूटी", "इलेक्ट्रिक साइकिल"], guidance: "Speed alone does not establish a registration exemption. Classification requires applicable testing-agency certification. Registered electric motorcycles and scooters use Motorcycles & Scooters; exempt-vehicle posting is not yet supported.", route: none },
      { id: "vehicle-parts", label: "Spare Parts & Accessories", hi: "स्पेयर पार्ट्स और सामान", aliases: ["tyre", "tire", "helmet", "battery", "spare"], route: none },
      { id: "commercial-vehicles", label: "Commercial & Other Vehicles", hi: "वाणिज्यिक और अन्य वाहन", aliases: ["truck", "auto", "rickshaw", "e-rickshaw", "tractor", "tempo", "van"], route: none },
    ],
  },
  {
    id: "property", label: { en: "Property", hi: "प्रॉपर्टी" },
    description: "Rent or sell homes, shops and land.",
    aliases: ["real estate", "flat", "house", "room", "rent", "to let"],
    trust: { status: "coming-soon", message: "Ownership and document verification", disclaimer: "FairSwap does not currently verify property ownership or documents." },
    subs: [
      { id: "rent-houses", group: "For Rent", label: "Houses & Apartments", hi: "मकान और अपार्टमेंट", aliases: ["flat", "bhk", "1bhk", "2bhk", "apartment", "house", "rent"], route: rent(RES + "Apartment or Flat", RES + "Independent House or Villa", RES + "Builder Floor", RES + "Studio Apartment") },
      { id: "rent-commercial", group: "For Rent", label: "Shops & Offices", hi: "दुकानें और कार्यालय", aliases: ["shop", "office", "showroom", "godown"], route: none },
      { id: "rent-pg", group: "For Rent", label: "PG & Guest Houses", hi: "पीजी और गेस्ट हाउस", aliases: ["pg", "paying guest", "hostel", "guest house", "co-living"], route: rent(PG + "Boys PG", PG + "Girls PG", PG + "Co-living Spaces", PG + "Hostels") },
      { id: "rent-land", group: "For Rent", label: "Land & Plots", hi: "जमीन और प्लॉट", aliases: ["plot", "land"], route: none },
      { id: "rent-flatmates", group: "For Rent", label: "Flatmates & Shared Rooms", hi: "फ्लैटमेट और साझा कमरे", aliases: ["flatmate", "roommate", "shared room", "sharing", "रूममेट", "साझा कमरा", "कमरा साथी"], route: rent(PG + "Flatmates & Shared Rooms") },
      { id: "rent-warehouses", group: "For Rent", label: "Godowns & Warehouses", hi: "गोदाम और वेयरहाउस", aliases: ["godown", "warehouse", "storage shed", "गोदाम"], route: none },
      { id: "sale-houses", group: "For Sale", label: "Houses & Apartments", hi: "मकान और अपार्टमेंट", aliases: ["buy flat", "sell house", "resale"], route: none },
      { id: "sale-commercial", group: "For Sale", label: "Shops & Offices", hi: "दुकानें और कार्यालय", route: none },
      { id: "sale-warehouses", group: "For Sale", label: "Godowns & Warehouses", hi: "गोदाम और वेयरहाउस", aliases: ["godown", "warehouse", "गोदाम"], route: none },
      { id: "sale-land", group: "For Sale", label: "Land & Plots", hi: "जमीन और प्लॉट", route: none },
    ],
  },
  {
    id: "appliances", label: { en: "Home Electronics & Appliances", hi: "होम इलेक्ट्रॉनिक्स और उपकरण" },
    description: "TVs, fridges, ACs and kitchen appliances.",
    aliases: ["appliance", "home appliance", "electronics"],
    trust: { status: "coming-soon", message: "Product authenticity checks", disclaimer: "FairSwap does not currently check product authenticity." },
    subs: [
      { id: "tv-audio", label: "TVs & Video", hi: "टीवी और वीडियो", aliases: ["tv", "television", "led", "video", "टीवी"], route: goods("tvs-video") },
      { id: "audio-home-theatre", label: "Audio & Home Theatre", hi: "ऑडियो और होम थिएटर", aliases: ["headphones", "earbuds", "speaker", "soundbar", "amplifier", "home theatre", "हेडफोन", "स्पीकर"], route: goods("audio-home-theatre") },
      { id: "power-backup-solar", label: "Power Backup & Solar", hi: "पावर बैकअप और सौर उपकरण", aliases: ["inverter", "ups", "battery", "solar", "power backup", "इन्वर्टर", "बैटरी", "सोलर"], route: goods("power-backup-solar") },
      { id: "kitchen", label: "Kitchen Appliances", hi: "रसोई के उपकरण", aliases: ["mixer", "grinder", "microwave", "oven", "induction", "gas stove", "chimney"], route: none },
      { id: "fridge", label: "Refrigerators", hi: "रेफ्रिजरेटर", aliases: ["fridge", "refrigerator", "freezer", "godrej", "double door"], route: none },
      { id: "ac", label: "Air Conditioners", hi: "एयर कंडीशनर", aliases: ["ac", "air conditioner", "split ac", "window ac", "cooler"], route: none },
      { id: "washing", label: "Washing Machines", hi: "वॉशिंग मशीन", aliases: ["washing machine", "washer", "front load", "top load"], route: none },
      { id: "other-appliances", label: "Other Home Appliances", hi: "अन्य घरेलू उपकरण", aliases: ["fan", "geyser", "heater", "iron", "vacuum", "water purifier", "ro", "ro system", "sewing machine", "silai machine", "सिलाई मशीन", "पंखा", "गीजर", "वाटर प्यूरीफायर", "आरओ"], route: goods("other-home-appliances") },
      { id: "general-electronics-tv", label: "General Electronics", hi: "सामान्य इलेक्ट्रॉनिक्स", aliases: ["electronics", "tv", "television", "speaker"], route: goods("electronics") },
      { id: "general-appliances", label: "General Home Appliances", hi: "सामान्य घरेलू उपकरण", aliases: ["home appliances", "appliance", "fridge", "refrigerator", "ac", "washing machine", "mixer", "microwave"], route: goods("home-appliances") },
    ],
  },
  {
    id: "computers", label: { en: "Computers & Cameras", hi: "कंप्यूटर और कैमरा" },
    description: "Laptops, cameras, games and accessories.",
    aliases: ["computer"],
    trust: { status: "coming-soon", message: "Device and serial-number checks", disclaimer: "FairSwap does not currently check device serial numbers." },
    subs: [
      { id: "laptops", label: "Computers & Laptops", hi: "कंप्यूटर और लैपटॉप", aliases: ["laptop", "macbook", "desktop", "pc", "dell", "hp", "lenovo", "notebook"], route: none },
      { id: "cameras", label: "Cameras & Lenses", hi: "कैमरा और लेंस", aliases: ["camera", "dslr", "canon", "nikon", "lens", "gopro"], route: none },
      { id: "games", label: "Games & Entertainment", hi: "वीडियो गेम और मनोरंजन", aliases: ["playstation", "ps4", "ps5", "xbox", "console", "video game"], route: none },
      { id: "computer-accessories", label: "Computer Accessories", hi: "कंप्यूटर एक्सेसरीज़", aliases: ["keyboard", "mouse", "webcam", "router", "pendrive"], route: none },
      { id: "storage", label: "Hard Disks & Storage", hi: "हार्ड डिस्क और स्टोरेज", aliases: ["hard disk", "hdd", "ssd", "pen drive", "memory card"], route: none },
      { id: "printers-monitors", label: "Printers & Monitors", hi: "प्रिंटर और मॉनिटर", aliases: ["printer", "monitor", "scanner", "projector"], route: none },
      { id: "general-electronics-pc", label: "General Electronics", hi: "सामान्य इलेक्ट्रॉनिक्स", aliases: ["electronics", "laptop", "computer", "camera", "printer", "monitor"], route: goods("electronics") },
    ],
  },
  {
    id: "furniture", label: { en: "Furniture & Home", hi: "फर्नीचर और घर" },
    description: "Sofas, beds, tables and household items.",
    aliases: ["furniture", "household"],
    trust: { status: "coming-soon", message: "Better condition and pickup safeguards", disclaimer: "FairSwap does not currently inspect items or arrange pickup." },
    subs: [
      { id: "sofa-dining", label: "Sofas & Dining", hi: "सोफे और डाइनिंग फर्नीचर", aliases: ["sofa", "couch", "dining table", "diwan"], route: none },
      { id: "beds-wardrobes", label: "Beds & Wardrobes", hi: "बिस्तर और अलमारियाँ", aliases: ["bed", "mattress", "wardrobe", "almirah", "cupboard", "cot"], route: none },
      { id: "decor-garden", label: "Home Decor & Garden", hi: "घर की सजावट और बगीचा", aliases: ["decor", "plant", "pot", "garden", "painting", "curtain"], route: none },
      { id: "kids-furniture", label: "Kids Furniture", hi: "बच्चों का फर्नीचर", aliases: ["cradle", "baby bed", "study table"], route: none },
      { id: "tables-chairs", label: "Tables & Chairs", hi: "मेज और कुर्सियाँ", aliases: ["table", "chair", "desk", "office chair", "stool"], route: none },
      { id: "other-household", label: "Other Household Items", hi: "अन्य घरेलू सामान", aliases: ["utensils", "household", "storage"], route: none },
      { id: "kitchenware-utensils", label: "Kitchenware & Utensils", hi: "रसोई का सामान और बर्तन", aliases: ["cookware", "steel utensils", "dishes", "storage containers", "non electrical kitchen", "bartan", "बर्तन", "डिब्बे", "कड़ाही", "तवा"], route: goods("kitchenware-utensils") },
      { id: "general-furniture", label: "General Furniture", hi: "सामान्य फर्नीचर", aliases: ["furniture", "sofa", "bed", "table", "chair", "wardrobe"], route: goods("furniture") },
    ],
  },
  {
    id: "fashion", label: { en: "Fashion", hi: "फैशन" },
    description: "Clothing, footwear, watches and accessories.",
    aliases: ["clothes", "clothing", "dress", "saree", "kurta", "shoes", "jeans"],
    trust: { status: "coming-soon", message: "Brand authenticity checks", disclaimer: "FairSwap does not currently check brand authenticity." },
    subs: [
      { id: "mens", label: "Men", hi: "पुरुष", aliases: ["shirt", "kurta", "jeans", "suit", "sherwani", "mens clothing", "mens footwear", "shoes", "पुरुषों के कपड़े", "जूते"], route: goods("fashion-men") },
      { id: "womens", label: "Women", hi: "महिलाएँ", aliases: ["saree", "lehenga", "dress", "kurti", "salwar", "womens clothing", "womens footwear", "sandals", "साड़ी", "महिलाओं के कपड़े"], route: goods("fashion-women") },
      { id: "kids-clothing", label: "Kids", hi: "बच्चे", aliases: ["baby clothes", "school uniform", "frock", "kids clothing", "kids footwear", "बच्चों के कपड़े", "बच्चों के जूते"], route: goods("fashion-kids") },
      { id: "watches", label: "Watches", hi: "घड़ियाँ", aliases: ["watch", "analog", "digital watch", "branded watch", "घड़ी"], route: goods("fashion-watches") },
      { id: "sunglasses-accessories", label: "Sunglasses & Accessories", hi: "धूप के चश्मे और एक्सेसरीज़", aliases: ["sunglasses", "belt", "wallet", "bag", "cap", "चश्मा", "बेल्ट", "बटुआ", "बैग", "टोपी"], route: goods("fashion-accessories") },
    ],
  },
  {
    id: "kids-baby", label: { en: "Kids & Baby", hi: "बच्चे और शिशु" },
    description: "Prams, baby furniture, toys and school essentials.",
    aliases: ["baby", "infant", "toddler", "शिशु", "बच्चे"],
    trust: { status: "planned", message: "Baby-product safety checks", disclaimer: "FairSwap does not verify product safety or recalls. Car-seat posting is unavailable." },
    subs: [
      { id: "strollers-prams", label: "Strollers & Prams", hi: "स्ट्रोलर और प्रैम", aliases: ["stroller", "pram", "pushchair", "बच्चे की गाड़ी", "प्रैम"], route: goods("strollers-prams") },
      { id: "baby-car-seats", label: "Car Seats", hi: "बच्चों की कार सीट", aliases: ["child seat", "baby car seat", "कार सीट"], guidance: "Do not sell a recalled or known unsafe car seat, a crash-damaged seat, or one with missing parts. Check the model and recall notices with the manufacturer. Car-seat posting remains unavailable until safety review is supported.", route: none },
      { id: "baby-furniture", label: "Cribs, Cots & Baby Furniture", hi: "पालने और शिशु फर्नीचर", aliases: ["crib", "cot", "cradle", "baby bed", "पालना"], route: goods("baby-furniture") },
      { id: "baby-gear", label: "Baby Gear & Accessories", hi: "शिशु के उपकरण और सामान", aliases: ["baby carrier", "baby gear", "diaper bag", "बेबी कैरियर"], route: goods("baby-gear") },
      { id: "toys-games", label: "Toys & Games", hi: "खिलौने और खेल", aliases: ["toy", "board game", "puzzle", "खिलौने", "खेल"], route: goods("toys-games") },
      { id: "school-essentials", label: "School Bags & Kids Essentials", hi: "स्कूल बैग और बच्चों का जरूरी सामान", aliases: ["school bag", "lunch box", "pencil case", "स्कूल बैग", "टिफिन"], route: goods("school-essentials") },
    ],
  },
  {
    id: "hobbies", label: { en: "Books, Sports & Hobbies", hi: "किताबें, खेल और शौक" },
    description: "Books, fitness, instruments and sports gear.",
    aliases: ["hobby", "sports"],
    trust: { status: "coming-soon", message: "Better condition and ad evidence guidance", disclaimer: "FairSwap does not currently verify item condition." },
    subs: [
      { id: "books", label: "Books", hi: "किताबें", aliases: ["textbook", "novel", "ncert", "study material", "notes"], route: goods("books") },
      { id: "gym", label: "Gym & Fitness", hi: "जिम और फिटनेस", aliases: ["dumbbell", "treadmill", "gym", "exercise", "yoga mat"], route: none },
      { id: "instruments", label: "Musical Instruments", hi: "संगीत वाद्ययंत्र", aliases: ["guitar", "harmonium", "tabla", "keyboard piano", "piano", "violin", "drum"], route: none },
      { id: "sports-equipment", label: "Sports Equipment", hi: "खेल उपकरण", aliases: ["cricket bat", "bat", "football", "badminton", "racket", "carrom"], route: none },
      { id: "other-hobbies", label: "Other Hobbies", hi: "अन्य शौक", aliases: ["collectibles", "coins", "stamps", "craft"], route: none },
      { id: "general-hobbies", label: "General Hobbies", hi: "सामान्य शौक", aliases: ["hobbies", "guitar", "instrument", "games", "collectibles"], route: goods("hobbies") },
    ],
  },
  {
    id: "pets", label: { en: "Pets", hi: "पालतू जानवर" },
    description: "Pet food, accessories and supplies.",
    aliases: ["pet", "animal", "puppy", "cat", "bird"],
    hideComingSoonBadge: true,
    trust: { status: "coming-soon", message: "Safer, policy-compliant pet-related ad safeguards", disclaimer: "FairSwap does not currently offer pet ads." },
    subs: [
      { id: "fish", label: "Fish & Aquariums", hi: "मछलियाँ और एक्वेरियम", aliases: ["fish", "aquarium", "fish tank"], route: { kind: "blocked" } },
      { id: "pet-supplies", label: "Pet Food & Accessories", hi: "पालतू पशु आहार और सामान", aliases: ["dog food", "cat food", "leash", "cage", "pet bed"], route: none },
      { id: "dogs", label: "Dogs", hi: "कुत्ते", aliases: ["dog", "puppy", "labrador", "pug"], route: { kind: "blocked" } },
      { id: "other-pets", label: "Other Pets", hi: "अन्य पालतू जानवर", aliases: ["cat", "kitten", "bird", "parrot", "rabbit"], route: { kind: "blocked" } },
    ],
  },
  {
    id: "services", label: { en: "Services", hi: "सेवाएँ" },
    description: "Movers, classes, repairs and more.",
    aliases: ["service"],
    trust: { status: "coming-soon", message: "Service-provider verification", disclaimer: "FairSwap does not currently verify service providers." },
    subs: [
      { id: "packers", label: "Packers & Movers", hi: "पैकर्स और मूवर्स", aliases: ["shifting", "relocation", "movers"], route: none },
      { id: "education", label: "Education & Classes", hi: "शिक्षा और कक्षाएँ", aliases: ["tuition", "coaching", "classes", "tutor"], route: none },
      { id: "travel", label: "Tours & Travel", hi: "टूर और यात्रा", aliases: ["tour", "taxi", "cab", "travel agent"], route: none },
      { id: "repair", label: "Electronics Repair & Services", hi: "इलेक्ट्रॉनिक्स की मरम्मत और सेवाएँ", aliases: ["mobile repair", "laptop repair", "ac repair", "service centre"], route: none },
      { id: "health-beauty", label: "Health & Beauty", hi: "स्वास्थ्य और सौंदर्य", aliases: ["salon", "spa", "makeup", "yoga"], route: none },
      { id: "renovation", label: "Home Renovation & Repair", hi: "घर का नवीनीकरण और मरम्मत", aliases: ["plumber", "electrician", "carpenter", "painter", "interior"], route: none },
      { id: "cleaning", label: "Cleaning & Pest Control", hi: "सफाई और कीट नियंत्रण", aliases: ["maid", "deep cleaning", "pest control", "sofa cleaning"], route: none },
      { id: "legal", label: "Legal & Documentation Services", hi: "कानूनी और दस्तावेज़ सेवाएँ", aliases: ["lawyer", "notary", "gst", "agreement", "documentation"], route: none },
      { id: "other-services", label: "Other Services", hi: "अन्य सेवाएँ", aliases: ["freelance", "event", "catering"], route: none },
    ],
  },
  {
    id: "jobs", label: { en: "Jobs", hi: "नौकरियाँ" },
    description: "Job openings and hiring.",
    aliases: ["job", "hiring", "vacancy", "career", "work"],
    trust: { status: "coming-soon", message: "Employer verification and fraud-resistant job ads", disclaimer: "FairSwap does not currently verify employers." },
    subs: [],
  },
  {
    id: "everything-else", label: { en: "Other / Everything Else", hi: "अन्य सामान" },
    description: "Items without a suitable category. Posting unavailable.",
    aliases: ["other", "everything else", "miscellaneous", "अन्य"],
    trust: { status: "planned", message: "Mandatory staff review and category reassignment", disclaimer: "Other posting is unavailable until backend moderation and staff reclassification are supported." },
    subs: [{ id: "other-items", label: "Other Items", hi: "अन्य वस्तुएँ", guidance: "Posting is unavailable until category-specific descriptions, mandatory staff moderation and staff reclassification are enforced. Prohibited items remain prohibited.", route: none }],
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
    case "mobile-phones": return caps.mobilePhones ? {readiness:"available",macro:"goods"} : {readiness:"coming-soon"};
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
    case "none": return { readiness: "coming-soon" };
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
    const subHits = main.subs.filter(s => [s.label, s.hi ?? "", ...(s.aliases ?? [])].some(t => termMatches(t, q)));
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
