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

export interface ImportTargetOptions {
  allowRemote: boolean;
  confirmHost: string | null;
  isDemo: boolean;
}

export function validateImportTarget(url: string, options: ImportTargetOptions) {
  const LOCAL_HOSTS = ["127.0.0.1", "localhost"];
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Invalid Supabase URL: ${url}`);
  }

  const hostname = parsed.hostname;
  const isLocal = LOCAL_HOSTS.includes(hostname);

  if (isLocal) {
    return; // Local targets always allowed
  }

  // Remote target checks
  if (!options.allowRemote) {
    throw new Error(
      `SAFETY REJECTION: Remote target "${hostname}" is not allowed without --allow-remote.\n` +
      `Usage: npm run location:import -- ./data.csv --allow-remote --confirm-host ${hostname}`
    );
  }

  if (!hostname.endsWith(".supabase.co")) {
    throw new Error(
      `SAFETY REJECTION: Remote host "${hostname}" is not a recognized Supabase host (*.supabase.co).`
    );
  }

  if (!options.confirmHost) {
    throw new Error(
      `SAFETY REJECTION: --allow-remote requires --confirm-host <hostname>.\n` +
      `Usage: --allow-remote --confirm-host ${hostname}`
    );
  }

  if (options.confirmHost !== hostname) {
    throw new Error(
      `SAFETY REJECTION: --confirm-host "${options.confirmHost}" does not match actual target "${hostname}".`
    );
  }

  if (options.isDemo) {
    throw new Error(
      `SAFETY REJECTION: --demo is not allowed against remote target "${hostname}". Demo data is for local development only.`
    );
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
  serviceRoleKey: string,
  targetOptions: ImportTargetOptions = { allowRemote: false, confirmHost: null, isDemo: false }
): Promise<ImportStats> {
  validateImportTarget(supabaseUrl, targetOptions);

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
  const validMap = new Map<string, (typeof validRecords)[0]>();

  const nowIso = new Date().toISOString();

  for (const raw of records) {
    const pincode = normalizeText(raw.pincode).replace(/\s+/g, "");
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

    const key = `${pincode}|${officeName.toLowerCase()}`;
    validMap.set(key, {
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

  for (const rec of validMap.values()) {
    validRecords.push(rec);
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

    if ((i + BATCH_SIZE) % 10000 === 0 || i + BATCH_SIZE >= validRecords.length) {
      console.log(`  -> Postal data progress: ${Math.min(i + BATCH_SIZE, validRecords.length)} / ${validRecords.length}`);
    }
  }

  // Derive cities & localities for high-priority postal offices
  // For each distinct state + district combo, ensure city exists in public.cities
  // Primary identity: normalized (name, state) — NOT slug, which is an implementation detail
  const cityMap = new Map<string, string>(); // "district|state" -> city_id

  const uniqueCities = new Map<string, { name: string; state: string; district: string }>();
  for (const r of validRecords) {
    const key = `${r.district.toLowerCase()}|${r.state.toLowerCase()}`;
    if (!uniqueCities.has(key)) {
      uniqueCities.set(key, { name: r.district, state: r.state, district: r.district });
    }
  }

  console.log(`Ensuring ${uniqueCities.size} cities exist...`);
  let citiesProcessed = 0;
  for (const [, cityInfo] of uniqueCities) {
    // 1. Look for existing city by normalized name + state (case-insensitive)
    const { data: existingByName } = await supabase
      .from("cities")
      .select("id")
      .ilike("name", cityInfo.name)
      .ilike("state", cityInfo.state)
      .limit(1)
      .maybeSingle();

    let cityId: string;
    if (existingByName) {
      cityId = existingByName.id;
    } else {
      // 2. No canonical match — create new city
      const slug = slugify(`${cityInfo.name}-${cityInfo.state}`);
      const { data: newCity, error: cityErr } = await supabase
        .from("cities")
        .insert({
          name: cityInfo.name,
          state: cityInfo.state,
          slug,
          is_active: true,
        })
        .select("id")
        .single();

      if (cityErr || !newCity) {
        // Might have been created concurrently; try to find it again
        const { data: retry } = await supabase
          .from("cities")
          .select("id")
          .ilike("name", cityInfo.name)
          .ilike("state", cityInfo.state)
          .limit(1)
          .maybeSingle();
        if (!retry) {
          console.warn(`Could not create city "${cityInfo.name}":`, cityErr?.message);
          continue;
        }
        cityId = retry.id;
      } else {
        cityId = newCity.id;
        stats.citiesCreated++;
      }
    }

    cityMap.set(`${cityInfo.district.toLowerCase()}|${cityInfo.state.toLowerCase()}`, cityId);
    citiesProcessed++;
    if (citiesProcessed % 100 === 0 || citiesProcessed === uniqueCities.size) {
      console.log(`  -> Cities progress: ${citiesProcessed} / ${uniqueCities.size}`);
    }
  }

  // Derive localities & mappings using batched upserts
  const localityCache = new Map<string, string>(); // `${cityId}|${locSlug}` -> localityId
  const uniqueLocs = new Map<string, { city_id: string; name: string; slug: string; is_active: boolean }>();

  for (const r of validRecords) {
    const cityKey = `${r.district.toLowerCase()}|${r.state.toLowerCase()}`;
    const cityId = cityMap.get(cityKey);
    if (!cityId) continue;

    const cleanLocalityName = r.office_name
      .replace(/\s+(B\.O|S\.O|H\.O|SO|BO|HO)$/i, "")
      .trim();

    if (!cleanLocalityName) continue;

    const locSlug = slugify(cleanLocalityName);
    if (!locSlug) continue;

    const key = `${cityId}|${locSlug}`;
    if (!uniqueLocs.has(key)) {
      uniqueLocs.set(key, {
        city_id: cityId,
        name: toTitleCase(cleanLocalityName),
        slug: locSlug,
        is_active: true,
      });
    }
  }

  console.log(`Batch upserting ${uniqueLocs.size} unique localities...`);
  // Batch upsert localities in chunks of BATCH_SIZE (500)
  const locArray = Array.from(uniqueLocs.values());
  for (let i = 0; i < locArray.length; i += BATCH_SIZE) {
    const chunk = locArray.slice(i, i + BATCH_SIZE);
    const { data: upserted, error: locErr } = await supabase
      .from("localities")
      .upsert(chunk, { onConflict: "city_id,slug" })
      .select("id, city_id, slug");

    if (locErr) {
      console.warn(`Localities batch error [${i}]:`, locErr.message);
      if (stats.errors.length < 20) {
        stats.errors.push(`Localities batch error: ${locErr.message}`);
      }
    } else if (upserted) {
      for (const loc of upserted) {
        localityCache.set(`${loc.city_id}|${loc.slug}`, loc.id);
      }
      stats.localitiesCreated += upserted.length;
    }

    if ((i + BATCH_SIZE) % 10000 === 0 || i + BATCH_SIZE >= locArray.length) {
      console.log(`  -> Localities progress: ${Math.min(i + BATCH_SIZE, locArray.length)} / ${locArray.length}`);
    }
  }

  console.log("Preparing candidate locality mappings...");
  // Batch upsert postal_pincode_localities mappings (deduplicated by pincode, locality_id)
  const mappingsMap = new Map<
    string,
    {
      pincode: string;
      locality_id: string;
      office_name: string;
      source: string;
    }
  >();

  for (const r of validRecords) {
    const cityKey = `${r.district.toLowerCase()}|${r.state.toLowerCase()}`;
    const cityId = cityMap.get(cityKey);
    if (!cityId) continue;

    const cleanLocalityName = r.office_name
      .replace(/\s+(B\.O|S\.O|H\.O|SO|BO|HO)$/i, "")
      .trim();

    if (!cleanLocalityName) continue;

    const locSlug = slugify(cleanLocalityName);
    if (!locSlug) continue;

    const localityId = localityCache.get(`${cityId}|${locSlug}`);
    if (!localityId) continue;

    const mapKey = `${r.pincode}|${localityId}`;
    if (!mappingsMap.has(mapKey)) {
      mappingsMap.set(mapKey, {
        pincode: r.pincode,
        locality_id: localityId,
        office_name: r.office_name,
        source: "india_post_candidate",
      });
    }
  }

  const mappingsToUpsert = Array.from(mappingsMap.values());

  console.log(`Batch upserting ${mappingsToUpsert.length} candidate mappings...`);
  for (let i = 0; i < mappingsToUpsert.length; i += BATCH_SIZE) {
    const chunk = mappingsToUpsert.slice(i, i + BATCH_SIZE);
    const { error: mapErr } = await supabase
      .from("postal_pincode_localities")
      .upsert(chunk, { onConflict: "pincode,locality_id" });

    if (!mapErr) {
      stats.mappingsCreated += chunk.length;
    } else {
      console.warn(`Mappings batch error [${i}]:`, mapErr.message);
      if (stats.errors.length < 20) {
        stats.errors.push(`Mappings batch error: ${mapErr.message}`);
      }
    }

    if ((i + BATCH_SIZE) % 10000 === 0 || i + BATCH_SIZE >= mappingsToUpsert.length) {
      console.log(`  -> Mappings progress: ${Math.min(i + BATCH_SIZE, mappingsToUpsert.length)} / ${mappingsToUpsert.length}`);
    }
  }

  return stats;
}

export function parseCSVFile(filePath: string): PostalRecordInput[] {
  let content = fs.readFileSync(filePath, "utf-8");
  if (content.charCodeAt(0) === 0xfeff) {
    content = content.slice(1);
  }
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length <= 1) return [];

  const rawHeaders = parseCSVLine(lines[0]);
  const cleanHeaders = rawHeaders.map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ""));
  const records: PostalRecordInput[] = [];

  const idxOffice = cleanHeaders.findIndex(
    (h) => h === "officename" || h === "poname" || (h.includes("office") && !h.includes("type") && !h.includes("status"))
  );
  const idxPincode = cleanHeaders.findIndex(
    (h) => h === "pincode" || h === "pin" || h === "postalcode"
  );
  const idxType = cleanHeaders.findIndex(
    (h) => h === "officetype" || h === "type"
  );
  const idxDelivery = cleanHeaders.findIndex(
    (h) => h === "delivery" || h === "deliverystatus"
  );
  const idxDivision = cleanHeaders.findIndex((h) => h.includes("division"));
  const idxRegion = cleanHeaders.findIndex((h) => h.includes("region"));
  const idxCircle = cleanHeaders.findIndex((h) => h.includes("circle"));
  const idxTaluk = cleanHeaders.findIndex((h) => h.includes("taluk") || h.includes("tehsil"));
  const idxDistrict = cleanHeaders.findIndex((h) => h.includes("district"));
  const idxState = cleanHeaders.findIndex((h) => h.includes("state"));

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

// Development and demo dataset (used only when --demo flag is explicitly specified)
export const DEMO_INDIA_POSTAL_DATA: PostalRecordInput[] = [
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
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

  if (!serviceRoleKey) {
    console.error("SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY) is required for postal data import script");
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const isDemo = args.includes("--demo");
  const allowRemote = args.includes("--allow-remote");

  // Parse --confirm-host value (--confirm-host <hostname>)
  const confirmHostIdx = args.indexOf("--confirm-host");
  const confirmHost = confirmHostIdx !== -1 ? args[confirmHostIdx + 1] || null : null;

  const csvArg = args.find((a) => !a.startsWith("--") && (confirmHostIdx === -1 || args.indexOf(a) !== confirmHostIdx + 1));

  const targetOptions: ImportTargetOptions = {
    allowRemote,
    confirmHost,
    isDemo,
  };

  // Log target host (never credentials)
  try {
    const parsed = new URL(supabaseUrl);
    console.log(`Target: ${parsed.hostname} (${allowRemote ? "remote mode" : "local mode"})`);
  } catch {
    // validateImportTarget will throw below
  }

  let records: PostalRecordInput[];

  if (isDemo) {
    console.log("Running in explicit DEMO mode. Importing curated sample India postal dataset...");
    records = DEMO_INDIA_POSTAL_DATA;
  } else {
    if (!csvArg) {
      console.error(
        "CRITICAL ERROR: Official postal CSV dataset file path is required.\n" +
        "Usage: npx tsx scripts/import-india-postal-data.ts <path-to-pincode.csv> (or use --demo for dev seeding)\n" +
        "\nRemote import:\n" +
        "  npx tsx scripts/import-india-postal-data.ts ./data.csv --allow-remote --confirm-host <project-ref>.supabase.co"
      );
      process.exit(1);
    }

    if (!fs.existsSync(csvArg)) {
      console.error(`CRITICAL ERROR: Postal dataset CSV file does not exist: "${csvArg}"`);
      process.exit(1);
    }

    console.log(`Loading official postal records from CSV file: ${csvArg}`);
    records = parseCSVFile(csvArg);

    if (records.length === 0) {
      console.error(`CRITICAL ERROR: No records found or CSV is malformed in "${csvArg}"`);
      process.exit(1);
    }
  }

  console.log(`Starting import of ${records.length} postal records...`);
  const stats = await importPostalData(records, supabaseUrl, serviceRoleKey, targetOptions);

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
