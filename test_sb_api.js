const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const page = browser.contexts()[0].pages().find(p => p.url().includes('supabase.com'));
  if (!page) { console.log('no supabase tab'); process.exit(0); }
  const res = await page.evaluate(async () => {
    try {
      const r = await fetch('/api/projects/yyexmcaumkzxvhplipkl/snippets');
      return await r.json();
    } catch(e) { return e.toString(); }
  });
  console.log(res);
  browser.close();
})();
