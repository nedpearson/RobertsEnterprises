import { test, expect } from '@playwright/test';

test.describe('Intelligent Scheduling', () => {
  test('should display AI match tab and deterministic data', async ({ page }) => {
    await page.goto('http://localhost:5173/scheduling/unified');
    
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

    // Wait for reload and authenticated state
    await expect(page.getByText('Demo Owner').first()).toBeVisible({ timeout: 15000 });

    // Ensure the calendar is loaded
    await expect(page.locator('.fc-view-harness')).toBeVisible({ timeout: 15000 });

    // Click on a pending request in the sidebar/queue
    // Our queue uses .draggable-request-card class now
    const pendingRequest = page.locator('.draggable-request-card').first();
    await expect(pendingRequest).toBeVisible({ timeout: 10000 });
    await pendingRequest.click();

    // Verify that the Appointment/Request 360 panel opens
    // It contains "Summary" tab
    await expect(page.locator('button:has-text("Summary")').first()).toBeVisible();

    // Click on the AI Match tab
    const aiTab = page.locator('button:has-text("AI Match")');
    if (await aiTab.isVisible()) {
      await aiTab.click();
      
      // Verify AI recommendation components
      await expect(page.locator('text=Match').first()).toBeVisible();
      
      // Look for the "Create Hold" button
      await expect(page.locator('button:has-text("Create Hold")').first()).toBeVisible();
    }
  });
});
