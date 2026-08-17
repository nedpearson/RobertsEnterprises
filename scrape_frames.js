const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  try {
    const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
    const contexts = browser.contexts();
    
    let allJwts = [];

    for (const ctx of contexts) {
      for (const p of ctx.pages()) {
        if (p.url().includes('supabase') || p.url().includes('railway')) {
          for (const f of p.frames()) {
             try {
               const html = await f.content();
               // We look for anything that looks like a JWT
               const regex = /eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g;
               const matches = html.match(regex) || [];
               allJwts.push(...matches);
             } catch(e) {}
          }
        }
      }
    }

    allJwts = [...new Set(allJwts)];
    console.log("Found JWTs:", allJwts.length);
    for (const jwt of allJwts) {
       console.log("LEN:", jwt.length);
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
