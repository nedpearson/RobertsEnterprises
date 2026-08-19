const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`PAGE LOG ERROR: ${msg.text()}`);
    }
  });

  page.on('pageerror', error => {
    console.log(`PAGE ERROR: ${error.message}`);
  });

  try {
    await page.goto('http://localhost:4173/demoapp', { waitUntil: 'networkidle' });
  } catch (e) {
    console.log('Navigation error:', e);
  }

  await new Promise(resolve => setTimeout(resolve, 2000));
  await browser.close();
})();
