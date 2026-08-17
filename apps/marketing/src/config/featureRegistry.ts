export interface VowOSFeature {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  longDescription: string;
  category: 'core' | 'operations' | 'growth' | 'intelligence' | 'integration' | 'platform';
  icon: string;
  routes: string[];
  minimumPlan: 'essentials' | 'growth' | 'pro' | 'enterprise';
  defaultEnabled: boolean;
  configurable: boolean;
}

export const featureList: VowOSFeature[] = [
  {
    id: 'customers',
    slug: 'customers',
    name: 'Customer & Bride CRM',
    shortDescription: 'Manage brides, profiles, and relationships.',
    longDescription: 'Comprehensive CRM tailored for bridal boutiques, tracking customer journeys, measurements, and preferences.',
    category: 'core',
    icon: 'users',
    routes: ['/customers'],
    minimumPlan: 'essentials',
    defaultEnabled: true,
    configurable: true
  },
  {
    id: 'scheduling',
    slug: 'scheduling',
    name: 'Appointments & Scheduling',
    shortDescription: 'Book and manage store appointments.',
    longDescription: 'Advanced scheduling system for fittings, consultations, and store visits with calendar sync.',
    category: 'core',
    icon: 'calendar',
    routes: ['/calendar', '/appointments'],
    minimumPlan: 'essentials',
    defaultEnabled: true,
    configurable: true
  },
  {
    id: 'alterations',
    slug: 'alterations',
    name: 'Alterations Management',
    shortDescription: 'Track alterations, seamstresses, and progress.',
    longDescription: 'Dedicated module for managing gown alterations, tracking stages, and coordinating with seamstresses.',
    category: 'operations',
    icon: 'scissors',
    routes: ['/alterations'],
    minimumPlan: 'growth',
    defaultEnabled: false,
    configurable: true
  },
  {
    id: 'inventory',
    slug: 'inventory',
    name: 'Gown & Product Inventory',
    shortDescription: 'Manage dresses, accessories, and stock.',
    longDescription: 'Full inventory management system for dresses, sizes, colors, and accessories with barcode support.',
    category: 'core',
    icon: 'package',
    routes: ['/inventory'],
    minimumPlan: 'essentials',
    defaultEnabled: true,
    configurable: true
  },
  {
    id: 'transfers',
    slug: 'transfers',
    name: 'Inter-Location Transfers',
    shortDescription: 'Transfer inventory between store locations.',
    longDescription: 'Seamlessly move stock between different boutique locations with tracking and approval workflows.',
    category: 'operations',
    icon: 'arrow-right-left',
    routes: ['/inventory/transfers'],
    minimumPlan: 'pro',
    defaultEnabled: false,
    configurable: false
  },
  {
    id: 'invoices',
    slug: 'invoices',
    name: 'Invoicing & Payments',
    shortDescription: 'Process payments and generate invoices.',
    longDescription: 'Integrated billing system for creating invoices, processing payments, and managing refunds.',
    category: 'core',
    icon: 'receipt',
    routes: ['/invoices', '/billing'],
    minimumPlan: 'essentials',
    defaultEnabled: true,
    configurable: true
  },
  {
    id: 'contracts',
    slug: 'contracts',
    name: 'Digital Contracts & e-Signatures',
    shortDescription: 'Manage and sign bridal contracts.',
    longDescription: 'Create, send, and securely store legally binding digital contracts with integrated e-signatures.',
    category: 'operations',
    icon: 'file-signature',
    routes: ['/contracts'],
    minimumPlan: 'growth',
    defaultEnabled: true,
    configurable: true
  },
  {
    id: 'communications',
    slug: 'communications',
    name: 'SMS & Email Communications',
    shortDescription: 'Engage clients via SMS and Email.',
    longDescription: 'Unified inbox and automated communication tools for SMS and Email outreach.',
    category: 'growth',
    icon: 'message-square',
    routes: ['/messages', '/communications'],
    minimumPlan: 'growth',
    defaultEnabled: true,
    configurable: true
  },
  {
    id: 'marketing',
    slug: 'marketing',
    name: 'Marketing Automation & Leads',
    shortDescription: 'Automate marketing and capture leads.',
    longDescription: 'Marketing tools to capture leads, run campaigns, and analyze conversion metrics.',
    category: 'growth',
    icon: 'megaphone',
    routes: ['/marketing'],
    minimumPlan: 'pro',
    defaultEnabled: false,
    configurable: true
  },
  {
    id: 'reports',
    slug: 'reports',
    name: 'Business Reporting & Analytics',
    shortDescription: 'Insights and business intelligence.',
    longDescription: 'Comprehensive dashboards and reports covering sales, inventory, and staff performance.',
    category: 'intelligence',
    icon: 'bar-chart-2',
    routes: ['/reports', '/analytics'],
    minimumPlan: 'growth',
    defaultEnabled: true,
    configurable: true
  },
  {
    id: 'ledgers',
    slug: 'ledgers',
    name: 'Financial Ledgers',
    shortDescription: 'Accounting and financial tracking.',
    longDescription: 'Detailed financial ledgers and accounting exports for seamless bookkeeping.',
    category: 'operations',
    icon: 'book',
    routes: ['/ledgers', '/finance'],
    minimumPlan: 'pro',
    defaultEnabled: false,
    configurable: true
  },
  {
    id: 'payroll',
    slug: 'payroll',
    name: 'Payroll & Commission',
    shortDescription: 'Manage staff payroll and sales commissions.',
    longDescription: 'Automated calculation of staff hours, salaries, and sales commissions.',
    category: 'operations',
    icon: 'dollar-sign',
    routes: ['/payroll'],
    minimumPlan: 'pro',
    defaultEnabled: false,
    configurable: true
  },
  {
    id: 'timeclock',
    slug: 'timeclock',
    name: 'Time Clock & Scheduling',
    shortDescription: 'Track staff hours and shifts.',
    longDescription: 'Staff time tracking, shift scheduling, and attendance management.',
    category: 'operations',
    icon: 'clock',
    routes: ['/timeclock', '/schedule'],
    minimumPlan: 'growth',
    defaultEnabled: false,
    configurable: true
  },
  {
    id: 'staff',
    slug: 'staff',
    name: 'Staff Management',
    shortDescription: 'Manage users, roles, and permissions.',
    longDescription: 'Complete staff directory, role-based access control, and performance tracking.',
    category: 'core',
    icon: 'users-cog',
    routes: ['/staff', '/team'],
    minimumPlan: 'essentials',
    defaultEnabled: true,
    configurable: true
  },
  {
    id: 'training',
    slug: 'training',
    name: 'Training Center',
    shortDescription: 'Onboard and train staff.',
    longDescription: 'Internal portal for staff onboarding, training materials, and interactive tutorials.',
    category: 'platform',
    icon: 'graduation-cap',
    routes: ['/training'],
    minimumPlan: 'essentials',
    defaultEnabled: true,
    configurable: true
  },
  {
    id: 'onlinestore',
    slug: 'onlinestore',
    name: 'Online Store (Shopify Integration)',
    shortDescription: 'Sync inventory with Shopify.',
    longDescription: 'Seamless bidirectional sync with Shopify for selling accessories and gowns online.',
    category: 'integration',
    icon: 'shopping-cart',
    routes: ['/integrations/shopify'],
    minimumPlan: 'pro',
    defaultEnabled: false,
    configurable: true
  },
  {
    id: 'ai_planner',
    slug: 'ai_planner',
    name: 'AI Stylist Planner',
    shortDescription: 'AI-driven styling recommendations.',
    longDescription: 'Leverage artificial intelligence to recommend styles and accessories based on bride preferences.',
    category: 'intelligence',
    icon: 'sparkles',
    routes: ['/ai/stylist'],
    minimumPlan: 'enterprise',
    defaultEnabled: false,
    configurable: true
  },
  {
    id: 'fitting_room',
    slug: 'fitting_room',
    name: 'Virtual Fitting Room',
    shortDescription: 'Digital dress visualization.',
    longDescription: 'Allow brides to digitally visualize dresses and alterations before making a decision.',
    category: 'intelligence',
    icon: 'camera',
    routes: ['/fitting-room'],
    minimumPlan: 'enterprise',
    defaultEnabled: false,
    configurable: true
  },
  {
    id: 'booking',
    slug: 'booking',
    name: 'Online Booking Portal',
    shortDescription: 'Client-facing appointment booking.',
    longDescription: 'Customizable public portal for brides to book appointments directly into your calendar.',
    category: 'growth',
    icon: 'globe',
    routes: ['/settings/booking-portal'],
    minimumPlan: 'essentials',
    defaultEnabled: true,
    configurable: true
  },
  {
    id: 'bride_portal',
    slug: 'bride_portal',
    name: 'Client Bride Portal',
    shortDescription: 'Personalized portal for brides.',
    longDescription: 'Secure online portal where brides can view their invoices, contracts, and appointment details.',
    category: 'growth',
    icon: 'heart',
    routes: ['/settings/bride-portal'],
    minimumPlan: 'growth',
    defaultEnabled: true,
    configurable: true
  },
  {
    id: 'seo',
    slug: 'seo',
    name: 'Technical SEO Engine',
    shortDescription: 'Automated SEO auditing and structured data.',
    longDescription: 'Monitors public website health, canonicals, sitemaps, and Core Web Vitals to ensure perfect indexing.',
    category: 'growth',
    icon: 'search',
    routes: ['/growth/seo'],
    minimumPlan: 'growth',
    defaultEnabled: true,
    configurable: true
  },
  {
    id: 'local_seo',
    slug: 'local_seo',
    name: 'Local SEO & Google Business',
    shortDescription: 'Manage Google Business Profiles.',
    longDescription: 'Direct integration with Google Business Profile to map physical locations, track local rankings, and monitor search impressions.',
    category: 'growth',
    icon: 'map-pin',
    routes: ['/growth/local'],
    minimumPlan: 'growth',
    defaultEnabled: true,
    configurable: true
  },
  {
    id: 'reputation',
    slug: 'reputation',
    name: 'Review Management',
    shortDescription: 'Monitor and respond to reviews.',
    longDescription: 'Centralize Google and Yelp reviews with AI-assisted drafting to maintain a strong local reputation.',
    category: 'growth',
    icon: 'star',
    routes: ['/growth/reputation'],
    minimumPlan: 'growth',
    defaultEnabled: true,
    configurable: true
  },
  {
    id: 'competitors',
    slug: 'competitors',
    name: 'Competitor Intelligence',
    shortDescription: 'Track local market competitors.',
    longDescription: 'Analyze competitor locations, public designers, and search visibility to identify local market gaps.',
    category: 'intelligence',
    icon: 'crosshair',
    routes: ['/growth/competitors'],
    minimumPlan: 'pro',
    defaultEnabled: false,
    configurable: true
  },
  {
    id: 'attribution',
    slug: 'attribution',
    name: 'Marketing Attribution',
    shortDescription: 'Track ROI from Search to Revenue.',
    longDescription: 'Perfect attribution tracking connecting Search Queries, Ad Clicks, and Lead forms directly to final Sales and Revenue.',
    category: 'intelligence',
    icon: 'target',
    routes: ['/growth/attribution'],
    minimumPlan: 'pro',
    defaultEnabled: false,
    configurable: true
  }
];

export const featureRegistry: Record<string, VowOSFeature> = featureList.reduce((acc, feature) => {
  acc[feature.id] = feature;
  return acc;
}, {} as Record<string, VowOSFeature>);
