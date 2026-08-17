const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const page = browser.contexts()[0].pages().find(p => p.url().includes('console.cloud.google.com/auth/clients/create'));
  
  for (const frame of page.frames()) {
    try {
      // Find both ADD URI buttons
      const btns = await frame.$$("text='+ Add URI'");
      if (btns.length >= 2) {
        // Click the second one (under Authorized redirect URIs)
        await btns[1].click();
        console.log('Clicked second Add URI button');
        
        await page.waitForTimeout(500);
        
        // Find the newly added input field. It's usually empty and near the bottom.
        // Let's just find the last input field of type text or url.
        const inputs = await frame.$$("input[type='text'], input[type='url']");
        const lastInput = inputs[inputs.length - 1];
        
        await lastInput.fill('https://vowos.bridgebox.ai/api/growth/callback');
        console.log('Filled URI');
        
        // Click Create button
        const createBtn = await frame.$("text='Create'");
        if (createBtn) {
          await createBtn.click();
          console.log('Clicked Create');
        } else {
          console.log('Create button not found');
        }
        break;
      }
    } catch(e) {}
  }
  
  await page.waitForTimeout(4000);
  await page.screenshot({ path: 'C:\\Users\\nedpe\\.gemini\\antigravity\\brain\\f850a3c9-317d-4db1-adb8-31fb2977846b\\scratch\\gc_created.png' });
  browser.close();
})();
