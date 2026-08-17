const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const page = browser.contexts()[0].pages().find(p => p.url().includes('supabase.com'));
  const hasMonaco = await page.evaluate(() => typeof monaco !== 'undefined');
  console.log('hasMonaco:', hasMonaco);
  browser.close();
})();
