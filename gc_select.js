const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const page = browser.contexts()[0].pages().find(p => p.url().includes('console.cloud.google.com/auth/clients/create'));
  
  // click anywhere in the div
  await page.click('text=\"Application type *\"');
  await page.waitForTimeout(1000);
  
  await page.click('text=\"Web application\"');
  await page.waitForTimeout(1000);
  
  await page.screenshot({ path: 'C:\\Users\\nedpe\\.gemini\\antigravity\\brain\\f850a3c9-317d-4db1-adb8-31fb2977846b\\scratch\\gc_selected.png' });
  browser.close();
})();
