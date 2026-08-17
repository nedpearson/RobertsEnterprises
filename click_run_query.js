const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const page = browser.contexts()[0].pages().find(p => p.url().includes('supabase.com'));
  
  await page.click('text=\"Run query\"');
  console.log('Clicked!');
  
  await page.waitForTimeout(3000);
  browser.close();
})();
