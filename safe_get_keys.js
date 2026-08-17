const { chromium } = require('playwright');
(async () => {
  try {
    const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
    const contexts = browser.contexts();
    let allPages = [];
    for (const ctx of contexts) { allPages.push(...ctx.pages()); }

    const sbPage = allPages.find(p => p.url().includes('supabase.com'));
    if (!sbPage) {
      console.log("No Supabase page found!");
      process.exit(1);
    }
    console.log("Found Supabase URL:", sbPage.url());

    // Do NOT navigate. Just read the page as is!
    const text = await sbPage.evaluate(() => document.body.innerText);
    const words = text.split(/\s+/);
    const keys = words.filter(w => w.startsWith('eyJ'));

    if (keys.length === 0) {
      console.log("No keys found on screen! The user might need to click 'Reveal' or go to the API settings page.");
      
      // try looking in inputs
      const inputVals = await sbPage.evaluate(() => {
        return Array.from(document.querySelectorAll('input')).map(i => i.value).filter(v => typeof v === 'string' && v.startsWith('eyJ'));
      });
      console.log("Found in inputs:", inputVals);
    } else {
      console.log("Found keys in text!");
      for (const k of keys) {
        if (k.length < 300) console.log("ANON:", k.substring(0, 50) + "...");
        if (k.length >= 300) console.log("SERVICE_ROLE:", k.substring(0, 50) + "...");
      }
      
      // Let's actually write them to a local file so I have them safely!
      const fs = require('fs');
      fs.writeFileSync('C:/Users/nedpe/Downloads/roberts-enterprises-app (3)/RE/extracted_keys.json', JSON.stringify({keys}));
      console.log("Saved to extracted_keys.json");
    }

    await browser.close();
    process.exit(0);
  } catch(e) { 
    console.error(e); 
    process.exit(1);
  }
})();
