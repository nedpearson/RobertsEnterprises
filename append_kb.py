import json

additional_articles = [
    # --- GETTING STARTED ---
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

    # --- TODAY ---
    {
        "title": "Handling VIP Walk-ins During Peak Hours",
        "category": "Today",
        "summary": "Scenario guide: What to do when a high-profile client arrives without an appointment on a busy Saturday.",
        "content": "# Handling VIP Walk-ins on Saturdays\n\nSaturdays are booked solid, but occasionally, a VIP (a local influencer, family friend of the owner, etc.) walks in.\n\n## 1. The Queue & Triage\nImmediately add them to the **Walk-in Queue** on the Today screen. Tag their profile with `VIP`. This flashes gold on all iPads.\n\n## 2. Re-assigning Resources\nIf all rooms are full, use the **Timeline** to identify the appointment closest to finishing (e.g., an appointment at 1h 45m out of 2h).\n- Send a polite push notification to the assigned stylist: *\"VIP waiting, wrap up Room 3 when possible.\"*\n- Move the VIP into the \"On Deck\" status for that room.\n\n## 3. The Bar / Lounge Hold\nWhile they wait, the Front Desk should utilize the \"Lounge\" status. This alerts the hospitality team to offer champagne or refreshments while the Floor Manager frees up a suite.",
        "role": "STORE_MANAGER",
        "status": "PUBLISHED"
    },

    # --- APPOINTMENTS ---
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

    # --- CUSTOMERS ---
    {
        "title": "GDPR and Data Privacy Requests",
        "category": "Customers",
        "summary": "How to completely anonymize or delete a customer record upon request.",
        "content": "# Handling Privacy Requests (GDPR/CCPA)\n\nIf a customer requests that their data be deleted, you must comply without breaking your historical financial reports.\n\n## The \"Anonymize\" Function\nNever delete an invoice. Instead, you will anonymize the Customer profile.\n\n1. Go to the Customer's 360 profile.\n2. Click the gear icon in the top right and select **Privacy / GDPR**.\n3. Click **Anonymize Customer Data**.\n4. **What happens:**\n   - First/Last Name becomes \"Anonymized Customer\".\n   - Email, Phone, and Address are permanently overwritten with random hash strings.\n   - Style notes and measurements are deleted.\n   - **Financials:** The invoices remain in your system so your Gross Sales reports are unaffected, but they are no longer tied to identifiable personal information.",
        "role": "STORE_MANAGER",
        "status": "PUBLISHED"
    },

    # --- SALES ---
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

    # --- INVENTORY ---
    {
        "title": "Transferring Stock Between Locations",
        "category": "Inventory",
        "summary": "The correct workflow for moving a dress from Boutique A to Boutique B.",
        "content": "# Inter-Store Transfers\n\nIf you own multiple locations, brides might want to try on a dress currently sitting at your sister store.\n\n## Initiating a Transfer\n1. **Location A (Requesting):** Go to the Inventory item and click **Request Transfer**.\n2. Select Location B as the source and enter a required date.\n\n## Fulfilling a Transfer\n1. **Location B (Fulfilling):** The manager sees a notification in the **Inventory > Transfers** queue.\n2. They locate the physical dress, pack it, and click **Mark in Transit**.\n3. The item's status changes globally to `IN_TRANSIT`, preventing anyone else from selling it.\n\n## Receiving\n1. **Location A:** When the box arrives, the manager clicks **Receive Transfer**. The inventory quantity is officially deducted from Location B and added to Location A.",
        "role": "STORE_MANAGER",
        "status": "PUBLISHED"
    },

    # --- TEAM ---
    {
        "title": "Shift Scheduling and Time Clock",
        "category": "Team",
        "summary": "Manage staff schedules and track hourly punches.",
        "content": "# Shift Scheduling & Time Clock\n\nVowOS replaces external tools like WhenIWork for basic scheduling.\n\n## Building the Schedule\n1. Go to **Team > Schedule**.\n2. The calendar view shows your store's operating hours.\n3. Click and drag to create shifts for your staff.\n4. Click **Publish** to send email/push notifications to all staff with their upcoming week's schedule.\n\n## The Time Clock\nHourly employees must clock in to get paid.\n1. On the main Dashboard, the top right corner has a **Clock In** button.\n2. They click it when they arrive. VowOS logs their IP address and timestamps it.\n3. They clock out for lunch and at the end of the day.\n4. **Timesheet Approvals:** At the end of the week, go to **Team > Timesheets** to review and approve hours before exporting to payroll.",
        "role": "STORE_MANAGER",
        "status": "PUBLISHED"
    },

    # --- REPORTS ---
    {
        "title": "Sales by Stylist & Performance Coaching",
        "category": "Reports",
        "summary": "Identify your top performers and areas for improvement.",
        "content": "# Sales by Stylist Report\n\nThis is your most important tool for coaching your team.\n\n## Key Metrics to Watch\nNavigate to **Reports > Performance > Stylists**.\n\n1. **Close Rate:** Are they closing 40%+ of their first-time brides? If not, they may need sales training.\n2. **Average Order Value (AOV):** If their close rate is high but AOV is low, they are selling the dress but failing to upsell veils and accessories.\n3. **Return Rate:** High returns mean they are pressuring brides into buying dresses they don't actually want.\n\n## Setting Goals\nYou can set monthly revenue targets for each stylist. VowOS will generate a progress bar on their personal dashboard, gamifying their sales targets.",
        "role": "OWNER",
        "status": "PUBLISHED"
    },

    # --- INTEGRATIONS ---
    {
        "title": "Zapier Webhooks: Build Your Own Automations",
        "category": "Integrations",
        "summary": "Use Zapier to connect VowOS to 3,000+ other apps (Mailchimp, Slack, Google Sheets).",
        "content": "# Zapier & Webhooks\n\nIf we don't have a native integration for your favorite tool, you can build it using Zapier.\n\n## Triggering a Zap\n1. Go to **Settings > API & Webhooks**.\n2. Create a new Webhook. Choose the Event Trigger: e.g., `invoice.created` or `customer.booked`.\n3. Paste the URL provided by Zapier.\n\n## Example Use Cases\n- **Slack Alerts:** Send a message to your `#celebrations` channel every time a dress over $5,000 is sold.\n- **Mailchimp:** Automatically subscribe new brides to your newsletter audience.\n- **Google Sheets:** Log every walk-in to a master spreadsheet for custom reporting.\n- **Postcard API:** Trigger a physical \"Thank You\" card to be printed and mailed to the bride after her wedding date.",
        "role": "OWNER",
        "status": "PUBLISHED"
    },
    
    # --- TROUBLESHOOTING ---
    {
        "title": "Clearing Browser Cache & Hard Resets",
        "category": "Troubleshooting",
        "summary": "The first step in fixing UI glitches or slow loading times.",
        "content": "# Clearing Browser Cache\n\nVowOS is a heavy web application that caches data locally to improve speed. Sometimes, this cache gets corrupted.\n\n## Symptoms of a Bad Cache\n- Buttons aren't responding.\n- Dropdowns are empty.\n- The page layout looks \"broken\" or misaligned.\n\n## The Fix (Hard Refresh)\nDo not just click the reload button. You must clear the cache.\n- **Windows:** Press `Ctrl + Shift + R`.\n- **Mac (Chrome/Safari):** Press `Cmd + Shift + R`.\n\n## The Deep Clean\nIf a hard refresh doesn't work, clear your site data:\n1. Click the \"Lock\" icon next to the URL bar.\n2. Select **Site Settings**.\n3. Click **Clear Data**.\n4. Reload the page and log back in.",
        "role": "EMPLOYEE",
        "status": "PUBLISHED"
    }
]

file_path = "apps/marketing/worker/src/jobs/seed_knowledge_base.ts"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# We need to parse the existing JSON out of the file, append to it, and write it back.
import re
match = re.search(r"const articles = (\[.*?\]);", content, re.DOTALL)
if match:
    existing_articles = json.loads(match.group(1))
    existing_articles.extend(additional_articles)
    
    new_articles_json = json.dumps(existing_articles, indent=2)
    new_content = content[:match.start(1)] + new_articles_json + content[match.end(1):]
    
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(new_content)
    print(f"Added {len(additional_articles)} new robust articles!")
else:
    print("Could not find articles array in the file.")
