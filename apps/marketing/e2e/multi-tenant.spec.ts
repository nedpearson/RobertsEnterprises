import { test, expect } from '@playwright/test';

test.describe('VowOS Multi-Tenant Architecture', () => {
  test('should render the signup page and allow selecting business vs individual', async ({ page }) => {
    // Navigate to signup
    await page.goto('/signup');

    // Check heading
    await expect(page.getByRole('heading', { name: 'Welcome to VowOS' })).toBeVisible();

    // Check options
    const businessCard = page.locator('text=BusinessFor companies, stores, teams and organizations.');
    const individualCard = page.locator('text=IndividualFor independent professionals and owner/operators.');
    
    await expect(businessCard).toBeVisible();
    await expect(individualCard).toBeVisible();

    // Select Business
    await page.getByRole('heading', { name: 'Business' }).click();
    await page.getByRole('button', { name: 'Continue' }).click();

    // Should see Business form
    await expect(page.getByRole('heading', { name: 'Create your Business Account' })).toBeVisible();
    await expect(page.getByLabel('Business Name')).toBeVisible();
  });

  test('should restrict platform-admin routes to unauthorized users', async ({ page }) => {
    // Attempt to navigate to platform admin without login
    await page.goto('/platform-admin');

    // Should redirect to login or show unauthorized (assuming it redirects)
    // Note: since our PlatformAdmin does an RPC check, it will redirect to /login
    await expect(page).toHaveURL(/.*\/login/);
  });
});
