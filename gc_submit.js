const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const page = browser.contexts()[0].pages().find(p => p.url().includes('console.cloud.google.com/auth/clients/create'));
  
  for (const frame of page.frames()) {
    try {
      // Find the input that has value or placeholder containing 'example.com' or just the last input
      const inputs = await frame.$$('input');
      if (inputs.length > 2) { // ensure we are in the right frame
        const lastInput = inputs[inputs.length - 1];
        await lastInput.fill('https://vowos.bridgebox.ai/api/growth/callback');
        console.log('Filled URI');
        
        // Scroll down to find the create button
        await frame.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(500);
        
        // Click Create button. Sometimes it is `button[type="submit"]` or has text "Create"
        const createBtn = await frame.$("button:has-text('Create')");
        if (createBtn) {
          await createBtn.click();
          console.log('Clicked Create');
        } else {
          console.log('Create button not found, falling back to finding by span');
          const spanBtn = await frame.$("span:has-text('Create')");
          if (spanBtn) await spanBtn.click();
        }
        break;
      }
    } catch(e) {
      console.log(e);
    }
  }
  
  await page.waitForTimeout(4000);
  await page.screenshot({ path: 'C:\\Users\\nedpe\\.gemini\\antigravity\\brain\\f850a3c9-317d-4db1-adb8-31fb2977846b\\scratch\\gc_submitted.png' });
  browser.close();
})();
