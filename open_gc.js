const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const page = browser.contexts()[0].pages().find(p => p.url().includes('vowos.bridgebox.ai'));
  await page.evaluate(() => {
    window.open('https://console.cloud.google.com/apis/credentials?project=vowos-505818', '_blank');
  });
  console.log('Opened new tab!');
  browser.close();
})();
