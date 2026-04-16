import { test, expect } from '@playwright/test';

// These E2E tests require a running dev server.
// Run with: npx playwright test tests/e2e/catalog.spec.ts

test.describe('Catalog', () => {
  test.skip('navigate categories: should list categories and click into one', async ({ page }) => {
    await page.goto('/');

    // Click on a category link (selector depends on actual UI)
    const categoryLink = page.locator('nav a[href*="/category"]').first();
    await categoryLink.click();

    // Expect the URL to contain category path
    await expect(page).toHaveURL(/\/category\//);

    // Expect product cards to be visible
    await expect(page.locator('[data-testid="product-card"]').first()).toBeVisible();
  });

  test.skip('view product detail: should navigate to a product page', async ({ page }) => {
    await page.goto('/');

    // Click on a product card (selector depends on actual UI)
    const productCard = page.locator('[data-testid="product-card"]').first();
    await productCard.click();

    // Expect to be on a product detail page
    await expect(page).toHaveURL(/\/product\//);

    // Expect product name and price to be visible
    await expect(page.locator('[data-testid="product-name"]')).toBeVisible();
    await expect(page.locator('[data-testid="product-price"]')).toBeVisible();
  });
});
