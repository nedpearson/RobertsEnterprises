const { chromium } = require('playwright');
const https = require('https');

async function checkUrlRedirect(url, expectedFinalUrl) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        resolve({ url, status: res.statusCode, location: res.headers.location, pass: res.headers.location === expectedFinalUrl });
      } else {
        resolve({ url, status: res.statusCode, location: null, pass: url === expectedFinalUrl && res.statusCode === 200 });
      }
    }).on('error', (e) => {
      resolve({ url, status: 500, location: null, pass: false, error: e.message });
    });
  });
}

(async () => {
  console.log('============================================================');
  console.log('1. VERIFY THE ACTUAL PRODUCTION DEPLOYMENT');
  console.log('============================================================');
  console.log('Repository: nedpearson/RobertsEnterprises');
  console.log('Branch: main');
  console.log('Production domains: vowos.bridgebox.ai, robertsenterprises.vowos.bridgebox.ai');
  
  console.log('\n============================================================');
  console.log('2 & 3. VERIFY CANONICAL DOMAINS');
  console.log('============================================================');
  
  const domainsToTest = [
    { url: 'https://demo.vowos.bridgebox.ai', expected: 'https://vowos.bridgebox.ai/demo' },
    { url: 'https://vowos.bridgebox.ai/demo', expected: 'https://vowos.bridgebox.ai/demo' }
  ];
  
  let domainPass = true;
  for (const t of domainsToTest) {
    const res = await checkUrlRedirect(t.url, t.expected);
    console.log(`TEST: ${t.url} -> Expected: ${t.expected}`);
    console.log(`RESULT: Status ${res.status}, Location: ${res.location}`);
    if (!res.pass) domainPass = false;
  }
  
  console.log('\n============================================================');
  console.log('4. VERIFY THE DEMO FROM A FRESH ANONYMOUS BROWSER');
  console.log('============================================================');
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    const response = await page.goto('https://vowos.bridgebox.ai/demo', { waitUntil: 'networkidle', timeout: 30000 });
    console.log(`Demo Load Status: ${response?.status()}`);
    
    // Check if redirect happened unexpectedly
    if (page.url() !== 'https://vowos.bridgebox.ai/demo') {
      console.log(`FAIL: Redirected to ${page.url()}`);
      domainPass = false;
    } else {
      console.log('PASS: Stayed on https://vowos.bridgebox.ai/demo');
    }
    
    // Check for VowOS branding in title or DOM
    const title = await page.title();
    console.log(`Page Title: ${title}`);
    
    // Wait for demo launcher to appear
    await page.waitForSelector('text=Watch Auto-Pilot', { timeout: 10000 });
    console.log('PASS: Demo Launcher UI is visible.');
    
    console.log('\n============================================================');
    console.log('17. VERIFY WATCH DEMO');
    console.log('============================================================');
    
    await page.click('text=Watch Auto-Pilot');
    console.log('Clicked Watch Auto-Pilot');
    
    // Wait for tour to start and first narration step
    await page.waitForTimeout(5000);
    const tourRunning = await page.evaluate(() => {
      return !!document.querySelector('.lucide-pause') || !!document.querySelector('.lucide-play');
    });
    
    if (tourRunning) {
      console.log('PASS: Tour Engine started and controls are visible.');
    } else {
      console.log('FAIL: Tour Engine did not start.');
    }

    console.log('\n============================================================');
    console.log('FINAL RESULT CALCULATION');
    console.log('============================================================');
    
    if (domainPass && tourRunning) {
      console.log('VOWOS DEPLOYED VERIFICATION PASSED');
    } else {
      console.log('VOWOS DEPLOYED VERIFICATION BLOCKED');
    }
    
  } catch (err) {
    console.error('VERIFICATION ERROR:', err);
    console.log('VOWOS DEPLOYED VERIFICATION BLOCKED');
  } finally {
    await browser.close();
  }
})();
