const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Intercept ALL network requests
  const allRequests = [];
  page.on('request', req => {
    if (req.method() === 'POST') {
      allRequests.push({ url: req.url(), method: req.method(), postData: req.postData() });
    }
  });
  page.on('response', resp => {
    if (resp.url().includes('globo') && resp.request().method() === 'POST') {
      console.log('GLOBO POST RESPONSE:', resp.url(), resp.status());
    }
  });

  await page.goto('https://properandcompany.com/pages/request-an-appointment?nocache=' + Date.now());
  await page.waitForTimeout(5000);

  // Check the actual DOM structure of the form
  const formStructure = await page.evaluate(() => {
    const formApp = document.querySelector('.globo-form-app');
    if (!formApp) return 'NO .globo-form-app found';
    
    const controls = formApp.querySelectorAll('.globo-form-control');
    const result = [];
    controls.forEach(ctrl => {
      const label = ctrl.querySelector('label');
      const input = ctrl.querySelector('input, select, textarea');
      result.push({
        label: label ? label.innerText : 'NO LABEL',
        inputType: input ? input.type : 'NO INPUT',
        inputName: input ? input.name : 'NO NAME',
        className: ctrl.className
      });
    });
    return result;
  });

  console.log('FORM STRUCTURE:', JSON.stringify(formStructure, null, 2));

  // Now fill and submit
  const filled = await page.evaluate(() => {
    const inputs = document.querySelectorAll('input, select, textarea');
    const filled = [];
    inputs.forEach(inp => {
      if (inp.type === 'hidden' || inp.type === 'submit') return;
      filled.push({ name: inp.name, type: inp.type, placeholder: inp.placeholder, value: inp.value });
    });
    return filled;
  });
  console.log('ALL INPUTS:', JSON.stringify(filled, null, 2));

  await browser.close();
})();
