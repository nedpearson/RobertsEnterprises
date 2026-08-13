const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const browserURL = process.env.AGY_BROWSER_WS_URL;
  if (!browserURL) {
    console.error("No browser URL");
    return;
  }
  
  const browser = await chromium.connectOverCDP(browserURL);
  const contexts = browser.contexts();
  let supabasePage = null;
  
  for (const ctx of contexts) {
    const pages = ctx.pages();
    for (const p of pages) {
      if (p.url().includes('supabase.com/dashboard/project/') && p.url().includes('/sql/')) {
        supabasePage = p;
        break;
      }
    }
    if (supabasePage) break;
  }
  
  if (supabasePage) {
    console.log("Found Supabase SQL tab: " + supabasePage.url());
    await supabasePage.bringToFront();
    
    const sql = fs.readFileSync(path.join(__dirname, 'audit_invariants.sql'), 'utf8');
    
    await supabasePage.locator('.view-lines').first().click();
    await supabasePage.keyboard.press('Control+A');
    await supabasePage.keyboard.press('Backspace');
    await supabasePage.waitForTimeout(500); 
    
    console.log("Inserting Audit SQL...");
    await supabasePage.keyboard.insertText(sql);
    await supabasePage.waitForTimeout(1000); 
    
    const runBtn = supabasePage.getByRole('button', { name: /Run/ });
    if (await runBtn.count() > 0) {
      await runBtn.first().click();
      console.log("Executed Audit Script!");
    } else {
      await supabasePage.keyboard.press('Control+Enter');
      console.log("Executed Audit Script via shortcut!");
    }
    
    await supabasePage.waitForTimeout(2000); 
  } else {
    console.log("Supabase SQL tab not found. Please open Supabase SQL editor in the browser.");
  }
  
  await browser.disconnect();
})();
