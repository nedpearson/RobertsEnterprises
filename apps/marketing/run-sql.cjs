const { chromium } = require('playwright');
const fs = require('fs');

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
    
    // Bring page to front
    await supabasePage.bringToFront();
    
    // Read the SQL file
    const sql = fs.readFileSync('supabase/migrations/20260806000000_scheduling_transactions.sql', 'utf8');
    
    // Focus the editor
    await supabasePage.locator('.view-lines').first().click();
    
    // Select all and delete
    await supabasePage.keyboard.press('Control+A');
    await supabasePage.keyboard.press('Backspace');
    await supabasePage.waitForTimeout(500); // give it a moment to clear
    
    // Insert the correct SQL
    console.log("Inserting SQL...");
    await supabasePage.keyboard.insertText(sql);
    await supabasePage.waitForTimeout(1000); // wait for monaco to register
    
    // Click the Run button. It might have text "Run Ctrl+Enter" or similar.
    console.log("Clicking Run...");
    const runBtn = supabasePage.getByRole('button', { name: /Run/ });
    if (await runBtn.count() > 0) {
      await runBtn.first().click();
      console.log("Clicked Run!");
    } else {
      console.log("Could not find the Run button. Pressing Ctrl+Enter instead.");
      await supabasePage.keyboard.press('Control+Enter');
    }
    
    await supabasePage.waitForTimeout(2000); // Wait to see result
  } else {
    console.log("Supabase SQL tab not found. Found the following tabs:");
    for (const ctx of contexts) {
      for (const p of ctx.pages()) {
        console.log("- " + p.url());
      }
    }
  }
  
  await browser.close();
})();
