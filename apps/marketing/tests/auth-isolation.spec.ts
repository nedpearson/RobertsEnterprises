import { test, expect } from '@playwright/test';

test.describe('Dual-Data Plane Authentication & Isolation', () => {
  
  test('Demo user should see DEMO MODE banner when logged in', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    
    // Sign out if currently signed in to get a clean state
    const signOutBtn = page.locator('button:has-text("Sign out")').first();
    if (await signOutBtn.isVisible()) {
      await signOutBtn.click();
      await page.waitForTimeout(500); // short wait for state to clear
    }
    
    // Open Auth Modal if locked panel or sign in button is visible
    const staffSignInBtn = page.locator('button:has-text("Staff Sign In")').first();
    const signInBtn = page.getByRole('button', { name: 'Sign In', exact: true }).first();
    
    if (await staffSignInBtn.isVisible()) {
      await staffSignInBtn.click();
    } else if (await signInBtn.isVisible()) {
      await signInBtn.click();
    }
    
    // Click Launch Demo Mode button
    const launchBtn = page.locator('button:has-text("Launch Demo Mode")');
    await expect(launchBtn).toBeVisible({ timeout: 5000 });
    await launchBtn.click();
    
    // Wait for the modal to close and the banner to appear
    const banner = page.locator('.bg-amber-500:has-text("DEMO MODE")');
    await expect(banner).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=SYNTHETIC DATA')).toBeVisible();
  });

  test('Production user should NOT see DEMO MODE banner', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    
    // Sign out if currently signed in to get a clean state
    const signOutBtn = page.locator('button:has-text("Sign out")').first();
    if (await signOutBtn.isVisible()) {
      await signOutBtn.click();
      await page.waitForTimeout(500); // short wait for state to clear
    }
    
    // Banner should be hidden by default
    const banner = page.locator('.bg-amber-500:has-text("DEMO MODE")');
    await expect(banner).toBeHidden();
  });
  
});
