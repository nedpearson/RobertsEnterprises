const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const page = browser.contexts()[0].pages().find(p => p.url().includes('supabase.com'));
  await page.evaluate(() => {
    document.querySelector('a[href=' + JSON.stringify('/dashboard/project/yyexmcaumkzxvhplipkl/sql') + ']').click();
  });
  await page.waitForTimeout(2000);
  const url = page.url();
  console.log(url);
  browser.close();
})();
