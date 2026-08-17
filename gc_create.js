const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const page = browser.contexts()[0].pages().find(p => p.url().includes('console.cloud.google.com/apis/credentials'));
  
  // Find the Create credentials button
  const buttons = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button, a')).filter(el => el.innerText && el.innerText.includes('Create credentials')).map(el => el.innerText);
  });
  console.log('Buttons:', buttons);
  browser.close();
})();
