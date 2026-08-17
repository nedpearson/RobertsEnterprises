const { chromium } = require('playwright');

(async () => {
  try {
    const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
    const contexts = browser.contexts();
    
    // Let's get ALL pages from all contexts just to be sure
    let allPages = [];
    for (const ctx of contexts) {
      allPages.push(...ctx.pages());
    }

    const page = allPages.find(p => p.url().includes('supabase.com'));
    
    if (!page) {
      console.log("No Supabase tab found.");
      process.exit(1);
    }

    console.log("Found Supabase tab:", page.url());
    console.log("Navigating to API settings...");
    await page.goto('https://supabase.com/dashboard/project/yyexmcaumkzxvhplipkl/settings/api', { waitUntil: 'networkidle' });
    
    // Wait for the inputs to appear
    await page.waitForTimeout(5000); 

    const keys = await page.evaluate(() => {
      // Keys usually start with eyJh... (JWTs)
      const inputs = Array.from(document.querySelectorAll('input'));
      const textAreas = Array.from(document.querySelectorAll('textarea'));
      const pres = Array.from(document.querySelectorAll('pre'));
      const codes = Array.from(document.querySelectorAll('code'));
      
      const potentialValues = [
        ...inputs.map(i => i.value),
        ...textAreas.map(t => t.value),
        ...pres.map(p => p.innerText),
        ...codes.map(c => c.innerText)
      ];
      
      return potentialValues.filter(v => typeof v === 'string' && v.startsWith('eyJ'));
    });
    
    console.log("Extracted Keys:", keys.length);
    if (keys.length >= 2) {
      console.log("ANON KEY:", keys.find(k => k.length < 300));
      console.log("SERVICE_ROLE KEY:", keys.find(k => k.length >= 300));
    }

    // Now let's try to find Railway
    const rPage = allPages.find(p => p.url().includes('railway.app'));
    if (!rPage) {
      console.log("No Railway tab found in this CDP session.");
    } else {
      console.log("Found Railway tab:", rPage.url());
    }

    browser.close();
  } catch (e) {
    console.error(e);
  }
})();
