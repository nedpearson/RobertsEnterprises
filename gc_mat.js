const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const page = browser.contexts()[0].pages().find(p => p.url().includes('console.cloud.google.com/auth/clients/create'));
  
  const text = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('mat-select')).map(el => el.outerHTML);
  });
  console.log(text);
  browser.close();
})();
