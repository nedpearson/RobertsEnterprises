const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  try {
    const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
    const contexts = browser.contexts();
    let allPages = [];
    for (const ctx of contexts) { allPages.push(...ctx.pages()); }

    const gcPage = allPages.find(p => p.url().includes('console.cloud.google.com/apis/credentials'));
    if (!gcPage) {
      console.log("No Google Cloud Credentials page found!");
      // Let's see what IS open
      console.log("Open URLs:");
      allPages.forEach(p => console.log(p.url()));
      process.exit(1);
    }
    
    console.log("Found GC Page:", gcPage.url());

    const html = await gcPage.content();
    fs.writeFileSync('C:/Users/nedpe/Downloads/roberts-enterprises-app (3)/RE/google_cloud.html', html);
    
    // Attempt to extract client ID and secret
    const text = await gcPage.evaluate(() => document.body.innerText);
    fs.writeFileSync('C:/Users/nedpe/Downloads/roberts-enterprises-app (3)/RE/google_cloud_text.txt', text);

    const inputs = await gcPage.evaluate(() => {
        return Array.from(document.querySelectorAll('input, textarea')).map(i => i.value).filter(Boolean);
    });
    fs.writeFileSync('C:/Users/nedpe/Downloads/roberts-enterprises-app (3)/RE/google_cloud_inputs.json', JSON.stringify(inputs));

    console.log("Saved GC HTML, text, and inputs!");

    await browser.close();
    process.exit(0);
  } catch(e) { 
    console.error(e); 
    process.exit(1);
  }
})();
