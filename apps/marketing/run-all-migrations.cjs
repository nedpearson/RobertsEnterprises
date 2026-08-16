const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const browserURL = 'http://localhost:9222';
  
  let browser;
  try {
    browser = await chromium.connectOverCDP(browserURL);
  } catch (err) {
    console.error("Failed to connect to Chrome on port 9222. Please make sure you have restarted Chrome using Launch_Chrome_Debugging.bat!");
    return;
  }
  
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
  
  if (!supabasePage) {
    console.error("Supabase SQL tab not found! Please open your Supabase project's SQL Editor (e.g. any SQL query tab) in Chrome first.");
    await browser.disconnect();
    return;
  }
  
  console.log("Found Supabase SQL tab: " + supabasePage.url());
  await supabasePage.bringToFront();
  
  // Get all migrations
  const migrationsDir = path.join(__dirname, 'supabase', 'migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql') && f >= '20260810000000_')
    .sort();
  
  console.log(`Found ${files.length} migrations to run.`);
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    console.log(`[${i + 1}/${files.length}] Running migration: ${file}...`);
    
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    
    // Focus the editor
    await supabasePage.locator('.view-lines').first().click();
    
    // Select all and delete
    await supabasePage.keyboard.press('Control+A');
    await supabasePage.keyboard.press('Backspace');
    await supabasePage.waitForTimeout(500);
    
    // Insert SQL
    await supabasePage.keyboard.insertText(sql);
    await supabasePage.waitForTimeout(1500); // Wait for editor syntax highlighting/parsing
    
    // Click the Run button
    const runBtn = supabasePage.getByRole('button', { name: /Run/ });
    if (await runBtn.count() > 0) {
      await runBtn.first().click();
      console.log("Clicked Run button.");
    } else {
      console.log("Pressing Ctrl+Enter to execute.");
      await supabasePage.keyboard.press('Control+Enter');
    }
    
    // Wait for execution to finish (5 seconds per migration is usually safe)
    await supabasePage.waitForTimeout(5000);
  }
  
  console.log("🎉 All migrations executed successfully!");
  await browser.disconnect();
})();
