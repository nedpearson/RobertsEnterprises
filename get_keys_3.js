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
      console.log("Clicking Reveal buttons...");
      const buttons = await sbPage.$$('button');
      for (const btn of buttons) {
        const text = await btn.textContent();
        if (text && text.includes('Reveal')) {
          await btn.click();
        }
      }
      await sbPage.waitForTimeout(2000);
      
      const text = await sbPage.evaluate(() => document.body.innerText);
      // find words starting with eyJ
      const words = text.split(/\s+/);
      const keys = words.filter(w => w.startsWith('eyJ'));
      
      console.log("Keys found in text:", keys.length);
      if (keys.length > 0) {
        console.log("ANON:", keys.find(k => k.length < 300));
        console.log("SERVICE_ROLE:", keys.find(k => k.length >= 300));
      }
    }
    await browser.close();
  } catch(e) { console.error(e); }
})();
