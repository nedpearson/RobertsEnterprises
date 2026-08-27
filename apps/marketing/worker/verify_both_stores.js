const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');

const db = createClient(
  'https://yyexmcaumkzxvhplipkl.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5ZXhtY2F1bWt6eHZocGxpcGtsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTg4ODgwNSwiZXhwIjoyMTAxNDY0ODA1fQ.dtdvjxpAyb2CbIs3tNbjEIqGHyX5uEKaCOLJm_TC4iw'
);

(async () => {
  const browser = await chromium.launch({ headless: true });

  console.log('=== TEST 1: Proper & Company ===');
  const page1 = await browser.newPage();
  let properFired = false;
  page1.on('request', req => {
    if (req.url().includes('form-bridge/submit') && req.method() === 'POST') {
      properFired = true;
      console.log('✅ Proper & Co payload fired:', req.postData());
    }
  });

  await page1.goto('https://properandcompany.com/pages/request-an-appointment?nocache=' + Date.now());
  await page1.waitForTimeout(5000);

  await page1.locator('input[name="text-1"]').fill('Proper Final Automated Test');
  await page1.locator('input[name="text"]').fill('555-111-2222');
  await page1.locator('input[name="email-2"]').fill('proper_final@example.com');
  await page1.locator('input[name="text-3"]').fill('Evening Wear');

  const loc1 = page1.locator('select[name="select-1"]');
  if (await loc1.count() > 0) await loc1.selectOption({ index: 1 });

  const btn1 = page1.locator('.globo-form-app button.submit');
  if (await btn1.count() > 0) await btn1.first().click();
  await page1.waitForTimeout(5000);
  console.log('Proper & Co test result:', properFired ? 'SUCCESS' : 'FAILED');

  console.log('\n=== TEST 2: I Do Bridal Couture ===');
  const page2 = await browser.newPage();
  let idoFired = false;
  page2.on('request', req => {
    if (req.url().includes('form-bridge/submit') && req.method() === 'POST') {
      idoFired = true;
      console.log('✅ I Do Bridal payload fired:', req.postData());
    }
  });

  await page2.goto('https://idobridalcouture.com/pages/request-an-appointment?nocache=' + Date.now());
  await page2.waitForTimeout(5000);

  // Fill in I Do Bridal form inputs
  const inputs2 = page2.locator('.globo-form-app input[type="text"], .globo-form-app input[type="email"]');
  const count = await inputs2.count();
  console.log(`I Do Bridal form inputs found: ${count}`);

  if (count >= 3) {
    await inputs2.nth(0).fill('I Do Bridal Final Test');
    await inputs2.nth(1).fill('555-333-4444');
    await inputs2.nth(2).fill('idobridal_final@example.com');
  }

  const btn2 = page2.locator('.globo-form-app button.submit, button.submit');
  if (await btn2.count() > 0) await btn2.first().click();
  await page2.waitForTimeout(5000);
  console.log('I Do Bridal test result:', idoFired ? 'SUCCESS' : 'FAILED');

  await browser.close();

  // Query database for recent records from both stores
  console.log('\n=== DATABASE VERIFICATION ===');
  const { data: reqs } = await db
    .from('appointment_requests')
    .select('id, submitted_at, notes')
    .order('submitted_at', { ascending: false })
    .limit(4);

  console.log(JSON.stringify(reqs, null, 2));
})();
