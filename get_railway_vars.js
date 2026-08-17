const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const page = browser.contexts()[0].pages().find(p => p.url().includes('railway.com'));
  if (!page) return console.log('No railway page');
  const vars = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('pre, code, textarea')).map(el => el.innerText || el.value);
  });
  console.log(vars);
  browser.close();
})();
