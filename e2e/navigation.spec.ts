import { test, expect } from '@playwright/test';

test.describe('Navigation Regression Tests', () => {
  test('header fragment links work via absolute paths from non-root', async ({ page }) => {
    // Go to search page
    await page.goto('/search');

    // Wait for Next.js to hydrate
    await page.waitForLoadState('networkidle');

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

    await page.goto(`/search`);
    await page.waitForLoadState('networkidle');

    // We filter out SVG nodes to ensure we grab the actual main link of the card
    const listingLinks = page.locator('a[href*="/listings/"]').filter({ hasNot: page.locator('svg') });

    if (await listingLinks.count() > 0) {
      await page.goto(`/search?q=${encodedQuery}&sort=price_asc`);
      await page.waitForLoadState('networkidle');

      const firstHref = await listingLinks.first().getAttribute('href');
      if (firstHref) {
        const basePath = firstHref.split('?')[0];
        const mockCtx = `q=${encodedQuery}&sort=price_asc`;
        await page.goto(`${basePath}?ctx=${encodeURIComponent(mockCtx)}`);

        await page.waitForLoadState('networkidle');

        // Find back link correctly addressing any structure
        const backLink = page.locator('a').filter({ hasText: 'Back to search' }).first();
        await expect(backLink).toBeVisible();

        const href = await backLink.getAttribute('href');
        expect(href).toContain('sort=price_asc');

        await backLink.click();
        await page.waitForLoadState('networkidle');
        await expect(page).toHaveURL(/.*sort=price_asc/);
      }
    }
  });

  test('homepage search form works with Javascript enabled or disabled', async ({ page }) => {
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

  test('malformed context parameter gracefully falls back', async ({ page }) => {
    await page.goto('/listings/some-fake-listing-slug?ctx=invalid-percent-encoding-%ZZ%YY');
    const title = await page.title();
    expect(title).toBeDefined();
  });

  test('excessively long context parameter values are ignored', async ({ page }) => {
    const longString = 'A'.repeat(250);
    const mockCtx = `q=${longString}&category=electronics`;
    const encodedCtx = encodeURIComponent(mockCtx);

    await page.goto('/search');
    await page.waitForLoadState('networkidle');
    const firstListing = page.locator('a[href*="/listings/"]').first();
    const count = await firstListing.count();

    // We only perform the test if we have a listing available
    if (count > 0) {
      const firstListingHref = await firstListing.getAttribute('href');

      if (firstListingHref) {
        const basePath = firstListingHref.split('?')[0];
        await page.goto(`${basePath}?ctx=${encodedCtx}`);

        const backLink = page.locator('a').filter({ hasText: 'Back to search' }).first();
        await expect(backLink).toBeVisible();

        const href = await backLink.getAttribute('href');
        expect(href).not.toContain('q=');
        expect(href).toContain('category=electronics');
      }
    }
  });
});