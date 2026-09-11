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
