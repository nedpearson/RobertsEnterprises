const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const page = browser.contexts()[0].pages().find(p => p.url().includes('console.cloud.google.com/auth/clients/create'));
  
  const html = await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('*')).filter(e => e.innerText && e.innerText.includes('Application type *'));
    return els.map(e => e.outerHTML).slice(-1)[0]; // get the innermost one
  });
  console.log(html.substring(0, 500));
  browser.close();
})();
