const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const page = browser.contexts()[0].pages().find(p => p.url().includes('railway.com'));
  
  await page.evaluate(() => {
    // Railway has a specific DOM structure. Click the service in the canvas first.
    const serviceNode = document.querySelector('[data-testid=\"service-node\"]');
    if (serviceNode) serviceNode.click();
  });
  
  await page.waitForTimeout(1000);
  
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button, [role=\"tab\"]'));
    const varBtn = btns.find(b => b.innerText && b.innerText.includes('Variables'));
    if (varBtn) varBtn.click();
  });
  
  await page.waitForTimeout(1000);
  
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const rawBtn = btns.find(b => b.innerText && b.innerText.includes('Raw Editor'));
    if (rawBtn) rawBtn.click();
  });
  
  await page.waitForTimeout(1000);
  
  const text = await page.evaluate(() => {
    const el = document.querySelector('textarea, [contenteditable=\"true\"]');
    return el ? el.value || el.innerText : 'not found';
  });
  console.log(text.substring(0, 500));
  browser.close();
})();
