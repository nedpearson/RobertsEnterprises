const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const pages = browser.contexts()[0].pages();
  const gcPage = pages.find(p => p.url().includes('console.cloud.google.com'));
  if (gcPage) {
    console.log('GC Tab URL:', gcPage.url());
  } else {
    console.log('GC Tab not found!');
  }
  browser.close();
})();
