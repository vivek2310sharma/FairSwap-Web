import { createClient } from "@supabase/supabase-js";
import * as fs from "node:fs";
import * as path from "node:path";
import type { Database } from "../src/types/database";

try {
  const proc = process as unknown as { loadEnvFile?: (path?: string) => void };
  if (typeof proc.loadEnvFile === "function") {
    proc.loadEnvFile(".env.local");
  }
} catch {
  // Ignore if .env.local doesn't exist
}

export interface PostalRecordInput {
  officename: string;
  pincode: string;
  officeType?: string;
  Deliverystatus?: string;
  divisionname?: string;
  regionname?: string;
  circlename?: string;
  Taluk?: string;
  Districtname: string;
  statename: string;
}

export function validateSeedTarget(url: string) {
  const allowedHosts = ["127.0.0.1", "localhost"];
  try {
    const parsed = new URL(url);
    if (!allowedHosts.includes(parsed.hostname)) {
      throw new Error(
        `CRITICAL SAFETY REJECTION: Script refused non-local target host "${parsed.hostname}". Allowed targets: ${allowedHosts.join(", ")}`
      );
    }
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("CRITICAL SAFETY REJECTION")) {
      throw err;
    }
    throw new Error(`Invalid Supabase URL: ${url}`);
  }
}

export function normalizeText(str: string | undefined | null): string {
  if (!str) return "";
  return str
    .trim()
    .replace(/\s+/g, " ");
}

export function toTitleCase(str: string): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

export interface ImportStats {
  totalRows: number;
  imported: number;
  skipped: number;
  rejected: number;
  citiesCreated: number;
  localitiesCreated: number;
  mappingsCreated: number;
  errors: string[];
}

export async function importPostalData(
  records: PostalRecordInput[],
  supabaseUrl: string,
  serviceRoleKey: string
): Promise<ImportStats> {
  validateSeedTarget(supabaseUrl);

  const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const stats: ImportStats = {
    totalRows: records.length,
    imported: 0,
    skipped: 0,
    rejected: 0,
    citiesCreated: 0,
    localitiesCreated: 0,
    mappingsCreated: 0,
    errors: [],
  };

  const validRecords: Array<{
    pincode: string;
    office_name: string;
    office_type: string | null;
    delivery_status: string | null;
    division: string | null;
    region: string | null;
    circle: string | null;
    taluk: string | null;
    district: string;
    state: string;
    source: string;
    source_updated_at: string;
  }> = [];

  const nowIso = new Date().toISOString();

  for (const raw of records) {
    const pincode = normalizeText(raw.pincode);
    const officeName = normalizeText(raw.officename);
    const district = normalizeText(raw.Districtname);
    const state = normalizeText(raw.statename);

    if (!/^\d{6}$/.test(pincode)) {
      stats.rejected++;
      if (stats.errors.length < 10) {
        stats.errors.push(`Invalid PIN code "${pincode}" for office "${officeName}"`);
      }
      continue;
    }

    if (!officeName || !district || !state) {
      stats.rejected++;
      if (stats.errors.length < 10) {
        stats.errors.push(`Missing required fields for PIN "${pincode}"`);
      }
      continue;
    }

    validRecords.push({
      pincode,
      office_name: officeName,
      office_type: normalizeText(raw.officeType) || null,
      delivery_status: normalizeText(raw.Deliverystatus) || null,
      division: normalizeText(raw.divisionname) || null,
      region: normalizeText(raw.regionname) || null,
      circle: normalizeText(raw.circlename) || null,
      taluk: normalizeText(raw.Taluk) || null,
      district: toTitleCase(district),
      state: toTitleCase(state),
      source: "data.gov.in",
      source_updated_at: nowIso,
    });
  }

  console.log(`Validated ${validRecords.length} records (${stats.rejected} rejected)...`);

  // Batch upsert into india_postal_data
  const BATCH_SIZE = 500;
  for (let i = 0; i < validRecords.length; i += BATCH_SIZE) {
    const batch = validRecords.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from("india_postal_data")
      .upsert(batch, { onConflict: "pincode,office_name" });

    if (error) {
      console.error(`Batch upsert error [${i}-${i + batch.length}]:`, error.message);
      stats.skipped += batch.length;
      if (stats.errors.length < 20) {
        stats.errors.push(`Batch upsert failed: ${error.message}`);
      }
    } else {
      stats.imported += batch.length;
    }
  }

  // Derive cities & localities for high-priority postal offices
  // For each distinct state + district combo, ensure city exists in public.cities
  const cityMap = new Map<string, string>(); // "district|state" -> city_id

  const uniqueCities = new Map<string, { name: string; state: string; district: string }>();
  for (const r of validRecords) {
    const key = `${r.district.toLowerCase()}|${r.state.toLowerCase()}`;
    if (!uniqueCities.has(key)) {
      uniqueCities.set(key, { name: r.district, state: r.state, district: r.district });
    }
  }

  for (const [, cityInfo] of uniqueCities) {
    const slug = slugify(`${cityInfo.name}-${cityInfo.state}`);
    
    // Check if city exists
    const { data: existingCity } = await supabase
      .from("cities")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    let cityId: string;
    if (existingCity) {
      cityId = existingCity.id;
    } else {
      const { data: newCity, error: cityErr } = await supabase
        .from("cities")
        .insert({
          name: cityInfo.name,
          state: cityInfo.state,
          district: cityInfo.district,
          slug,
          is_active: true,
        })
        .select("id")
        .single();

      if (cityErr || !newCity) {
        console.warn(`Could not create city "${cityInfo.name}":`, cityErr?.message);
        continue;
      }
      cityId = newCity.id;
      stats.citiesCreated++;
    }

    cityMap.set(`${cityInfo.district.toLowerCase()}|${cityInfo.state.toLowerCase()}`, cityId);
  }

  // Derive localities & mappings
  for (const r of validRecords) {
    const cityKey = `${r.district.toLowerCase()}|${r.state.toLowerCase()}`;
    const cityId = cityMap.get(cityKey);
    if (!cityId) continue;

    // Clean post office name for locality (remove B.O, S.O, H.O suffixes if present)
    const cleanLocalityName = r.office_name
      .replace(/\s+(B\.O|S\.O|H\.O|SO|BO|HO)$/i, "")
      .trim();

    if (!cleanLocalityName) continue;

    const locSlug = slugify(cleanLocalityName);
    if (!locSlug) continue;

    // Fetch or create locality
    const { data: existingLoc } = await supabase
      .from("localities")
      .select("id")
      .eq("city_id", cityId)
      .eq("slug", locSlug)
      .maybeSingle();

    let localityId: string;
    if (existingLoc) {
      localityId = existingLoc.id;
    } else {
      const { data: newLoc, error: locErr } = await supabase
        .from("localities")
        .insert({
          city_id: cityId,
          name: toTitleCase(cleanLocalityName),
          slug: locSlug,
          is_active: true,
        })
        .select("id")
        .single();

      if (locErr || !newLoc) {
        // Might fail on constraint if slug duplicate, select again
        const { data: fallbackLoc } = await supabase
          .from("localities")
          .select("id")
          .eq("city_id", cityId)
          .eq("slug", locSlug)
          .maybeSingle();

        if (!fallbackLoc) continue;
        localityId = fallbackLoc.id;
      } else {
        localityId = newLoc.id;
        stats.localitiesCreated++;
      }
    }

    // Upsert postal_pincode_localities mapping
    const { error: mapErr } = await supabase
      .from("postal_pincode_localities")
      .upsert(
        {
          pincode: r.pincode,
          locality_id: localityId,
          office_name: r.office_name,
        },
        { onConflict: "pincode,locality_id" }
      );

    if (!mapErr) {
      stats.mappingsCreated++;
    }
  }

  return stats;
}

export function parseCSVFile(filePath: string): PostalRecordInput[] {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length <= 1) return [];

  const headers = parseCSVLine(lines[0]).map((h) => h.toLowerCase());
  const records: PostalRecordInput[] = [];

  const idxOffice = headers.findIndex((h) => h.includes("office") || h.includes("officename"));
  const idxPincode = headers.findIndex((h) => h.includes("pin") || h.includes("pincode"));
  const idxType = headers.findIndex((h) => h.includes("type") || h.includes("officetype"));
  const idxDelivery = headers.findIndex((h) => h.includes("delivery") || h.includes("deliverystatus"));
  const idxDivision = headers.findIndex((h) => h.includes("division"));
  const idxRegion = headers.findIndex((h) => h.includes("region"));
  const idxCircle = headers.findIndex((h) => h.includes("circle"));
  const idxTaluk = headers.findIndex((h) => h.includes("taluk"));
  const idxDistrict = headers.findIndex((h) => h.includes("district"));
  const idxState = headers.findIndex((h) => h.includes("state"));

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (cols.length < 3) continue;

    records.push({
      officename: idxOffice >= 0 ? cols[idxOffice] : cols[0],
      pincode: idxPincode >= 0 ? cols[idxPincode] : cols[1],
      officeType: idxType >= 0 ? cols[idxType] : undefined,
      Deliverystatus: idxDelivery >= 0 ? cols[idxDelivery] : undefined,
      divisionname: idxDivision >= 0 ? cols[idxDivision] : undefined,
      regionname: idxRegion >= 0 ? cols[idxRegion] : undefined,
      circlename: idxCircle >= 0 ? cols[idxCircle] : undefined,
      Taluk: idxTaluk >= 0 ? cols[idxTaluk] : undefined,
      Districtname: idxDistrict >= 0 ? cols[idxDistrict] : cols[cols.length - 2] || "",
      statename: idxState >= 0 ? cols[idxState] : cols[cols.length - 1] || "",
    });
  }

  return records;
}

// Default sample dataset for test/seed run if no CSV argument provided
export const SAMPLE_INDIA_POSTAL_DATA: PostalRecordInput[] = [
  // Bengaluru Urban
  { officename: "Koramangala VI Bk S.O", pincode: "560095", Districtname: "Bengaluru Urban", statename: "Karnataka", Deliverystatus: "Delivery", Taluk: "Bengaluru South" },
  { officename: "Koramangala I Block S.O", pincode: "560034", Districtname: "Bengaluru Urban", statename: "Karnataka", Deliverystatus: "Delivery", Taluk: "Bengaluru South" },
  { officename: "Madiwala S.O", pincode: "560068", Districtname: "Bengaluru Urban", statename: "Karnataka", Deliverystatus: "Delivery", Taluk: "Bengaluru South" },
  { officename: "Indiranagar S.O", pincode: "560038", Districtname: "Bengaluru Urban", statename: "Karnataka", Deliverystatus: "Delivery", Taluk: "Bengaluru North" },
  { officename: "Jayanagar S.O", pincode: "560041", Districtname: "Bengaluru Urban", statename: "Karnataka", Deliverystatus: "Delivery", Taluk: "Bengaluru South" },
  { officename: "Whitefield S.O", pincode: "560066", Districtname: "Bengaluru Urban", statename: "Karnataka", Deliverystatus: "Delivery", Taluk: "Bengaluru East" },

  // Jaipur (complementing existing pilot seed data)
  { officename: "Malviya Nagar S.O", pincode: "302017", Districtname: "Jaipur", statename: "Rajasthan", Deliverystatus: "Delivery", Taluk: "Jaipur" },
  { officename: "Vaishali Nagar S.O", pincode: "302021", Districtname: "Jaipur", statename: "Rajasthan", Deliverystatus: "Delivery", Taluk: "Jaipur" },
  { officename: "Mansarovar S.O", pincode: "302020", Districtname: "Jaipur", statename: "Rajasthan", Deliverystatus: "Delivery", Taluk: "Jaipur" },
  { officename: "C Scheme S.O", pincode: "302001", Districtname: "Jaipur", statename: "Rajasthan", Deliverystatus: "Delivery", Taluk: "Jaipur" },
  { officename: "Raja Park S.O", pincode: "302004", Districtname: "Jaipur", statename: "Rajasthan", Deliverystatus: "Delivery", Taluk: "Jaipur" },

  // Mumbai
  { officename: "Bandra West S.O", pincode: "400050", Districtname: "Mumbai Suburban", statename: "Maharashtra", Deliverystatus: "Delivery", Taluk: "Bandra" },
  { officename: "Andheri West S.O", pincode: "400058", Districtname: "Mumbai Suburban", statename: "Maharashtra", Deliverystatus: "Delivery", Taluk: "Andheri" },

  // Delhi
  { officename: "Connaught Place H.O", pincode: "110001", Districtname: "New Delhi", statename: "Delhi", Deliverystatus: "Delivery", Taluk: "New Delhi" },
  { officename: "Hauz Khas S.O", pincode: "110016", Districtname: "South Delhi", statename: "Delhi", Deliverystatus: "Delivery", Taluk: "Hauz Khas" },
];

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    console.error("SUPABASE_SERVICE_ROLE_KEY is required for postal data import script");
    process.exit(1);
  }

  const csvArg = process.argv[2];
  let records: PostalRecordInput[];

  if (csvArg && fs.existsSync(csvArg)) {
    console.log(`Loading postal records from CSV file: ${csvArg}`);
    records = parseCSVFile(csvArg);
  } else {
    console.log("No CSV file provided or file not found. Importing standard seed India postal dataset...");
    records = SAMPLE_INDIA_POSTAL_DATA;
  }

  console.log(`Starting import of ${records.length} postal records...`);
  const stats = await importPostalData(records, supabaseUrl, serviceRoleKey);

  console.log("----------------------------------------");
  console.log("Postal Import Summary:");
  console.log(`  Total input rows:      ${stats.totalRows}`);
  console.log(`  Successfully imported: ${stats.imported}`);
  console.log(`  Skipped (upsert err):  ${stats.skipped}`);
  console.log(`  Rejected (invalid):    ${stats.rejected}`);
  console.log(`  New cities created:    ${stats.citiesCreated}`);
  console.log(`  New localities created:${stats.localitiesCreated}`);
  console.log(`  Mappings created:      ${stats.mappingsCreated}`);
  if (stats.errors.length > 0) {
    console.log("Sample Errors:");
    stats.errors.slice(0, 5).forEach((e) => console.log(`  - ${e}`));
  }
  console.log("----------------------------------------");
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  main().catch((err) => {
    console.error("Fatal error during postal data import:", err);
    process.exit(1);
  });
}
