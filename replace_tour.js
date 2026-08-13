const fs = require('fs');
const file = 'apps/marketing/src/lib/demo/scenariosLibrary.ts';
let content = fs.readFileSync(file, 'utf8');
const searchString = `id: 'scenario-0-master-tour',`;
const nextSearchString = `id: 'scenario-owner-overview',`;

const startIndex = content.indexOf(searchString);
const prevObjectStart = content.lastIndexOf('{', startIndex);
const nextScenario = content.indexOf(nextSearchString);
const prevNextObjectStart = content.lastIndexOf('{', nextScenario);

const newScenario = `{
    id: 'scenario-0-master-tour',
    name: '0. VowOS Complete Business Tour',
    description: 'The definitive end-to-end customer journey from marketing through booking, sale, inventory, and executive analytics.',
    targetRole: 'Owner',
    startRoute: 'dashboard',
    estimatedMinutes: 10,
    difficulty: 'Advanced',
    steps: [
      {
        id: 'flagship-1',
        route: 'dashboard',
        targetId: 'hero-banner',
        narrationText: 'Welcome to VowOS. We start on the Executive Dashboard where the owner has complete visibility. Let us trace a single customer journey, beginning with how they find us.',
        caption: 'Owner Dashboard',
        action: 'explain',
      },
      {
        id: 'flagship-2',
        route: 'marketing',
        targetId: 'nav-marketing',
        narrationText: 'It all starts with Marketing. Here you can see active campaigns running across social channels driving traffic to your website.',
        caption: 'Marketing Campaign Overview',
        action: 'click',
        waitForRoute: 'marketing',
      },
      {
        id: 'flagship-3',
        route: 'marketing',
        targetId: 'campaign-instagram',
        narrationText: 'An engaged bride clicks our Instagram ad and lands on the boutique website to make an inquiry.',
        caption: 'Website Inquiry Generation',
        action: 'explain',
      },
      {
        id: 'flagship-4',
        route: 'leads',
        targetId: 'nav-leads',
        narrationText: 'That inquiry flows directly into the VowOS Lead Pipeline, preventing any missed opportunities.',
        caption: 'Lead Pipeline',
        action: 'click',
        waitForRoute: 'leads',
      },
      {
        id: 'flagship-5',
        route: 'messages',
        targetId: 'nav-messages',
        narrationText: 'Your team reaches out instantly. VowOS Unified Communications keeps SMS, email, and social messages in one continuous thread.',
        caption: 'Customer Conversation',
        action: 'click',
        waitForRoute: 'messages',
      },
      {
        id: 'flagship-6',
        route: 'dashboard',
        targetId: 'nav-booking',
        narrationText: 'The bride decides to book. Our premium, brand-aligned public booking engine allows her to seamlessly secure her bridal fitting online.',
        caption: 'Beautiful Online Booking',
        action: 'explain',
      },
      {
        id: 'flagship-7',
        route: 'calendar',
        targetId: 'nav-calendar',
        narrationText: 'The appointment is instantly synchronized to the master calendar without double-booking, visible to the entire staff.',
        caption: 'Master Calendar Synchronization',
        action: 'click',
        waitForRoute: 'calendar',
      },
      {
        id: 'flagship-8',
        route: 'calendar',
        targetId: 'check-in-button',
        narrationText: 'When the bride arrives at the boutique, the front desk checks her in with a single click, notifying her consultant.',
        caption: 'Customer Arrival & Check-In',
        action: 'explain',
      },
      {
        id: 'flagship-9',
        route: 'customers',
        targetId: 'nav-customers',
        narrationText: 'The consultant accesses the Customer 360 profile on their tablet, reviewing her Pinterest board and wedding details before she even steps into the suite.',
        caption: 'Customer 360 Profile',
        action: 'click',
        waitForRoute: 'customers',
      },
      {
        id: 'flagship-10',
        route: 'orders',
        targetId: 'nav-orders',
        narrationText: 'She says yes to the dress! A new order is created, detailing customizations and measurements.',
        caption: 'Point of Sale / Order Creation',
        action: 'click',
        waitForRoute: 'orders',
      },
      {
        id: 'flagship-11',
        route: 'orders',
        targetId: 'payment-button',
        narrationText: 'Payment is captured seamlessly and securely, immediately updating the business ledger.',
        caption: 'Integrated Payment Processing',
        action: 'explain',
      },
      {
        id: 'flagship-12',
        route: 'inventory',
        targetId: 'nav-inventory',
        narrationText: 'Behind the scenes, the gown inventory is automatically adjusted, and a purchase order for the designer is queued.',
        caption: 'Inventory & Supply Chain',
        action: 'click',
        waitForRoute: 'inventory',
      },
      {
        id: 'flagship-13',
        route: 'commerce',
        targetId: 'nav-commerce',
        narrationText: 'She also purchases an accessory from our Shopify-connected E-Commerce channel, which VowOS natively manages.',
        caption: 'Shopify / E-Commerce Integration',
        action: 'click',
        waitForRoute: 'commerce',
      },
      {
        id: 'flagship-14',
        route: 'messages',
        targetId: 'nav-messages',
        narrationText: 'The system automatically triggers a follow-up email celebrating her purchase, maintaining the premium brand experience.',
        caption: 'Automated Follow-Up',
        action: 'explain',
      },
      {
        id: 'flagship-15',
        route: 'reports',
        targetId: 'nav-reports',
        narrationText: 'The store manager reviews the day, tracking conversion rates, consultant performance, and upcoming tasks.',
        caption: 'Manager Reporting',
        action: 'click',
        waitForRoute: 'reports',
      },
      {
        id: 'flagship-16',
        route: 'dashboard',
        targetId: 'nav-dashboard',
        narrationText: 'Finally, we return to the Owner Dashboard. That single customer journey has seamlessly updated revenue, inventory, and marketing ROI without a single duplicate data entry.',
        caption: 'Executive Analytics',
        action: 'click',
        waitForRoute: 'dashboard',
      }
    ]
  },`;

const before = content.substring(0, prevObjectStart);
const after = content.substring(prevNextObjectStart);

fs.writeFileSync(file, before + newScenario + '\n  ' + after);
console.log('Successfully replaced scenario-0-master-tour.');
