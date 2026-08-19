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
import { StaffRole } from '@/contexts/AuthContext';

export type WorkspaceId =
  | 'today'
  | 'appointments'
  | 'customers'
  | 'sales'
  | 'inventory'
  | 'team'
  | 'growth'
  | 'reports'
  | 'settings';

export interface WorkspaceChild {
  id: string;
  label: string;
  path: string;
  moduleKey?: string;
  entitlementKey?: string;
  roles?: StaffRole[];
  icon?: LucideIcon;
  searchKeywords?: string[];
  badgeKey?: 'overdueInvoices' | 'pendingContracts' | 'unreadMessages' | 'alterationsDue' | 'delayedOrders' | 'inTransitTransfers';
}

export interface Workspace {
  id: WorkspaceId;
  sidebarLabel: string;
  pageTitle: string;
  icon: LucideIcon;
  path: string;
  moduleKey?: string;
  entitlementKey?: string;
  roles: StaffRole[];
  isCoreWorkspace?: boolean;
  children: WorkspaceChild[];
}

export const WORKSPACES: Workspace[] = [
  {
    id: 'today',
    sidebarLabel: 'Today',
    pageTitle: 'Today',
    icon: LayoutDashboard,
    path: '/today',
    roles: ['Owner', 'Manager', 'Stylist', 'Front Desk', 'Seamstress'],
    isCoreWorkspace: true,
    children: []
  },
  {
    id: 'appointments',
    sidebarLabel: 'Appointments',
    pageTitle: 'Appointments',
    icon: CalendarDays,
    path: '/appointments',
    roles: ['Owner', 'Manager', 'Stylist', 'Front Desk'],
    isCoreWorkspace: true,
    children: [
      { id: 'schedule', label: 'Schedule', path: '/appointments?mode=calendar', searchKeywords: ['calendar', 'schedule'] },
      { id: 'requests', label: 'Requests', path: '/appointments?mode=requests', searchKeywords: ['booking requests'] },
    ]
  },
  {
    id: 'customers',
    sidebarLabel: 'Customers',
    pageTitle: 'Customers & Communications',
    icon: Users,
    path: '/customers',
    roles: ['Owner', 'Manager', 'Stylist', 'Front Desk', 'Seamstress'],
    isCoreWorkspace: true,
    children: [
      { id: 'customers_list', label: 'Customer 360', path: '/customers?tab=customers', searchKeywords: ['bride', 'customers', 'clients'] },
      { id: 'communications', label: 'Inbox', path: '/customers?tab=inbox', searchKeywords: ['messages', 'sms', 'email', 'inbox'], badgeKey: 'unreadMessages' },
      { id: 'followups', label: 'Follow-Ups', path: '/customers?tab=followups', searchKeywords: ['follow-ups'] }
    ]
  },
  {
    id: 'sales',
    sidebarLabel: 'Sales',
    pageTitle: 'Sales & Operations',
    icon: Receipt,
    path: '/sales',
    roles: ['Owner', 'Manager', 'Stylist', 'Front Desk', 'Seamstress'],
    isCoreWorkspace: true,
    children: [
      { id: 'invoices', label: 'POS', path: '/sales?tab=payments', searchKeywords: ['invoices', 'pos', 'payments'], badgeKey: 'overdueInvoices' },
      { id: 'contracts', label: 'Contracts', path: '/sales?tab=contracts', entitlementKey: 'sales.contracts', searchKeywords: ['contracts', 'agreements'], badgeKey: 'pendingContracts' },
      { id: 'alterations', label: 'Alterations', path: '/sales?tab=alterations', entitlementKey: 'alterations.core', searchKeywords: ['alterations', 'fittings'], badgeKey: 'alterationsDue' }
    ]
  },
  {
    id: 'inventory',
    sidebarLabel: 'Inventory',
    pageTitle: 'Inventory & Products',
    icon: Shirt,
    path: '/inventory',
    roles: ['Owner', 'Manager'],
    children: [
      { id: 'inventory_list', label: 'Inventory', path: '/inventory?tab=inventory', searchKeywords: ['gowns', 'inventory', 'dresses'] },
      { id: 'purchases', label: 'Purchase Orders', path: '/inventory?tab=purchases', entitlementKey: 'purchasing.core', searchKeywords: ['purchase orders', 'po', 'vendors'], badgeKey: 'delayedOrders' },
      { id: 'catalog', label: 'Vendors', path: '/inventory?tab=vendors', searchKeywords: ['catalog', 'vendors', 'products'] },
      { id: 'transfers', label: 'Transfers', path: '/inventory?tab=transfers', entitlementKey: 'transfers.core', searchKeywords: ['transfers', 'interstore'], badgeKey: 'inTransitTransfers' }
    ]
  },
  {
    id: 'team',
    sidebarLabel: 'Team',
    pageTitle: 'Team & Workforce',
    icon: Users,
    path: '/team',
    roles: ['Owner', 'Manager'],
    children: [
      { id: 'staff', label: 'Employees', path: '/team?tab=employees', searchKeywords: ['staff', 'team', 'employees'] },
      { id: 'timeclock', label: 'Time Clock', path: '/team?tab=timeclock', searchKeywords: ['time clock', 'shifts'] },
      { id: 'payroll', label: 'Payroll', path: '/team?tab=payroll', entitlementKey: 'payroll.core', searchKeywords: ['payroll', 'commissions'] }
    ]
  },
  {
    id: 'growth',
    sidebarLabel: 'Growth',
    pageTitle: 'Growth & Marketing',
    icon: Sparkles,
    path: '/growth',
    roles: ['Owner'],
    children: [
      { id: 'marketing', label: 'Overview', path: '/growth?tab=overview', entitlementKey: 'growth.marketing', searchKeywords: ['growth', 'marketing', 'campaigns'] },
      { id: 'leads', label: 'Leads', path: '/growth?tab=leads', entitlementKey: 'growth.leads', searchKeywords: ['leads', 'inquiries', 'funnel'] },
      { id: 'social_content', label: 'Social', path: '/growth?tab=social', entitlementKey: 'growth.social_content', searchKeywords: ['social', 'content', 'instagram'] },
      { id: 'seo', label: 'SEO', path: '/growth?tab=seo', entitlementKey: 'growth.seo', searchKeywords: ['seo', 'core web vitals'] },
      { id: 'local_seo', label: 'Google', path: '/growth?tab=google', entitlementKey: 'growth.local_seo', searchKeywords: ['local seo', 'google business', 'maps'] },
      { id: 'reputation', label: 'Reviews', path: '/growth?tab=reviews', entitlementKey: 'growth.reputation', searchKeywords: ['reviews', 'reputation', 'google reviews'] },
      { id: 'competitors', label: 'Competitors', path: '/growth?tab=competitors', entitlementKey: 'growth.competitors', searchKeywords: ['competitors', 'market gap'] },
      { id: 'attribution', label: 'Attribution', path: '/growth?tab=attribution', entitlementKey: 'growth.attribution', searchKeywords: ['attribution', 'roi', 'roas'] },
      { id: 'website_builder', label: 'Website', path: '/growth?tab=website', entitlementKey: 'growth.website', searchKeywords: ['website', 'builder', 'storefront'] }
    ]
  },
  {
    id: 'reports',
    sidebarLabel: 'Reports',
    pageTitle: 'Analytics & Reporting',
    icon: BarChart3,
    path: '/reports',
    roles: ['Owner', 'Manager'],
    children: [
      { id: 'sales_reports', label: 'Sales', path: '/reports?tab=sales', entitlementKey: 'reports.core', searchKeywords: ['sales', 'revenue', 'reports'] },
      { id: 'analytics', label: 'Analytics', path: '/reports?tab=analytics', entitlementKey: 'reports.core', searchKeywords: ['analytics', 'insights'] },
      { id: 'ledgers', label: 'Accounting', path: '/reports?tab=accounting', entitlementKey: 'reports.advanced', searchKeywords: ['ledgers', 'accounting', 'transactions'] }
    ]
  },
  {
    id: 'settings',
    sidebarLabel: 'Settings',
    pageTitle: 'Settings',
    icon: SlidersHorizontal,
    path: '/settings',
    roles: ['Owner', 'Manager'],
    isCoreWorkspace: true,
    children: [
      { id: 'settings', label: 'Settings', path: '/settings', searchKeywords: ['settings', 'configuration', 'store setup'] },
      { id: 'onlinestore', label: 'Shopify', path: '/settings?tab=integrations', entitlementKey: 'integrations.shopify', searchKeywords: ['online store', 'shopify', 'ecommerce'] },
      { id: 'training', label: 'Training', path: '/settings?tab=training', searchKeywords: ['training', 'tutorials', 'learning'] }
    ]
  }
];

export type NavigationSectionId = string;
export type ViewKey = string;

export interface NavigationSection {
  id: NavigationSectionId;
  label: string;
  order: number;
  defaultExpanded?: boolean;
}

export interface NavigationItem {
  id: string;
  label: string;
  shortLabel?: string;
  icon: LucideIcon;
  href?: string;
  path: string;
  section: string;
  badgeKey?: 'overdueInvoices' | 'pendingContracts' | 'unreadMessages' | 'alterationsDue' | 'delayedOrders' | 'inTransitTransfers';
  external?: boolean;
  openInNewTab?: boolean;
  mobilePriority?: number; // Lower number = higher priority for bottom nav bar
  searchKeywords: string[];
  featureSlug: string; // Feature key required to view this item
  requiredFeature?: string;
}

/** 
 * Backward compatibility: returns workspaces and their children flattened
 * in the format the older components (Command Palette, Mobile Nav) expect. 
 */
export function getLegacyNavigationItems(): NavigationItem[] {
  const items: NavigationItem[] = [];
  
  // Add workspaces themselves
  WORKSPACES.forEach((w, idx) => {
    items.push({
      id: w.id,
      label: w.sidebarLabel,
      shortLabel: w.sidebarLabel,
      icon: w.icon,
      path: w.path,
      section: w.id,
      searchKeywords: [w.sidebarLabel.toLowerCase()],
      featureSlug: w.entitlementKey || w.id,
      requiredFeature: w.entitlementKey,
      mobilePriority: idx + 1
    });

    // Add their children
    w.children.forEach(c => {
      items.push({
        id: c.id,
        label: `${w.sidebarLabel} \u2192 ${c.label}`,
        shortLabel: c.label,
        icon: c.icon || w.icon,
        path: c.path,
        section: w.id,
        badgeKey: c.badgeKey,
        searchKeywords: c.searchKeywords || [],
        featureSlug: c.entitlementKey || c.id,
        requiredFeature: c.entitlementKey,
        mobilePriority: 99
      });
    });
  });

  return items;
}

/**
 * Kept for backward compatibility
 */
export const NAVIGATION_SECTIONS: NavigationSection[] = WORKSPACES.map((w, i) => ({
  id: w.id,
  label: w.sidebarLabel.toUpperCase(),
  order: i + 1,
  defaultExpanded: true
}));

export const NAVIGATION_ITEMS: NavigationItem[] = getLegacyNavigationItems();

export const VIEW_TO_PATH: Record<string, string> = {
  dashboard: '/today',
  overview: '/today',
  schedule: '/appointments',
  sales: '/sales',
  customers: '/customers',
  leads: '/growth',
  catalog: '/inventory',
  inventory: '/inventory',
  transfers: '/inventory',
  communications: '/customers',
  contracts: '/sales',
  alterations: '/sales',
  invoices: '/sales',
  purchases: '/inventory',
  reports: '/reports',
  ledgers: '/reports',
  staff: '/team',
  settings: '/settings',
  payroll: '/team',
  timeclock: '/team',
  training: '/settings',
  onlinestore: '/settings',
  marketing: '/growth',
  social_content: '/growth',
  seo: '/growth',
  local_seo: '/growth',
  reputation: '/growth',
  competitors: '/growth',
  attribution: '/growth',
  website_builder: '/growth',
  'platform-admin': '/platform-admin',
  'bride-portal': '/portal',
  'fitting-room': '/fitting-room'
};

export const PATH_TO_VIEW: Record<string, string> = {
  '/today': 'today',
  '/dashboard': 'today',
  '/overview': 'today',
  '/appointments': 'appointments',
  '/schedule': 'appointments',
  '/sales': 'sales',
  '/brides': 'customers', // fallback mapping
  '/customers': 'customers',
  '/growth': 'growth',
  '/growth/leads': 'growth',
  '/growth/campaigns': 'growth',
  '/catalog': 'inventory',
  '/inventory': 'inventory',
  '/transfers': 'inventory',
  '/communications': 'customers',
  '/onlinestore': 'settings',
  '/contracts': 'sales',
  '/alterations': 'sales',
  '/invoices': 'sales',
  '/purchases': 'inventory',
  '/reports': 'reports',
  '/ledgers': 'reports',
  '/team': 'team',
  '/settings': 'settings',
  '/payroll': 'team',
  '/timeclock': 'team',
  '/training': 'settings',
  '/growth/social': 'growth',
  '/growth/seo': 'growth',
  '/growth/local': 'growth',
  '/growth/reputation': 'growth',
  '/growth/competitors': 'growth',
  '/growth/attribution': 'growth',
  '/growth/website': 'growth',
  '/platform-admin': 'platform-admin',
  '/portal': 'bride-portal',
  '/fitting-room': 'fitting-room'
};

