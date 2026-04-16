import { test, expect } from '@playwright/test';

// These E2E tests require a running dev server and authenticated user state.
// Run with: npx playwright test tests/e2e/checkout.spec.ts

test.describe('Checkout flow', () => {
  test.skip('add to cart and go to checkout', async ({ page }) => {
    // Navigate to a product page
    await page.goto('/');
    const productCard = page.locator('[data-testid="product-card"]').first();
    await productCard.click();

    // Select options if needed (selector depends on actual UI)
    // await page.selectOption('[data-testid="option-select"]', { index: 0 });

    // Click add-to-cart button
    await page.click('[data-testid="add-to-cart"]');

    // Expect cart count badge to update
    await expect(page.locator('[data-testid="cart-count"]')).not.toHaveText('0');

    // Navigate to cart page
    await page.goto('/cart');
    await expect(page.locator('[data-testid="cart-item"]').first()).toBeVisible();

    // Proceed to checkout
    await page.click('[data-testid="checkout-button"]');
    await expect(page).toHaveURL(/\/checkout/);

    // Verify checkout form is visible
    await expect(page.locator('input[name="recipientName"]')).toBeVisible();
  });
});
