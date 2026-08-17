const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  try {
    const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
    const contexts = browser.contexts();
    let allPages = [];
    for (const ctx of contexts) { allPages.push(...ctx.pages()); }

    const sbPage = allPages.find(p => p.url().includes('settings/api-keys'));
    if (sbPage) {
      const html = await sbPage.content();
      fs.writeFileSync('C:/Users/nedpe/Downloads/roberts-enterprises-app (3)/RE/supabase_api_keys.html', html);
      
      const inputs = await sbPage.evaluate(() => {
        return Array.from(document.querySelectorAll('input, textarea')).map(i => i.value);
      });
      fs.writeFileSync('C:/Users/nedpe/Downloads/roberts-enterprises-app (3)/RE/supabase_api_keys_inputs.json', JSON.stringify(inputs));
      
      console.log("Saved HTML and inputs!");
    } else {
      console.log("No API keys page found.");
    }

    await browser.close();
    process.exit(0);
  } catch(e) { 
    console.error(e); 
    process.exit(1);
  }
})();
