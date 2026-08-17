const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const sql1 = fs.readFileSync('apps/marketing/supabase/migrations/20260829000000_growth_foundation.sql', 'utf8');
  const sql2 = fs.readFileSync('apps/marketing/supabase/migrations/20260830000000_growth_social_and_meta.sql', 'utf8');
  const sql = sql1 + '\n\n' + sql2;
  
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const page = browser.contexts()[0].pages().find(p => p.url().includes('supabase.com'));
  
  await page.evaluate((sqlText) => {
    monaco.editor.getModels()[0].setValue(sqlText);
    const buttons = Array.from(document.querySelectorAll('button'));
    const runBtn = buttons.find(b => b.innerText.includes('Run\n'));
    if (runBtn) runBtn.click();
  }, sql);
  
  await page.waitForTimeout(1000);
  await page.click('text=\"Run query\"').catch(()=>console.log('No confirm needed'));
  
  await page.waitForTimeout(5000);
  await page.screenshot({ path: 'C:\\Users\\nedpe\\.gemini\\antigravity\\brain\\f850a3c9-317d-4db1-adb8-31fb2977846b\\scratch\\supabase_sql_result2.png' });
  browser.close();
})();
