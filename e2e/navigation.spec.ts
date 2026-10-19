import { test, expect } from '@playwright/test';
import { seedNavigationListings, cleanupNavigationListings } from './seed-navigation';

test.describe('Navigation Regression Tests', () => {
  test.beforeAll(async () => {
    if (process.env.ALLOW_LOCAL_TEST_MUTATIONS === 'true') {
      await seedNavigationListings();
    }
  });

  test.afterAll(async () => {
    if (process.env.ALLOW_LOCAL_TEST_MUTATIONS === 'true') {
      await cleanupNavigationListings();
    }
  });

  test('header fragment links work via absolute paths from non-root', async ({ page }) => {
    // Go to search page
    await page.goto('/search');

    // Wait for Next.js to hydrate
    await page.waitForLoadState('networkidle');

    // If mobile, open the menu first
    const isMobile = await page.evaluate(() => window.innerWidth < 768);
    if (isMobile) {
      await page.getByRole('button', { name: 'Open menu' }).click();
    }

    // Click How It Works
    await page.getByRole('link', { name: 'How It Works' }).click();

    // Check we navigated to /#how-it-works
    await expect(page).toHaveURL(/.*\/#how-it-works/);

    // Verify the element is visible
    await expect(page.locator('#how-it-works')).toBeVisible();
  });

  test('search to listing details and back preserves context', async ({ page }) => {
    const queryStr = 'C++ & 100% 👍';
    const encodedQuery = encodeURIComponent(queryStr);

    // Go to search with the explicit query parameters
    await page.goto(`/search?q=${encodedQuery}&sort=price_asc&page=1`);
    await page.waitForLoadState('networkidle');

    // We explicitly assert that the seeded test fixture is present on the page
    // Using an accessible locator matching the deterministic fixture title.
    // The fixture title created in seed-navigation.ts is "C++ & 100% 👍 Developer Laptop"
    const listingLink = page.getByRole('link', { name: /Developer Laptop/i }).first();
    await expect(listingLink).toBeVisible({ timeout: 5000 });

    // Verify the href actually includes the ctx parameter we expect
    const listingHref = await listingLink.getAttribute('href');
    expect(listingHref).toContain('ctx=');

    // Click the accessible listing link
    await listingLink.click();
    await page.waitForLoadState('networkidle');

    // Verify the detail page actually opened by checking for the item title heading
    const detailTitle = page.getByRole('heading', { level: 1, name: /Developer Laptop/i });
    await expect(detailTitle).toBeVisible();

    // Find the Back to search link and verify it preserves filters
    const backLink = page.locator('a').filter({ hasText: 'Back to search' }).first();
    await expect(backLink).toBeVisible();

    const backHref = await backLink.getAttribute('href');
    expect(backHref).toContain('sort=price_asc');
    expect(backHref).toContain('page=1');
    expect(backHref).toContain('q=C%2B%2B+%26+100%25+%F0%9F%91%8D');

    // Navigate back to the search page
    await backLink.click();
    await page.waitForLoadState('networkidle');

    // Verify that search filters, pagination, and special characters are preserved
    await expect(page).toHaveURL(/.*sort=price_asc/);
    await expect(page).toHaveURL(/.*page=1/);
    await expect(page).toHaveURL(/.*q=C%2B%2B\+%26\+100%25\+%F0%9F%91%8D/);
    await expect(page.getByRole('searchbox', { name: 'Search items, titles, brands...' })).toHaveValue(queryStr);
  });

  test('homepage search form works with Javascript enabled', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const searchInput = page.getByPlaceholder('Search items, categories, or keywords...');
    await searchInput.fill('laptop');

    await page.getByRole('button', { name: 'Search' }).click();
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/.*\/search\?q=laptop/);

    const filtersSearchInput = page.getByRole('searchbox', { name: 'Search items, titles, brands...' });
    await expect(filtersSearchInput).toHaveValue('laptop');
  });

  test("malformed context parameter gracefully falls back", async ({ page }) => {
    await page.goto("/search");
    await page.waitForLoadState("networkidle");
    const firstListing = page.getByRole("link", { name: /Developer Laptop/i }).first();
    await expect(firstListing).toBeVisible();
    const firstListingHref = await firstListing.getAttribute("href");
    const basePath = firstListingHref?.split("?")[0];
    await page.goto(`${basePath}?ctx=invalid-percent-encoding-%ZZ%YY`);
    const backLink = page.locator("a").filter({ hasText: "Back to search" }).first();
    await expect(backLink).toBeVisible();
    const href = await backLink.getAttribute("href");
    expect(href).toBe("/search?");
  });

  test('excessively long context parameter values are ignored', async ({ page }) => {
    const longString = 'A'.repeat(250);
    const mockCtx = `q=${longString}&category=electronics`;
    const encodedCtx = encodeURIComponent(mockCtx);

    // Go to search to ensure our fixture is visible
    await page.goto('/search');
    await page.waitForLoadState('networkidle');

    // Select the known fixture
    const firstListing = page.getByRole('link', { name: /Developer Laptop/i }).first();
    await expect(firstListing).toBeVisible();

    const firstListingHref = await firstListing.getAttribute('href');
    const basePath = firstListingHref?.split('?')[0];

    // Navigate directly to the listing page with an excessively long context
    await page.goto(`${basePath}?ctx=${encodedCtx}`);
    await page.waitForLoadState('networkidle');

    const backLink = page.locator('a').filter({ hasText: 'Back to search' }).first();
    await expect(backLink).toBeVisible();

    // The overlong parameter ('q') should be stripped out for exceeding 200 characters,
    // but the valid parameter ('category') should be preserved.
    const href = await backLink.getAttribute('href');
    expect(href).not.toContain('q=');
    expect(href).toContain('category=electronics');
  });
});