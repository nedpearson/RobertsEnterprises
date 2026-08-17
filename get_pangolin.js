const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const page = browser.contexts()[0].pages().find(p => p.url().includes('console.cloud.google.com/auth/clients/create'));
  
  const frame = page.frames().find(f => f.url().includes('pangolin'));
  if (frame) {
    const html = await frame.evaluate(() => document.body.innerHTML);
    require('fs').writeFileSync('pangolin.html', html);
  }
  browser.close();
})();
