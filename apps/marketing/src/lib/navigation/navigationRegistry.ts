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
  | 'gowns'
  | 'finance'
  | 'team'
  | 'growth'
  | 'insights'
  | 'admin'
  | 'external';

export type ViewKey =
  | 'dashboard' // Maps to Today (Manager)
  | 'overview' // Maps to Overview (Owner)
  | 'customers' // Brides
  | 'leads'
  | 'catalog' // Universal Vendor Catalog
  | 'inventory'
  | 'transfers'
  | 'schedule' // Calendar & Scheduling (Canonical)
  | 'sales' // Manager & Owner Sales
  | 'communications'
  | 'contracts'
  | 'alterations'
  | 'invoices'
  | 'purchases'
  | 'reports' // Insights
  | 'ledgers'
  | 'staff'
  | 'settings'
  | 'payroll'
  | 'timeclock'
  | 'training'
  | 'onlinestore'
  | 'marketing'
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
  { id: 'clients', label: 'CLIENTS & SALES', order: 2, defaultExpanded: true },
  { id: 'gowns', label: 'GOWNS & OPERATIONS', order: 3, defaultExpanded: true },
  { id: 'growth', label: 'GROWTH & MARKETING', order: 4, defaultExpanded: true },
  { id: 'finance', label: 'FINANCE', order: 5, defaultExpanded: false },
  { id: 'team', label: 'TEAM', order: 6, defaultExpanded: false },
  { id: 'insights', label: 'INSIGHTS', order: 7, defaultExpanded: false },
  { id: 'admin', label: 'ADMIN', order: 8, defaultExpanded: false },
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
    allowedRoles: ['Owner'],
    mobilePriority: 1,
    searchKeywords: ['overview', 'dashboard', 'executive'],
  },
  {
    id: 'schedule',
    label: 'Calendar & Scheduling',
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
      'workforce',
      'staff schedule',
      'booking requests',
      'employee shifts',
      'capacity',
      'AI assignment'
    ],
  },
  {
    id: 'sales',
    label: 'Sales',
    shortLabel: 'Sales',
    icon: BarChart3,
    path: '/sales',
    section: 'finance',
    allowedRoles: ['Owner', 'Manager'],
    mobilePriority: 4,
    searchKeywords: ['sales', 'revenue', 'reports'],
    requiredFeature: 'reports.core',
  },

  // CLIENTS & SALES
  {
    id: 'customers',
    label: 'Brides',
    shortLabel: 'Brides',
    icon: Users,
    path: '/brides',
    section: 'clients',
    allowedRoles: ['Owner', 'Manager', 'Stylist', 'Front Desk'],
    mobilePriority: 5,
    searchKeywords: ['bride', 'customers', 'clients', 'profiles', 'wedding', 'bride 360'],
  },
  {
    id: 'contracts',
    label: 'Contracts',
    shortLabel: 'Contracts',
    icon: FileSignature,
    path: '/contracts',
    section: 'clients',
    allowedRoles: ['Owner', 'Manager', 'Stylist', 'Front Desk'],
    badgeKey: 'pendingContracts',
    mobilePriority: 11,
    searchKeywords: ['contracts', 'agreements', 'signatures', 'pending contracts', 'legal'],
    requiredFeature: 'sales.contracts',
  },

  // GOWNS & OPERATIONS
  {
    id: 'catalog',
    label: 'Vendor Catalog',
    shortLabel: 'Catalog',
    icon: PackageSearch,
    path: '/catalog',
    section: 'gowns',
    allowedRoles: ['Owner', 'Manager'],
    mobilePriority: 3.5,
    searchKeywords: ['catalog', 'vendors', 'products', 'import', 'csv', 'designer catalog'],
  },
  {
    id: 'inventory',
    label: 'Gown Inventory',
    shortLabel: 'Inventory',
    icon: Shirt,
    path: '/inventory',
    section: 'gowns',
    allowedRoles: ['Owner', 'Manager', 'Stylist'],
    mobilePriority: 4,
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
    mobilePriority: 5,
    searchKeywords: ['alterations', 'fittings', 'seamstress', 'tailoring', 'modifications', 'fitting queue'],
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
    mobilePriority: 12,
    searchKeywords: ['transfers', 'interstore', 'locations', 'baton rouge', 'covington', 'transit'],
    requiredFeature: 'transfers.core',
  },
  {
    id: 'purchases',
    label: 'Purchase Orders',
    shortLabel: 'Orders',
    icon: PackageSearch,
    path: '/purchases',
    section: 'gowns',
    allowedRoles: ['Owner', 'Manager'],
    badgeKey: 'delayedOrders',
    mobilePriority: 13,
    searchKeywords: ['purchase orders', 'po', 'vendors', 'designers', 'special orders', 'ordering'],
    requiredFeature: 'purchasing.core',
  },

  // FINANCE
  {
    id: 'invoices',
    label: 'Invoices',
    shortLabel: 'POS / Pay',
    icon: Receipt,
    path: '/invoices',
    section: 'finance',
    allowedRoles: ['Owner', 'Manager', 'Front Desk'],
    badgeKey: 'overdueInvoices',
    mobilePriority: 6,
    searchKeywords: ['invoices', 'pos', 'payments', 'balances', 'due', 'receipts', 'billing'],
  },
  {
    id: 'ledgers',
    label: 'Ledgers',
    shortLabel: 'Ledgers',
    icon: BookOpenText,
    path: '/ledgers',
    section: 'finance',
    allowedRoles: ['Owner', 'Manager'],
    mobilePriority: 14,
    searchKeywords: ['ledgers', 'accounting', 'journal', 'transactions', 'financials', 'auditing'],
    requiredFeature: 'reports.advanced',
  },

  // TEAM
  {
    id: 'staff',
    label: 'Team Directory',
    shortLabel: 'Team',
    icon: Users,
    path: '/team',
    section: 'team',
    allowedRoles: ['Owner', 'Manager', 'Stylist', 'Front Desk'],
    mobilePriority: 14,
    searchKeywords: ['staff', 'team', 'employees', 'stylists', 'directory', 'roles'],
  },
  {
    id: 'timeclock',
    label: 'Time Clock',
    shortLabel: 'Time Clock',
    icon: AlarmClock,
    path: '/timeclock',
    section: 'team',
    allowedRoles: ['Owner', 'Manager', 'Stylist', 'Front Desk'],
    mobilePriority: 15,
    searchKeywords: ['time clock', 'timecards', 'clock in', 'clock out', 'hours', 'shifts'],
  },
  {
    id: 'payroll',
    label: 'Payroll',
    shortLabel: 'Payroll',
    icon: Gem,
    path: '/payroll',
    section: 'team',
    allowedRoles: ['Owner', 'Manager', 'Stylist', 'Front Desk'],
    mobilePriority: 16,
    searchKeywords: ['payroll', 'commissions', 'tips', 'wages', 'workforce', 'payouts'],
    requiredFeature: 'payroll.core',
  },
  {
    id: 'training',
    label: 'Training Center',
    shortLabel: 'Training',
    icon: BookOpenText,
    path: '/training',
    section: 'team',
    allowedRoles: ['Owner', 'Manager', 'Stylist', 'Front Desk'],
    mobilePriority: 17,
    searchKeywords: ['training', 'demo', 'scenarios', 'tutorials', 'guided tour', 'learning'],
  },

  // GROWTH & MARKETING
  {
    id: 'marketing',
    label: 'Growth & Marketing',
    shortLabel: 'Growth',
    icon: Megaphone,
    path: '/growth',
    section: 'growth',
    allowedRoles: ['Owner', 'Manager', 'Stylist', 'Front Desk'],
    mobilePriority: 7.5,
    searchKeywords: ['growth', 'marketing', 'leads', 'pipeline', 'facebook', 'instagram', 'google ads', 'tiktok', 'pinterest', 'meta', 'campaigns', 'ad spend', 'roas'],
    requiredFeature: 'marketing.leads',
  },

  // INSIGHTS
  {
    id: 'reports',
    label: 'Insights & Reports',
    shortLabel: 'Insights',
    icon: BarChart3,
    path: '/reports',
    section: 'insights',
    allowedRoles: ['Owner', 'Manager'],
    mobilePriority: 8,
    searchKeywords: ['reports', 'analytics', 'insights', 'sales goals', 'conversion', 'revenue'],
  },

  // ADMIN
  {
    id: 'settings',
    label: 'Settings',
    shortLabel: 'Settings',
    icon: SlidersHorizontal,
    path: '/settings',
    section: 'admin',
    allowedRoles: ['Owner', 'Manager'],
    mobilePriority: 18,
    searchKeywords: ['settings', 'configuration', 'store setup', 'notifications', 'taxes', 'system'],
  },
  {
    id: 'onlinestore',
    label: 'Online Store',
    shortLabel: 'Shopify Store',
    icon: ShoppingBag,
    path: '/onlinestore',
    section: 'admin',
    allowedRoles: ['Owner', 'Manager'],
    mobilePriority: 17,
    searchKeywords: ['online store', 'shopify', 'proper', 'ecommerce', 'catalog import', 'web orders'],
    requiredFeature: 'integrations.shopify',
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
    mobilePriority: 19,
    searchKeywords: ['online booking', 'public page', 'bride booking', 'client schedule link'],
  },
];

/** Map view key to canonical path */
export const VIEW_TO_PATH: Record<ViewKey, string> = {
  dashboard: '/today',
  overview: '/overview',
  schedule: '/schedule',
  sales: '/sales',
  customers: '/brides',
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
};

/** Map path to view key */
export const PATH_TO_VIEW: Record<string, ViewKey> = {
  '/today': 'dashboard',
  '/overview': 'overview',
  '/schedule': 'schedule',
  '/sales': 'sales',
  '/brides': 'customers',
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
};
