import { test, expect } from '@playwright/test';

// These E2E tests require a running dev server.
// Run with: npx playwright test tests/e2e/auth.spec.ts

test.describe('Auth flow', () => {
  test.skip('signup: should fill the form and submit', async ({ page }) => {
    await page.goto('/signup');

    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'Test1234!');
    await page.fill('input[name="name"]', '테스트');

    // Check required agreement checkboxes
    await page.check('input[name="agreeTerms"]');
    await page.check('input[name="agreePrivacy"]');

    await page.click('button[type="submit"]');

    // Expect redirect or success message after signup
    await expect(page).toHaveURL(/\/(login|$)/);
  });

  test.skip('login: should fill the form and submit', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'Test1234!');

    await page.click('button[type="submit"]');

    // Expect redirect to home or dashboard after login
    await expect(page).not.toHaveURL(/\/login/);
  });

  test.skip('logout: should log out the user', async ({ page }) => {
    // Assumes user is already logged in (needs auth state setup)
    await page.goto('/');

    // Click logout button or link (selector depends on actual UI)
    await page.click('[data-testid="logout-button"]');

    // Expect redirect to home or login page
    await expect(page).toHaveURL(/\/(login|$)/);
  });
});
