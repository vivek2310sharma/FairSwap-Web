// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";

const root = resolve(__dirname, "../..");
const ref = join(root, "docs/reference/post-ad/wearables");
const csvPath = join(ref, "fairswap_smartwatch_wearables_catalogue_india.csv");
const load = async <T,>(p: string) => (await import(/* @vite-ignore */ pathToFileURL(join(root, p)).href)) as T;
type Row = { id: string; brand_id: string; brand: string; name: string; series: string; source_type: string; device_type: string; status: string; reason: string | null; corrections: unknown[] };
type Cat = { rows: Row[]; brandMap: Map<string, string>; revision: string; json: { revision: string } };
type Gen = { buildCatalogue: (b: Buffer, c: unknown, s?: unknown) => Cat; seedSql: (c: unknown) => string; auditMd: (c: unknown) => string; BEGIN: string; END: string; PATHS: Record<string, string> };
type Key = { nameKey: (s: string) => string; baseKey: (s: string) => string };
const supplement = () => JSON.parse(readFileSync(join(ref, "supplement.v1.1.json"), "utf8"));
const corrections = () => JSON.parse(readFileSync(join(ref, "corrections.json"), "utf8"));
type Model = { id: string; brand_id: string; type: string; series: string; name: string };
const json = () => JSON.parse(readFileSync(join(root, "src/lib/listings/wearables/catalogue.generated.json"), "utf8")) as { revision: string; rows_total: number; rows_approved: number; models: Model[]; brands: unknown[] };

describe("wearables catalogue import", () => {
  it("keeps the source CSV immutable, UTF-8 with BOM, with the audited baselines", async () => {
    const raw = readFileSync(csvPath);
    expect(createHash("sha256").update(raw).digest("hex")).toBe("6f7da5dd8aeae2a0914369b2bfeebe1604bd2f9c5c5eb42a3275fe050d86f6ce");
    expect([raw[0], raw[1], raw[2]]).toEqual([0xef, 0xbb, 0xbf]);
    const { buildCatalogue } = await load<Gen>("scripts/wearables/build-catalogue.mjs");
    const c = buildCatalogue(raw, corrections());
    expect(c.rows).toHaveLength(607);
    expect(c.brandMap.size).toBe(35);
    expect(new Set(c.rows.map((r: Row) => r.series)).size).toBe(68);
    const count = (f: (r: Row) => string) => c.rows.reduce((m: Record<string, number>, r: Row) => ({ ...m, [f(r)]: (m[f(r)] ?? 0) + 1 }), {});
    expect(count(r => r.source_type)).toEqual({ smartwatch: 359, sports_gps_watch: 132, fitness_band: 90, smart_ring: 26 });
    expect(new Set(c.rows.map((r: Row) => `${r.brand}|${r.name}`.toLowerCase())).size).toBe(607);
  });
  it("audits without silent edits: counts, quarantine, exclusions and documented reclassification", async () => {
    const { buildCatalogue } = await load<Gen>("scripts/wearables/build-catalogue.mjs");
    const c = buildCatalogue(readFileSync(csvPath), corrections());
    const by = (s: string) => c.rows.filter((r: Row) => r.status === s).map((r: Row) => r.name);
    expect(by("approved")).toHaveLength(587); expect(by("quarantined")).toHaveLength(14); expect(by("excluded")).toHaveLength(6);
    expect(by("quarantined")).toEqual(expect.arrayContaining(["Oura Ring Ceramic", "Amazfit Helio Strap", "Noise Luna Ring Gold", "Ultrahuman Ring AIR Matte Grey", "Fossil Hybrid HR"]));
    expect(by("excluded")).toEqual(expect.arrayContaining(["Ultrahuman Home", "Fitbit Ace 3", "Whoop 4.0"]));
    const reclass = c.rows.filter((r: Row) => r.corrections.length);
    expect(reclass.map((r: Row) => r.name).sort()).toEqual(["CMF Band", "CMF Band Pro", "Realme TechLife Band", "Realme TechLife Smart Band"]);
    for (const r of reclass) { expect(r.source_type).toBe("smartwatch"); expect(r.device_type).toBe("fitness_band"); }
    expect(c.rows.filter((r: Row) => r.status !== "approved" && !r.reason)).toHaveLength(0);
  });
  it("never exposes release years or unapproved rows in the server catalogue", () => {
    const j = json();
    expect(j.rows_total).toBe(607 + supplement().entries.length); expect(j.rows_approved).toBe(587 + supplement().entries.filter((e: {status:string})=>e.status==="approved").length); expect(j.models).toHaveLength(587 + supplement().entries.filter((e: {status:string})=>e.status==="approved").length);
    expect(JSON.stringify(j)).not.toMatch(/year|source_row|reason|status/i);
    expect(j.models.map((m: Model) => m.name)).not.toContain("Oura Ring Ceramic");
  });
  it("uses deterministic, collision-checked ids; regeneration is idempotent and committed outputs are current", async () => {
    const g = await load<Gen>("scripts/wearables/build-catalogue.mjs");
    const a = g.buildCatalogue(readFileSync(csvPath), corrections(), supplement()), b = g.buildCatalogue(readFileSync(csvPath), corrections(), supplement());
    expect(a.revision).toBe(b.revision); expect(a.rows.map((r: Row) => r.id)).toEqual(b.rows.map((r: Row) => r.id));
    expect(a.rows.every((r: Row) => /^wm_[0-9a-f]{12}$/.test(r.id) && /^wb_[a-z0-9-]+$/.test(r.brand_id))).toBe(true);
    expect(new Set(a.rows.map((r: Row) => r.id)).size).toBe(607 + supplement().entries.length);
    expect(JSON.stringify(a.json) + "\n").toBe(readFileSync(g.PATHS.json, "utf8"));
    expect(g.seedSql(a)).toBe(readFileSync(g.PATHS.seed, "utf8"));
    expect(g.auditMd(a)).toBe(readFileSync(g.PATHS.audit, "utf8"));
    expect(a.json.revision).toBe(json().revision);
  });
  it("fails loudly on bad input: missing BOM, duplicate pair, stale correction key, unknown type", async () => {
    const { buildCatalogue } = await load<Gen>("scripts/wearables/build-catalogue.mjs");
    const raw = readFileSync(csvPath), text = raw.toString("utf8").replace(/^﻿/, "");
    expect(() => buildCatalogue(Buffer.from(text), corrections())).toThrow(/BOM/);
    const lines = text.trimEnd().split(/\r?\n/);
    expect(() => buildCatalogue(Buffer.from("﻿" + [...lines, lines[1]].join("\n")), corrections())).toThrow(/duplicate/);
    expect(() => buildCatalogue(raw, { ...corrections(), status: { ...corrections().status, "Nope|Nothing": { status: "excluded", reason: "x" } } })).toThrow(/Stale/);
    expect(() => buildCatalogue(Buffer.from("﻿" + lines[0] + "\nApple,tablet,Apple Watch,Apple Watch X,2024\n"), { reclassify: {}, status: {} })).toThrow(/unknown device_type/);
  });
  it("JS matching keys: plus is significant, finish words fold only in the base key", async () => {
    const { nameKey, baseKey } = await load<Key>("scripts/wearables/name-key.mjs");
    expect(nameKey("TicWatch C2+")).not.toBe(nameKey("TicWatch C2"));
    expect(nameKey("Fitbit  ace-3")).toBe(nameKey("Fitbit Ace 3"));
    expect(baseKey("Noise Luna Ring Gold")).toBe(baseKey("Noise Luna Ring"));
    expect(nameKey("Noise Luna Ring Gold")).not.toBe(nameKey("Noise Luna Ring"));
  });
  it("preserves all 607 IDs and source rows; verifies additions, types and evidence", async () => {
    const g = await load<Gen>("scripts/wearables/build-catalogue.mjs");
    const raw = readFileSync(csvPath), original = g.buildCatalogue(raw, corrections()), next = g.buildCatalogue(raw, corrections(), supplement());
    expect(original.revision).toBe("8dd5783ac9b7e12e");
    for (const row of original.rows) {
      const updated = next.rows.find(r => r.id === row.id)!;
      expect(updated).toMatchObject({ id: row.id, brand_id: row.brand_id, name: row.name, series: row.series, source_row: (row as Row & {source_row: number}).source_row });
    }
    expect(next.rows).toHaveLength(607 + supplement().entries.length);
    expect(next.rows.filter(r=>r.status==="approved")).toHaveLength(587 + supplement().entries.filter((e: {status:string})=>e.status==="approved").length);
    for(const [name,type]of [["Galaxy Watch9","smartwatch"],["Galaxy Watch Ultra2","sports_gps_watch"],["Pixel Watch 5","smartwatch"]]) {expect(next.rows.filter(r=>r.name===name)).toHaveLength(1);expect(next.rows.find(r=>r.name===name)).toMatchObject({device_type:type,status:"approved"});}
    for(const e of supplement().entries)expect(e.manufacturer_url).not.toMatch(/\/collections\/[^/]+$/);
    expect(next.rows.find(r=>r.name==="Amazfit Active Edge")?.device_type).toBe("smartwatch");
    expect(next.rows.find(r=>r.name==="Amazfit Helio Strap")).toMatchObject({device_type:"fitness_band",status:"quarantined",reason:"screenless_contract"});
    for (const e of [...supplement().entries, ...supplement().overrides]) { expect(e.manufacturer_url).toMatch(/^https:/); expect(e.verified_on).toMatch(/^2026-11-(11|14)$/); }
  });
  it("rejects supplement duplicate keys, provenance collisions, stale overrides and invalid statuses/types", async () => {
    const g = await load<Gen>("scripts/wearables/build-catalogue.mjs");
    const check = (change: (s: ReturnType<typeof supplement>)=>void) => {const s=supplement(); change(s); return ()=>g.buildCatalogue(readFileSync(csvPath),corrections(),s);};
    expect(check(s=>s.entries.push({...s.entries[0],source_row:1000999}))).toThrow(/duplicate/);
    expect(check(s=>s.entries[0].source_row=2)).toThrow(/source_row/);
    expect(check(s=>s.entries[0].status="bogus")).toThrow(/status/);
    expect(check(s=>s.entries[0].device_type="tablet")).toThrow(/type/);
    expect(check(s=>s.overrides[0].name="missing")).toThrow(/Stale/);
    expect(check(s=>s.entries[0].manufacturer_url="http://example.com")).toThrow(/evidence/);
  });
  it("regenerates the new Backend update without altering the historical foundation", async () => {
    const dir = resolve(root, "../FairSwap-Backend/supabase/forward-migrations/wearables-v11/supabase/migrations");
    if (!existsSync(dir)) return;
    const {updateSql} = await load<{updateSql:(s:unknown)=>string}>("scripts/wearables/build-update.mjs");
    const file = readdirSync(dir).find(f=>f.endsWith(".sql"))!;
    expect(updateSql(supplement())).toBe(readFileSync(join(dir,file),"utf8"));
  });
  it("lazy loading budgets: brands and the largest brand+type model list stay tiny", () => {
    const j = json(), per = new Map<string, { id: string; name: string; series: string }[]>();
    for (const m of j.models) { const k = `${m.brand_id}|${m.type}`; per.set(k, [...(per.get(k) ?? []), { id: m.id, name: m.name, series: m.series }]); }
    const brands = JSON.stringify(j.brands), largest = Math.max(...[...per.values()].map(v => JSON.stringify({ models: v }).length));
    console.info(`wearables payloads: brands ${brands.length} B (${gzipSync(brands).length} B gz); largest brand+type models ${largest} B; full catalogue ${JSON.stringify(j).length} B`);
    expect(brands.length).toBeLessThan(4096); expect(largest).toBeLessThan(8192); expect(JSON.stringify(j).length).toBeGreaterThan(60000);
  });
  it("the full catalogue is never imported by client code", () => {
    const files = ["src/components/listings/WearableForm.tsx", "src/components/listings/posting/wearable-wizard.ts", "src/components/listings/posting/WearableBuyerPreview.tsx", "src/lib/listings/wearables/contract.ts"];
    for (const f of files) { const t = readFileSync(join(root, f), "utf8"); expect(t, f).not.toMatch(/catalogue\.generated|wearables\/server|from "\.\/server"/); }
    expect(readFileSync(join(root, "src/lib/listings/wearables/server.ts"), "utf8")).toMatch(/^import "server-only";/);
  });
});
