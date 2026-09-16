/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { chromium, type Page } from "@playwright/test";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const BASE_URL = "http://localhost:3001";
const EVIDENCE_DIR = path.resolve(process.cwd(), "artifacts", "evidence", "point17");

if (!fs.existsSync(EVIDENCE_DIR)) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

interface TestReport {
  viewportsTested: string[];
  pagesScanned: string[];
  consoleErrors: string[];
  networkErrors: string[];
  axeResults: Array<{
    page: string;
    violationsCount: number;
    violations: Array<{ id: string; impact: string; description: string; help: string; count: number }>;
  }>;
  screenshots: string[];
  keyboardResults: Record<string, boolean>;
  contrastFindings: string[];
  contentLifecycleFindings: Record<string, any>;
}

const report: TestReport = {
  viewportsTested: [],
  pagesScanned: [],
  consoleErrors: [],
  networkErrors: [],
  axeResults: [],
  screenshots: [],
  keyboardResults: {},
  contrastFindings: [],
  contentLifecycleFindings: {},
};

function setupMonitoring(page: Page, label: string) {
  page.on("console", (msg) => {
    const text = msg.text();
    const type = msg.type();
    if (type === "error" && !text.includes("Failed to load resource") && !text.includes("favicon")) {
      report.consoleErrors.push(`[${label}] [${type}] ${text}`);
    }
  });

  page.on("pageerror", (err) => {
    report.consoleErrors.push(`[${label}] [PAGE_ERROR] ${err.message}`);
  });

  page.on("response", (res) => {
    const status = res.status();
    const url = res.url();
    if (status >= 400 && !url.includes("favicon") && !url.includes("non-existent") && !url.includes("00000000-0000")) {
      report.networkErrors.push(`[${label}] HTTP ${status} for ${url}`);
    }
  });
}

// Injects axe-core script and runs accessibility audit
async function runAxeScan(page: Page, pageName: string) {
  try {
    // Inject axe-core from CDN if not already present
    await page.evaluate(async () => {
      if ((window as any).axe) return;
      return new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.2/axe.min.js";
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Failed to load axe-core from CDN"));
        document.head.appendChild(script);
      });
    });

    const results = await page.evaluate(async () => {
      if (!(window as any).axe) return null;
      return await (window as any).axe.run(document, {
        runOnly: {
          type: "tag",
          values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"],
        },
      });
    });

    if (results && results.violations) {
      report.axeResults.push({
        page: pageName,
        violationsCount: results.violations.length,
        violations: results.violations.map((v: any) => ({
          id: v.id,
          impact: v.impact || "unknown",
          description: v.description,
          help: v.help,
          count: v.nodes?.length || 0,
          nodes: v.nodes?.map((n: any) => ({
            target: n.target,
            html: n.html,
            summary: n.failureSummary,
          })),
        })),
      });
    }
  } catch (err: any) {
    console.log(`[Axe] Notice: axe scan on ${pageName} skipped: ${err.message}`);
  }
}

async function captureEvidence(page: Page, filename: string) {
  const targetPath = path.join(EVIDENCE_DIR, filename);
  await page.screenshot({ path: targetPath, fullPage: true });
  report.screenshots.push(filename);
  console.log(`Saved screenshot: ${filename}`);
}

async function runVerification() {
  console.log("=== Launching Chromium for Point 17 Verification ===");
  const browser = await chromium.launch({ headless: true });

  try {
    // -------------------------------------------------------------
    // VIEWPORT 1: PRIMARY DESKTOP (1440 x 900)
    // -------------------------------------------------------------
    console.log("\n--- Testing Primary Desktop Viewport (1440 x 900) ---");
    report.viewportsTested.push("Primary Desktop (1440x900)");
    const desktopContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 FairSwap-Audit/1.0",
    });
    const desktopPage = await desktopContext.newPage();
    setupMonitoring(desktopPage, "Desktop");

    // 1. Homepage & Navigation
    await desktopPage.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });
    await captureEvidence(desktopPage, "01_desktop_home.png");
    report.pagesScanned.push("Desktop Homepage");
    await runAxeScan(desktopPage, "Desktop Homepage");

    // Verify Header navigation elements
    const brandLink = desktopPage.locator('a[aria-label*="FairSwap home" i], a:has-text("FairSwap")').first();
    const navSearch = desktopPage.locator('input[placeholder*="search" i], input[type="search"]').first();
    console.log("Desktop brand link visible:", await brandLink.isVisible());

    // 2. Search & Discovery
    await desktopPage.goto(`${BASE_URL}/search`, { waitUntil: "networkidle" });
    await captureEvidence(desktopPage, "02_desktop_search_discovery.png");
    report.pagesScanned.push("Desktop Search");
    await runAxeScan(desktopPage, "Desktop Search");

    // 3. Point 9B Active Bike Listing Detail
    await desktopPage.goto(`${BASE_URL}/listings/bike-1694c2`, { waitUntil: "networkidle" });
    await captureEvidence(desktopPage, "03_desktop_listing_detail.png");
    report.pagesScanned.push("Desktop Listing Detail (Bike)");
    await runAxeScan(desktopPage, "Desktop Listing Detail (Bike)");

    // 4. Footer & Legal
    await desktopPage.goto(`${BASE_URL}/terms`, { waitUntil: "networkidle" });
    await captureEvidence(desktopPage, "04_desktop_footer_legal_terms.png");
    await desktopPage.goto(`${BASE_URL}/privacy`, { waitUntil: "networkidle" });
    await captureEvidence(desktopPage, "04b_desktop_footer_legal_privacy.png");
    report.pagesScanned.push("Desktop Legal (Terms & Privacy)");

    // -------------------------------------------------------------
    // VIEWPORT 2: PRIMARY MOBILE (390 x 844)
    // -------------------------------------------------------------
    console.log("\n--- Testing Primary Mobile Viewport (390 x 844) ---");
    report.viewportsTested.push("Primary Mobile (390x844)");
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1 FairSwap-Audit/1.0",
    });
    const mobilePage = await mobileContext.newPage();
    setupMonitoring(mobilePage, "Mobile-390");

    // Check horizontal page overflow on Mobile 390
    await mobilePage.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });
    const hasOverflow390 = await mobilePage.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    console.log("Mobile 390 horizontal overflow detected:", hasOverflow390);
    await captureEvidence(mobilePage, "05_mobile_390_home.png");

    // Mobile menu drawer
    const menuButton = mobilePage.locator('button[aria-label*="menu" i], button:has-text("Menu")').first();
    if (await menuButton.isVisible()) {
      await menuButton.click();
      await mobilePage.waitForTimeout(300);
      await captureEvidence(mobilePage, "06_mobile_390_nav_drawer.png");
      const closeButton = mobilePage.locator('button[aria-label*="close" i]').first();
      if (await closeButton.isVisible()) {
        await closeButton.click();
        await mobilePage.waitForTimeout(200);
      }
    }

    // Mobile listing detail
    await mobilePage.goto(`${BASE_URL}/listings/bike-1694c2`, { waitUntil: "networkidle" });
    await captureEvidence(mobilePage, "07_mobile_390_listing_detail.png");

    // -------------------------------------------------------------
    // VIEWPORT 3: SMALL MOBILE (320 x 568)
    // -------------------------------------------------------------
    console.log("\n--- Testing Small Mobile Viewport (320 x 568) ---");
    report.viewportsTested.push("Small Mobile (320x568)");
    const smallMobileContext = await browser.newContext({
      viewport: { width: 320, height: 568 },
      isMobile: true,
      hasTouch: true,
    });
    const smallMobilePage = await smallMobileContext.newPage();
    setupMonitoring(smallMobilePage, "SmallMobile-320");

    await smallMobilePage.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });
    const hasOverflow320 = await smallMobilePage.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    console.log("Small Mobile 320 horizontal overflow detected:", hasOverflow320);
    await captureEvidence(smallMobilePage, "08_mobile_320_home.png");

    await smallMobilePage.goto(`${BASE_URL}/listings/bike-1694c2`, { waitUntil: "networkidle" });
    await captureEvidence(smallMobilePage, "09_mobile_320_listing_detail.png");

    // -------------------------------------------------------------
    // VIEWPORT 4: TABLET (768 x 1024)
    // -------------------------------------------------------------
    console.log("\n--- Testing Tablet Viewport (768 x 1024) ---");
    report.viewportsTested.push("Tablet (768x1024)");
    const tabletContext = await browser.newContext({
      viewport: { width: 768, height: 1024 },
      hasTouch: true,
    });
    const tabletPage = await tabletContext.newPage();
    setupMonitoring(tabletPage, "Tablet-768");

    await tabletPage.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });
    await captureEvidence(tabletPage, "10_tablet_768_home.png");
    await tabletPage.goto(`${BASE_URL}/listings/bike-1694c2`, { waitUntil: "networkidle" });
    await captureEvidence(tabletPage, "11_tablet_768_listing_detail.png");

    // -------------------------------------------------------------
    // AUTHENTICATION FLOWS (Sign In, Sign Up, Recovery, Confirm)
    // -------------------------------------------------------------
    console.log("\n--- Testing Auth Journeys ---");
    const authPage = await desktopContext.newPage();
    setupMonitoring(authPage, "Auth");

    // Sign In
    await authPage.goto(`${BASE_URL}/auth/sign-in`, { waitUntil: "networkidle" });
    await captureEvidence(authPage, "12_auth_signin.png");
    await runAxeScan(authPage, "Auth Sign In");

    // Sign In form validation
    const submitBtn = authPage.locator('button[type="submit"]:has-text("Sign in")').first();
    await submitBtn.click();
    await authPage.waitForTimeout(300);
    await captureEvidence(authPage, "12b_auth_signin_validation.png");

    // Sign Up
    await authPage.goto(`${BASE_URL}/auth/sign-up`, { waitUntil: "networkidle" });
    await captureEvidence(authPage, "13_auth_signup.png");
    await runAxeScan(authPage, "Auth Sign Up");

    // Forgot Password
    await authPage.goto(`${BASE_URL}/auth/forgot-password`, { waitUntil: "networkidle" });
    await captureEvidence(authPage, "14_auth_forgot_password.png");

    // Confirmation screen
    await authPage.goto(`${BASE_URL}/auth/confirm?email=test@fairswap.local`, { waitUntil: "networkidle" });
    await captureEvidence(authPage, "15_auth_confirm_instruction.png");

    // -------------------------------------------------------------
    // PROTECTED ACCOUNT & BUYER/SELLER FLOWS
    // -------------------------------------------------------------
    console.log("\n--- Testing Protected Account Routes & Redirects ---");
    // Unauthenticated access to /account redirects to /auth/sign-in
    await authPage.goto(`${BASE_URL}/account`, { waitUntil: "networkidle" });
    console.log("Unauthenticated /account URL:", authPage.url());
    report.keyboardResults["unauthenticated_redirect_to_signin"] = authPage.url().includes("/auth/sign-in");

    // Unauthenticated access to /admin redirects to /auth/sign-in
    await authPage.goto(`${BASE_URL}/admin`, { waitUntil: "networkidle" });
    console.log("Unauthenticated /admin URL:", authPage.url());
    report.keyboardResults["unauthenticated_admin_redirect"] = authPage.url().includes("/auth/sign-in");

    // -------------------------------------------------------------
    // NOT-FOUND (404) & UNAVAILABLE CONTENT
    // -------------------------------------------------------------
    console.log("\n--- Testing 404 & Unavailable Content Presentation ---");
    const nonExistentSlug = `non-existent-${crypto.randomBytes(6).toString("hex")}`;
    await authPage.goto(`${BASE_URL}/listings/${nonExistentSlug}`, { waitUntil: "networkidle" });
    await captureEvidence(authPage, "31_error_and_404.png");

    // Test non-existent seller
    await authPage.goto(`${BASE_URL}/seller/00000000-0000-0000-0000-000000000000`, { waitUntil: "networkidle" });
    await captureEvidence(authPage, "31b_nonexistent_seller_404.png");

    // -------------------------------------------------------------
    // EMPTY STATES & SEARCH FILTERS
    // -------------------------------------------------------------
    console.log("\n--- Testing Empty Search State & Filters ---");
    await authPage.goto(`${BASE_URL}/search?q=xyznonexistentterm999`, { waitUntil: "networkidle" });
    await captureEvidence(authPage, "30_empty_search_state.png");

    // -------------------------------------------------------------
    // ZOOM 200% CHECK
    // -------------------------------------------------------------
    console.log("\n--- Testing 200% Zoom Resizing ---");
    const zoomContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });
    const zoomPage = await zoomContext.newPage();
    await zoomPage.goto(`${BASE_URL}/listings/bike-1694c2`, { waitUntil: "networkidle" });
    await captureEvidence(zoomPage, "33_desktop_200_zoom.png");

    // -------------------------------------------------------------
    // KEYBOARD NAVIGATION & FOCUS RINGS
    // -------------------------------------------------------------
    console.log("\n--- Testing Keyboard Traversal & Visible Focus Ring ---");
    const keyPage = await desktopContext.newPage();
    await keyPage.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });

    // Press Tab and inspect focus
    await keyPage.keyboard.press("Tab");
    const focusedElement = await keyPage.evaluate(() => {
      const active = document.activeElement;
      if (!active) return null;
      const style = window.getComputedStyle(active);
      return {
        tagName: active.tagName,
        outlineStyle: style.outlineStyle,
        outlineWidth: style.outlineWidth,
        outlineColor: style.outlineColor,
        boxShadow: style.boxShadow,
      };
    });
    console.log("First Tab focused element style:", focusedElement);
    report.keyboardResults["first_tab_has_visible_focus"] =
      focusedElement !== null && (focusedElement.outlineStyle === "solid" || focusedElement.boxShadow.includes("rgb"));

    await captureEvidence(keyPage, "34_keyboard_focus_ring.png");

    // -------------------------------------------------------------
    // SITEMAP & CONTENT METADATA HONESTY
    // -------------------------------------------------------------
    console.log("\n--- Testing Sitemap & SEO Metadata ---");
    const sitemapRes = await fetch(`${BASE_URL}/sitemap.xml`);
    const sitemapText = await sitemapRes.text();
    report.contentLifecycleFindings["sitemap_status"] = sitemapRes.status;
    report.contentLifecycleFindings["sitemap_includes_active_bike"] = sitemapText.includes("bike-1694c2");
    report.contentLifecycleFindings["sitemap_excludes_private_data"] = !sitemapText.includes("password") && !sitemapText.includes("secret");

    // Detail page metadata inspection
    await keyPage.goto(`${BASE_URL}/listings/bike-1694c2`);
    const metaTitle = await keyPage.evaluate(() => document.title);
    const metaDescription = await keyPage.locator('meta[name="description"]').getAttribute("content");
    const ogImage = await keyPage.locator('meta[property="og:image"]').getAttribute("content");
    report.contentLifecycleFindings["listing_meta_title"] = metaTitle;
    report.contentLifecycleFindings["listing_meta_description"] = metaDescription;
    report.contentLifecycleFindings["listing_og_image"] = ogImage;

  } finally {
    await browser.close();
  }

  // Save full JSON report
  const reportFile = path.join(EVIDENCE_DIR, "point17_verification_report.json");
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  console.log(`\nPoint 17 Verification Complete! Report saved to ${reportFile}`);
}

runVerification().catch(console.error);
