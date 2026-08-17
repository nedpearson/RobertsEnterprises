const { chromium } = require('playwright');
(async () => {
  try {
    const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
    const contexts = browser.contexts();
    
    let allPages = [];
    for (const ctx of contexts) {
      allPages.push(...ctx.pages());
    }

    const sbPage = allPages.find(p => p.url().includes('supabase.com'));
    if (sbPage) {
      console.log("Navigating to API settings...");
      await sbPage.goto('https://supabase.com/dashboard/project/yyexmcaumkzxvhplipkl/settings/api', { waitUntil: 'networkidle' });
      await sbPage.waitForTimeout(3000);
      
      const keys = await sbPage.evaluate(() => {
        const inputs = Array.from(document.querySelectorAll('input'));
        return inputs.map(i => i.value).filter(v => v.startsWith('ey'));
      });
      console.log("Keys found in inputs:", keys.length);
      if (keys.length > 0) {
        console.log("ANON:", keys.find(k => k.length < 300));
        console.log("SERVICE_ROLE:", keys.find(k => k.length >= 300));
      }
    }
    await browser.close();
  } catch(e) { console.error(e); }
})();
