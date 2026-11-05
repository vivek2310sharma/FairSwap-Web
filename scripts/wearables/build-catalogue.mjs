#!/usr/bin/env node
// Repeatable wearables catalogue build. Pure function buildCatalogue() + CLI.
//   node scripts/wearables/build-catalogue.mjs [--check] [--migration <path>]
// Inputs (immutable/reviewed): the source CSV and corrections.json.
// Outputs: catalogue.generated.json (server-only, approved rows), a seed SQL
// block (all rows incl. quarantined/excluded), CATALOGUE_AUDIT.md.
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { nameKey } from "./name-key.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ref = resolve(root, "docs/reference/post-ad/wearables");
export const PATHS = {
  csv: resolve(ref, "fairswap_smartwatch_wearables_catalogue_india.csv"),
  corrections: resolve(ref, "corrections.json"),
  json: resolve(root, "src/lib/listings/wearables/catalogue.generated.json"),
  seed: resolve(ref, "catalogue-seed.generated.sql"),
  audit: resolve(ref, "CATALOGUE_AUDIT.md"),
};
export const TYPES = ["smartwatch", "fitness_band", "sports_gps_watch", "smart_ring"];
export const BEGIN = "-- BEGIN GENERATED CATALOGUE";
export const END = "-- END GENERATED CATALOGUE";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const slug = (s) => nameKey(s).replace(/ /g, "-");

export function parseCsv(text) {
  const rows = [];
  let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(cell); cell = ""; if (row.length > 1 || row[0] !== "") rows.push(row); row = []; }
    else cell += c;
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

export function buildCatalogue(csvBuffer, corrections) {
  const hasBom = csvBuffer[0] === 0xef && csvBuffer[1] === 0xbb && csvBuffer[2] === 0xbf;
  if (!hasBom) throw new Error("CSV must be UTF-8 with BOM");
  const [header, ...body] = parseCsv(csvBuffer.toString("utf8").replace(/^﻿/, ""));
  if (header.join(",") !== "brand,device_type,series,model,approx_release_year") throw new Error("Unexpected CSV header");
  const reclass = corrections.reclassify ?? {}, status = corrections.status ?? {};
  const seen = new Set(), ids = new Map(), keys = new Map(), used = new Set();
  const rows = body.map((r, i) => {
    if (r.length !== 5 || r.some((v) => v.trim() === "")) throw new Error(`CSV row ${i + 2}: missing value`);
    const [brand, type, series, model, year] = r;
    if (!TYPES.includes(type)) throw new Error(`CSV row ${i + 2}: unknown device_type ${type}`);
    const dupe = `${brand}|${model}`.toLowerCase();
    if (seen.has(dupe)) throw new Error(`CSV row ${i + 2}: duplicate (brand, model)`);
    seen.add(dupe);
    const k = `${brand}|${model}`;
    const re = reclass[k]; const st = status[k];
    if (re) used.add(`reclassify:${k}`); if (st) used.add(`status:${k}`);
    const id = "wm_" + sha(Buffer.from(dupe.normalize("NFKC"))).slice(0, 12);
    if (ids.has(id)) throw new Error(`ID collision ${id}`);
    ids.set(id, k);
    const nk = nameKey(model);
    if (keys.has(nk)) throw new Error(`name_key collision: ${model} vs ${keys.get(nk)}`);
    keys.set(nk, model);
    return {
      id, brand_id: "wb_" + slug(brand), brand, series, name: model,
      source_type: type, device_type: re ? re.device_type : type,
      status: st ? st.status : "approved", reason: st ? st.reason : null,
      source_row: i + 2, source_year: Number(year),
      corrections: re ? [{ field: "device_type", from: type, to: re.device_type, evidence: re.evidence }] : [],
      note: st?.note ?? null,
    };
  });
  for (const section of ["reclassify", "status"]) for (const k of Object.keys(corrections[section] ?? {})) if (!used.has(`${section}:${k}`)) throw new Error(`Stale corrections key: ${section} ${k}`);
  rows.sort((a, b) => (a.brand.toLowerCase() < b.brand.toLowerCase() ? -1 : a.brand.toLowerCase() > b.brand.toLowerCase() ? 1 : a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1));
  rows.forEach((r, i) => { r.sort_order = i + 1; });
  const csvSha = sha(csvBuffer), corrSha = sha(Buffer.from(JSON.stringify(corrections)));
  const canonical = JSON.stringify(rows.map((r) => [r.id, r.brand_id, r.device_type, r.series, r.name, r.status, r.reason, r.source_row]));
  const revision = sha(Buffer.from(canonical + csvSha + corrSha)).slice(0, 16);
  const approved = rows.filter((r) => r.status === "approved");
  const brandMap = new Map();
  for (const r of rows) if (!brandMap.has(r.brand_id)) brandMap.set(r.brand_id, r.brand);
  const brands = [...brandMap].map(([id, name]) => ({ id, name, types: [...new Set(approved.filter((r) => r.brand_id === id).map((r) => r.device_type))].sort() })).filter((b) => b.types.length);
  const json = {
    revision, csv_sha256: csvSha, corrections_sha256: corrSha, rows_total: rows.length, rows_approved: approved.length,
    types: TYPES,
    brands,
    models: approved.map((r) => ({ id: r.id, brand_id: r.brand_id, type: r.device_type, series: r.series, name: r.name })),
  };
  return { rows, json, revision, csvSha, corrSha, brandMap };
}

const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
export function seedSql(c) {
  const brandRows = [...c.brandMap].sort((a, b) => a[1].toLowerCase() < b[1].toLowerCase() ? -1 : 1).map(([id, name], i) => `(${q(id)},${q(name)},${i + 1})`);
  const modelRows = c.rows.map((r) => `(${q(r.id)},${q(r.brand_id)},${q(r.device_type)},${q(r.series)},${q(r.name)},${q(r.status)},${r.reason ? q(r.reason) : "null"},${r.source_row},${r.sort_order})`);
  return [
    `${BEGIN} revision=${c.revision}`,
    `insert into public.wearable_catalogue_revision_v1(singleton,revision,csv_sha256,corrections_sha256,rows_total,rows_approved) values(true,${q(c.revision)},${q(c.csvSha)},${q(c.corrSha)},${c.rows.length},${c.json.rows_approved}) on conflict(singleton) do nothing;`,
    `insert into public.wearable_brands_v1(id,name,sort_order) values`, brandRows.join(",\n") + " on conflict(id) do nothing;",
    `insert into public.wearable_models_v1(id,brand_id,device_type,series,name,status,reason,source_row,sort_order) values`, modelRows.join(",\n") + " on conflict(id) do nothing;",
    END, "",
  ].join("\n");
}

export function auditMd(c) {
  const by = (f) => c.rows.reduce((m, r) => (m[f(r)] = (m[f(r)] ?? 0) + 1, m), {});
  const t = by((r) => r.status), yrs = by((r) => r.source_year);
  const lines = [
    "# Wearables catalogue audit", "",
    "Generated by `scripts/wearables/build-catalogue.mjs`; do not hand-edit. Nothing here is manufacturer-verified.", "",
    `- Source CSV sha256: \`${c.csvSha}\` (immutable, UTF-8 BOM)`, `- corrections.json sha256: \`${c.corrSha}\``, `- Catalogue revision: \`${c.revision}\``, "",
    "## Counts", "",
    `| Imported | Approved (picker) | Quarantined | Excluded | Reclassified | Brands | Series |`, `|---|---|---|---|---|---|---|`,
    `| ${c.rows.length} | ${t.approved ?? 0} | ${t.quarantined ?? 0} | ${t.excluded ?? 0} | ${c.rows.filter((r) => r.corrections.length).length} | ${c.brandMap.size} | ${new Set(c.rows.map((r) => r.series)).size} |`, "",
    `Source types: ${Object.entries(by((r) => r.source_type)).map(([k, v]) => `${k} ${v}`).join(", ")}.`, "",
    "## Release years: not used", "",
    `\`approx_release_year\` is stored as \`source_year\` only. It is never displayed, filtered or used for validation. Distribution: ${Object.entries(yrs).map(([k, v]) => `${k}: ${v}`).join(", ")}. ${yrs["2024"]} of ${c.rows.length} rows say 2024 and all smart rings say 2024, which suggests a fill value. Known contradictions: Apple Watch Series 1 = 2024 (row ${c.rows.find((r) => r.name === "Apple Watch Series 1")?.source_row}), Apple Watch SE 3 = 2020 (row ${c.rows.find((r) => r.name === "Apple Watch SE 3")?.source_row}), Galaxy Fit models = 2019. No year was corrected.`, "",
    "## Reclassified (documented corrections; source value retained)", "", "| Row | Model | From | To | Evidence |", "|---|---|---|---|---|",
    ...c.rows.filter((r) => r.corrections.length).map((r) => `| ${r.source_row} | ${r.name} | ${r.corrections[0].from} | ${r.corrections[0].to} | ${r.corrections[0].evidence} |`), "",
    "## Quarantined and excluded", "", "Not selectable in the picker. A matching Other-model entry is rejected server-side.", "", "| Row | Brand | Model | Status | Reason | Note |", "|---|---|---|---|---|---|",
    ...c.rows.filter((r) => r.status !== "approved").sort((a, b) => a.source_row - b.source_row).map((r) => `| ${r.source_row} | ${r.brand} | ${r.name} | ${r.status} | ${r.reason} | ${r.note} |`), "",
    "## Reported only (no action taken)", "",
    "- Every year value is unverified. Series names are kept exactly as in the source.", "- Subscription-dependent features of other brands (for example Oura membership) are not verified here and are not claimed in product copy.", "",
  ];
  return lines.join("\n");
}

function cli() {
  const args = process.argv.slice(2);
  const csv = readFileSync(PATHS.csv), corrections = JSON.parse(readFileSync(PATHS.corrections, "utf8"));
  const c = buildCatalogue(csv, corrections);
  const out = { [PATHS.json]: JSON.stringify(c.json) + "\n", [PATHS.seed]: seedSql(c), [PATHS.audit]: auditMd(c) };
  const mi = args.indexOf("--migration");
  let migration = null;
  if (mi >= 0) {
    const p = resolve(args[mi + 1]);
    const text = readFileSync(p, "utf8"), a = text.indexOf(BEGIN), b = text.indexOf(END);
    if (a < 0 || b < 0) throw new Error("Migration is missing generated-catalogue markers");
    migration = [p, text.slice(0, a) + seedSql(c).trimEnd() + text.slice(b + END.length)];
    out[p] = migration[1];
  }
  if (args.includes("--check")) {
    const stale = Object.entries(out).filter(([p, v]) => !existsSync(p) || readFileSync(p, "utf8") !== v).map(([p]) => p);
    if (stale.length) { console.error("STALE:\n" + stale.join("\n")); process.exit(1); }
    console.log(`catalogue up to date (revision ${c.revision}, ${c.json.rows_approved}/${c.rows.length} approved)`);
    return;
  }
  for (const [p, v] of Object.entries(out)) writeFileSync(p, v);
  console.log(`wrote catalogue revision ${c.revision}: ${c.json.rows_approved}/${c.rows.length} approved`);
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) cli();
