import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.describe('VowOS Visual Regression Tests', () => {
  const artifactDir = 'C:/Users/nedpe/.gemini/antigravity/brain/d0311e8b-b831-4579-8b20-46de076c9cce/.user_uploaded/';

  // Viewports defined by user
  const viewports = [
    { name: 'desktop-1440', width: 1440, height: 900 },
    { name: 'desktop-1366', width: 1366, height: 768 },
    { name: 'tablet-768', width: 768, height: 1024 },
    { name: 'mobile-390', width: 390, height: 844 }
  ];

  for (const vp of viewports) {
    test(`Capture dashboard at ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      // Go to the local dev server
      await page.goto('http://localhost:5173');
      
      // Wait for React to mount the app-container
      await page.waitForSelector('.app-container', { timeout: 10000 });

      // If we are at the login screen, we need to click "Demo/Staff Access"
      const isLogin = await page.locator('.login-container').count() > 0;
      if (isLogin) {
        // Find the generic Demo button that bypasses login
        const buttons = await page.locator('button');
        const count = await buttons.count();
        for (let i = 0; i < count; i++) {
          const text = await buttons.nth(i).innerText();
          if (text.includes('Demo') || text.includes('Staff')) {
            await buttons.nth(i).click();
            break;
          }
        }
      }
      
      // Wait for dashboard hero banner
      await page.waitForSelector('text=Good evening', { timeout: 10000 });

      // Save screenshot
      const filename = path.join(artifactDir, `vowos-2026-08-03-reference-${vp.name}.png`);
      await page.screenshot({ path: filename, fullPage: true });
    });
  }
});
