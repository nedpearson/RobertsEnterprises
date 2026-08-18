import {
  LayoutDashboard,
  Users,
  Sparkles,
  Shirt,
  ArrowLeftRight,
  CalendarDays,
  Receipt,
  PackageSearch,
  BarChart3,
  BookOpenText,
  ShieldCheck,
  Gem,
  CalendarHeart,
  MessageSquare,
  FileSignature,
  Scissors,
  SlidersHorizontal,
  AlarmClock,
  ShoppingBag,
  Megaphone,
  Target,
  Globe,
  LucideIcon
} from 'lucide-react';
import { OrganizationRole } from '@/lib/auth/roles';;

export type NavigationSectionId =
  | 'today'
  | 'clients'
  | 'communications'
  | 'sales'
  | 'gowns'
  | 'growth'
  | 'admin'
  | 'external';

export type ViewKey =
  | 'dashboard' // Maps to Today (Manager)
  | 'overview' // Maps to Overview (Owner)
  | 'schedule' // Calendar & Scheduling (Canonical)
  | 'customers' // Brides / Customer 360
  | 'communications' // Unified Inbox
  | 'invoices'
  | 'purchases'
  | 'contracts'
  | 'sales' // Manager & Owner Sales Dashboard
  | 'inventory'
  | 'alterations'
  | 'transfers'
  | 'catalog' // Universal Vendor Catalog
  | 'leads'
  | 'marketing'
  | 'reports' // Insights
  | 'ledgers'
  | 'staff'
  | 'payroll'
  | 'timeclock'
  | 'settings'
  | 'training'
  | 'onlinestore'
  | 'bride-portal'
  | 'fitting-room'
  | 'seo'
  | 'local_seo'
  | 'reputation'
  | 'competitors'
  | 'attribution'
  | 'website_builder'
  | 'platform-admin';

export interface NavigationSection {
  id: NavigationSectionId;
  label: string;
  order: number;
  defaultExpanded?: boolean;
}

export interface NavigationItem {
  id: ViewKey | 'booking';
  label: string;
  shortLabel?: string;
  icon: LucideIcon;
  href?: string;
  path: string;
  section: NavigationSectionId;
  badgeKey?: 'overdueInvoices' | 'pendingContracts' | 'unreadMessages' | 'alterationsDue' | 'delayedOrders' | 'inTransitTransfers';
  external?: boolean;
  openInNewTab?: boolean;
  mobilePriority?: number; // Lower number = higher priority for bottom nav bar
  searchKeywords: string[];
  featureSlug: string; // Feature key required to view this item
}

export const NAVIGATION_SECTIONS: NavigationSection[] = [
  { id: 'today', label: 'TODAY', order: 1, defaultExpanded: true },
  { id: 'clients', label: 'CUSTOMERS', order: 2, defaultExpanded: true },
  { id: 'communications',
    featureSlug: 'communications', label: 'COMMUNICATIONS', order: 3, defaultExpanded: true },
  { id: 'sales',
    featureSlug: 'sales.reports', label: 'SALES & ORDERS', order: 4, defaultExpanded: false },
  { id: 'gowns', label: 'INVENTORY & GOWNS', order: 5, defaultExpanded: false },
  { id: 'growth', label: 'GROWTH & MARKETING', order: 6, defaultExpanded: false },
  { id: 'admin', label: 'MORE / SETTINGS', order: 7, defaultExpanded: false },
  { id: 'external', label: 'EXTERNAL BUSINESS PAGE', order: 9, defaultExpanded: true },
];

export const NAVIGATION_ITEMS: NavigationItem[] = [
  // TODAY
  {
    id: 'dashboard',
    featureSlug: 'dashboard',
    label: 'Today',
    shortLabel: 'Today',
    icon: LayoutDashboard,
    path: '/today',
    section: 'today',
    mobilePriority: 1,
    searchKeywords: ['dashboard', 'today', 'overview', 'kpi', 'alerts', 'command center'],
  },
  {
    id: 'overview',
    featureSlug: 'overview',
    label: 'Overview',
    shortLabel: 'Overview',
    icon: LayoutDashboard,
    path: '/overview',
    section: 'today',
    mobilePriority: 1,
    searchKeywords: ['overview', 'dashboard', 'executive'],
  },
  {
    id: 'schedule',
    featureSlug: 'schedule',
    label: 'Schedule & Appointments',
    shortLabel: 'Schedule',
    icon: CalendarDays,
    path: '/schedule',
    section: 'today',
    mobilePriority: 2,
    searchKeywords: [
      'calendar',
      'schedule',
      'appointments',
      'operations',
      'booking requests',
      'employee shifts'
    ],
  },

  // CUSTOMERS
  {
    id: 'customers',
    featureSlug: 'customers',
    label: 'Customers 360',
    shortLabel: 'Customers',
    icon: Users,
    path: '/customers',
    section: 'clients',
    mobilePriority: 3,
    searchKeywords: ['bride', 'customers', 'clients', 'profiles', 'wedding', 'bride 360'],
  },

  // COMMUNICATIONS
  {
    id: 'communications',
    label: 'Inbox',
    shortLabel: 'Inbox',
    icon: MessageSquare,
    path: '/communications',
    section: 'communications',
    badgeKey: 'unreadMessages',
    mobilePriority: 4,
    searchKeywords: ['messages', 'sms', 'email', 'inbox', 'chat', 'communications'],
  },

  // SALES & ORDERS
  {
    id: 'invoices',
    featureSlug: 'invoices',
    label: 'Payments & POS',
    shortLabel: 'Payments',
    icon: Receipt,
    path: '/invoices',
    section: 'sales',
    badgeKey: 'overdueInvoices',
    mobilePriority: 5,
    searchKeywords: ['invoices', 'pos', 'payments', 'balances', 'due', 'receipts', 'billing'],
  },
  {
    id: 'purchases',
    featureSlug: 'purchasing.core',
    label: 'Purchase Orders',
    shortLabel: 'PO',
    icon: PackageSearch,
    path: '/purchases',
    section: 'sales',
    badgeKey: 'delayedOrders',
    mobilePriority: 6,
    searchKeywords: ['purchase orders', 'po', 'vendors', 'designers', 'special orders', 'ordering'],
    requiredFeature: 'purchasing.core',
  },
  {
    id: 'contracts',
    featureSlug: 'sales.contracts',
    label: 'Contracts',
    shortLabel: 'Contracts',
    icon: FileSignature,
    path: '/contracts',
    section: 'sales',
    badgeKey: 'pendingContracts',
    mobilePriority: 7,
    searchKeywords: ['contracts', 'agreements', 'signatures', 'pending contracts', 'legal'],
    requiredFeature: 'sales.contracts',
  },

  // INVENTORY & GOWNS
  {
    id: 'inventory',
    featureSlug: 'inventory',
    label: 'Inventory',
    shortLabel: 'Inventory',
    icon: Shirt,
    path: '/inventory',
    section: 'gowns',
    mobilePriority: 8,
    searchKeywords: ['gowns', 'inventory', 'dresses', 'sample gowns', 'styles', 'stock'],
  },
  {
    id: 'alterations',
    featureSlug: 'alterations.core',
    label: 'Alterations',
    shortLabel: 'Fittings',
    icon: Scissors,
    path: '/alterations',
    section: 'gowns',
    badgeKey: 'alterationsDue',
    mobilePriority: 9,
    searchKeywords: ['alterations', 'fittings', 'seamstress', 'tailoring', 'modifications'],
    requiredFeature: 'alterations.core',
  },
  {
    id: 'transfers',
    featureSlug: 'transfers.core',
    label: 'Store Transfers',
    shortLabel: 'Transfers',
    icon: ArrowLeftRight,
    path: '/transfers',
    section: 'gowns',
    badgeKey: 'inTransitTransfers',
    mobilePriority: 10,
    searchKeywords: ['transfers', 'interstore', 'locations', 'transit'],
    requiredFeature: 'transfers.core',
  },
  {
    id: 'catalog',
    featureSlug: 'catalog',
    label: 'Vendor Catalog',
    shortLabel: 'Catalog',
    icon: PackageSearch,
    path: '/catalog',
    section: 'gowns',
    mobilePriority: 11,
    searchKeywords: ['catalog', 'vendors', 'products', 'designer catalog'],
  },

  // GROWTH & MARKETING
  {
    id: 'leads',
    featureSlug: 'growth.leads',
    label: 'Lead Pipeline',
    shortLabel: 'Leads',
    icon: Sparkles,
    path: '/growth/leads',
    section: 'growth',
    mobilePriority: 12,
    searchKeywords: ['leads', 'inquiries', 'funnel', 'pipeline'],
  },
  {
    id: 'marketing',
    featureSlug: 'growth.marketing',
    label: 'Growth Overview',
    shortLabel: 'Growth',
    icon: Megaphone,
    path: '/growth',
    section: 'growth',
    mobilePriority: 13,
    searchKeywords: ['growth', 'marketing', 'campaigns', 'ad spend', 'roas'],
  },
  {
    id: 'seo',
    featureSlug: 'growth.seo',
    label: 'Technical SEO Health',
    shortLabel: 'Technical SEO',
    icon: ShieldCheck,
    path: '/growth/seo',
    section: 'growth',
    mobilePriority: 14,
    searchKeywords: ['seo', 'core web vitals', 'ranking'],
    requiredFeature: 'growth.seo',
  },
  {
    id: 'local_seo',
    featureSlug: 'growth.local_seo',
    label: 'Local SEO & Google',
    shortLabel: 'Local SEO',
    icon: LayoutDashboard,
    path: '/growth/local',
    section: 'growth',
    mobilePriority: 15,
    searchKeywords: ['local seo', 'google business', 'maps', 'gbp'],
    requiredFeature: 'growth.local_seo',
  },
  {
    id: 'reputation',
    featureSlug: 'growth.reputation',
    label: 'Reviews & Reputation',
    shortLabel: 'Reviews',
    icon: MessageSquare,
    path: '/growth/reputation',
    section: 'growth',
    mobilePriority: 16,
    searchKeywords: ['reviews', 'reputation', 'google reviews', 'yelp'],
    requiredFeature: 'growth.reputation',
  },
  {
    id: 'competitors',
    featureSlug: 'growth.competitors',
    label: 'Competitor Intel',
    shortLabel: 'Competitors',
    icon: Users,
    path: '/growth/competitors',
    section: 'growth',
    mobilePriority: 17,
    searchKeywords: ['competitors', 'market gap', 'intelligence'],
    requiredFeature: 'growth.competitors',
  },
  {
    id: 'attribution',
    featureSlug: 'growth.attribution',
    label: 'Marketing Attribution',
    shortLabel: 'Attribution',
    icon: Target,
    path: '/growth/attribution',
    section: 'growth',
    mobilePriority: 18,
    searchKeywords: ['attribution', 'roi', 'roas', 'source tracking'],
    requiredFeature: 'growth.attribution',
  },
  {
    id: 'website_builder',
    featureSlug: 'growth.website',
    label: 'Website & SEO Builder',
    shortLabel: 'Website',
    icon: Globe,
    path: '/growth/website',
    section: 'growth',
    mobilePriority: 19,
    searchKeywords: ['website', 'builder', 'storefront', 'seo settings', 'ecommerce'],
    requiredFeature: 'growth.website',
  },

  // MORE / SETTINGS
  {
    id: 'sales',
    label: 'Sales Reports',
    shortLabel: 'Sales Reports',
    icon: BarChart3,
    path: '/sales',
    section: 'admin',
    mobilePriority: 14,
    searchKeywords: ['sales', 'revenue', 'reports'],
    requiredFeature: 'reports.core',
  },
  {
    id: 'reports',
    featureSlug: 'reports.core',
    label: 'Analytics',
    shortLabel: 'Analytics',
    icon: BarChart3,
    path: '/reports',
    section: 'admin',
    mobilePriority: 15,
    searchKeywords: ['reports', 'analytics', 'insights'],
  },
  {
    id: 'staff',
    featureSlug: 'staff',
    label: 'Team Directory',
    shortLabel: 'Team',
    icon: Users,
    path: '/team',
    section: 'admin',
    mobilePriority: 16,
    searchKeywords: ['staff', 'team', 'employees', 'stylists'],
  },
  {
    id: 'timeclock',
    featureSlug: 'timeclock',
    label: 'Time Clock',
    shortLabel: 'Time Clock',
    icon: AlarmClock,
    path: '/timeclock',
    section: 'admin',
    mobilePriority: 17,
    searchKeywords: ['time clock', 'clock in', 'clock out', 'shifts'],
  },
  {
    id: 'payroll',
    featureSlug: 'payroll.core',
    label: 'Payroll & Commissions',
    shortLabel: 'Payroll',
    icon: Gem,
    path: '/payroll',
    section: 'admin',
    mobilePriority: 18,
    searchKeywords: ['payroll', 'commissions', 'payouts'],
    requiredFeature: 'payroll.core',
  },
  {
    id: 'ledgers',
    featureSlug: 'reports.advanced',
    label: 'Accounting Ledgers',
    shortLabel: 'Ledgers',
    icon: BookOpenText,
    path: '/ledgers',
    section: 'admin',
    mobilePriority: 19,
    searchKeywords: ['ledgers', 'accounting', 'transactions'],
    requiredFeature: 'reports.advanced',
  },
  {
    id: 'onlinestore',
    featureSlug: 'integrations.shopify',
    label: 'Shopify Connections',
    shortLabel: 'Shopify',
    icon: ShoppingBag,
    path: '/onlinestore',
    section: 'admin',
    mobilePriority: 20,
    searchKeywords: ['online store', 'shopify', 'ecommerce'],
    requiredFeature: 'integrations.shopify',
  },
  {
    id: 'settings',
    featureSlug: 'settings',
    label: 'VowOS Settings',
    shortLabel: 'Settings',
    icon: SlidersHorizontal,
    path: '/settings',
    section: 'admin',
    mobilePriority: 21,
    searchKeywords: ['settings', 'configuration', 'store setup', 'system'],
  },
  {
    id: 'training',
    featureSlug: 'training',
    label: 'Training Center',
    shortLabel: 'Training',
    icon: BookOpenText,
    path: '/training',
    section: 'admin',
    mobilePriority: 22,
    searchKeywords: ['training', 'tutorials', 'learning'],
  },

  // EXTERNAL
  {
    id: 'booking',
    featureSlug: 'booking',
    label: 'View Online Booking Page',
    shortLabel: 'Booking Page',
    icon: CalendarHeart,
    path: '/book',
    section: 'external',
    external: true,
    openInNewTab: true,
    mobilePriority: 23,
    searchKeywords: ['online booking', 'public page', 'bride booking'],
  },
];

/** Map view key to canonical path */
export const VIEW_TO_PATH: Record<ViewKey, string> = {
  dashboard: '/today',
  overview: '/overview',
  schedule: '/schedule',
  sales: '/sales',
  customers: '/customers',
  leads: '/growth/leads',
  catalog: '/catalog',
  inventory: '/inventory',
  transfers: '/transfers',
  communications: '/communications',
  contracts: '/contracts',
  alterations: '/alterations',
  invoices: '/invoices',
  purchases: '/purchases',
  reports: '/reports',
  ledgers: '/ledgers',
  staff: '/team',
  settings: '/settings',
  payroll: '/payroll',
  timeclock: '/timeclock',
  training: '/training',
  onlinestore: '/onlinestore',
  marketing: '/growth',
  seo: '/growth/seo',
  local_seo: '/growth/local',
  reputation: '/growth/reputation',
  competitors: '/growth/competitors',
  attribution: '/growth/attribution',
  website_builder: '/growth/website',
  'platform-admin': '/platform-admin',
  'bride-portal': '/portal',
  'fitting-room': '/fitting-room'
};

/** Map path to view key */
export const PATH_TO_VIEW: Record<string, ViewKey> = {
  '/today': 'dashboard',
  '/dashboard': 'dashboard',
  '/overview': 'overview',
  '/schedule': 'schedule',
  '/sales': 'sales',
  '/brides': 'customers', // fallback mapping
  '/customers': 'customers',
  '/growth': 'marketing',
  '/growth/leads': 'leads',
  '/growth/campaigns': 'marketing',
  '/catalog': 'catalog',
  '/inventory': 'inventory',
  '/transfers': 'transfers',
  '/communications': 'communications',
  '/onlinestore': 'onlinestore',
  '/contracts': 'contracts',
  '/alterations': 'alterations',
  '/invoices': 'invoices',
  '/purchases': 'purchases',
  '/reports': 'reports',
  '/ledgers': 'ledgers',
  '/team': 'staff',
  '/settings': 'settings',
  '/payroll': 'payroll',
  '/timeclock': 'timeclock',
  '/training': 'training',
  '/growth/seo': 'seo',
  '/growth/local': 'local_seo',
  '/growth/reputation': 'reputation',
  '/growth/competitors': 'competitors',
  '/growth/attribution': 'attribution',
  '/growth/website': 'website_builder',
  '/platform-admin': 'platform-admin',
  '/portal': 'bride-portal',
  '/fitting-room': 'fitting-room'
};
