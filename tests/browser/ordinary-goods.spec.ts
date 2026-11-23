import { expect, test } from "@playwright/test";
import sharp from "sharp";
import { api } from "./posting-fixture";
import { selectedGoodsSubmission } from "../../src/lib/listings/ordinary-goods/contract";

const owner = "11111111-1111-4111-8111-111111111111";
const locality = "66666666-6666-4666-8666-666666666666";
const listing = "77777777-7777-4777-8777-777777777777";
const cases = [
  ["v2-laptops", "Laptops", "RAM (GB)", "16", 320],
  ["v2-tvs", "TVs", "Screen size (inches)", "55", 360],
  ["v2-refrigerators", "Refrigerators", "Capacity (litres)", "250", 390],
  ["v2-sofas-dining", "Sofas & Dining", "Sofa or dining furniture type", "Three-seater sofa", 320],
  ["v2-tables-chairs", "Tables & Chairs", "Table or chair type", "Dining chair", 360],
  ["v2-women", "Women", "Labelled size", "M", 360],
  ["v2-books", "Books", "Book title", "Collected stories", 390],
  ["v2-headphones-earbuds", "Headphones & Earbuds", "Item type", "Wired headphones", 320],
  ["v2-strollers-prams", "Strollers & Prams", "Item type", "Stroller", 360],
  ["v2-aquariums-fish-supplies", "Aquariums & Fish Supplies", "Item type", "Empty tank", 390],
] as const;
const definitions = JSON.parse(process.env.FAIRSWAP_GOODS_BROWSER_FIXTURE ?? "{}");

for (const [slug, label, detail, answer, width] of cases) {
  test(`${slug} at ${width}px through chooser, photo, draft recovery and review`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await api(page); // loopback PIN fixture and catch-all denial for unmatched APIs
    const definition = definitions[slug];
    const draftOnly = ["v2-cars", "v2-motorcycles-scooters", "v2-commercial-vehicles", "v2-electric-cycles-low-speed-evs"].includes(slug);
    const property = definition?.fields.some((field: {key:string}) => field.key === "offer");
    expect(definition).toBeTruthy();
    if (property) await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
    const ready: {id:string;state:string;url:null}[] = [];
    let session = "";
    let submitted = 0;
    let frozen = false;
    let original: unknown;
    const base = `/api/post-ad/goods/${slug}`;
    await page.route(`**${base}/**`, async route => {
      const request = route.request();
      const path = new URL(request.url()).pathname;
      const snapshot = () => ({ session: { id: session, owner_id: owner, listing_id: listing, state: frozen ? "finalizing" : "open" }, media: ready });
      if (path === `${base}/sessions` && request.method() === "POST") {
        session = request.postDataJSON().session_id;
        return route.fulfill({ json: snapshot() });
      }
      if (path === `${base}/sessions/${session}/media`) {
        if (request.method() === "GET") return route.fulfill({ json: snapshot() });
        const form = await new Request(request.url(), { method: "POST", headers: request.headers(),
          body: new Uint8Array(request.postDataBuffer() ?? []) }).formData();
        expect((form.get("file") as File).type).toBe("image/webp");
        ready.push({ id: String(form.get("media_id")), state: "ready", url: null });
        return route.fulfill({ json: { success: true } });
      }
      if (path === `${base}/submit`) {
        submitted++;
        const parsed = selectedGoodsSubmission(definition).parse(request.postDataJSON());
        expect(parsed.category_id).toBe(definition.category_id);
        expect(parsed.media_ids).toEqual(ready.map(p => p.id));
        if (slug === "v2-laptops" && submitted === 1) {
          original = parsed; frozen = true;
          return route.fulfill({ status: 503, json: { error: "Temporary submission failure" } });
        }
        if (frozen) expect(parsed).toEqual(original);
        return route.fulfill({ json: { success: true, listing_id: listing } });
      }
      return route.fulfill({ status: 403, json: { error: "Unexpected fixture request" } });
    });

    await page.goto("/account/listings/new");
    await page.getByRole("searchbox", { name: "Search categories" }).fill(label);
    await page.getByRole("link", { name: new RegExp(`^${label}`) }).first().click();
    await expect(page).toHaveURL(new RegExp(`category=${slug}$`));
    await expect(page.getByRole("searchbox", { name: "Search categories" })).toHaveCount(0);
    const photo = await sharp({ create: { width: 32, height: 32, channels: 3, background: "#32695d" } }).png().toBuffer();
    await page.locator("#mobile-photo-files").setInputFiles({ name: "item.png", mimeType: "image/png", buffer: photo });
    await page.getByRole("button", { name: "Upload / retry photos" }).click();
    await expect(page.getByText("Cover · Ready", { exact: true })).toBeVisible();
    const next = () => page.getByRole("button", { name: "Continue", exact: true }).click();
    await next();
    for (const f of definition.fields.filter((field: { required: boolean; key:string }) => field.required && (!property || !["offer","amount_paise","deposit_paise","charges_paise"].includes(field.key)))) {
      const input = page.getByLabel(`${f.label} *`, {exact:true});
      if (f.choices) await input.selectOption(f.label === detail ? answer : f.choices[0]);
      else await input.fill(f.label === detail ? answer : f.kind === "number" ? String(Math.max(1, f.min)) : "Well maintained");
    }
    const primary = definition.fields.find((field: { label: string }) => field.label === detail);
    if (!primary.required) await page.getByLabel(`${detail} (optional)`,{exact:true}).fill(answer);
    await next();
    if (!property) await page.getByRole("combobox", { name: "Condition", exact: true }).selectOption("good");
    await page.getByLabel("Title", { exact: true }).fill("Sample listing");
    await page.getByRole("textbox", { name: "Description", exact: true }).fill("Carefully used for two years.");
    await page.getByLabel(/I own this item|I have authority/).check();
    await page.getByLabel(/I checked for unsafe wiring|If this item uses power|My listing and photos omit/).check();
    await next();
    if (property) {
      const sale = slug !== "v2-pg-hostels-guest-houses";
      await page.getByLabel("Offer", {exact:true}).selectOption(sale ? "Sale" : "Rent");
      await page.getByLabel(sale ? "Sale price (₹)" : "Monthly rent (₹)", {exact:true}).fill(sale ? "31250000.01" : "12500.50");
      if (!sale) {
        await page.getByLabel("Deposit (₹)", {exact:true}).fill("5000");
        await page.getByLabel("Monthly charges (₹)", {exact:true}).fill("0");
      }
    } else if (width === 320) await page.getByRole("button", { name: "Give away" }).click();
    else await page.getByLabel("Price (₹)").fill("1299.99");
    await next();
    await page.locator("#pincode_picker_input").fill("560034");
    await page.getByRole("combobox", { name: "Area / Locality *" }).selectOption(locality);
    await expect.poll(async () => page.evaluate(async key => {
      const db = await new Promise<IDBDatabase>((resolve,reject) => {
        const r = indexedDB.open("fairswap-posting-v2"); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error);
      });
      const record = await new Promise<{draft?: {location?: {locality_id: string}}}>((resolve,reject) => {
        const r = db.transaction("drafts").objectStore("drafts").get(key);
        r.onsuccess = () => resolve(r.result ?? {}); r.onerror = () => reject(r.error);
      });
      db.close();
      return record.draft?.location?.locality_id;
    }, `${owner}:ordinary-goods:${definition.category_id}:1`)).toBe(locality);
    await page.reload();
    await page.getByRole("button", { name: "Step 5: Location" }).click();
    await expect(page.locator("#pincode_picker_input")).toHaveValue("560034");
    await page.getByRole("button", { name: "Review listing" }).click();
    await expect(page.getByRole("complementary", { name: "Buyer preview" })).toContainText(answer);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (property) {
      expect(await page.evaluate(() => matchMedia("(prefers-color-scheme: dark)").matches)).toBe(true);
      const preview = page.getByRole("complementary", { name: "Buyer preview" });
      // The app deliberately serves one light palette, even when the OS requests dark.
      const darkSurface = await preview.evaluate(el => getComputedStyle(el).backgroundColor);
      expect(await page.locator("html").evaluate(el => getComputedStyle(el).colorScheme)).toBe("light");
      expect(darkSurface).toBe("rgb(255, 255, 255)");
      await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
      await expect.poll(() => preview.evaluate(el => getComputedStyle(el).backgroundColor)).toBe(darkSurface);
      await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
      await expect.poll(() => preview.evaluate(el => getComputedStyle(el).backgroundColor)).toBe(darkSurface);
      if (slug === "v2-pg-hostels-guest-houses") {
        await expect(preview).toContainText("₹12,500.50 / month");
        await expect(preview).toContainText("Deposit: ₹5,000.00");
        await expect(preview).toContainText("Monthly charges: ₹0.00");
      } else {
        await expect(preview).toContainText("₹3,12,50,000.01");
        await expect(preview).not.toContainText("/ month");
      }
    }
    if (draftOnly) {
      await expect(page.getByRole("button", { name: "Submit for review", exact: true })).toBeDisabled();
      await expect(page.getByText(/^Draft only/)).toBeVisible();
      if (slug === "v2-cars" || slug === "v2-motorcycles-scooters") {
        await expect(page.getByText(/independent verification of registration, registered ownership and authority to transfer/)).toBeVisible();
      }
      expect(submitted).toBe(0);
      return;
    }
    await page.getByRole("button", { name: "Submit for review", exact: true }).click();
    if (slug === "v2-laptops") {
      await expect(page.getByText("Temporary submission failure")).toBeVisible();
      await page.reload();
      await page.getByRole("button", { name: "Submit for review", exact: true }).click();
    }
    await expect(page.getByRole("heading", { name: "Submitted for review" })).toBeVisible();
    expect(submitted).toBe(slug === "v2-laptops" ? 2 : 1);
  });
}

// These leaves must not fall through to the ordinary-goods writer, even if a
// future catalogue accidentally marks them enabled; family forms are separate.
test('restricted and specialist canonical leaves have no ordinary-goods fallback',async({page})=>{
 await api(page);
 await page.goto('/account/listings/new');
 const search=page.getByRole('searchbox',{name:'Search categories'});
 for(const label of ['Bicycles','Car Accessories & Spare Parts','Bike Accessories & Spare Parts',
  'Land & Plots','Commercial & Other Vehicles','Electric Cycles & Low-Speed EVs',
  'Cars','Motorcycles & Scooters','Houses & Apartments','PG, Hostels & Guest Houses']){
  await search.fill(label);
  await expect(page.getByRole('link',{name:new RegExp('^'+label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'))})).toHaveCount(0);
 }
});
