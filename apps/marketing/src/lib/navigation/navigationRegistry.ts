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
  allowedRoles: OrganizationRole[];
  badgeKey?: 'overdueInvoices' | 'pendingContracts' | 'unreadMessages' | 'alterationsDue' | 'delayedOrders' | 'inTransitTransfers';
  external?: boolean;
  openInNewTab?: boolean;
  mobilePriority?: number; // Lower number = higher priority for bottom nav bar
  searchKeywords: string[];
  requiredFeature?: string; // Feature key required to view this item
}

export const NAVIGATION_SECTIONS: NavigationSection[] = [
  { id: 'today', label: 'TODAY', order: 1, defaultExpanded: true },
  { id: 'clients', label: 'CUSTOMERS', order: 2, defaultExpanded: true },
  { id: 'communications', label: 'COMMUNICATIONS', order: 3, defaultExpanded: true },
  { id: 'sales', label: 'SALES & ORDERS', order: 4, defaultExpanded: false },
  { id: 'gowns', label: 'INVENTORY & GOWNS', order: 5, defaultExpanded: false },
  { id: 'growth', label: 'GROWTH & MARKETING', order: 6, defaultExpanded: false },
  { id: 'admin', label: 'MORE / SETTINGS', order: 7, defaultExpanded: false },
  { id: 'external', label: 'EXTERNAL BUSINESS PAGE', order: 9, defaultExpanded: true },
];

export const NAVIGATION_ITEMS: NavigationItem[] = [
  // TODAY
  {
    id: 'dashboard',
    label: 'Today',
    shortLabel: 'Today',
    icon: LayoutDashboard,
    path: '/today',
    section: 'today',
    allowedRoles: ['Owner', 'Manager', 'Stylist', 'Front Desk'],
    mobilePriority: 1,
    searchKeywords: ['dashboard', 'today', 'overview', 'kpi', 'alerts', 'command center'],
  },
  {
    id: 'overview',
    label: 'Overview',
    shortLabel: 'Overview',
    icon: LayoutDashboard,
    path: '/overview',
    section: 'today',
    allowedRoles: ['Owner'], // Only Owners see the Executive Overview in the sidebar
    mobilePriority: 1,
    searchKeywords: ['overview', 'dashboard', 'executive'],
  },
  {
    id: 'schedule',
    label: 'Schedule & Appointments',
    shortLabel: 'Schedule',
    icon: CalendarDays,
    path: '/schedule',
    section: 'today',
    allowedRoles: ['Owner', 'Manager', 'Stylist', 'Front Desk'],
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
    label: 'Customers 360',
    shortLabel: 'Customers',
    icon: Users,
    path: '/customers',
    section: 'clients',
    allowedRoles: ['Owner', 'Manager', 'Stylist', 'Front Desk'],
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
    allowedRoles: ['Owner', 'Manager', 'Stylist', 'Front Desk'],
    badgeKey: 'unreadMessages',
    mobilePriority: 4,
    searchKeywords: ['messages', 'sms', 'email', 'inbox', 'chat', 'communications'],
  },

  // SALES & ORDERS
  {
    id: 'invoices',
    label: 'Payments & POS',
    shortLabel: 'Payments',
    icon: Receipt,
    path: '/invoices',
    section: 'sales',
    allowedRoles: ['Owner', 'Manager', 'Front Desk'],
    badgeKey: 'overdueInvoices',
    mobilePriority: 5,
    searchKeywords: ['invoices', 'pos', 'payments', 'balances', 'due', 'receipts', 'billing'],
  },
  {
    id: 'purchases',
    label: 'Purchase Orders',
    shortLabel: 'PO',
    icon: PackageSearch,
    path: '/purchases',
    section: 'sales',
    allowedRoles: ['Owner', 'Manager'],
    badgeKey: 'delayedOrders',
    mobilePriority: 6,
    searchKeywords: ['purchase orders', 'po', 'vendors', 'designers', 'special orders', 'ordering'],
    requiredFeature: 'purchasing.core',
  },
  {
    id: 'contracts',
    label: 'Contracts',
    shortLabel: 'Contracts',
    icon: FileSignature,
    path: '/contracts',
    section: 'sales',
    allowedRoles: ['Owner', 'Manager'],
    badgeKey: 'pendingContracts',
    mobilePriority: 7,
    searchKeywords: ['contracts', 'agreements', 'signatures', 'pending contracts', 'legal'],
    requiredFeature: 'sales.contracts',
  },

  // INVENTORY & GOWNS
  {
    id: 'inventory',
    label: 'Inventory',
    shortLabel: 'Inventory',
    icon: Shirt,
    path: '/inventory',
    section: 'gowns',
    allowedRoles: ['Owner', 'Manager', 'Stylist'],
    mobilePriority: 8,
    searchKeywords: ['gowns', 'inventory', 'dresses', 'sample gowns', 'styles', 'stock'],
  },
  {
    id: 'alterations',
    label: 'Alterations',
    shortLabel: 'Fittings',
    icon: Scissors,
    path: '/alterations',
    section: 'gowns',
    allowedRoles: ['Owner', 'Manager', 'Stylist'],
    badgeKey: 'alterationsDue',
    mobilePriority: 9,
    searchKeywords: ['alterations', 'fittings', 'seamstress', 'tailoring', 'modifications'],
    requiredFeature: 'alterations.core',
  },
  {
    id: 'transfers',
    label: 'Store Transfers',
    shortLabel: 'Transfers',
    icon: ArrowLeftRight,
    path: '/transfers',
    section: 'gowns',
    allowedRoles: ['Owner', 'Manager', 'Stylist'],
    badgeKey: 'inTransitTransfers',
    mobilePriority: 10,
    searchKeywords: ['transfers', 'interstore', 'locations', 'transit'],
    requiredFeature: 'transfers.core',
  },
  {
    id: 'catalog',
    label: 'Vendor Catalog',
    shortLabel: 'Catalog',
    icon: PackageSearch,
    path: '/catalog',
    section: 'gowns',
    allowedRoles: ['Owner', 'Manager'],
    mobilePriority: 11,
    searchKeywords: ['catalog', 'vendors', 'products', 'designer catalog'],
  },

  // GROWTH & MARKETING
  {
    id: 'leads',
    label: 'Lead Pipeline',
    shortLabel: 'Leads',
    icon: Sparkles,
    path: '/growth/leads',
    section: 'growth',
    allowedRoles: ['Owner', 'Manager'],
    mobilePriority: 12,
    searchKeywords: ['leads', 'inquiries', 'funnel', 'pipeline'],
  },
  {
    id: 'marketing',
    label: 'Marketing Campaigns',
    shortLabel: 'Marketing',
    icon: Megaphone,
    path: '/growth',
    section: 'growth',
    allowedRoles: ['Owner', 'Manager'],
    mobilePriority: 13,
    searchKeywords: ['growth', 'marketing', 'campaigns', 'ad spend', 'roas'],
    requiredFeature: 'marketing.leads',
  },

  // MORE / SETTINGS
  {
    id: 'sales',
    label: 'Sales Reports',
    shortLabel: 'Sales Reports',
    icon: BarChart3,
    path: '/sales',
    section: 'admin',
    allowedRoles: ['Owner', 'Manager'],
    mobilePriority: 14,
    searchKeywords: ['sales', 'revenue', 'reports'],
    requiredFeature: 'reports.core',
  },
  {
    id: 'reports',
    label: 'Analytics',
    shortLabel: 'Analytics',
    icon: BarChart3,
    path: '/reports',
    section: 'admin',
    allowedRoles: ['Owner', 'Manager'],
    mobilePriority: 15,
    searchKeywords: ['reports', 'analytics', 'insights'],
  },
  {
    id: 'staff',
    label: 'Team Directory',
    shortLabel: 'Team',
    icon: Users,
    path: '/team',
    section: 'admin',
    allowedRoles: ['Owner', 'Manager', 'Stylist', 'Front Desk'],
    mobilePriority: 16,
    searchKeywords: ['staff', 'team', 'employees', 'stylists'],
  },
  {
    id: 'timeclock',
    label: 'Time Clock',
    shortLabel: 'Time Clock',
    icon: AlarmClock,
    path: '/timeclock',
    section: 'admin',
    allowedRoles: ['Owner', 'Manager', 'Stylist', 'Front Desk'],
    mobilePriority: 17,
    searchKeywords: ['time clock', 'clock in', 'clock out', 'shifts'],
  },
  {
    id: 'payroll',
    label: 'Payroll & Commissions',
    shortLabel: 'Payroll',
    icon: Gem,
    path: '/payroll',
    section: 'admin',
    allowedRoles: ['Owner', 'Manager'],
    mobilePriority: 18,
    searchKeywords: ['payroll', 'commissions', 'payouts'],
    requiredFeature: 'payroll.core',
  },
  {
    id: 'ledgers',
    label: 'Accounting Ledgers',
    shortLabel: 'Ledgers',
    icon: BookOpenText,
    path: '/ledgers',
    section: 'admin',
    allowedRoles: ['Owner', 'Manager'],
    mobilePriority: 19,
    searchKeywords: ['ledgers', 'accounting', 'transactions'],
    requiredFeature: 'reports.advanced',
  },
  {
    id: 'onlinestore',
    label: 'Shopify Connections',
    shortLabel: 'Shopify',
    icon: ShoppingBag,
    path: '/onlinestore',
    section: 'admin',
    allowedRoles: ['Owner', 'Manager'],
    mobilePriority: 20,
    searchKeywords: ['online store', 'shopify', 'ecommerce'],
    requiredFeature: 'integrations.shopify',
  },
  {
    id: 'settings',
    label: 'VowOS Settings',
    shortLabel: 'Settings',
    icon: SlidersHorizontal,
    path: '/settings',
    section: 'admin',
    allowedRoles: ['Owner', 'Manager'],
    mobilePriority: 21,
    searchKeywords: ['settings', 'configuration', 'store setup', 'system'],
  },
  {
    id: 'training',
    label: 'Training Center',
    shortLabel: 'Training',
    icon: BookOpenText,
    path: '/training',
    section: 'admin',
    allowedRoles: ['Owner', 'Manager', 'Stylist', 'Front Desk'],
    mobilePriority: 22,
    searchKeywords: ['training', 'tutorials', 'learning'],
  },

  // EXTERNAL
  {
    id: 'booking',
    label: 'View Online Booking Page',
    shortLabel: 'Booking Page',
    icon: CalendarHeart,
    path: '/book',
    section: 'external',
    allowedRoles: ['Owner', 'Manager', 'Stylist', 'Front Desk'],
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
  '/platform-admin': 'platform-admin',
  '/portal': 'bride-portal',
  '/fitting-room': 'fitting-room'
};
