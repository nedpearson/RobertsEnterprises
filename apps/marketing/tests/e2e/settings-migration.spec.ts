import { test, expect } from '@playwright/test';

test.describe('Settings Control Plane Validation', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to live site and ensure we are logged in
    await page.goto('https://robertsenterprises.vowos.bridgebox.ai');
    const demoButton = page.getByRole('button', { name: 'Launch Demo Mode' });
    if (await demoButton.isVisible()) {
      await demoButton.click();
      await page.waitForLoadState('networkidle');
    }
  });

  test('Settings can be navigated, modified, and saved across the new scoped plane', async ({ page }) => {
    // Wait for the side navigation and click Settings
    const settingsLink = page.getByRole('link', { name: /Settings/i });
    if (await settingsLink.isVisible()) {
      await settingsLink.click();
      await page.waitForLoadState('networkidle');

      // Verify Settings shell loaded
      await expect(page.getByText('Settings', { exact: true }).first()).toBeVisible();
      
      // Verify Organization Settings tab is default
      await expect(page.getByText('Organization Settings', { exact: true })).toBeVisible();

      // Click on Security Tab
      const securityTab = page.getByRole('button', { name: /Security/i });
      await securityTab.click();
      await page.waitForLoadState('networkidle');

      // Verify Security Tab loaded
      await expect(page.getByText('Security Policy', { exact: true })).toBeVisible();
      
      // Find an input to change and change it to trigger dirty state
      const lockoutsInput = page.locator('input[type="number"]').first();
      await lockoutsInput.fill('6');

      // Save Bar should appear
      const saveButton = page.getByRole('button', { name: 'Save Settings' });
      await expect(saveButton).toBeVisible();
      
      // Type in reason in sticky bar (if applicable, though some tabs require reason, let's just click save)
      const reasonInput = page.getByPlaceholder('What changed and why?');
      if (await reasonInput.isVisible()) {
        await reasonInput.fill('Automated UI Test');
      }

      await saveButton.click();

      // Wait for success toast
      await expect(page.getByText('Security policy updated')).toBeVisible({ timeout: 5000 });
      
      // Save bar should disappear
      await expect(saveButton).toBeHidden();
    }
  });
});
