import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'fake';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const categories = [
  'Getting Started', 'Today', 'Appointments', 'Customers', 'Sales', 'Inventory', 
  'Team', 'Growth', 'Reports', 'Settings', 'Integrations', 'Billing', 'Mobile', 
  'Security', 'Troubleshooting', 'Training'
];

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
}

const articles = [
  {
    title: 'Handling new booking requests',
    category: 'Appointments',
    summary: 'Learn how to review, approve, or reschedule new bridal appointment requests.',
    content: "# Handling New Booking Requests\n\nWhen a bride submits a new appointment request through your booking portal, you'll see a notification in the **Appointments** dashboard.\n\n## Step-by-step Guide:\n\n1. **Review the Request:** Click on the new request to view the bride's details, preferred date, and any notes she provided (e.g., dress styles she likes).\n2. **Check Availability:** Cross-reference the requested time with your stylists' schedules and fitting room availability.\n3. **Approve or Reschedule:** \n   - If the time works, click **Approve**. An automated confirmation email will be sent to the bride.\n   - If the time is unavailable, click **Propose New Time** and select 2-3 alternative slots to offer her.\n4. **Assign a Stylist:** Once confirmed, assign an available stylist to the appointment so they can prepare.\n\n> **Pro Tip:** Always check the bride's notes before the appointment to pull a few dresses that match her style!",
    role: 'EMPLOYEE',
    status: 'PUBLISHED'
  },
  {
    title: 'Importing inventory by CSV',
    category: 'Inventory',
    summary: 'A complete guide to bulk importing your dresses and accessories into VowOS.',
    content: "# Importing Inventory by CSV\n\nIf you have an existing spreadsheet of your gowns, you can import them all at once into VowOS to avoid manual data entry.\n\n## Preparation\n\nEnsure your CSV file contains the following required columns:\n- 'Style Number' (e.g., 44293)\n- 'Designer' (e.g., Justin Alexander)\n- 'Name' (e.g., The Juliet Gown)\n- 'Price' (e.g., 1500.00)\n\n## Import Steps\n\n1. Navigate to the **Inventory** workspace.\n2. Click the **Import** button in the top right corner.\n3. Upload your CSV file.\n4. Map the columns in your file to the corresponding VowOS fields.\n5. Click **Run Import**.\n\n*Note: The import runs in the background. You'll receive a notification when it's complete.*",
    role: 'STORE_MANAGER',
    status: 'PUBLISHED'
  },
  {
    title: 'Resolving inventory mismatches',
    category: 'Inventory',
    summary: 'How to correct your stock counts when VowOS doesn\'t match your physical inventory.',
    content: "# Resolving Inventory Mismatches\n\nSometimes, your physical dress count may not match the stock recorded in VowOS. This is usually due to unrecorded sales or miscounted receiving.\n\n## How to fix an inventory discrepancy:\n\n1. Go to the **Inventory** workspace and locate the specific item (e.g., Justin Alexander 88071).\n2. Click into the product details.\n3. Select the **Adjust Stock** button.\n4. Enter the *actual* physical quantity you have in store.\n5. Select a reason code (e.g., 'Cycle Count Correction' or 'Damaged').\n6. Save the adjustment.",
    role: 'STORE_MANAGER',
    status: 'PUBLISHED'
  },
  {
    title: 'Adding Brands and Locations',
    category: 'Getting Started',
    summary: 'Learn how to set up your primary brand and add multiple store locations.',
    content: "# Adding Brands and Locations\n\nVowOS supports multi-location operations. You can manage multiple stores under one central brand.\n\n## Adding a Location\n1. Go to **Settings > Locations**.\n2. Click **Add Location**.\n3. Enter the store name, address, and contact details.\n4. Save. This location is now available in the location switcher in the top navigation bar.",
    role: 'OWNER',
    status: 'PUBLISHED'
  },
  {
    title: 'Connecting Google Business Profile',
    category: 'Growth',
    summary: 'Sync your Google Business reviews and analytics directly into your Growth dashboard.',
    content: "# Connecting Google Business Profile\n\nConnect your Google Business Profile to track search impressions, map views, and respond to reviews right from VowOS.\n\n## Steps to Connect:\n1. Open the **Growth** workspace.\n2. Click on the **Integrations** tab.\n3. Locate the Google Business Profile card and click **Connect**.\n4. Log in with the Google Account that manages your store's profile.\n5. Grant VowOS permission to view and manage your business listings.\n\nOnce connected, your metrics will populate within 24 hours.",
    role: 'OWNER',
    status: 'PUBLISHED'
  },
  {
    title: 'Adding Designers',
    category: 'Inventory',
    summary: 'How to add new bridal designers to your catalog.',
    content: "# Adding Designers\n\nBefore adding gowns, you must first create the Designer profile.\n\n1. Navigate to **Settings > Designers & Vendors**.\n2. Click **Add Designer**.\n3. Enter the designer's name and contact information.\n4. Save. You can now assign this designer to your inventory items.",
    role: 'STORE_MANAGER',
    status: 'PUBLISHED'
  },
  {
    title: 'Adding New Staff Members',
    category: 'Team',
    summary: 'Learn how to invite new stylists and managers to your VowOS store.',
    content: "# Adding New Staff Members\n\nAs you grow your team, you'll need to grant them access to VowOS. \n\n## Inviting a User\n1. Go to **Team > Roster** in the main navigation.\n2. Click the **Invite Staff** button.\n3. Enter their email address, first name, and last name.\n4. Select their Role (e.g., Stylist, Manager, Alterations).\n5. Click **Send Invite**. \n\nThey will receive an email with a secure link to set their password and log in.",
    role: 'STORE_MANAGER',
    status: 'PUBLISHED'
  },
  {
    title: 'Managing Stylist Permissions',
    category: 'Team',
    summary: 'How to restrict or grant access to specific workspaces.',
    content: "# Managing Stylist Permissions\n\nNot everyone needs access to financial reports or owner settings. VowOS uses a Role-Based Access Control (RBAC) system to automatically filter permissions.\n\n## Adjusting Roles\nIf a staff member needs more access (for example, promoting a Stylist to a Floor Manager):\n1. Go to **Team > Roster**.\n2. Select the staff member.\n3. Under the **Permissions** tab, change their Role dropdown.\n4. Save. Changes take effect on their next login.",
    role: 'OWNER',
    status: 'PUBLISHED'
  },
  {
    title: 'Understanding the End of Day Report',
    category: 'Reports',
    summary: 'A breakdown of the metrics shown in your daily closeout report.',
    content: "# Understanding the End of Day Report\n\nThe End of Day (EOD) report is crucial for reconciling your cash drawer and tracking daily performance.\n\n## Key Metrics\n- **Gross Sales**: Total value of all invoices created today.\n- **Payments Collected**: Actual funds received today (Credit, Cash, Check) regardless of invoice date.\n- **Close Rate**: The percentage of first-time bridal appointments today that resulted in a dress sale.\n\nRun this report from **Reports > End of Day** before closing the store each night.",
    role: 'STORE_MANAGER',
    status: 'PUBLISHED'
  },
  {
    title: 'Exporting Sales Data',
    category: 'Reports',
    summary: 'How to export your transaction history to Excel or CSV.',
    content: "# Exporting Sales Data\n\nIf you need to do custom analysis in Excel or share data with your accountant, you can export your sales history.\n\n1. Go to the **Reports > Financials** tab.\n2. Set your desired Date Range.\n3. Click the **Export** button in the top right.\n4. Choose **CSV** or **Excel** format.\n5. A download link will be generated and emailed to you.",
    role: 'STORE_MANAGER',
    status: 'PUBLISHED'
  },
  {
    title: 'Configuring Store Hours',
    category: 'Settings',
    summary: 'Update your operational hours so brides know when they can book appointments.',
    content: "# Configuring Store Hours\n\nYour store hours dictate your online booking availability and automated communications.\n\n1. Go to **Settings > Locations**.\n2. Select the location you want to update.\n3. Scroll down to the **Operating Hours** section.\n4. Toggle days on/off and set the Open and Close times.\n5. Click **Save**.\n\n*Note: If you have special holiday hours, add them under the \"Exceptions\" tab.*",
    role: 'STORE_MANAGER',
    status: 'PUBLISHED'
  },
  {
    title: 'Setting up Tax Rates',
    category: 'Settings',
    summary: 'How to configure local sales tax rates for your region.',
    content: "# Setting up Tax Rates\n\nCompliance is key. VowOS allows you to set default tax rates that automatically apply to invoices.\n\n1. Go to **Settings > Billing & Taxes**.\n2. Click **Add Tax Rate**.\n3. Name the tax (e.g., \"State Sales Tax\").\n4. Enter the percentage (e.g., 8.5%).\n5. Toggle **Default for new invoices** if you want it applied automatically.\n\nYou can override this on individual invoices if you ship out of state.",
    role: 'OWNER',
    status: 'PUBLISHED'
  },
  {
    title: 'Connecting QuickBooks Online',
    category: 'Integrations',
    summary: 'Sync your daily payouts and invoices directly to QuickBooks.',
    content: "# Connecting QuickBooks Online\n\nVowOS features a direct API integration with QuickBooks Online to automate your accounting.\n\n## Setup Instructions\n1. Navigate to **Settings > Integrations**.\n2. Click the **QuickBooks** card.\n3. Click **Connect to QuickBooks**.\n4. You will be redirected to Intuit's login page. Sign in and authorize VowOS.\n5. Once redirected back, select your default income and bank accounts for the sync mapping.\n6. Save your settings and enable the Daily Sync toggle.",
    role: 'OWNER',
    status: 'PUBLISHED'
  },
  {
    title: 'Updating Your Payment Method',
    category: 'Billing',
    summary: 'How to update the credit card used for your VowOS subscription.',
    content: "# Updating Your Payment Method\n\nIf you need to change the credit card on file for your VowOS platform subscription:\n\n1. Log in with an **Owner** account.\n2. Go to **Settings > Platform Billing**.\n3. Under Payment Methods, click **Update Card**.\n4. Enter your new card details via our secure Stripe checkout.\n5. Set the new card as the Default.\n\nYour next monthly invoice will be charged to the new card.",
    role: 'OWNER',
    status: 'PUBLISHED'
  },
  {
    title: 'Using the VowOS iPad App',
    category: 'Mobile',
    summary: 'A quick guide to navigating the iOS application on the showroom floor.',
    content: "# Using the VowOS iPad App\n\nThe VowOS iPad app is designed for mobility while on the showroom floor.\n\n## Key Differences from Desktop\n- **Camera Scanning**: Use the iPad's camera to scan barcode tags on dresses instead of a USB scanner.\n- **Signature Capture**: The checkout screen allows brides to sign contracts and invoices directly with their finger or an Apple Pencil.\n- **Offline Mode**: If your Wi-Fi drops, the iPad app caches data and will sync automatically when the connection is restored.",
    role: 'EMPLOYEE',
    status: 'PUBLISHED'
  },
  {
    title: 'Enabling Two-Factor Authentication',
    category: 'Security',
    summary: 'Protect your account with 2FA using an authenticator app.',
    content: "# Enabling Two-Factor Authentication\n\nWe strongly recommend all staff enable Two-Factor Authentication (2FA) to protect customer data.\n\n1. Click your profile avatar in the bottom left corner.\n2. Select **My Account**.\n3. Go to the **Security** tab.\n4. Click **Enable 2FA**.\n5. Scan the QR code using an app like Google Authenticator or Authy.\n6. Enter the 6-digit code to confirm.\n\nNext time you log in, you will be prompted for a code.",
    role: 'EMPLOYEE',
    status: 'PUBLISHED'
  },
  {
    title: 'Fixing Printer Connection Issues',
    category: 'Troubleshooting',
    summary: 'Common solutions when your receipt or label printer stops responding.',
    content: "# Fixing Printer Connection Issues\n\nIf VowOS isn't communicating with your receipt or label printer, try these steps:\n\n1. **Check the Cables**: Ensure the USB or Ethernet cable is firmly plugged in.\n2. **Verify the Network**: If using a Wi-Fi printer, make sure the iPad/Computer is on the *same Wi-Fi network* as the printer.\n3. **Restart the Print Spooler**: In the VowOS settings, go to Devices -> Printers and click **Refresh Devices**.\n4. **Power Cycle**: Turn the printer off, wait 10 seconds, and turn it back on.\n\nIf the issue persists, contact Support via the Help drawer.",
    role: 'STORE_MANAGER',
    status: 'PUBLISHED'
  },
  {
    title: 'Onboarding Checklist for New Stylists',
    category: 'Training',
    summary: 'A step-by-step curriculum for training your new hires on VowOS.',
    content: "# Onboarding Checklist for New Stylists\n\nWelcome to the team! To get comfortable using VowOS, complete the following modules within your first week:\n\n- [ ] **Module 1: The Today Screen**. Understand how to check in appointments and view your daily schedule.\n- [ ] **Module 2: Customer 360**. Learn how to add a bride, update her measurements, and log style notes.\n- [ ] **Module 3: Inventory Search**. Practice looking up dresses by designer, silhouette, and price.\n- [ ] **Module 4: Checkout**. Walk through a mock sale, including taking a deposit and capturing a signature.\n\nAsk your Store Manager to shadow your first mock appointment!",
    role: 'EMPLOYEE',
    status: 'PUBLISHED'
  }
];

export async function seedKnowledgeBase() {
  console.log('Starting Knowledge Base Seed...');

  // 1. Upsert Categories
  for (const catName of categories) {
    const slug = slugify(catName);
    const { error } = await supabase
      .from('help_categories')
      .upsert({ slug, title: catName }, { onConflict: 'slug' });

    if (error) {
      console.error(`Failed to upsert category: ${catName}`, error);
    } else {
      console.log(`Upserted category: ${catName}`);
    }
  }

  // Fetch categories to get their IDs
  const { data: catData, error: catError } = await supabase
    .from('help_categories')
    .select('id, title');

  if (catError || !catData) {
    console.error('Failed to fetch categories', catError);
    return;
  }

  const categoryMap = new Map();
  catData.forEach(c => categoryMap.set(c.title, c.id));

  // 2. Upsert Articles
  for (const article of articles) {
    const category_id = categoryMap.get(article.category);
    if (!category_id) {
      console.warn(`Category ID not found for: ${article.category}`);
      continue;
    }

    const slug = slugify(article.title);
    
    const { error } = await supabase
      .from('help_articles')
      .upsert({
        slug,
        title: article.title,
        summary: article.summary,
        content: article.content,
        category: article.category,
        category_id,
        role: article.role,
        status: article.status
      }, { onConflict: 'slug' });

    if (error) {
      console.error(`Failed to upsert article: ${article.title}`, error);
    } else {
      console.log(`Upserted article: ${article.title}`);
    }
  }

  console.log('Knowledge Base Seed completed.');
}

// Allow running directly via tsx
if (require.main === module || process.argv[1]?.endsWith('seed_knowledge_base.ts')) {
  seedKnowledgeBase().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
  });
}
