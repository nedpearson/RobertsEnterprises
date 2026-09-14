import json
import os

articles = [
    # GETTING STARTED
    {
        "title": "VowOS Core Concepts & Navigation",
        "category": "Getting Started",
        "summary": "Understand the fundamental architecture of VowOS, including workspaces, data flow, and global navigation.",
        "content": "# VowOS Core Concepts\n\nWelcome to VowOS. To get the most out of the platform, it's important to understand how data flows through the system.\n\n## The Workspace Model\nVowOS is divided into *Workspaces* (e.g., Today, Inventory, Sales). Each workspace is tailored to a specific role in your boutique.\n- **Front Desk:** Spends 90% of their time in the **Today** and **Appointments** workspaces.\n- **Stylists:** Utilize the **Customer 360** and **Mobile** iPad app.\n- **Managers:** Live in **Inventory**, **Team**, and **Reports**.\n\n## Global Search (Omnisearch)\nPress `Ctrl+K` (or `Cmd+K` on Mac) anywhere in VowOS to open the Command Palette. You can instantly search for brides, style numbers, or invoice numbers without leaving your current screen.\n\n## The Customer 360 Flow\nEverything in VowOS revolves around the Bride (Customer). When a bride books an appointment, an Event is created. When she buys a dress, an Invoice is linked to her profile. This means you can always go to a Customer's profile to see her entire history in one place.",
        "role": "EMPLOYEE",
        "status": "PUBLISHED"
    },
    {
        "title": "Hardware Setup: Scanners, Printers & iPads",
        "category": "Getting Started",
        "summary": "Step-by-step guide to configuring your boutique's physical hardware with VowOS.",
        "content": "# Hardware Setup\n\nVowOS integrates seamlessly with your physical retail hardware. Here is how to configure each component.\n\n## 1. Barcode Scanners\nVowOS supports standard USB and Bluetooth HID barcode scanners (e.g., Zebra, Symbol, Socket Mobile).\n**Configuration:**\n1. Ensure your scanner is in \"Keyboard Wedge\" mode (this is usually the default).\n2. Program the scanner to add a `Carriage Return (Enter)` after every scan. Check your scanner's manual for the specific barcode to scan for this setting.\n3. Test by opening a text document, scanning a tag, and ensuring the cursor jumps to the next line.\n\n## 2. Receipt Printers\nWe recommend Star Micronics or Epson receipt printers.\n**Configuration:**\n1. Connect the printer to the same Wi-Fi network as your computers.\n2. In VowOS, navigate to **Settings > Hardware**.\n3. Click **Add Printer** and enter the IP address of the printer.\n\n## 3. Label Printers (Dymo / Zebra)\nFor printing barcode tags:\n1. Install the manufacturer's print spooler software on your PC/Mac.\n2. In VowOS Inventory, select items and click **Print Labels**.\n3. Ensure your browser's print dialog is set to the correct label size (e.g., 1.125\" x 2\").\n\n## 4. iPads\nDownload the VowOS iOS app from the App Store. Ensure iPads are running iOS 16+ for optimal camera scanning performance.",
        "role": "OWNER",
        "status": "PUBLISHED"
    },
    
    # TODAY
    {
        "title": "Managing Walk-ins and the Fitting Room Queue",
        "category": "Today",
        "summary": "How to handle unexpected walk-in brides and manage fitting room availability in real-time.",
        "content": "# Managing Walk-ins & The Queue\n\nSaturdays can get chaotic. The **Today** workspace is designed to act as your digital floor manager.\n\n## Registering a Walk-in\nWhen a bride walks in without an appointment:\n1. Open the **Today** workspace.\n2. Click **+ Walk-in**.\n3. Quickly capture her Name, Phone, and Event Date. (Email can be collected later).\n4. She will be added to the **Waitlist / Queue**.\n\n## Assigning Fitting Rooms\nThe Floor Timeline visualizes your physical store.\n1. Drag the walk-in from the Queue onto an available Fitting Room track.\n2. Assign an available Stylist.\n3. The Stylist will receive an instant push notification on their iPad that their walk-in is ready in Room X.\n\n## Handling Overcapacity\nIf all rooms are full, use the **Wait Time Estimator** feature. VowOS calculates average appointment durations and will project when the next room will open up. You can send the bride an automated SMS when her room is ready so she can grab coffee nearby.",
        "role": "EMPLOYEE",
        "status": "PUBLISHED"
    },
    {
        "title": "No-Shows and Daily Briefings",
        "category": "Today",
        "summary": "Protocols for managing no-shows and utilizing the Daily Briefing tool.",
        "content": "# No-Shows & Daily Briefings\n\n## The Morning Briefing\nEvery morning, managers should review the **Daily Briefing** in the Today workspace. This highlights:\n- VIP appointments.\n- Brides returning for a 2nd appointment (trying to \"say yes\").\n- Alterations pickups.\n- Staff call-outs.\n\n## Handling No-Shows\nIf an appointment is 15 minutes late:\n1. Click the appointment in the Today timeline.\n2. Click **Mark as No-Show**.\n3. **Scenario A (Credit Card on File):** If you require a booking fee, VowOS will prompt you to capture the cancellation fee via Stripe.\n4. **Scenario B (No Card):** VowOS will trigger an automated \"Sorry we missed you\" email, prompting them to reschedule.\n5. The fitting room is instantly freed up for walk-ins.",
        "role": "STORE_MANAGER",
        "status": "PUBLISHED"
    },

    # APPOINTMENTS
    {
        "title": "Customizing Appointment Types & Questionnaires",
        "category": "Appointments",
        "summary": "Create targeted appointment types (Bridal, Bridesmaid, Alterations) and gather intel before they arrive.",
        "content": "# Customizing Appointment Types\n\nNot all appointments are created equal. You can configure rules, durations, and pricing for different appointment types.\n\n## Creating an Appointment Type\n1. Go to **Settings > Appointments**.\n2. Click **New Appointment Type**.\n3. **Basic Details:** Name (e.g., \"VIP Bridal Appointment\"), Duration (e.g., 120 mins), Price (e.g., $150).\n4. **Concurrency:** Can this overlap? Set how many of these appointments can happen at the same time.\n\n## Pre-Appointment Questionnaires\nGathering information before the bride arrives increases close rates by 30%.\n1. Under the Appointment Type, click the **Questionnaire** tab.\n2. Add questions:\n   - *Text*: \"What is your wedding venue?\"\n   - *Multiple Choice*: \"What silhouettes do you prefer?\"\n   - *Budget Dropdown*: \"What is your gown budget?\"\n3. When the bride books online, she *must* complete this form.\n4. The answers appear directly on the Stylist's iPad during the appointment.",
        "role": "OWNER",
        "status": "PUBLISHED"
    },
    {
        "title": "Double-Booking and Overrides",
        "category": "Appointments",
        "summary": "How managers can override scheduling conflicts when absolutely necessary.",
        "content": "# Double-Booking & Overrides\n\nBy default, VowOS prevents double-booking fitting rooms and stylists. However, managers sometimes need to squeeze someone in.\n\n## Performing an Override\n1. In the **Appointments** calendar, click the desired timeslot.\n2. Enter the bride's details.\n3. When clicking Save, you will receive a red **Conflict Error** (e.g., \"Stylist Sarah is already booked\").\n4. If you are a Store Manager or Owner, you will see a **Force Override** checkbox.\n5. Check this box and confirm.\n\n## Warning\nForcing an override means Sarah will appear on the calendar *twice* for the same timeslot. This is useful for double-booking a stylist who is handling a bridal appointment and a quick accessory pickup simultaneously. Use with caution.",
        "role": "STORE_MANAGER",
        "status": "PUBLISHED"
    },

    # CUSTOMERS
    {
        "title": "Merging Duplicate Customer Profiles",
        "category": "Customers",
        "summary": "Keep your CRM clean by merging duplicate records created by typos or multiple bookings.",
        "content": "# Merging Duplicate Profiles\n\nBrides occasionally book twice using different emails (e.g., personal vs. work), creating duplicate records.\n\n## How to Merge\n1. Go to the **Customers** workspace.\n2. Search for the bride's name.\n3. Check the boxes next to the two duplicate profiles.\n4. Click the **Merge (2)** button that appears at the top of the list.\n5. **Conflict Resolution:** VowOS will ask you which profile is the \"Master\". The Master profile's contact info will be kept.\n6. All appointments, invoices, and style notes from the secondary profile will be seamlessly migrated to the Master profile.\n7. The secondary profile is permanently deleted.\n\n> **Warning:** Merging cannot be undone. Always verify phone numbers before merging.",
        "role": "STORE_MANAGER",
        "status": "PUBLISHED"
    },
    {
        "title": "Managing VIP Customers and Entourages",
        "category": "Customers",
        "summary": "Track complex relationships like Bridesmaids, Mothers of the Bride, and VIPs.",
        "content": "# VIPs and Entourages\n\n## Tagging VIPs\nSome customers require white-glove service.\n1. Open the Customer 360 profile.\n2. In the tags section, type `VIP`.\n3. VIP tags highlight the customer's name in gold on the Today screen, alerting all staff to provide exceptional service.\n\n## The Entourage Feature\nWhen a bride brings bridesmaids, you want to market to them later, or link their dress purchases to her wedding.\n1. In the Bride's profile, click the **Entourage** tab.\n2. Click **Add Member**.\n3. Enter the bridesmaid's details and role (e.g., Maid of Honor).\n4. This creates a linked sub-profile. When the bridesmaid buys a dress, the invoice is billed to the bridesmaid, but the revenue is attributed to the Bride's overall Wedding Value in your reports.",
        "role": "EMPLOYEE",
        "status": "PUBLISHED"
    },

    # SALES
    {
        "title": "Split Payments & Multi-Tender Invoices",
        "category": "Sales",
        "summary": "Process complex transactions where multiple people are paying for one gown.",
        "content": "# Split Payments\n\nIt is incredibly common for a mother to pay half, and the bride to pay half.\n\n## Processing a Split Payment\n1. Build the invoice as normal (e.g., $2,000 total).\n2. Click **Checkout**.\n3. Instead of charging the full balance, click **Split Payment**.\n4. Enter the amount for Tender 1 (e.g., $1,000).\n5. Select the method (e.g., Credit Card) and process it.\n6. The invoice will update to show a $1,000 Remaining Balance.\n7. Enter the amount for Tender 2 (e.g., $1,000).\n8. Select the method (e.g., Cash) and complete the sale.\n\nVowOS will generate a single receipt detailing both payment methods.",
        "role": "EMPLOYEE",
        "status": "PUBLISHED"
    },
    {
        "title": "Special Orders vs. Off-the-Rack Sales",
        "category": "Sales",
        "summary": "Understand the crucial workflow differences between ordering a dress and selling floor stock.",
        "content": "# Special Orders vs. Off-the-Rack\n\nUnderstanding how VowOS handles inventory deduction is critical to avoiding stock errors.\n\n## Special Orders (Made to Order)\nWhen a bride orders a dress to be manufactured:\n1. Add the item to the invoice and ensure the type is **Special Order**.\n2. You *must* select the Custom Size, Color, and Length.\n3. **Inventory Impact:** This does *not* deduct your floor sample from inventory. Instead, it places the item into the **Awaiting PO** queue in the Purchasing workspace so your manager can order it from the designer.\n\n## Off-the-Rack (Floor Sample)\nWhen a bride buys the literal dress she tried on:\n1. Add the item and toggle it to **Off-the-Rack**.\n2. VowOS will force you to select the exact barcode/SKU of the floor sample.\n3. **Inventory Impact:** The moment the invoice is paid, that specific barcode is permanently deducted from your physical inventory.\n\n> **Caution:** Never sell a Special Order as Off-the-Rack, or your system will think your floor sample is gone!",
        "role": "EMPLOYEE",
        "status": "PUBLISHED"
    },
    {
        "title": "Refunds, Cancellations & Store Credit",
        "category": "Sales",
        "summary": "Properly handle reversed transactions without breaking your accounting.",
        "content": "# Refunds & Store Credit\n\nBridal is generally final sale, but exceptions happen.\n\n## Processing a Refund\n1. Open the Paid Invoice.\n2. Click **Options > Issue Refund**.\n3. Select the items being returned to restock them (if applicable).\n4. Choose to refund to the **Original Payment Method** or **Store Credit**.\n5. If Stripe was used, the funds are automatically returned to the card.\n\n## Store Credit\nIssuing Store Credit adds a balance to the Customer's 360 Profile. The next time you create an invoice for them, VowOS will prompt you to apply their available credit before asking for a credit card.",
        "role": "STORE_MANAGER",
        "status": "PUBLISHED"
    },

    # INVENTORY
    {
        "title": "Receiving Purchase Orders (POs)",
        "category": "Inventory",
        "summary": "How to intake new shipments from designers and automatically notify brides.",
        "content": "# Receiving Purchase Orders\n\nWhen a box arrives from a designer (e.g., Essence of Australia), you need to receive it in VowOS.\n\n## Step-by-Step Receiving\n1. Go to **Inventory > Purchase Orders**.\n2. Find the PO matching the packing slip and click **Receive**.\n3. Scan the barcodes of the items in the box, or manually check them off.\n4. **Quality Check:** Note any damages. If an item is damaged, receive it as \"Quarantined\".\n5. **Automated Alerts:** If the received item was a Special Order for a bride, VowOS instantly moves her status to \"Dress Arrived\" and triggers an automated SMS/Email telling her to book a pickup appointment!\n6. **Printing Labels:** VowOS will automatically queue up barcode labels to print for any new floor samples.",
        "role": "STORE_MANAGER",
        "status": "PUBLISHED"
    },
    {
        "title": "Cycle Counts & Physical Audits",
        "category": "Inventory",
        "summary": "Conducting quarterly or annual full-store inventory counts using iPads.",
        "content": "# Cycle Counts\n\nDoing inventory doesn't have to take all night.\n\n## Running an Audit\n1. Go to **Inventory > Audits** and click **Start New Audit**.\n2. Select the Zone (e.g., \"A-Line Dresses\").\n3. Grab an iPad paired with a Bluetooth scanner.\n4. Walk the rack, scanning every barcode rapidly.\n5. The iPad will beep green for found items, and red for items that belong in a different zone.\n\n## Reconciliation\nOnce done, VowOS will present a Variance Report:\n- **Missing Items:** Expected but not scanned.\n- **Extra Items:** Scanned but not in the system.\n\nYou can then investigate discrepancies and click **Commit Audit** to permanently overwrite your stock levels to match the physical count.",
        "role": "STORE_MANAGER",
        "status": "PUBLISHED"
    },

    # TEAM
    {
        "title": "Commission Structures & Payroll",
        "category": "Team",
        "summary": "Setting up automated commission tracking to eliminate manual payroll spreadsheets.",
        "content": "# Commissions & Payroll\n\nVowOS automatically calculates commissions based on invoice attribution.\n\n## Setting up Commission Tiers\n1. Go to **Settings > Team > Commissions**.\n2. You can set flat rates (e.g., 5% on all bridal gowns) or tiered structures (e.g., 2% if monthly sales < $10k, 5% if > $10k).\n3. Assign these tiers to specific roles or individual stylists.\n\n## Handling Split Commissions\nIf Stylist A started the appointment, but Stylist B closed the sale on a returning visit:\n1. On the invoice, edit the **Attribution** field.\n2. Select both Stylists and set it to a 50/50 split.\n\n## Payroll Export\nAt the end of the pay period, go to **Team > Payroll**, select your dates, and export the CSV. This file is pre-formatted for direct import into Gusto, ADP, or QuickBooks Payroll.",
        "role": "OWNER",
        "status": "PUBLISHED"
    },

    # GROWTH
    {
        "title": "Automated Review Requests (Reputation Center)",
        "category": "Growth",
        "summary": "Put your 5-star Google Reviews on autopilot.",
        "content": "# Automated Review Requests\n\nYour Google Business rating is your most important marketing asset. VowOS's Reputation Center automates this.\n\n## How it Works\n1. A bride purchases her dress.\n2. 24 hours later, VowOS sends an automated SMS: *\"Did you say yes to the dress? We'd love your feedback!\"*\n3. The link takes them to an internal feedback form.\n4. **The Filter:** If they rate 4 or 5 stars, VowOS immediately redirects them to your Google Business Profile to post it publicly.\n5. If they rate 1-3 stars, VowOS intercepts the review, keeps it internal, and alerts the Store Manager to perform service recovery.\n\n## Configuration\nGo to **Growth > Reputation**. You can adjust the delay (e.g., send 2 hours after sale instead of 24) and customize the SMS template.",
        "role": "OWNER",
        "status": "PUBLISHED"
    },
    {
        "title": "Email Marketing Flows & Triggers",
        "category": "Growth",
        "summary": "Setup \"Drip Campaigns\" based on where the bride is in her journey.",
        "content": "# Email Marketing Flows\n\nStop sending generic newsletters. Use lifecycle marketing.\n\n## Key Triggers\nIn **Growth > Campaigns**, you can build automations based on triggers:\n- **Trigger: Appointment Booked.** -> Send \"How to prepare for your appointment\" 2 days prior.\n- **Trigger: Appointment Completed (No Sale).** -> Send \"Still thinking about it? Here's 10% off accessories if you return\" 3 days later.\n- **Trigger: Dress Arrived.** -> Send \"Your dress is here! Book your alterations.\"\n- **Trigger: Wedding Date Passed.** -> Send \"Happy Anniversary / Preserve your dress with us\" 1 month after the wedding.\n\nEnable these flows once, and VowOS acts as a full-time marketing manager in the background.",
        "role": "OWNER",
        "status": "PUBLISHED"
    },

    # REPORTS
    {
        "title": "Inventory Aging & Turnover Analytics",
        "category": "Reports",
        "summary": "Identify dead stock and optimize your open-to-buy budget.",
        "content": "# Inventory Aging\n\nNot all dresses are winners. The Inventory Aging report tells you what needs to go.\n\n## Interpreting the Data\nGo to **Reports > Inventory > Aging**.\n- **0-90 Days:** Fresh arrivals.\n- **90-180 Days:** Standard floor life.\n- **180+ Days (Red):** Dead stock.\n\nIf a dress has been tried on 40 times (tracked via Fitting Room metrics) but has 0 sales, it is a \"High Traffic, Low Conversion\" item. It looks good on the hanger but fits poorly. You should instantly mark this item down for a sample sale to free up capital.",
        "role": "OWNER",
        "status": "PUBLISHED"
    },

    # INTEGRATIONS
    {
        "title": "Shopify E-commerce Sync",
        "category": "Integrations",
        "summary": "Keep your brick-and-mortar inventory perfectly synced with your online store.",
        "content": "# Shopify E-commerce Sync\n\nIf you sell accessories, veils, or sample dresses online, VowOS can act as your source of truth.\n\n## Setup\n1. Go to **Settings > Integrations > Shopify**.\n2. Enter your `myshopify.com` domain and Admin API Key.\n3. **Map Locations:** Link your VowOS store location to your Shopify Location.\n4. **Sync Direction:** Choose whether VowOS pushes inventory to Shopify (Recommended) or pulls from it.\n\n## Real-time Sync\nWhen an online order is placed on Shopify, it instantly appears in VowOS as a \"Fulfillment\" order. Inventory is deducted immediately, ensuring a bride in-store can't buy a veil that was just sold online.",
        "role": "OWNER",
        "status": "PUBLISHED"
    },

    # SECURITY
    {
        "title": "Role-Based Access Control (RBAC) Matrix",
        "category": "Security",
        "summary": "A deep dive into exactly what each system role can and cannot do.",
        "content": "# RBAC Matrix\n\nVowOS utilizes strict roles. Here is the breakdown:\n\n- **Stylist:** Can view Today, Appointments, Customers, and create Invoices. *Cannot* void payments, export customer lists, view store-wide financial reports, or access Settings.\n- **Alterations:** Can view the Alterations queue, update measurements, and change item statuses. *Cannot* view financial data.\n- **Store Manager:** Can issue refunds, override double-bookings, execute Purchase Orders, and view local End of Day reports. *Cannot* change global tax rates, billing, or multi-store analytics.\n- **Owner:** Full system access. Can export complete databases, change platform billing, and modify the integration API keys.\n\nTo audit what your staff is doing, Owners can view the **Security > Audit Log** to see a time-stamped history of every deleted invoice and exported report.",
        "role": "OWNER",
        "status": "PUBLISHED"
    },

    # TROUBLESHOOTING
    {
        "title": "Payment Terminal Errors (Stripe Reader)",
        "category": "Troubleshooting",
        "summary": "Resolving connection drops between VowOS and your physical credit card terminal.",
        "content": "# Payment Terminal Errors\n\nIf your Stripe BBPOS Smart Reader isn't capturing taps/chips:\n\n## 1. The \"Terminal Offline\" Error\nThis means the reader lost Wi-Fi.\n- Swipe right on the reader's touchscreen.\n- Go to Settings > Network and reconnect to your Wi-Fi.\n- Ensure it is on the *exact same 2.4GHz or 5GHz network* as your iPad/PC.\n\n## 2. The \"Update Required\" Error\nStripe pushes mandatory firmware updates.\n- If prompted, you must allow it to update. This takes 2-5 minutes. **Do not turn off the device** during this process.\n\n## 3. Reader Not Discovered\nIn VowOS checkout, if the reader isn't listed in the dropdown:\n- Go to **Settings > Hardware > Card Readers**.\n- Delete the reader and re-register it using the pairing code generated on the reader's screen (Settings > Generate Pairing Code).",
        "role": "EMPLOYEE",
        "status": "PUBLISHED"
    },
    
    # TRAINING
    {
        "title": "Manager Certification Path",
        "category": "Training",
        "summary": "Advanced training modules for Store Managers.",
        "content": "# Manager Certification Path\n\nBefore taking the keys, Store Managers must understand the operational backend of VowOS.\n\n## Core Modules\n- [ ] **Advanced Inventory:** Receiving POs, executing Cycle Counts, and reading the Variance Report.\n- [ ] **Financials:** Reconciling the End of Day report against the Stripe batch deposit.\n- [ ] **Conflict Resolution:** Issuing refunds, voiding erroneous invoices, and merging duplicate customer files.\n- [ ] **Team Management:** Onboarding new stylists and assigning correct RBAC roles.\n\nPass the integrated VowOS quiz in the Training portal to unlock your Manager Certificate!",
        "role": "STORE_MANAGER",
        "status": "PUBLISHED"
    }
]

file_path = "apps/marketing/worker/src/jobs/seed_knowledge_base.ts"

ts_content = f"""import {{ createClient }} from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'fake';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const categories = [
  'Getting Started', 'Today', 'Appointments', 'Customers', 'Sales', 'Inventory', 
  'Team', 'Growth', 'Reports', 'Settings', 'Integrations', 'Billing', 'Mobile', 
  'Security', 'Troubleshooting', 'Training'
];

function slugify(text: string) {{
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
}}

const articles = {json.dumps(articles, indent=2)};

export async function seedKnowledgeBase() {{
  console.log('Starting Knowledge Base Seed...');

  for (const catName of categories) {{
    const slug = slugify(catName);
    const {{ error }} = await supabase
      .from('help_categories')
      .upsert({{ slug, title: catName }}, {{ onConflict: 'slug' }});
    if (error) console.error(`Failed to upsert category: ${{catName}}`, error);
    else console.log(`Upserted category: ${{catName}}`);
  }}

  const {{ data: catData, error: catError }} = await supabase.from('help_categories').select('id, title');
  if (catError || !catData) return console.error('Failed to fetch categories', catError);

  const categoryMap = new Map();
  catData.forEach(c => categoryMap.set(c.title, c.id));

  for (const article of articles) {{
    const category_id = categoryMap.get(article.category);
    if (!category_id) continue;
    
    const slug = slugify(article.title);
    const {{ error }} = await supabase
      .from('help_articles')
      .upsert({{
        slug,
        title: article.title,
        summary: article.summary,
        content: article.content,
        category: article.category,
        category_id,
        role: article.role,
        status: article.status
      }}, {{ onConflict: 'slug' }});

    if (error) console.error(`Failed to upsert article: ${{article.title}}`, error);
    else console.log(`Upserted article: ${{article.title}}`);
  }}

  console.log('Knowledge Base Seed completed.');
}}

if (require.main === module || process.argv[1]?.endsWith('seed_knowledge_base.ts')) {{
  seedKnowledgeBase().then(() => process.exit(0)).catch(e => {{
    console.error(e);
    process.exit(1);
  }});
}}
"""

with open(file_path, "w", encoding="utf-8") as f:
    f.write(ts_content)

print("Seed script generated successfully!")
