const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err));
  page.on('request', req => {
    if (req.url().includes('api.robertsenterprises')) console.log('VOWOS REQUEST:', req.url(), req.method());
    if (req.url().includes('form.globosoftware.net')) console.log('GLOBO REQUEST:', req.url(), req.method());
  });
  page.on('requestfailed', req => {
    if (req.url().includes('api.robertsenterprises')) console.log('VOWOS FAILED:', req.url(), req.failure());
  });

  await page.goto('https://properandcompany.com/pages/request-an-appointment?nocache=' + Date.now());
  await page.waitForTimeout(3000);
  
  const formsCount = await page.locator('form').count();
  console.log('Number of forms:', formsCount);
  
  const content = await page.content();
  console.log('Has custom script:', content.includes('api.robertsenterprises.bridgebox.ai'));
  
  await page.evaluate(() => {
    const inputs = document.querySelectorAll('input[type="text"], input[type="email"]');
    if (inputs.length > 2) {
       inputs[0].value = 'Antigravity Test 2';
       inputs[1].value = '555-0000';
       inputs[2].value = 'test2@example.com';
    }
  });
  
  const btn = page.locator('button.submit');
  if (await btn.count() > 0) {
    await btn.first().click();
  }
  
  await page.waitForTimeout(4000);
  await browser.close();
})();
