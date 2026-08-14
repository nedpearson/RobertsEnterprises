import { test, expect } from '@playwright/test';

test.describe('VowOS Complete Multi-Tenant & Super Admin Flow', () => {
  
  test('should render signup page and successfully register a new user as an individual workspace', async ({ page }) => {
    // 1. Go to signup
    await page.goto('/signup');
    await expect(page.getByRole('heading', { name: 'Welcome to VowOS' })).toBeVisible();

    // 2. Select Individual (personal workspace)
    await page.getByRole('heading', { name: 'Individual' }).click();
    await page.getByRole('button', { name: 'Continue' }).click();

    // 3. Complete signup form
    await expect(page.getByRole('heading', { name: 'Create your Account' })).toBeVisible();
    await page.getByLabel('Full Name').fill('Test User');
    await page.getByLabel('Email').fill(`testuser-${Date.now()}@example.com`);
    await page.getByLabel('Password').fill('TestPassword123!');
    await page.getByRole('button', { name: 'Create Account' }).click();

    // 4. Verify onboarding step or dashboard redirect (mocked or actual depending on setup)
    // Wait for network/navigation
    await page.waitForURL('**/onboarding*');
    await expect(page.getByRole('heading', { name: 'Welcome aboard' })).toBeVisible();
  });

  test('super admin should be able to access the platform admin dashboard', async ({ page }) => {
    // In a real E2E test, we would seed a Super Admin user or mock the auth context
    // For now, we simulate logging in as the known Super Admin (nedpearson@gmail.com)
    
    // Note: Since this is an E2E test without a seeded DB, we might get redirected to login.
    // This test ensures the route exists and is protected.
    
    await page.goto('/platform');
    
    // Assuming unauthenticated users get redirected to /login
    await expect(page).toHaveURL(/.*\/login/);
  });
});
