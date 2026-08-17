const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const page = browser.contexts()[0].pages().find(p => p.url().includes('console.cloud.google.com/auth/clients/create'));
  
  for (let i=0; i<page.frames().length; i++) {
    const frame = page.frames()[i];
    try {
      const html = await frame.evaluate(() => document.body.innerHTML);
      require('fs').writeFileSync(`frame_${i}.html`, html);
    } catch(e) {}
  }
  browser.close();
})();
