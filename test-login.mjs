import { chromium } from 'playwright-core';

(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true
  });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  page.on('response', response => {
    if (response.status() >= 300 && response.status() <= 399) {
      console.log('Redirect:', response.url(), '->', response.headers()['location']);
    }
  });

  page.on('console', msg => console.log('BROWSER:', msg.text()));

  await page.goto('http://localhost:5173/login');
  
  await page.fill('input[type="email"]', 'nedpearson@gmail.com');
  // Guessing password or wait, I don't know the password!
  // Let's just mock it or wait, I can just inject the token into localstorage!
  
  await browser.close();
})();
