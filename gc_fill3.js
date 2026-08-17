const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const page = browser.contexts()[0].pages().find(p => p.url().includes('console.cloud.google.com/auth/clients/create'));
  
  for (const frame of page.frames()) {
    try {
      const btns = await frame.$$("text='Add URI'");
      if (btns.length >= 2) {
        await btns[1].click();
        console.log('Clicked Add URI');
        
        await page.waitForTimeout(500);
        
        const inputs = await frame.$$("input[type='text'], input[type='url']");
        const lastInput = inputs[inputs.length - 1];
        await lastInput.fill('https://vowos.bridgebox.ai/api/growth/callback');
        console.log('Filled URI');
        
        const createBtns = await frame.$$("text='Create'");
        // The Create button at the bottom of the page
        const createBtn = createBtns[createBtns.length - 1];
        if (createBtn) {
          await createBtn.click();
          console.log('Clicked Create');
        }
        break;
      }
    } catch(e) {}
  }
  
  await page.waitForTimeout(4000);
  await page.screenshot({ path: 'C:\\Users\\nedpe\\.gemini\\antigravity\\brain\\f850a3c9-317d-4db1-adb8-31fb2977846b\\scratch\\gc_created.png' });
  browser.close();
})();
