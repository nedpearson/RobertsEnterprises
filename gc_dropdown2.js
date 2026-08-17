const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const page = browser.contexts()[0].pages().find(p => p.url().includes('console.cloud.google.com/auth/clients/create'));
  
  const html = await page.evaluate(() => {
    const el = document.querySelector('mat-select, select, [role=\"combobox\"], [aria-label=\"Application type\"]');
    return el ? el.outerHTML : 'not found';
  });
  console.log(html);
  browser.close();
})();
