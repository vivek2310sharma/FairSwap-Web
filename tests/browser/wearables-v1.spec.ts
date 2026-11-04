import { test, expect, type Page } from "@playwright/test";
import sharp from "sharp";
import { wearableApi } from "./wearables-fixture";
import { wearableSchema } from "../../src/lib/listings/wearables/contract";
async function choose(page: Page, label: string, value: string) { const input = page.getByRole("combobox", { name: label, exact: true }); await input.fill(value); await input.press("ArrowDown"); await input.press("Enter"); }
const next = (page: Page) => page.getByRole("button", { name: "Continue", exact: true }).click();
for (const width of [320, 360]) test(`Wearable five-step journey, device switching, lock/pairing gates and recovery at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1000 }); const fixture = await wearableApi(page);
  await page.goto("/account/listings/new?posting=wearables");
  await expect(page.getByRole("button", { name: "Step 2: Wearable details" })).toBeDisabled();
  const photo = await sharp({ create: { width: 32, height: 32, channels: 3, background: "#08704a" } }).png().toBuffer();
  await page.locator("#mobile-photo-files").setInputFiles({ name: "watch.png", mimeType: "image/png", buffer: photo });
  await page.getByRole("button", { name: "Upload / retry photos", exact: true }).click(); await expect(page.getByText("Temporary upload failure", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Upload / retry photos", exact: true }).click(); await next(page);
  // Device switching shows only relevant fields and resets dependent choices.
  await page.getByRole("button", { name: "Smartwatch", exact: true }).click(); await expect(page.getByRole("group", { name: "Connectivity" })).toBeVisible();
  await choose(page, "Brand", "Apple"); await choose(page, "Model", "Apple Watch Series 9");
  await page.getByRole("button", { name: "Smart ring", exact: true }).click(); await expect(page.getByLabel(/Ring size/)).toBeVisible(); await expect(page.getByRole("group", { name: "Connectivity" })).toHaveCount(0); await expect(page.getByRole("combobox", { name: "Brand", exact: true })).toHaveValue("");
  await page.getByRole("button", { name: "Smartwatch", exact: true }).click(); await choose(page, "Brand", "Apple"); await choose(page, "Model", "Apple Watch Series 9");
  await page.getByRole("button", { name: "Bluetooth (GPS if listed by seller)", exact: true }).click(); await next(page);
  // Condition: lock blocks, still-paired needs acknowledgement, then a ready device passes.
  await page.getByRole("button", { name: "Good condition", exact: true }).click();
  for (const [group, option] of [["Screen", "Perfect"], ["Touch and buttons", "Working"], ["Strap or band", "Good"], ["Sensors", "Working"], ["Charging", "Working"], ["Battery", "Not tested"]] as const) await page.getByRole("group", { name: group }).getByRole("button", { name: option, exact: true }).click();
  await page.getByLabel("I own this device and it is not lost, stolen or reported as such.").check();
  await page.getByLabel("Description").fill("Used for a year with a screen guard. Charger included.");
  await page.getByLabel("Activation or account lock is on").check(); await expect(page.getByRole("alert").filter({ hasText: "can’t be listed" })).toBeVisible(); await next(page); await expect(page.getByText("STEP 3 OF 5")).toBeVisible();
  await page.getByLabel("Still paired with my account / phone").check(); await next(page); await expect(page.getByText(/Confirm you will unpair/)).toBeVisible();
  await page.getByLabel("Signed out of my account, not reset").check(); await next(page);
  if (width === 320) await page.getByRole("button", { name: "Give away", exact: true }).click(); else await page.getByLabel("Price (₹)", { exact: true }).fill("12000");
  await next(page); await page.locator("#pincode_picker_input").fill("560034"); await page.getByRole("combobox", { name: "Area / Locality *", exact: true }).selectOption("66666666-6666-4666-8666-666666666666");
  await page.getByRole("button", { name: "Review listing", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Review your listing", exact: true })).toBeVisible(); await expect(page.getByRole("complementary", { name: "Buyer preview" })).toContainText("Seller reported: signed out");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.getByText("Saved on this device", { exact: true })).toBeVisible(); await page.reload(); await page.getByRole("button", { name: "Resume saved listing" }).click();
  await page.getByRole("button", { name: "Step 5: Location" }).click(); await page.getByRole("button", { name: "Review listing", exact: true }).click();
  const sent = page.waitForRequest(r => r.url().endsWith("/api/post-ad/wearables/submit")); await page.getByRole("button", { name: "Submit for review", exact: true }).dblclick();
  const payload = (await sent).postDataJSON(); expect(wearableSchema.safeParse(payload).success).toBe(true); expect(payload.pairing_status).toBe("signed_out"); expect(payload).not.toHaveProperty("ram");
  expect(fixture.submits()).toBe(1); expect(fixture.calls.every(c => !c.includes("/api/post-ad/sessions") && !c.endsWith("/api/post-ad/submit"))).toBe(true);
});
test("category chooser links to the wearables journey and keeps the phone draft record independent", async ({ page }) => {
  await wearableApi(page); await page.goto("/account/listings/new"); await page.getByRole("button", { name: /Mobiles & Tablets/ }).click();
  await expect(page.getByRole("link", { name: /Smartwatches & Wearables/ })).toHaveAttribute("href", "/account/listings/new?posting=wearables");
  const owner = await page.evaluate(async () => { const db = await new Promise<IDBDatabase>((res, rej) => { const r = indexedDB.open("fairswap-posting-v2", 1); r.onupgradeneeded = () => r.result.createObjectStore("drafts"); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); const keys = await new Promise<IDBValidKey[]>(res => { const r = db.transaction("drafts").objectStore("drafts").getAllKeys(); r.onsuccess = () => res(r.result); }); db.close(); return keys; });
  expect(owner.every(k => !String(k).endsWith(":wearables:v1"))).toBe(true);
});
