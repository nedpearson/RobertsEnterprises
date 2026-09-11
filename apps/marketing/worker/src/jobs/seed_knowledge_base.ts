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
  {
    "title": "Commission Structures & Payroll",
    "category": "Team",
    "summary": "Setting up automated commission tracking to eliminate manual payroll spreadsheets.",
    "content": "# Commissions & Payroll\n\nVowOS automatically calculates commissions based on invoice attribution.\n\n## Setting up Commission Tiers\n1. Go to **Settings > Team > Commissions**.\n2. You can set flat rates (e.g., 5% on all bridal gowns) or tiered structures (e.g., 2% if monthly sales < $10k, 5% if > $10k).\n3. Assign these tiers to specific roles or individual stylists.\n\n## Handling Split Commissions\nIf Stylist A started the appointment, but Stylist B closed the sale on a returning visit:\n1. On the invoice, edit the **Attribution** field.\n2. Select both Stylists and set it to a 50/50 split.\n\n## Payroll Export\nAt the end of the pay period, go to **Team > Payroll**, select your dates, and export the CSV. This file is pre-formatted for direct import into Gusto, ADP, or QuickBooks Payroll.",
    "role": "OWNER",
    "status": "PUBLISHED"
  },
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
  {
    "title": "Inventory Aging & Turnover Analytics",
    "category": "Reports",
    "summary": "Identify dead stock and optimize your open-to-buy budget.",
    "content": "# Inventory Aging\n\nNot all dresses are winners. The Inventory Aging report tells you what needs to go.\n\n## Interpreting the Data\nGo to **Reports > Inventory > Aging**.\n- **0-90 Days:** Fresh arrivals.\n- **90-180 Days:** Standard floor life.\n- **180+ Days (Red):** Dead stock.\n\nIf a dress has been tried on 40 times (tracked via Fitting Room metrics) but has 0 sales, it is a \"High Traffic, Low Conversion\" item. It looks good on the hanger but fits poorly. You should instantly mark this item down for a sample sale to free up capital.",
    "role": "OWNER",
    "status": "PUBLISHED"
  },
  {
    "title": "Shopify E-commerce Sync",
    "category": "Integrations",
    "summary": "Keep your brick-and-mortar inventory perfectly synced with your online store.",
    "content": "# Shopify E-commerce Sync\n\nIf you sell accessories, veils, or sample dresses online, VowOS can act as your source of truth.\n\n## Setup\n1. Go to **Settings > Integrations > Shopify**.\n2. Enter your `myshopify.com` domain and Admin API Key.\n3. **Map Locations:** Link your VowOS store location to your Shopify Location.\n4. **Sync Direction:** Choose whether VowOS pushes inventory to Shopify (Recommended) or pulls from it.\n\n## Real-time Sync\nWhen an online order is placed on Shopify, it instantly appears in VowOS as a \"Fulfillment\" order. Inventory is deducted immediately, ensuring a bride in-store can't buy a veil that was just sold online.",
    "role": "OWNER",
    "status": "PUBLISHED"
  },
  {
    "title": "Role-Based Access Control (RBAC) Matrix",
    "category": "Security",
    "summary": "A deep dive into exactly what each system role can and cannot do.",
    "content": "# RBAC Matrix\n\nVowOS utilizes strict roles. Here is the breakdown:\n\n- **Stylist:** Can view Today, Appointments, Customers, and create Invoices. *Cannot* void payments, export customer lists, view store-wide financial reports, or access Settings.\n- **Alterations:** Can view the Alterations queue, update measurements, and change item statuses. *Cannot* view financial data.\n- **Store Manager:** Can issue refunds, override double-bookings, execute Purchase Orders, and view local End of Day reports. *Cannot* change global tax rates, billing, or multi-store analytics.\n- **Owner:** Full system access. Can export complete databases, change platform billing, and modify the integration API keys.\n\nTo audit what your staff is doing, Owners can view the **Security > Audit Log** to see a time-stamped history of every deleted invoice and exported report.",
    "role": "OWNER",
    "status": "PUBLISHED"
  },
  {
    "title": "Payment Terminal Errors (Stripe Reader)",
    "category": "Troubleshooting",
    "summary": "Resolving connection drops between VowOS and your physical credit card terminal.",
    "content": "# Payment Terminal Errors\n\nIf your Stripe BBPOS Smart Reader isn't capturing taps/chips:\n\n## 1. The \"Terminal Offline\" Error\nThis means the reader lost Wi-Fi.\n- Swipe right on the reader's touchscreen.\n- Go to Settings > Network and reconnect to your Wi-Fi.\n- Ensure it is on the *exact same 2.4GHz or 5GHz network* as your iPad/PC.\n\n## 2. The \"Update Required\" Error\nStripe pushes mandatory firmware updates.\n- If prompted, you must allow it to update. This takes 2-5 minutes. **Do not turn off the device** during this process.\n\n## 3. Reader Not Discovered\nIn VowOS checkout, if the reader isn't listed in the dropdown:\n- Go to **Settings > Hardware > Card Readers**.\n- Delete the reader and re-register it using the pairing code generated on the reader's screen (Settings > Generate Pairing Code).",
    "role": "EMPLOYEE",
    "status": "PUBLISHED"
  },
  {
    "title": "Manager Certification Path",
    "category": "Training",
    "summary": "Advanced training modules for Store Managers.",
    "content": "# Manager Certification Path\n\nBefore taking the keys, Store Managers must understand the operational backend of VowOS.\n\n## Core Modules\n- [ ] **Advanced Inventory:** Receiving POs, executing Cycle Counts, and reading the Variance Report.\n- [ ] **Financials:** Reconciling the End of Day report against the Stripe batch deposit.\n- [ ] **Conflict Resolution:** Issuing refunds, voiding erroneous invoices, and merging duplicate customer files.\n- [ ] **Team Management:** Onboarding new stylists and assigning correct RBAC roles.\n\nPass the integrated VowOS quiz in the Training portal to unlock your Manager Certificate!",
    "role": "STORE_MANAGER",
    "status": "PUBLISHED"
  },
  {
    "title": "Migrating Historical Data into VowOS",
    "category": "Getting Started",
    "summary": "Best practices for exporting data from BridalLive/Square and importing into VowOS.",
    "content": "# Migrating Historical Data\n\nTransitioning to a new system is daunting, but VowOS's migration wizards make it painless.\n\n## Step 1: Exporting from your Old System\nIf you are migrating from legacy software like BridalLive or Square, go to their reporting suite and export your data as CSV files. You will need separate files for:\n- Customers (First Name, Last Name, Email, Phone, Event Date)\n- Inventory (Style, Color, Size, Price, QOH)\n- Upcoming Appointments (Date, Time, Stylist, Customer)\n\n## Step 2: The Import Wizard\nNavigate to **Settings > Data Migration**.\n1. Upload your Customer CSV first (always load Customers before Appointments).\n2. **Column Mapping:** VowOS will attempt to auto-map columns (e.g., matching 'Mobile' to 'Phone'). Verify these mappings.\n3. Run the import. VowOS will flag any rows with invalid emails or missing required fields.\n\n## Step 3: Historical Sales\nWe recommend only importing active Layaways and unpaid Special Orders. Fully closed historical sales should remain in your accounting software (like QuickBooks) rather than cluttering your new system.",
    "role": "OWNER",
    "status": "PUBLISHED"
  },
  {
    "title": "Configuring Multi-Store Environments",
    "category": "Getting Started",
    "summary": "How to set up data sharing and isolation rules if you own multiple boutique locations.",
    "content": "# Multi-Store Environments\n\nVowOS is built for scaling. If you own \"Boutique A\" in New York and \"Boutique B\" in New Jersey, you can manage them both from one login.\n\n## Creating the Locations\n1. Go to **Settings > Locations** and add both stores.\n2. Assign unique tax rates to each location.\n\n## Inventory Sharing vs. Isolation\nYou must decide how your inventory behaves:\n- **Isolated:** Store A cannot see Store B's inventory. Recommended if they are completely different brands.\n- **Shared (Default):** A stylist at Store A can look up a dress, see that it's out of stock locally, but see that Store B has a size 12. They can then request a **Store Transfer** directly from the UI.\n\n## Employee Assignment\nWhen inviting staff in **Team > Roster**, you assign them a \"Home Location\". However, managers can be granted access to toggle between multiple locations using the Location Switcher in the top navigation bar.",
    "role": "OWNER",
    "status": "PUBLISHED"
  },
  {
    "title": "Handling VIP Walk-ins During Peak Hours",
    "category": "Today",
    "summary": "Scenario guide: What to do when a high-profile client arrives without an appointment on a busy Saturday.",
    "content": "# Handling VIP Walk-ins on Saturdays\n\nSaturdays are booked solid, but occasionally, a VIP (a local influencer, family friend of the owner, etc.) walks in.\n\n## 1. The Queue & Triage\nImmediately add them to the **Walk-in Queue** on the Today screen. Tag their profile with `VIP`. This flashes gold on all iPads.\n\n## 2. Re-assigning Resources\nIf all rooms are full, use the **Timeline** to identify the appointment closest to finishing (e.g., an appointment at 1h 45m out of 2h).\n- Send a polite push notification to the assigned stylist: *\"VIP waiting, wrap up Room 3 when possible.\"*\n- Move the VIP into the \"On Deck\" status for that room.\n\n## 3. The Bar / Lounge Hold\nWhile they wait, the Front Desk should utilize the \"Lounge\" status. This alerts the hospitality team to offer champagne or refreshments while the Floor Manager frees up a suite.",
    "role": "STORE_MANAGER",
    "status": "PUBLISHED"
  },
  {
    "title": "Automated Waitlist Management",
    "category": "Appointments",
    "summary": "How to let brides join a waitlist for fully booked days and automatically fill cancellations.",
    "content": "# Automated Waitlists\n\nNever lose revenue due to a cancellation again. VowOS's Waitlist feature automatically fills empty slots.\n\n## How it Works\n1. If a Saturday is 100% booked, your online booking widget will change from \"No Availability\" to \"Join Waitlist\".\n2. Brides select their preferred date and time range (e.g., \"Any time Saturday morning\").\n3. **The Trigger:** A scheduled bride calls to cancel her 10:00 AM slot. The front desk clicks **Cancel Appointment**.\n4. **The Automation:** VowOS instantly scans the waitlist for matches. It sends an automated SMS to the first match: *\"An opening just became available at 10 AM! Reply YES to claim it.\"*\n5. The first bride to reply YES automatically secures the appointment and is placed on the calendar.\n\n## Managing the Waitlist Manually\nYou can also view the Waitlist by going to **Appointments > Waitlist**. From here, you can manually override the automation and push a specific bride into an available slot.",
    "role": "STORE_MANAGER",
    "status": "PUBLISHED"
  },
  {
    "title": "Charging No-Show and Cancellation Fees",
    "category": "Appointments",
    "summary": "Set up Stripe to capture credit cards at booking and enforce your cancellation policy.",
    "content": "# Charging No-Show Fees\n\nTo drastically reduce no-shows, VowOS allows you to require a credit card on file to hold an appointment.\n\n## Configuration\n1. Go to **Settings > Appointments > Booking Policies**.\n2. Enable **Require Card on File**.\n3. Define your policy text: e.g., *\"Cancellations within 48 hours will be charged a $50 fee.\"*\n4. When a bride books online, Stripe securely vaults her card (no funds are captured yet).\n\n## Executing a Charge\nIf the bride no-shows:\n1. Click her appointment on the calendar.\n2. Click **Mark as No-Show**.\n3. A modal appears: **Capture Fee?**\n4. Enter the amount ($50) and click Charge. The vault will be processed, and an automated receipt will be emailed to the bride detailing the policy violation.",
    "role": "OWNER",
    "status": "PUBLISHED"
  },
  {
    "title": "GDPR and Data Privacy Requests",
    "category": "Customers",
    "summary": "How to completely anonymize or delete a customer record upon request.",
    "content": "# Handling Privacy Requests (GDPR/CCPA)\n\nIf a customer requests that their data be deleted, you must comply without breaking your historical financial reports.\n\n## The \"Anonymize\" Function\nNever delete an invoice. Instead, you will anonymize the Customer profile.\n\n1. Go to the Customer's 360 profile.\n2. Click the gear icon in the top right and select **Privacy / GDPR**.\n3. Click **Anonymize Customer Data**.\n4. **What happens:**\n   - First/Last Name becomes \"Anonymized Customer\".\n   - Email, Phone, and Address are permanently overwritten with random hash strings.\n   - Style notes and measurements are deleted.\n   - **Financials:** The invoices remain in your system so your Gross Sales reports are unaffected, but they are no longer tied to identifiable personal information.",
    "role": "STORE_MANAGER",
    "status": "PUBLISHED"
  },
  {
    "title": "Configuring Payment Plans (Layaway)",
    "category": "Sales",
    "summary": "Set up automated recurring billing for brides paying off their gowns over time.",
    "content": "# Payment Plans & Recurring Billing\n\nNot every bride can pay a $3,000 balance upfront. VowOS's Payment Plans automate the collections process.\n\n## Setting up a Plan\n1. Add a gown to the invoice. The balance is $3,000.\n2. Take an initial deposit via Credit Card (e.g., $1,000). Remaining balance: $2,000.\n3. Click **Setup Payment Plan**.\n4. Choose the frequency (e.g., Monthly) and the number of installments (e.g., 4 payments of $500).\n5. VowOS will vault the card used for the deposit.\n\n## Automation\nOn the scheduled dates, Stripe will automatically charge the vaulted card for $500. The invoice balance will decrease, and a receipt will be emailed to the bride.\n\n**Failed Payments:** If a card declines, the system automatically sends a \"Payment Failed - Update Card\" email with a secure link for the bride to enter a new card.",
    "role": "EMPLOYEE",
    "status": "PUBLISHED"
  },
  {
    "title": "Applying and Auditing Discounts",
    "category": "Sales",
    "summary": "How discounts affect commissions and how managers can track abuse.",
    "content": "# Applying & Auditing Discounts\n\nDiscounts are powerful closing tools, but they eat into your margins.\n\n## Applying a Discount\nOn the checkout screen, click the **%** icon next to an item.\n- You can apply a flat dollar amount ($100 off) or a percentage (10% off).\n- You must select a **Reason Code** (e.g., \"Trunk Show\", \"Floor Sample\", \"Manager Approval\").\n\n## Impact on Commission\nBy default, commissions are calculated on the *discounted* subtotal. If a stylist gives a $200 discount, their commission shrinks proportionally. This aligns their incentives with your margins.\n\n## Auditing (Manager Feature)\nTo ensure staff aren't giving away the farm:\n1. Go to **Reports > Financials > Discounts**.\n2. Review the breakdown of discounts by Stylist and by Reason Code.\n3. If you see Stylist A applying the \"Manager Approval\" discount excessively, you can revoke their discount permissions in the RBAC settings.",
    "role": "STORE_MANAGER",
    "status": "PUBLISHED"
  },
  {
    "title": "Transferring Stock Between Locations",
    "category": "Inventory",
    "summary": "The correct workflow for moving a dress from Boutique A to Boutique B.",
    "content": "# Inter-Store Transfers\n\nIf you own multiple locations, brides might want to try on a dress currently sitting at your sister store.\n\n## Initiating a Transfer\n1. **Location A (Requesting):** Go to the Inventory item and click **Request Transfer**.\n2. Select Location B as the source and enter a required date.\n\n## Fulfilling a Transfer\n1. **Location B (Fulfilling):** The manager sees a notification in the **Inventory > Transfers** queue.\n2. They locate the physical dress, pack it, and click **Mark in Transit**.\n3. The item's status changes globally to `IN_TRANSIT`, preventing anyone else from selling it.\n\n## Receiving\n1. **Location A:** When the box arrives, the manager clicks **Receive Transfer**. The inventory quantity is officially deducted from Location B and added to Location A.",
    "role": "STORE_MANAGER",
    "status": "PUBLISHED"
  },
  {
    "title": "Shift Scheduling and Time Clock",
    "category": "Team",
    "summary": "Manage staff schedules and track hourly punches.",
    "content": "# Shift Scheduling & Time Clock\n\nVowOS replaces external tools like WhenIWork for basic scheduling.\n\n## Building the Schedule\n1. Go to **Team > Schedule**.\n2. The calendar view shows your store's operating hours.\n3. Click and drag to create shifts for your staff.\n4. Click **Publish** to send email/push notifications to all staff with their upcoming week's schedule.\n\n## The Time Clock\nHourly employees must clock in to get paid.\n1. On the main Dashboard, the top right corner has a **Clock In** button.\n2. They click it when they arrive. VowOS logs their IP address and timestamps it.\n3. They clock out for lunch and at the end of the day.\n4. **Timesheet Approvals:** At the end of the week, go to **Team > Timesheets** to review and approve hours before exporting to payroll.",
    "role": "STORE_MANAGER",
    "status": "PUBLISHED"
  },
  {
    "title": "Sales by Stylist & Performance Coaching",
    "category": "Reports",
    "summary": "Identify your top performers and areas for improvement.",
    "content": "# Sales by Stylist Report\n\nThis is your most important tool for coaching your team.\n\n## Key Metrics to Watch\nNavigate to **Reports > Performance > Stylists**.\n\n1. **Close Rate:** Are they closing 40%+ of their first-time brides? If not, they may need sales training.\n2. **Average Order Value (AOV):** If their close rate is high but AOV is low, they are selling the dress but failing to upsell veils and accessories.\n3. **Return Rate:** High returns mean they are pressuring brides into buying dresses they don't actually want.\n\n## Setting Goals\nYou can set monthly revenue targets for each stylist. VowOS will generate a progress bar on their personal dashboard, gamifying their sales targets.",
    "role": "OWNER",
    "status": "PUBLISHED"
  },
  {
    "title": "Zapier Webhooks: Build Your Own Automations",
    "category": "Integrations",
    "summary": "Use Zapier to connect VowOS to 3,000+ other apps (Mailchimp, Slack, Google Sheets).",
    "content": "# Zapier & Webhooks\n\nIf we don't have a native integration for your favorite tool, you can build it using Zapier.\n\n## Triggering a Zap\n1. Go to **Settings > API & Webhooks**.\n2. Create a new Webhook. Choose the Event Trigger: e.g., `invoice.created` or `customer.booked`.\n3. Paste the URL provided by Zapier.\n\n## Example Use Cases\n- **Slack Alerts:** Send a message to your `#celebrations` channel every time a dress over $5,000 is sold.\n- **Mailchimp:** Automatically subscribe new brides to your newsletter audience.\n- **Google Sheets:** Log every walk-in to a master spreadsheet for custom reporting.\n- **Postcard API:** Trigger a physical \"Thank You\" card to be printed and mailed to the bride after her wedding date.",
    "role": "OWNER",
    "status": "PUBLISHED"
  },
  {
    "title": "Clearing Browser Cache & Hard Resets",
    "category": "Troubleshooting",
    "summary": "The first step in fixing UI glitches or slow loading times.",
    "content": "# Clearing Browser Cache\n\nVowOS is a heavy web application that caches data locally to improve speed. Sometimes, this cache gets corrupted.\n\n## Symptoms of a Bad Cache\n- Buttons aren't responding.\n- Dropdowns are empty.\n- The page layout looks \"broken\" or misaligned.\n\n## The Fix (Hard Refresh)\nDo not just click the reload button. You must clear the cache.\n- **Windows:** Press `Ctrl + Shift + R`.\n- **Mac (Chrome/Safari):** Press `Cmd + Shift + R`.\n\n## The Deep Clean\nIf a hard refresh doesn't work, clear your site data:\n1. Click the \"Lock\" icon next to the URL bar.\n2. Select **Site Settings**.\n3. Click **Clear Data**.\n4. Reload the page and log back in.",
    "role": "EMPLOYEE",
    "status": "PUBLISHED"
  },
  {
    "title": "Configuring Tax Exemptions for Out-of-State Brides",
    "category": "Getting Started",
    "summary": "How to handle interstate shipping and tax nexus requirements.",
    "content": "# Tax Exemptions & Out-of-State Shipping\n\nWhen you ship a gown out of state, you generally do not collect sales tax unless you have a physical nexus in that state.\n\n## Setting up Exemption Rules\n1. Go to **Settings > Billing & Taxes**.\n2. Ensure your default local tax rate is set up.\n3. VowOS will automatically detect when a Shipping Address is in a different state than your Boutique Location.\n4. When you create an invoice and add a Shipping Address, a prompt will appear: *\"This address is out-of-state. Remove local sales tax?\"*\n5. Click **Yes**. The invoice will recalculate to 0% tax, and an \"Out of State Exemption\" tag will be added to the invoice for audit purposes.\n\n## Manual Tax Overrides\nIf a bride is purchasing for a tax-exempt organization (e.g., a theater company):\n1. On the invoice, click the **Tax** line item.\n2. Select **Override to 0%** and enter their Tax Exempt ID number in the notes.",
    "role": "STORE_MANAGER",
    "status": "PUBLISHED"
  },
  {
    "title": "End-of-Shift Cash Drawer Reconciliation",
    "category": "Today",
    "summary": "Step-by-step process for stylists closing out their physical cash drawers.",
    "content": "# Cash Drawer Reconciliation\n\nIf you accept physical cash or paper checks, the drawer must be reconciled at the end of every shift.\n\n## Closing the Register\n1. At the end of the day, navigate to the **Today** workspace and click **Close Register**.\n2. The screen will display your Expected Cash (e.g., Starting Float $200 + Cash Sales $500 = $700 Expected).\n3. Open the physical drawer and count the bills.\n4. Enter the counted amount into the VowOS prompt.\n5. If there is a discrepancy (Over/Short), you must enter a reason (e.g., \"Gave incorrect change on Invoice #1024\").\n6. The manager on duty must enter their PIN to approve any discrepancy over $5.00.\n7. Print the Z-Report slip and include it in your deposit bag.",
    "role": "EMPLOYEE",
    "status": "PUBLISHED"
  },
  {
    "title": "Managing Alterations Appointments and Fittings",
    "category": "Appointments",
    "summary": "Tracking a bride through her 1st, 2nd, and 3rd alterations fittings.",
    "content": "# Managing Alterations Appointments\n\nAlterations follow a strict, multi-step pipeline unlike standard bridal sales.\n\n## The Fittings Pipeline\nWhen a bride's dress arrives, she will book a series of fittings. You should set up a specific Appointment Type called \"Alterations Fitting\" with a shorter duration (e.g., 45 minutes).\n\n## 1st Fitting (Pinning)\n- The seamstress pins the dress.\n- In VowOS, open the Customer 360, navigate to the **Alterations** tab on her dress, and log the pinning notes (e.g., \"Take in bust 1 inch, hem 2 inches\").\n- Set the status to **In Progress**.\n\n## 2nd Fitting (Review)\n- The bride tries on the basted dress.\n- Log any adjustments.\n\n## Final Fitting & Pickup\n- The dress is ready. Once the bride takes the dress home, mark the Alteration Status as **Completed** and the Inventory Status as **Delivered**. This permanently closes the lifecycle of the gown.",
    "role": "EMPLOYEE",
    "status": "PUBLISHED"
  },
  {
    "title": "Using the Secure Messaging Portal",
    "category": "Customers",
    "summary": "How to communicate with brides via SMS and Email directly through VowOS.",
    "content": "# The Secure Messaging Portal\n\nStop using your personal cell phone to text brides. VowOS includes an integrated Omni-channel inbox.\n\n## Sending Messages\n1. Open a Customer's 360 profile.\n2. Click the **Messages** tab.\n3. You will see a combined feed of all Emails and SMS messages sent to and from this bride.\n4. Type your message in the composer. Select the channel (Email or SMS) via the toggle.\n5. Click **Send**. SMS messages are sent from your boutique's dedicated Twilio phone number.\n\n## Automated Reply Handling\nIf a bride replies to an automated appointment reminder (e.g., *\"Can I bring 5 people instead of 3?\"*), a red notification badge will appear on the **Inbox** icon in your top navigation bar, alerting the front desk to respond.",
    "role": "EMPLOYEE",
    "status": "PUBLISHED"
  },
  {
    "title": "Managing Shipping Fees & Tracking Numbers",
    "category": "Sales",
    "summary": "Adding shipping costs to invoices and automatically notifying brides when their dress ships.",
    "content": "# Shipping Fees & Tracking\n\nWhen a bride requests that her dress be shipped to her home (or out of state), you need to manage the logistics in VowOS.\n\n## Adding Shipping to the Invoice\n1. On the checkout screen, click **Add Item** and select your \"Standard Shipping\" or \"Expedited Shipping\" service SKU.\n2. This adds the flat rate cost to the invoice.\n3. Ensure the Shipping Address is filled out on the Customer Profile.\n\n## Adding Tracking Information\nOnce you box the dress and create a label (e.g., via FedEx or UPS):\n1. Go to the Invoice.\n2. Click **Fulfillment > Add Tracking**.\n3. Enter the Carrier (FedEx) and the Tracking Number.\n4. VowOS will automatically email the bride a shipping confirmation with a clickable tracking link.",
    "role": "EMPLOYEE",
    "status": "PUBLISHED"
  },
  {
    "title": "Handling Damaged or Defective Goods (RTV)",
    "category": "Inventory",
    "summary": "How to process a Return to Vendor (RTV) when a dress arrives damaged.",
    "content": "# Damaged Goods & Returns to Vendor\n\nSometimes a dress arrives from the designer with a broken zipper or a stain. You must execute an RTV (Return to Vendor).\n\n## Initiating an RTV\n1. During the PO Receiving process, if an item is damaged, receive it as **Quarantined** instead of Active.\n2. Take photos of the damage.\n3. Contact your designer representative to receive an RA (Return Authorization) number.\n4. In VowOS, go to **Inventory > RTV**.\n5. Create a new RTV, select the quarantined item, and enter the RA number.\n6. Once shipped, mark the RTV as **Returned**.\n\n## Accounting Impact\nVowOS will automatically generate a Credit Memo in your financials, indicating that the vendor owes you a refund or credit for the defective item.",
    "role": "STORE_MANAGER",
    "status": "PUBLISHED"
  },
  {
    "title": "Setting Up Stylist Dashboards and Goals",
    "category": "Team",
    "summary": "Customizing the home screen for your sales team to keep them motivated.",
    "content": "# Stylist Dashboards & Goals\n\nVowOS gamifies the sales experience to keep your team motivated.\n\n## Configuring Goals\n1. Go to **Team > Roster** and select a Stylist.\n2. Under the **Goals** tab, you can set a Monthly Revenue Target (e.g., $40,000) and a Close Rate Target (e.g., 50%).\n3. Save the settings.\n\n## The Stylist View\nWhen the stylist logs in, their **Today** dashboard will feature a prominent progress bar tracking their real-time performance against their goals. As they close invoices, the bar fills up in real-time. If they hit 100%, the dashboard triggers a celebratory confetti animation!",
    "role": "STORE_MANAGER",
    "status": "PUBLISHED"
  },
  {
    "title": "Tracking ROI on Bridal Expos and Ads",
    "category": "Growth",
    "summary": "Using lead sources to determine which marketing channels are actually generating revenue.",
    "content": "# Tracking Marketing ROI\n\nYou spend thousands on Facebook Ads and local Bridal Expos, but which one is actually driving sales?\n\n## Capturing the Lead Source\n1. When a bride books online, she is required to answer: *\"How did you hear about us?\"*\n2. The dropdown options (e.g., \"Instagram\", \"The Knot\", \"Local Expo\") map directly to your **Lead Sources**.\n3. If a bride walks in, the front desk must ask and manually select the Lead Source when creating her profile.\n\n## Analyzing the Data\nGo to **Growth > Attribution**.\n- The report will show you the exact amount of Gross Revenue tied to each Lead Source.\n- Example: You spent $2,000 on a Bridal Expo, but the report shows $15,000 in revenue from brides who selected \"Local Expo\". That is a 7.5x ROI. You know you should book that expo again next year!",
    "role": "OWNER",
    "status": "PUBLISHED"
  },
  {
    "title": "Understanding the Tax Liability Report",
    "category": "Reports",
    "summary": "How to pull your monthly sales tax data for state remittance.",
    "content": "# The Tax Liability Report\n\nAt the end of every month or quarter, you must remit sales tax to your state/local government.\n\n## Generating the Report\n1. Go to **Reports > Financials > Taxes**.\n2. Select the specific Date Range (e.g., Last Month).\n3. The report will break down the exact amount of tax collected, separated by Tax Jurisdiction (e.g., State Tax vs. City Tax).\n4. It will also show you the total amount of *Tax Exempt* sales (e.g., out-of-state shipping) so you can report your gross vs. taxable revenue correctly.\n5. Click **Export PDF** to send to your accountant or use the data to file directly on your state's tax portal.",
    "role": "OWNER",
    "status": "PUBLISHED"
  },
  {
    "title": "Customizing the Online Booking Widget",
    "category": "Settings",
    "summary": "Embedding the VowOS booking calendar on your boutique's website.",
    "content": "# Customizing the Online Booking Widget\n\nThe VowOS Booking Widget is a lightweight iframe you can embed on your Squarespace, Wix, or Wordpress site.\n\n## Customization\n1. Go to **Settings > Appointments > Booking Widget**.\n2. **Brand Colors:** Enter your boutique's HEX color codes so the widget matches your website perfectly.\n3. **Logo:** Upload a high-res version of your logo.\n4. **Rules:** Decide how far in advance a bride must book (e.g., \"Require 24 hours notice\").\n\n## Embedding\nCopy the generated HTML `<script>` snippet. Paste it into the \"Custom Code\" or \"HTML Block\" section of your website builder on your /appointments page. Any changes you make in VowOS will automatically update the live widget on your site.",
    "role": "OWNER",
    "status": "PUBLISHED"
  },
  {
    "title": "Mailchimp and Klaviyo Synchronization",
    "category": "Integrations",
    "summary": "Keep your email marketing audiences constantly up to date.",
    "content": "# Mailchimp & Klaviyo Integrations\n\nIf you prefer to use dedicated email marketing software instead of VowOS's built-in campaigns, you can sync your lists seamlessly.\n\n## The Sync Logic\nVowOS operates a one-way sync to Mailchimp/Klaviyo. \nWhen a customer is created in VowOS, they are added to your designated Audience List. Crucially, VowOS syncs their **Status Tags** (e.g., `Bride`, `Purchased`, `Wedding Passed`).\n\n## Setup\n1. Go to **Settings > Integrations** and select your platform.\n2. Paste your API Key.\n3. Select which Audience List to sync to.\n4. Now, in Mailchimp, you can create segments like: *\"Send a promotional email to all users tagged with 'Bride' but NOT tagged with 'Purchased'\"*.",
    "role": "OWNER",
    "status": "PUBLISHED"
  },
  {
    "title": "Understanding Your Invoice & Usage Limits",
    "category": "Billing",
    "summary": "How VowOS calculates your monthly subscription and overages.",
    "content": "# Understanding Your Billing\n\nVowOS charges a base platform fee, plus usage-based billing for certain features.\n\n## Base Subscription\nGo to **Settings > Platform Billing**. Your current plan (e.g., \"Pro Boutique\") covers up to 3 Locations and 15 Staff Members. It includes 5,000 outbound SMS messages per month.\n\n## Usage Overages\nIf you exceed your plan's limits, you will be billed for overages at the end of the month:\n- **SMS Overages:** $0.02 per additional SMS segment.\n- **Storage:** Exceeding your allotted file storage (for hi-res dress images and customer attachments).\n\nTo view a real-time gauge of your monthly usage, check the **Usage Dashboard** within the Billing tab.",
    "role": "OWNER",
    "status": "PUBLISHED"
  },
  {
    "title": "Using the iPad App Offline",
    "category": "Mobile",
    "summary": "How to continue working when your boutique's internet goes down.",
    "content": "# Using the iPad App Offline\n\nInternet outages happen. The VowOS iPad app is designed to keep your floor running even when the Wi-Fi drops.\n\n## Offline Mode Activation\nIf the iPad loses connection, a yellow banner will appear at the top of the screen: **\"Offline Mode Active\"**.\n\n## What You Can Do:\n- You can still view today's schedule and all pre-loaded Customer profiles.\n- You can write style notes and add dresses to a bride's \"Favorites\" list.\n- You can scan inventory barcodes to view item details.\n\n## What You Cannot Do:\n- You *cannot* process live credit card transactions.\n- You *cannot* sync changes to other iPads.\n\n## Re-syncing\nWhen Wi-Fi is restored, the yellow banner will turn green and say **\"Syncing...\"**. All notes and favorites you created offline will automatically push to the cloud.",
    "role": "EMPLOYEE",
    "status": "PUBLISHED"
  },
  {
    "title": "Reviewing the Audit Logs for Fraud",
    "category": "Security",
    "summary": "How owners can monitor the system for suspicious activity.",
    "content": "# Reviewing the Audit Logs\n\nThe Audit Log is an immutable record of every critical action taken in VowOS. This protects you against internal theft or accidental data loss.\n\n## Accessing the Logs\nGo to **Settings > Security > Audit Logs**. (This is restricted strictly to Owners).\n\n## Key Events to Monitor\nFilter the log for the following high-risk events:\n- `INVOICE_VOIDED`: A stylist voided a transaction entirely.\n- `DISCOUNT_APPLIED_MANUAL`: A custom discount was applied without a pre-approved reason code.\n- `CUSTOMER_DELETED`: Someone attempted to delete a customer record.\n- `DATA_EXPORTED`: A staff member downloaded a CSV of your customer or inventory data.\n\nIf you see a stylist exporting data at 2:00 AM, you can immediately suspend their account from the Roster.",
    "role": "OWNER",
    "status": "PUBLISHED"
  },
  {
    "title": "Emails Going to Spam / Deliverability Issues",
    "category": "Troubleshooting",
    "summary": "Steps to fix poor email deliverability for your appointment confirmations.",
    "content": "# Fixing Email Deliverability\n\nIf brides are complaining that they aren't receiving their appointment confirmations or receipts, your emails might be landing in their Spam folders.\n\n## The Solution: Domain Verification (DKIM/SPF)\nBy default, VowOS sends emails from `noreply@vowos.com` on your behalf. To improve deliverability, you should verify your boutique's custom domain (e.g., `hello@myboutique.com`).\n\n1. Go to **Settings > Communications > Email Setup**.\n2. Enter your custom domain.\n3. VowOS will generate three DNS records (CNAME and TXT).\n4. Log into your domain registrar (GoDaddy, Namecheap, Google Domains) and add these records to your DNS settings.\n5. Click **Verify** in VowOS. Once verified, all emails will be cryptographically signed as originating from your boutique, drastically reducing spam placement.",
    "role": "OWNER",
    "status": "PUBLISHED"
  },
  {
    "title": "Roleplay Scenarios for New Hires",
    "category": "Training",
    "summary": "Practice scripts and scenarios to run in the Sandbox environment.",
    "content": "# Roleplay Scenarios for New Hires\n\nBefore letting a new stylist operate VowOS live with a real bride, run these practice scenarios in your VowOS Sandbox Environment.\n\n## Scenario 1: The Hesitant Buyer\n- **Setup:** Create a fake appointment. Hand the iPad to the trainee.\n- **Action:** Have them navigate to the bride's profile, view her Pinterest integration board, and \"Favorite\" three dresses.\n- **Goal:** Trainee successfully adds the dresses to the Cart, but then places them on \"Hold\" instead of checking out.\n\n## Scenario 2: The Split Payment Sale\n- **Setup:** The trainee must ring up a $3,500 Special Order gown.\n- **Action:** Roleplay as the Mother of the Bride. Say, \"I am paying $2,000 on my card, and my daughter is paying the rest in cash.\"\n- **Goal:** Trainee successfully uses the Multi-Tender checkout flow, applies the correct tax rate, and captures the digital signature on the iPad.",
    "role": "STORE_MANAGER",
    "status": "PUBLISHED"
  }
];

export async function seedKnowledgeBase() {
  console.log('Starting Knowledge Base Seed...');

  for (const catName of categories) {
    const slug = slugify(catName);
    const { error } = await supabase
      .from('help_categories')
      .upsert({ slug, title: catName }, { onConflict: 'slug' });
    if (error) console.error(`Failed to upsert category: ${catName}`, error);
    else console.log(`Upserted category: ${catName}`);
  }

  const { data: catData, error: catError } = await supabase.from('help_categories').select('id, title');
  if (catError || !catData) return console.error('Failed to fetch categories', catError);

  const categoryMap = new Map();
  catData.forEach(c => categoryMap.set(c.title, c.id));

  for (const article of articles) {
    const category_id = categoryMap.get(article.category);
    if (!category_id) continue;
    
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

    if (error) console.error(`Failed to upsert article: ${article.title}`, error);
    else console.log(`Upserted article: ${article.title}`);
  }

  console.log('Knowledge Base Seed completed.');
}

if (require.main === module || process.argv[1]?.endsWith('seed_knowledge_base.ts')) {
  seedKnowledgeBase().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
  });
}
