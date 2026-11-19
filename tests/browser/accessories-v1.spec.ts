import { expect, test } from "@playwright/test";
import { api } from "./posting-fixture";

const chooser = "/account/listings/new";

test("legacy accessory entry returns to the chooser without creating or submitting anything", async ({ page }) => {
  const fixture = await api(page, { accessorySuccess: true });
  for (const query of [
    "posting=mobile-accessories",
    "category=mobile-phones&posting=mobile-accessories",
    "category=v2-mobile-tablet-accessories&category=mobile-phones",
  ]) {
    await page.goto(`${chooser}?${query}`);
    await expect(page).toHaveURL(new RegExp(`${chooser}$`));
    await expect(page.getByRole("searchbox", { name: "Search categories" })).toBeVisible();
    await expect(page.getByRole("list", { name: "Posting steps" })).toHaveCount(0);
  }
  expect(fixture.calls).toHaveLength(0);
  expect(fixture.submits()).toBe(0);
});

test("canonical accessory leaves fail closed even with the legacy catalogue enabled", async ({ page }) => {
  const fixture = await api(page, { accessorySuccess: true });
  await page.goto(chooser);
  await page.getByRole("searchbox", { name: "Search categories" }).fill("Mobile & Tablet Accessories");
  await expect(page.getByRole("link", { name: /^Mobile & Tablet Accessories/ })).toHaveCount(0);
  for (const leaf of ["v2-mobile-tablet-accessories", "v2-headphones-earbuds"]) {
    await page.goto(`${chooser}?category=${leaf}`);
    await expect(page.getByRole("list", { name: "Posting steps" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Submit for review" })).toHaveCount(0);
  }
  expect(fixture.calls).toHaveLength(0);
  expect(fixture.submits()).toBe(0);
});

test("a canonical phone draft recovers after a rejected accessory entry without cross-wiring media", async ({ page }) => {
  const fixture = await api(page, { accessorySuccess: true });
  await page.setViewportSize({ width: 360, height: 1000 });
  await page.goto(chooser);
  await page.getByRole("searchbox", { name: "Search categories" }).fill("Mobile Phones");
  await page.getByRole("link", { name: /^Mobile Phones/ }).click();
  await expect(page).toHaveURL(new RegExp(`${chooser}\\?category=mobile-phones$`));
  await expect(page.getByRole("button", { name: /^Step 2:/ })).toBeDisabled();
  await page.locator("#mobile-photo-files").setInputFiles({
    name: "phone.png", mimeType: "image/png", buffer: Buffer.from(fixture.pixel.split(",")[1], "base64"),
  });
  const upload = page.getByRole("button", { name: "Upload / retry photos" });
  await upload.click();
  await expect(page.getByText("Temporary upload failure", { exact: true })).toBeVisible();
  await upload.click();
  await expect(page.getByText("Cover · Ready", { exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => new Promise<string | undefined>((resolve, reject) => {
    const request = indexedDB.open("fairswap-posting-v2", 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const read = db.transaction("drafts").objectStore("drafts").get("11111111-1111-4111-8111-111111111111");
      read.onerror = () => { db.close(); reject(read.error); };
      read.onsuccess = () => { db.close(); resolve(read.result?.photos?.[0]?.state); };
    };
  }))).toBe("ready");
  const calls = fixture.calls.length;
  await page.goto(`${chooser}?posting=mobile-accessories`);
  await expect(page).toHaveURL(new RegExp(`${chooser}$`));
  await expect(page.getByRole("button", { name: "Resume saved listing" })).toHaveCount(0);
  await page.goto(`${chooser}?category=mobile-phones`);
  await page.getByRole("button", { name: "Resume saved listing" }).click();
  await expect(page.getByText("Cover · Ready", { exact: true })).toBeVisible();
  expect(fixture.calls).toHaveLength(calls);
  expect(fixture.media.size).toBe(1);
  expect(fixture.submits()).toBe(0);
});
