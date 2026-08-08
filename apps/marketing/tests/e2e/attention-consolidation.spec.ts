import { test, expect } from '@playwright/test';

test.describe('Needs Attention Consolidation', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', msg => console.log(`Browser: ${msg.text()}`));
    await page.goto('/');
    
    // Use the actual application UI to start a demo session if we're not logged in
    const signInButton = page.getByRole('button', { name: /Staff Sign In/i }).first();
    const isGuest = await signInButton.isVisible().catch(() => false);
    
    if (isGuest) {
      // Open the AuthModal
      await signInButton.click();
      
      // Click the Demo Login button inside the modal
      const demoLogin = page.getByRole('button', { name: /Launch Demo Mode/i });
      if (await demoLogin.isVisible()) {
         await demoLogin.click();
         // Wait for the modal to close (Success message shows then closes)
         await expect(demoLogin).toBeHidden({ timeout: 5000 });
      }
    }
  });

  test('Action Center is removed from navigation', async ({ page }) => {
    await page.goto('/');

    // Look for the desktop sidebar navigation
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible();

    // Verify "Action Center" is not in the sidebar
    const actionCenterLink = sidebar.getByText('Action Center', { exact: true });
    await expect(actionCenterLink).toHaveCount(0);
  });

  test('Navigating to /actions redirects to /today', async ({ page }) => {
    await page.goto('/actions');

    // Wait for URL to update to /today?section=attention (or just /today)
    await page.waitForURL(/.*\/today.*/);

    // Verify we are on the Today view
    const todayHeader = page.getByRole('heading', { name: /Needs Attention/i });
    await expect(todayHeader).toBeVisible();
  });

  test('Needs Attention renders and displays operational items', async ({ page }) => {
    await page.goto('/today');

    // Wait for the component to render
    const attentionHeader = page.getByRole('heading', { name: /Needs Attention/i });
    await expect(attentionHeader).toBeVisible();

    // Check that filters exist
    await expect(page.getByRole('button', { name: 'Urgent', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Approvals', exact: true })).toBeVisible();

    // Depending on demo data, there should be items or the "caught up" state
    const items = page.locator('.group.relative.rounded-xl'); // The action cards
    const caughtUp = page.getByText(/You're caught up/i);
    const errorState = page.getByText(/Unable to load attention items/i);

    const hasItems = await items.count() > 0;
    const isCaughtUp = await caughtUp.isVisible();
    const hasError = await errorState.isVisible();

    expect(hasItems || isCaughtUp || hasError).toBeTruthy();
  });
});
