const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  try {
    const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
    const contexts = browser.contexts();
    let allPages = [];
    for (const ctx of contexts) { allPages.push(...ctx.pages()); }

    let allJwts = [];

    for (const p of allPages) {
      if (p.url().includes('supabase')) {
         try {
           const inputVals = await p.evaluate(() => {
              return Array.from(document.querySelectorAll('input, textarea')).map(i => i.value).filter(v => typeof v === 'string' && v.startsWith('ey'));
           });
           allJwts.push(...inputVals);
           
           const text = await p.evaluate(() => document.body.innerText);
           const regex = /eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+/g;
           const matches = text.match(regex) || [];
           allJwts.push(...matches);
         } catch(e) {}
      }
    }

    allJwts = [...new Set(allJwts)];
    console.log("Found JWTs:", allJwts.length);
    for (const jwt of allJwts) {
       console.log("LENGTH", jwt.length, ":", jwt.substring(0, 50) + "...");
       if (jwt.length < 300) {
          fs.writeFileSync('C:/Users/nedpe/Downloads/roberts-enterprises-app (3)/RE/anon_key.txt', jwt);
       } else if (jwt.length > 500) {
          fs.writeFileSync('C:/Users/nedpe/Downloads/roberts-enterprises-app (3)/RE/service_role_key.txt', jwt);
       }
    }

    await browser.close();
    process.exit(0);
  } catch(e) { 
    console.error(e); 
    process.exit(1);
  }
})();
