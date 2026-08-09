import { test, expect } from '@playwright/test';

test.describe('Settings UI Crawler', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate directly to Settings to trigger the "Settings is staff-only" view
    await page.goto('https://robertsenterprises.bridgebox.ai/settings');
    
    // Check if we need to log in
    const signInButton = page.getByRole('button', { name: 'Staff Sign In', exact: true }).first();
    if (await signInButton.isVisible()) {
      await signInButton.click();
      
      // Wait for Auth Modal
      const demoButton = page.getByRole('button', { name: 'Launch Demo Mode' });
      await demoButton.waitFor({ state: 'visible', timeout: 5000 });
      await demoButton.click();
      
      // Wait for the modal to close and the page to reload into the Settings shell
      await expect(page.locator('div[data-tour-id="card-settings-active"]')).toBeVisible({ timeout: 15000 });
    }
  });

  test('Crawls all Settings tabs and verifies no React crashes occur', async ({ page }) => {
    test.setTimeout(120000); // This test navigates through 24 tabs, give it 2 minutes

    const TABS = [
      'organization', 'locations', 'payments', 'booking', 'scheduling', 
      'alterations', 'sales', 'commission', 'inventory', 'purchasing', 
      'transfers', 'communications', 'automations', 'notifications', 
      'documents', 'integrations', 'reporting', 'security', 'data', 
      'audit', 'system-health', 'feature-flags', 'ai-models'
    ];

    console.log(`Crawling ${TABS.length} settings tabs...`);

    // Iterate over every tab via page.goto
    for (const tab of TABS) {
      console.log(`Crawling tab: ${tab}`);

      // Navigate to the tab directly
      await page.goto(`https://robertsenterprises.bridgebox.ai/settings?tab=${tab}`);
      
      // Wait for the content card to be visible (this means React rendered successfully)
      const contentCard = page.locator('div[data-tour-id="card-settings-active"]');
      await expect(contentCard).toBeVisible({ timeout: 15000 });

      // Verify that the React ErrorBoundary did NOT catch a fatal error
      const errorBoundary = page.getByText('Something went wrong');
      await expect(errorBoundary).toBeHidden();
    }
    
    console.log(`Successfully crawled ${TABS.length} settings tabs with zero crashes.`);
  });
});
