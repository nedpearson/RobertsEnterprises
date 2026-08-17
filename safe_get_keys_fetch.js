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

    // Evaluate a fetch request to the internal Supabase API to get the keys
    const result = await sbPage.evaluate(async () => {
      try {
        const ref = 'yyexmcaumkzxvhplipkl';
        const res = await fetch(`https://api.supabase.io/v1/projects/${ref}/api-keys`, {
          credentials: 'omit' // actually, it might need to be include, but usually the dashboard uses a bearer token stored in localStorage
        });
        
        // Let's try grabbing the token from localStorage first!
        let token = null;
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key.includes('token') || key.includes('auth')) {
             try {
                const val = JSON.parse(localStorage.getItem(key));
                if (val && val.token) token = val.token;
                if (val && val.access_token) token = val.access_token;
             } catch(e) {}
          }
        }
        
        // Alternatively, if it's cookie based:
        const res2 = await fetch(`https://api.supabase.com/v1/projects/${ref}/api-keys`, {
           headers: {
              'Content-Type': 'application/json'
           }
        });
        if (res2.ok) return await res2.json();

        // Let's just try to navigate via JS, it might be safer than page.goto
        return { error: 'Fetch failed', status: res2.status };
      } catch (e) {
        return { error: e.toString() };
      }
    });

    console.log("API Result:", result);

    await browser.close();
    process.exit(0);
  } catch(e) { 
    console.error(e); 
    process.exit(1);
  }
})();
