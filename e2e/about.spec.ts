import { expect, test } from "@playwright/test";

const roster = [
  ["Vivek Kumar", "Director & Founder"],
  ["Sourabh Sharma", "CEO & Co-Founder"],
  ["Raghav Marwah", "CTO & Co-Founder"],
  ["Rudra Tiwari", "Chief Marketing Officer"],
  ["Abhishek Sharma", "CFO"],
  ["Tanvi Chawla", "Project Manager"],
  ["Riya Purohit", "People and Culture Manager"],
  ["Khushi Sharma", "Business Development Manager"],
  ["Gauri Bharatkumar Joshi", "Senior Developer"],
  ["Saiesh Purohit", "Developer"],
  ["Nikhil Joshi", "QA Tester"],
];

const profiles = [
  { name: "Vivek Kumar", photo: "vivek.webp", linkedIn: "https://www.linkedin.com/in/vivek2310sharma/" },
  { name: "Sourabh Sharma", photo: "raghav.webp", linkedIn: "https://www.linkedin.com/in/sourabh-sharma-6622071aa/" },
  { name: "Raghav Marwah", photo: "sourabh.webp", linkedIn: "https://www.linkedin.com/in/raghav-marwah-72b46b13a/" },
  { name: "Gauri Bharatkumar Joshi", photo: "gauri.webp" },
  { name: "Nikhil Joshi", photo: "nikhil.webp" },
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

test("portraits and initials share the same card layout", async ({ page }) => {
  await page.goto("/about");
  const main = page.getByRole("main");
  await expect(main.getByRole("img")).toHaveCount(5);
  await expect(page.locator('a[href*="linkedin.com"]')).toHaveCount(3);

  const cards = main.getByRole("listitem");
  const firstFrame = cards.first().locator(":scope > div").first();
  const frameSize = await firstFrame.boundingBox();
  const radius = await cards.first().evaluate((element) => getComputedStyle(element).borderRadius);

  for (const [index, [name]] of roster.entries()) {
    const card = cards.nth(index);
    const frame = card.locator(":scope > div").first();
    await expect(frame).toHaveCSS("aspect-ratio", "1 / 1");
    await expect(frame).toHaveCSS("overflow", "hidden");
    await expect(card).toHaveCSS("border-radius", radius);
    const box = await frame.boundingBox();
    expect(box?.width).toBeCloseTo(frameSize!.width, 0);
    expect(box?.height).toBeCloseTo(frameSize!.height, 0);

    const profile = profiles.find((profile) => profile.name === name);
    if (!profile) {
      const initials = frame.getByText(name.split(" ").map((part) => part[0]).join(""), { exact: true });
      await expect(initials).toBeVisible();
      await expect(initials).toHaveAttribute("aria-hidden", "true");
      continue;
    }

    const portrait = frame.getByRole("img", { name: `Portrait of ${name}` });
    await portrait.scrollIntoViewIfNeeded();
    await expect(portrait).toBeVisible();
    const src = await portrait.getAttribute("src");
    expect(new URL(src!, page.url()).searchParams.get("url")).toBe(`/images/team/${profile.photo}`);
    await expect(portrait).toHaveCSS("scale", "none");
    await expect(portrait).toHaveCSS("object-position", "50% 0%");
    await expect(portrait).toHaveJSProperty("complete", true);
    await expect.poll(() => portrait.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
    if (profile.linkedIn) {
      await expect(card.getByRole("link", { name: `${name} on LinkedIn` })).toHaveAttribute("href", profile.linkedIn);
    }
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
