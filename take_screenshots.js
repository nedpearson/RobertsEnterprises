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
      await sbPage.screenshot({ path: 'C:/Users/nedpe/.gemini/antigravity/brain/f850a3c9-317d-4db1-adb8-31fb2977846b/scratch/supabase.png' });
    }
    
    const rwPage = allPages.find(p => p.url().includes('railway'));
    if (rwPage) {
      await rwPage.screenshot({ path: 'C:/Users/nedpe/.gemini/antigravity/brain/f850a3c9-317d-4db1-adb8-31fb2977846b/scratch/railway.png' });
    }
    await browser.close();
  } catch(e) { console.error(e); }
})();
