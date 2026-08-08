import { test, expect } from '@playwright/test';

test.describe('Settings Control Plane End-to-End', () => {
  test.beforeEach(async ({ page }) => {
    // 1) Go to app root
    await page.goto('/');

    // 2) Log in as Owner to access settings
    await page.click('button:has-text("Staff Sign In")');
    await page.fill('input[placeholder="name@example.com"]', 'owner@example.com');
    await page.fill('input[placeholder="••••••••"]', 'admin123');
    await page.click('button:has-text("Sign In")');

    // 3) Navigate to Settings view via Sidebar
    await page.click('nav a:has-text("Settings")');
  });

  test('can navigate tabs and save Settings correctly', async ({ page }) => {
    // Wait for settings page to load
    await expect(page.locator('h2', { hasText: 'Organization Settings' })).toBeVisible();

    // 1) Check Data Settings
    await page.click('a:has-text("Data & Import")');
    await expect(page.locator('h2', { hasText: 'Data Portability & Retention' })).toBeVisible();

    // Export toggle should be visible
    await expect(page.locator('text=Self-Service Export')).toBeVisible();

    // 2) Check Security Settings
    await page.click('a:has-text("Security Policy")');
    await expect(page.locator('h2', { hasText: 'Access & Password Policy' })).toBeVisible();

    // Try changing lockout attempts
    const lockoutInput = page.locator('input[type="number"]').first();
    await lockoutInput.fill('6');
    await page.click('button:has-text("Save Changes")');
    await expect(page.locator('text=Security settings saved')).toBeVisible();

    // 3) Check that Mock placeholders are gone
    await page.click('a:has-text("System Health")');
    await expect(page.locator('h2', { hasText: 'Owner System Administrations' })).toBeVisible();
    await expect(page.locator('text=Run Health Check')).toBeVisible();
    
    // Check Audit logs
    await page.click('a:has-text("Audit Log")');
    await expect(page.locator('h2', { hasText: 'Immutable Audit Logs' })).toBeVisible();
    await expect(page.locator('text=Loading audit history')).toBeVisible(); // Check loading state briefly or table
  });

  test('CommissionSettings are dynamic and save correctly', async ({ page }) => {
    // Go to Commission Settings
    await page.click('a:has-text("Commission Plans")');
    await expect(page.locator('h2', { hasText: 'Compensation & Commission Policies' })).toBeVisible();

    // Edit commission rate
    const rateInput = page.locator('input[type="number"]').first();
    await rateInput.fill('4.5');
    await page.click('button:has-text("Save Changes")');

    await expect(page.locator('text=Commission settings saved')).toBeVisible();
  });
});
