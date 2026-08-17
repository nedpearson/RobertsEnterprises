const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const page = browser.contexts()[0].pages().find(p => p.url().includes('supabase.com'));
  const links = await page.evaluate(() => Array.from(document.querySelectorAll('a')).map(a => a.href));
  console.log(links.filter(l => l.includes('sql')));
  browser.close();
})();
