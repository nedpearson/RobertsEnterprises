const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const sql = fs.readFileSync('apps/marketing/supabase/migrations/20260830000000_growth_social_and_meta.sql', 'utf8');
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const page = browser.contexts()[0].pages().find(p => p.url().includes('supabase.com'));
  
  await page.evaluate((sqlText) => {
    monaco.editor.getModels()[0].setValue(sqlText);
    const buttons = Array.from(document.querySelectorAll('button'));
    const runBtn = buttons.find(b => b.innerText.includes('Run\n'));
    if (runBtn) runBtn.click();
  }, sql);
  
  await page.waitForTimeout(1000);
  
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const confirmBtn = buttons.find(b => b.innerText.includes('Run query'));
    if (confirmBtn) {
      confirmBtn.click();
      console.log('Clicked confirm');
    }
  });
  
  await page.waitForTimeout(3000);
  
  const toasts = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('[role=\"status\"], .toast')).map(t => t.innerText);
  });
  console.log('Toasts:', toasts);
  
  browser.close();
})();
