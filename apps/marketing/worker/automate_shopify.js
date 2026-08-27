const { chromium } = require('playwright');

(async () => {
  console.log('🚀 Launching automated browser window...');
  const browser = await chromium.launch({
    headless: false, // Visible browser on user's screen
    args: ['--start-maximized']
  });

  const context = await browser.newContext({ viewport: null });
  const page = await context.newPage();

  console.log('Navigating to Shopify Admin...');
  await page.goto('https://admin.shopify.com');

  console.log('\n======================================================');
  console.log('👉 Please log in to Shopify in the opened browser window.');
  console.log('   The script will automatically detect when you are logged in!');
  console.log('======================================================\n');

  // Wait until we reach Shopify Admin dashboard (URL contains /store/ or admin.shopify.com/store)
  await page.waitForURL(url => url.href.includes('/store/'), { timeout: 300000 });
  console.log('✅ Logged in! Current URL:', page.url());

  const scriptTag = '<script src="https://robertsenterprises.bridgebox.ai/api/form-bridge/bridge.js" defer></script>';

  // Function to process a store theme
  async function updateStoreTheme(storeName) {
    console.log(`\nProcessing store: ${storeName}...`);
    
    // Go to Themes page
    const currentStoreMatch = page.url().match(/\/store\/([^/]+)/);
    if (!currentStoreMatch) return;
    const storeSlug = currentStoreMatch[1];
    
    console.log(`Navigating to themes page for ${storeSlug}...`);
    await page.goto(`https://admin.shopify.com/store/${storeSlug}/themes`);
    await page.waitForTimeout(4000);

    // Look for the "Edit code" option or three dots menu
    console.log('Opening theme code editor...');
    // Direct URL to edit active theme code if possible, or click menu
    const editCodeUrl = `https://admin.shopify.com/store/${storeSlug}/themes?action=edit_code`;
    await page.goto(editCodeUrl);
    await page.waitForTimeout(5000);

    console.log('Current URL after edit_code action:', page.url());
  }

  await updateStoreTheme('Current Store');

  console.log('Done!');
})();
