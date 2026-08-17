const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const page = browser.contexts()[0].pages().find(p => p.url().includes('railway.com'));
  const html = await page.content();
  require('fs').writeFileSync('railway_html.html', html);
  browser.close();
})();
