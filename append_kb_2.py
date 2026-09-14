import json

additional_articles = [
    # --- GETTING STARTED ---
    {
        "title": "Configuring Tax Exemptions for Out-of-State Brides",
        "category": "Getting Started",
        "summary": "How to handle interstate shipping and tax nexus requirements.",
        "content": "# Tax Exemptions & Out-of-State Shipping\n\nWhen you ship a gown out of state, you generally do not collect sales tax unless you have a physical nexus in that state.\n\n## Setting up Exemption Rules\n1. Go to **Settings > Billing & Taxes**.\n2. Ensure your default local tax rate is set up.\n3. VowOS will automatically detect when a Shipping Address is in a different state than your Boutique Location.\n4. When you create an invoice and add a Shipping Address, a prompt will appear: *\"This address is out-of-state. Remove local sales tax?\"*\n5. Click **Yes**. The invoice will recalculate to 0% tax, and an \"Out of State Exemption\" tag will be added to the invoice for audit purposes.\n\n## Manual Tax Overrides\nIf a bride is purchasing for a tax-exempt organization (e.g., a theater company):\n1. On the invoice, click the **Tax** line item.\n2. Select **Override to 0%** and enter their Tax Exempt ID number in the notes.",
        "role": "STORE_MANAGER",
        "status": "PUBLISHED"
    },
    
    # --- TODAY ---
    {
        "title": "End-of-Shift Cash Drawer Reconciliation",
        "category": "Today",
        "summary": "Step-by-step process for stylists closing out their physical cash drawers.",
        "content": "# Cash Drawer Reconciliation\n\nIf you accept physical cash or paper checks, the drawer must be reconciled at the end of every shift.\n\n## Closing the Register\n1. At the end of the day, navigate to the **Today** workspace and click **Close Register**.\n2. The screen will display your Expected Cash (e.g., Starting Float $200 + Cash Sales $500 = $700 Expected).\n3. Open the physical drawer and count the bills.\n4. Enter the counted amount into the VowOS prompt.\n5. If there is a discrepancy (Over/Short), you must enter a reason (e.g., \"Gave incorrect change on Invoice #1024\").\n6. The manager on duty must enter their PIN to approve any discrepancy over $5.00.\n7. Print the Z-Report slip and include it in your deposit bag.",
        "role": "EMPLOYEE",
        "status": "PUBLISHED"
    },
    
    # --- APPOINTMENTS ---
    {
        "title": "Managing Alterations Appointments and Fittings",
        "category": "Appointments",
        "summary": "Tracking a bride through her 1st, 2nd, and 3rd alterations fittings.",
        "content": "# Managing Alterations Appointments\n\nAlterations follow a strict, multi-step pipeline unlike standard bridal sales.\n\n## The Fittings Pipeline\nWhen a bride's dress arrives, she will book a series of fittings. You should set up a specific Appointment Type called \"Alterations Fitting\" with a shorter duration (e.g., 45 minutes).\n\n## 1st Fitting (Pinning)\n- The seamstress pins the dress.\n- In VowOS, open the Customer 360, navigate to the **Alterations** tab on her dress, and log the pinning notes (e.g., \"Take in bust 1 inch, hem 2 inches\").\n- Set the status to **In Progress**.\n\n## 2nd Fitting (Review)\n- The bride tries on the basted dress.\n- Log any adjustments.\n\n## Final Fitting & Pickup\n- The dress is ready. Once the bride takes the dress home, mark the Alteration Status as **Completed** and the Inventory Status as **Delivered**. This permanently closes the lifecycle of the gown.",
        "role": "EMPLOYEE",
        "status": "PUBLISHED"
    },
    
    # --- CUSTOMERS ---
    {
        "title": "Using the Secure Messaging Portal",
        "category": "Customers",
        "summary": "How to communicate with brides via SMS and Email directly through VowOS.",
        "content": "# The Secure Messaging Portal\n\nStop using your personal cell phone to text brides. VowOS includes an integrated Omni-channel inbox.\n\n## Sending Messages\n1. Open a Customer's 360 profile.\n2. Click the **Messages** tab.\n3. You will see a combined feed of all Emails and SMS messages sent to and from this bride.\n4. Type your message in the composer. Select the channel (Email or SMS) via the toggle.\n5. Click **Send**. SMS messages are sent from your boutique's dedicated Twilio phone number.\n\n## Automated Reply Handling\nIf a bride replies to an automated appointment reminder (e.g., *\"Can I bring 5 people instead of 3?\"*), a red notification badge will appear on the **Inbox** icon in your top navigation bar, alerting the front desk to respond.",
        "role": "EMPLOYEE",
        "status": "PUBLISHED"
    },
    
    # --- SALES ---
    {
        "title": "Managing Shipping Fees & Tracking Numbers",
        "category": "Sales",
        "summary": "Adding shipping costs to invoices and automatically notifying brides when their dress ships.",
        "content": "# Shipping Fees & Tracking\n\nWhen a bride requests that her dress be shipped to her home (or out of state), you need to manage the logistics in VowOS.\n\n## Adding Shipping to the Invoice\n1. On the checkout screen, click **Add Item** and select your \"Standard Shipping\" or \"Expedited Shipping\" service SKU.\n2. This adds the flat rate cost to the invoice.\n3. Ensure the Shipping Address is filled out on the Customer Profile.\n\n## Adding Tracking Information\nOnce you box the dress and create a label (e.g., via FedEx or UPS):\n1. Go to the Invoice.\n2. Click **Fulfillment > Add Tracking**.\n3. Enter the Carrier (FedEx) and the Tracking Number.\n4. VowOS will automatically email the bride a shipping confirmation with a clickable tracking link.",
        "role": "EMPLOYEE",
        "status": "PUBLISHED"
    },
    
    # --- INVENTORY ---
    {
        "title": "Handling Damaged or Defective Goods (RTV)",
        "category": "Inventory",
        "summary": "How to process a Return to Vendor (RTV) when a dress arrives damaged.",
        "content": "# Damaged Goods & Returns to Vendor\n\nSometimes a dress arrives from the designer with a broken zipper or a stain. You must execute an RTV (Return to Vendor).\n\n## Initiating an RTV\n1. During the PO Receiving process, if an item is damaged, receive it as **Quarantined** instead of Active.\n2. Take photos of the damage.\n3. Contact your designer representative to receive an RA (Return Authorization) number.\n4. In VowOS, go to **Inventory > RTV**.\n5. Create a new RTV, select the quarantined item, and enter the RA number.\n6. Once shipped, mark the RTV as **Returned**.\n\n## Accounting Impact\nVowOS will automatically generate a Credit Memo in your financials, indicating that the vendor owes you a refund or credit for the defective item.",
        "role": "STORE_MANAGER",
        "status": "PUBLISHED"
    },
    
    # --- TEAM ---
    {
        "title": "Setting Up Stylist Dashboards and Goals",
        "category": "Team",
        "summary": "Customizing the home screen for your sales team to keep them motivated.",
        "content": "# Stylist Dashboards & Goals\n\nVowOS gamifies the sales experience to keep your team motivated.\n\n## Configuring Goals\n1. Go to **Team > Roster** and select a Stylist.\n2. Under the **Goals** tab, you can set a Monthly Revenue Target (e.g., $40,000) and a Close Rate Target (e.g., 50%).\n3. Save the settings.\n\n## The Stylist View\nWhen the stylist logs in, their **Today** dashboard will feature a prominent progress bar tracking their real-time performance against their goals. As they close invoices, the bar fills up in real-time. If they hit 100%, the dashboard triggers a celebratory confetti animation!",
        "role": "STORE_MANAGER",
        "status": "PUBLISHED"
    },
    
    # --- GROWTH ---
    {
        "title": "Tracking ROI on Bridal Expos and Ads",
        "category": "Growth",
        "summary": "Using lead sources to determine which marketing channels are actually generating revenue.",
        "content": "# Tracking Marketing ROI\n\nYou spend thousands on Facebook Ads and local Bridal Expos, but which one is actually driving sales?\n\n## Capturing the Lead Source\n1. When a bride books online, she is required to answer: *\"How did you hear about us?\"*\n2. The dropdown options (e.g., \"Instagram\", \"The Knot\", \"Local Expo\") map directly to your **Lead Sources**.\n3. If a bride walks in, the front desk must ask and manually select the Lead Source when creating her profile.\n\n## Analyzing the Data\nGo to **Growth > Attribution**.\n- The report will show you the exact amount of Gross Revenue tied to each Lead Source.\n- Example: You spent $2,000 on a Bridal Expo, but the report shows $15,000 in revenue from brides who selected \"Local Expo\". That is a 7.5x ROI. You know you should book that expo again next year!",
        "role": "OWNER",
        "status": "PUBLISHED"
    },
    
    # --- REPORTS ---
    {
        "title": "Understanding the Tax Liability Report",
        "category": "Reports",
        "summary": "How to pull your monthly sales tax data for state remittance.",
        "content": "# The Tax Liability Report\n\nAt the end of every month or quarter, you must remit sales tax to your state/local government.\n\n## Generating the Report\n1. Go to **Reports > Financials > Taxes**.\n2. Select the specific Date Range (e.g., Last Month).\n3. The report will break down the exact amount of tax collected, separated by Tax Jurisdiction (e.g., State Tax vs. City Tax).\n4. It will also show you the total amount of *Tax Exempt* sales (e.g., out-of-state shipping) so you can report your gross vs. taxable revenue correctly.\n5. Click **Export PDF** to send to your accountant or use the data to file directly on your state's tax portal.",
        "role": "OWNER",
        "status": "PUBLISHED"
    },
    
    # --- SETTINGS ---
    {
        "title": "Customizing the Online Booking Widget",
        "category": "Settings",
        "summary": "Embedding the VowOS booking calendar on your boutique's website.",
        "content": "# Customizing the Online Booking Widget\n\nThe VowOS Booking Widget is a lightweight iframe you can embed on your Squarespace, Wix, or Wordpress site.\n\n## Customization\n1. Go to **Settings > Appointments > Booking Widget**.\n2. **Brand Colors:** Enter your boutique's HEX color codes so the widget matches your website perfectly.\n3. **Logo:** Upload a high-res version of your logo.\n4. **Rules:** Decide how far in advance a bride must book (e.g., \"Require 24 hours notice\").\n\n## Embedding\nCopy the generated HTML `<script>` snippet. Paste it into the \"Custom Code\" or \"HTML Block\" section of your website builder on your /appointments page. Any changes you make in VowOS will automatically update the live widget on your site.",
        "role": "OWNER",
        "status": "PUBLISHED"
    },
    
    # --- INTEGRATIONS ---
    {
        "title": "Mailchimp and Klaviyo Synchronization",
        "category": "Integrations",
        "summary": "Keep your email marketing audiences constantly up to date.",
        "content": "# Mailchimp & Klaviyo Integrations\n\nIf you prefer to use dedicated email marketing software instead of VowOS's built-in campaigns, you can sync your lists seamlessly.\n\n## The Sync Logic\nVowOS operates a one-way sync to Mailchimp/Klaviyo. \nWhen a customer is created in VowOS, they are added to your designated Audience List. Crucially, VowOS syncs their **Status Tags** (e.g., `Bride`, `Purchased`, `Wedding Passed`).\n\n## Setup\n1. Go to **Settings > Integrations** and select your platform.\n2. Paste your API Key.\n3. Select which Audience List to sync to.\n4. Now, in Mailchimp, you can create segments like: *\"Send a promotional email to all users tagged with 'Bride' but NOT tagged with 'Purchased'\"*.",
        "role": "OWNER",
        "status": "PUBLISHED"
    },
    
    # --- BILLING ---
    {
        "title": "Understanding Your Invoice & Usage Limits",
        "category": "Billing",
        "summary": "How VowOS calculates your monthly subscription and overages.",
        "content": "# Understanding Your Billing\n\nVowOS charges a base platform fee, plus usage-based billing for certain features.\n\n## Base Subscription\nGo to **Settings > Platform Billing**. Your current plan (e.g., \"Pro Boutique\") covers up to 3 Locations and 15 Staff Members. It includes 5,000 outbound SMS messages per month.\n\n## Usage Overages\nIf you exceed your plan's limits, you will be billed for overages at the end of the month:\n- **SMS Overages:** $0.02 per additional SMS segment.\n- **Storage:** Exceeding your allotted file storage (for hi-res dress images and customer attachments).\n\nTo view a real-time gauge of your monthly usage, check the **Usage Dashboard** within the Billing tab.",
        "role": "OWNER",
        "status": "PUBLISHED"
    },
    
    # --- MOBILE ---
    {
        "title": "Using the iPad App Offline",
        "category": "Mobile",
        "summary": "How to continue working when your boutique's internet goes down.",
        "content": "# Using the iPad App Offline\n\nInternet outages happen. The VowOS iPad app is designed to keep your floor running even when the Wi-Fi drops.\n\n## Offline Mode Activation\nIf the iPad loses connection, a yellow banner will appear at the top of the screen: **\"Offline Mode Active\"**.\n\n## What You Can Do:\n- You can still view today's schedule and all pre-loaded Customer profiles.\n- You can write style notes and add dresses to a bride's \"Favorites\" list.\n- You can scan inventory barcodes to view item details.\n\n## What You Cannot Do:\n- You *cannot* process live credit card transactions.\n- You *cannot* sync changes to other iPads.\n\n## Re-syncing\nWhen Wi-Fi is restored, the yellow banner will turn green and say **\"Syncing...\"**. All notes and favorites you created offline will automatically push to the cloud.",
        "role": "EMPLOYEE",
        "status": "PUBLISHED"
    },
    
    # --- SECURITY ---
    {
        "title": "Reviewing the Audit Logs for Fraud",
        "category": "Security",
        "summary": "How owners can monitor the system for suspicious activity.",
        "content": "# Reviewing the Audit Logs\n\nThe Audit Log is an immutable record of every critical action taken in VowOS. This protects you against internal theft or accidental data loss.\n\n## Accessing the Logs\nGo to **Settings > Security > Audit Logs**. (This is restricted strictly to Owners).\n\n## Key Events to Monitor\nFilter the log for the following high-risk events:\n- `INVOICE_VOIDED`: A stylist voided a transaction entirely.\n- `DISCOUNT_APPLIED_MANUAL`: A custom discount was applied without a pre-approved reason code.\n- `CUSTOMER_DELETED`: Someone attempted to delete a customer record.\n- `DATA_EXPORTED`: A staff member downloaded a CSV of your customer or inventory data.\n\nIf you see a stylist exporting data at 2:00 AM, you can immediately suspend their account from the Roster.",
        "role": "OWNER",
        "status": "PUBLISHED"
    },
    
    # --- TROUBLESHOOTING ---
    {
        "title": "Emails Going to Spam / Deliverability Issues",
        "category": "Troubleshooting",
        "summary": "Steps to fix poor email deliverability for your appointment confirmations.",
        "content": "# Fixing Email Deliverability\n\nIf brides are complaining that they aren't receiving their appointment confirmations or receipts, your emails might be landing in their Spam folders.\n\n## The Solution: Domain Verification (DKIM/SPF)\nBy default, VowOS sends emails from `noreply@vowos.com` on your behalf. To improve deliverability, you should verify your boutique's custom domain (e.g., `hello@myboutique.com`).\n\n1. Go to **Settings > Communications > Email Setup**.\n2. Enter your custom domain.\n3. VowOS will generate three DNS records (CNAME and TXT).\n4. Log into your domain registrar (GoDaddy, Namecheap, Google Domains) and add these records to your DNS settings.\n5. Click **Verify** in VowOS. Once verified, all emails will be cryptographically signed as originating from your boutique, drastically reducing spam placement.",
        "role": "OWNER",
        "status": "PUBLISHED"
    },
    
    # --- TRAINING ---
    {
        "title": "Roleplay Scenarios for New Hires",
        "category": "Training",
        "summary": "Practice scripts and scenarios to run in the Sandbox environment.",
        "content": "# Roleplay Scenarios for New Hires\n\nBefore letting a new stylist operate VowOS live with a real bride, run these practice scenarios in your VowOS Sandbox Environment.\n\n## Scenario 1: The Hesitant Buyer\n- **Setup:** Create a fake appointment. Hand the iPad to the trainee.\n- **Action:** Have them navigate to the bride's profile, view her Pinterest integration board, and \"Favorite\" three dresses.\n- **Goal:** Trainee successfully adds the dresses to the Cart, but then places them on \"Hold\" instead of checking out.\n\n## Scenario 2: The Split Payment Sale\n- **Setup:** The trainee must ring up a $3,500 Special Order gown.\n- **Action:** Roleplay as the Mother of the Bride. Say, \"I am paying $2,000 on my card, and my daughter is paying the rest in cash.\"\n- **Goal:** Trainee successfully uses the Multi-Tender checkout flow, applies the correct tax rate, and captures the digital signature on the iPad.",
        "role": "STORE_MANAGER",
        "status": "PUBLISHED"
    }
]

import json
import re

file_path = "apps/marketing/worker/src/jobs/seed_knowledge_base.ts"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

match = re.search(r"const articles = (\[.*?\]);", content, re.DOTALL)
if match:
    existing_articles = json.loads(match.group(1))
    existing_articles.extend(additional_articles)
    
    new_articles_json = json.dumps(existing_articles, indent=2)
    new_content = content[:match.start(1)] + new_articles_json + content[match.end(1):]
    
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(new_content)
    print(f"Added {len(additional_articles)} MORE robust articles! Total is now {len(existing_articles)}")
else:
    print("Could not find articles array in the file.")
