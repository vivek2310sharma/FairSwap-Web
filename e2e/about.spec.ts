import { expect, test } from "@playwright/test";

const roster = [
  ["Vivek", "Director & Founder"],
  ["Sourabh", "CEO & Co-Founder"],
  ["Raghav", "CTO & Co-Founder"],
  ["Rudra", "Chief Marketing Officer"],
  ["Abhishek", "CFO"],
  ["Tanvi", "Project Manager"],
  ["Riya", "People and Culture Manager"],
  ["Khushi", "Business Development Manager"],
  ["Gauri", "Senior Developer"],
  ["Saiesh", "Developer"],
  ["Nikhil", "QA Tester"],
];

const founderProfiles = [
  { name: "Vivek", photo: "vivek.webp", linkedIn: "https://www.linkedin.com/in/vivek2310sharma/" },
  { name: "Sourabh", photo: "raghav.webp", linkedIn: "https://www.linkedin.com/in/sourabh-sharma-6622071aa/" },
  { name: "Raghav", photo: "sourabh.webp", linkedIn: "https://www.linkedin.com/in/raghav-marwah-72b46b13a/" },
];

test("About is public and presents the team in accessible reading order", async ({ page }) => {
  const response = await page.goto("/about");
  expect(response?.status()).toBe(200);
  await expect(page).toHaveURL(/\/about$/);
  await expect(page).toHaveTitle(/About FairSwap/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://fairswap.in/about");

  const main = page.getByRole("main");
  await expect(main.getByRole("heading", { level: 1 })).toHaveText("About FairSwap");
  await expect(main.getByRole("heading", { level: 2 })).toHaveText([
    "Our Story and Mission",
    "Meet Our Founders",
    "Leadership",
    "The Team Behind FairSwap",
  ]);
  const story = main.getByRole("region", { name: "Our Story and Mission" });
  await expect(story.locator("p")).toHaveText([
    "FairSwap is building a safer, more trustworthy way to buy and sell locally in India. Our approach prioritises data privacy, account security and accountability, with identity verification in mind and one genuine account per user as a design goal.",
    "Our mission is to make local transactions simpler and safer. AI-assisted moderation is part of our approach to spotting potential fraud, spam and unsafe activity.",
  ]);
  await expect(main.getByRole("heading", { level: 3 })).toHaveText(roster.map(([name]) => name));
  const cards = main.getByRole("listitem");
  await expect(cards).toHaveCount(roster.length);
  for (const [index, [name, role]] of roster.entries()) {
    await expect(cards.nth(index).getByRole("heading")).toHaveText(name);
    await expect(cards.nth(index).getByText(role, { exact: true })).toBeVisible();
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    await page.evaluate(() => document.documentElement.clientWidth),
  );
});

test("the three founder portraits load and link to the supplied LinkedIn profiles", async ({ page }) => {
  await page.goto("/about");
  const main = page.getByRole("main");
  await expect(main.getByRole("img")).toHaveCount(3);
  await expect(page.locator('a[href*="linkedin.com"]')).toHaveCount(3);

  const cards = main.getByRole("region", { name: "Meet Our Founders" }).getByRole("listitem");
  await expect(cards.getByRole("heading")).toHaveText(founderProfiles.map(({ name }) => name));
  for (const [index, { name, photo, linkedIn }] of founderProfiles.entries()) {
    const card = cards.nth(index);
    const portrait = card.getByRole("img", { name: `Portrait of ${name}` });
    await portrait.scrollIntoViewIfNeeded();
    await expect(portrait).toBeVisible();
    const src = await portrait.getAttribute("src");
    expect(new URL(src!, page.url()).searchParams.get("url")).toBe(`/images/team/${photo}`);
    const frame = portrait.locator("..");
    await expect(frame).toHaveCSS("aspect-ratio", "1 / 1");
    await expect(frame).toHaveCSS("overflow", "hidden");
    await expect(card).toHaveCSS("border-radius", await cards.first().evaluate((element) => getComputedStyle(element).borderRadius));
    await expect(portrait).toHaveJSProperty("complete", true);
    await expect.poll(() => portrait.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
    await expect(card.getByRole("link", { name: `${name} on LinkedIn` })).toHaveAttribute("href", linkedIn);
  }
});

test("About Us is linked from the homepage and standard footer", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const aboutLink = page.getByRole("contentinfo").getByRole("link", { name: "About Us", exact: true });
  await expect(aboutLink).toHaveAttribute("href", "/about");
  await aboutLink.click();
  await expect(page).toHaveURL(/\/about$/);
  await expect(aboutLink).toBeVisible();
  await expect(aboutLink).toHaveAttribute("href", "/about");
});
