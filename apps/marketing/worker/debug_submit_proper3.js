const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('request', req => {
    if (req.url().includes('globo')) {
       console.log('GLOBO REQUEST:', req.url(), req.method());
       console.log('GLOBO POST DATA:', req.postData());
    }
  });

  await page.goto('https://properandcompany.com/pages/request-an-appointment?nocache=' + Date.now());
  await page.waitForTimeout(3000);
  
  await page.evaluate(() => {
    // Manually trigger Globo's fetch to see what it sends, bypassing captcha
    if (window.Globo && window.Globo.FormBuilder) {
       console.log("Triggering via Globo JS");
    }
  });
  
  // Just submit
  await page.evaluate(() => {
    const inputs = document.querySelectorAll('input[type=\"text\"], input[type=\"email\"]');
    if (inputs.length > 2) {
       inputs[0].value = 'Proper Antigravity Test';
       inputs[1].value = '555-1111';
       inputs[2].value = 'propertest@example.com';
    }
  });
  
  const btn = page.locator('button.submit');
  if (await btn.count() > 0) {
    await btn.first().click();
  }
  
  await page.waitForTimeout(4000);
  await browser.close();
})();
