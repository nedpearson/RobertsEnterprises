const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const page = browser.contexts()[0].pages().find(p => p.url().includes('console.cloud.google.com/apis/credentials'));
  
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('a, span, div')).find(el => el.innerText === 'OAuth client ID');
    if (btn) btn.click();
  });
  
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'C:\\Users\\nedpe\\.gemini\\antigravity\\brain\\f850a3c9-317d-4db1-adb8-31fb2977846b\\scratch\\gc_oauth.png' });
  browser.close();
})();
