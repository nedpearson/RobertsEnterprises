const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const page = browser.contexts()[0].pages().find(p => p.url().includes('supabase.com'));
  await page.evaluate(() => {
    monaco.editor.getModels()[0].setValue("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE 'growth_%';");
    const buttons = Array.from(document.querySelectorAll('button'));
    const runBtn = buttons.find(b => b.innerText.includes('Run\n'));
    if (runBtn) runBtn.click();
  });
  await page.waitForTimeout(3000);
  const results = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.rdg-cell')).map(c => c.innerText);
  });
  console.log('Results:', results);
  browser.close();
})();
