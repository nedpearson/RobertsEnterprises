const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const page = browser.contexts()[0].pages().find(p => p.url().includes('console.cloud.google.com/auth/clients/create'));
  
  for (const frame of page.frames()) {
    try {
      const el = await frame.$("cfc-select");
      if (el) {
        console.log('Found cfc-select in frame:', frame.url());
        await el.click();
        console.log('Clicked!');
        break;
      }
    } catch(e) {}
  }
  
  await page.waitForTimeout(1000);
  
  for (const frame of page.frames()) {
    try {
      // The options are usually inside mat-option or something similar.
      const el = await frame.$("text='Web application'");
      if (el) {
        await el.click();
        console.log('Clicked Web application');
        break;
      }
    } catch(e) {}
  }
  
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'C:\\Users\\nedpe\\.gemini\\antigravity\\brain\\f850a3c9-317d-4db1-adb8-31fb2977846b\\scratch\\gc_frame_click.png' });
  browser.close();
})();
