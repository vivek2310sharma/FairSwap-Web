import { test, expect } from "./helpers/test";
import path from "node:path";
import fs from "node:fs";

test.describe("FairSwap Grievance Redressal E2E Tests", () => {
  test("grievance page renders approved grievance contact details while signed out with zero console errors", async ({
    page,
  }, testInfo) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });
    page.on("pageerror", (err) => {
      consoleErrors.push(err.message);
    });

    await page.goto("/grievance");

    // 1. Heading
    await expect(
      page.getByRole("heading", { level: 1, name: "Grievance Redressal" })
    ).toBeVisible();

    // 2. Grievance Officer Details
    await expect(page.getByText("Vivek Kumar")).toBeVisible();
    await expect(page.getByText("Grievance Officer — FairSwap")).toBeVisible();

    // 3. Functional mailto link
    const mailLink = page.getByRole("link", { name: "grievance@fairswap.in" });
    await expect(mailLink).toBeVisible();
    await expect(mailLink).toHaveAttribute("href", "mailto:grievance@fairswap.in");

    // 4. Portal link with environment-safe navigation
    const portalLink = page.getByRole("link", { name: "https://fairswap.in/grievance" });
    await expect(portalLink).toBeVisible();
    await expect(portalLink).toHaveAttribute("href", "/grievance");
    await portalLink.click();
    await expect(page).toHaveURL(/\/grievance$/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Grievance Redressal" })
    ).toBeVisible();

    // 5. Understandable categories
    await expect(page.getByText("Account or access")).toBeVisible();
    await expect(page.getByText("Listing or content")).toBeVisible();
    await expect(page.getByText("Privacy / personal data")).toBeVisible();

    // 6. Security warning against sensitive info / Aadhaar
    await expect(page.getByText("Security & Sensitive Information Notice")).toBeVisible();
    await expect(page.getByText(/passwords/i)).toBeVisible();
    await expect(page.getByText(/Aadhaar/i)).toBeVisible();

    // 7. Safety guidance
    await expect(page.getByText("Safety and Urgent Concerns")).toBeVisible();

    // 8. Footer grievance link without a pilot notice
    const footer = page.getByRole("contentinfo");
    await expect(footer).toBeVisible();
    const footerGrievanceLink = footer.getByRole("link", { name: "Grievance Redressal" });
    await expect(footerGrievanceLink).toBeVisible();
    await expect(footerGrievanceLink).toHaveAttribute("href", "/grievance");
    await expect(footer).not.toContainText("Currently operating as a controlled production pilot.");

    // 9. Zero console or page errors
    expect(consoleErrors).toEqual([]);

    // 10. Screenshot
    const screenshotDir = path.resolve("test-results", "screenshots");
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
    const screenshotPath = path.join(
      screenshotDir,
      `${testInfo.project.name}-grievance.png`
    );
    await page.screenshot({ path: screenshotPath, fullPage: true });
  });

  test("footer link navigates cleanly to /grievance", async ({ page }) => {
    await page.goto("/");
    const footer = page.getByRole("contentinfo");
    const grievanceLink = footer.getByRole("link", { name: "Grievance Redressal" });
    await grievanceLink.scrollIntoViewIfNeeded();
    await grievanceLink.click();
    await expect(page).toHaveURL(/\/grievance$/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Grievance Redressal" })
    ).toBeVisible();
  });

  test("contact page cross-links cleanly to /grievance and displays Grievance Officer details", async ({
    page,
  }) => {
    await page.goto("/contact");
    await expect(page.getByText("Controlled Production Pilot Notice")).toHaveCount(0);
    await expect(page.getByText("Vivek Kumar")).toBeVisible();
    await expect(page.getByText("Grievance Officer — FairSwap")).toBeVisible();

    const portalLink = page.getByRole("link", { name: "Grievance Redressal Portal" });
    await portalLink.click();
    await expect(page).toHaveURL(/\/grievance$/);
  });
});