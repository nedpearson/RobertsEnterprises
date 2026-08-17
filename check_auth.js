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
      console.log("Supabase URL:", sbPage.url());
      const html = await sbPage.content();
      if (html.includes('Sign In') || html.includes('password') || html.includes('Login')) {
        console.log("Supabase is on login screen!");
      } else {
        console.log("Supabase seems logged in!");
      }
    }
    const rwPage = allPages.find(p => p.url().includes('railway'));
    if (rwPage) {
      console.log("Railway URL:", rwPage.url());
      const html = await rwPage.content();
      if (html.includes('Sign In') || html.includes('Log in') || html.includes('404')) {
        console.log("Railway is on login screen or 404!");
      } else {
        console.log("Railway seems logged in!");
      }
    }
    await browser.close();
  } catch(e) { console.error(e); }
})();
