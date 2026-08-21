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
import { FeatureKey } from '@/lib/features/featureCatalog';

export type WorkspaceId =
  | 'today'
  | 'appointments'
  | 'customers'
  | 'sales'
  | 'inventory'
  | 'team'
  | 'growth'
  | 'reports'
  | 'settings'
  | 'communications'
  | 'dashboard'
  | 'training'
  | 'onlinestore'
  | 'bride-portal'
  | 'fitting-room'
  | 'platform-admin'
  | 'not-found';

export interface WorkspaceChild {
  id: string;
  label: string;
  path: string;
  moduleKey?: string;
  entitlementKey?: FeatureKey;
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
  entitlementKey?: FeatureKey;
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
    entitlementKey: 'appointments',
    roles: ['Owner', 'Manager', 'Stylist', 'Front Desk'],
    isCoreWorkspace: true,
    children: [
      { id: 'schedule', label: 'Schedule', path: '/appointments?mode=calendar', searchKeywords: ['calendar', 'schedule'] },
      { id: 'requests', label: 'Requests', path: '/appointments?mode=requests', entitlementKey: 'appointments.online_booking', searchKeywords: ['booking requests'] },
    ]
  },
  {
    id: 'customers',
    sidebarLabel: 'Customers',
    pageTitle: 'Customers & Communications',
    icon: Users,
    path: '/customers',
    entitlementKey: 'customers',
    roles: ['Owner', 'Manager', 'Stylist', 'Front Desk', 'Seamstress'],
    isCoreWorkspace: true,
    children: [
      { id: 'customers_list', label: 'Customer 360', path: '/customers?tab=customers', searchKeywords: ['bride', 'customers', 'clients'] },
      { id: 'communications', label: 'Inbox', path: '/customers?tab=inbox', searchKeywords: ['messages', 'sms', 'email', 'inbox'], badgeKey: 'unreadMessages' },
      { id: 'followups', label: 'Follow-Ups', path: '/customers?tab=followups', entitlementKey: 'customers.follow_up', searchKeywords: ['follow-ups'] }
    ]
  },
  {
    id: 'sales',
    sidebarLabel: 'Sales',
    pageTitle: 'Sales & Operations',
    icon: Receipt,
    path: '/sales',
    entitlementKey: 'sales',
    roles: ['Owner', 'Manager', 'Stylist', 'Front Desk', 'Seamstress'],
    isCoreWorkspace: true,
    children: [
      { id: 'invoices', label: 'POS', path: '/sales?tab=payments', searchKeywords: ['invoices', 'pos', 'payments'], badgeKey: 'overdueInvoices' },
      { id: 'contracts', label: 'Quotes', path: '/sales?tab=quotes', entitlementKey: 'sales.quotes', searchKeywords: ['quotes', 'agreements'] }
    ]
  },
  {
    id: 'inventory',
    sidebarLabel: 'Inventory',
    pageTitle: 'Inventory & Catalog',
    icon: Shirt,
    path: '/inventory',
    entitlementKey: 'inventory',
    roles: ['Owner', 'Manager'],
    children: [
      { id: 'catalog', label: 'Catalog', path: '/inventory?tab=catalog', entitlementKey: 'inventory.catalog', searchKeywords: ['catalog', 'products'] },
      { id: 'designers', label: 'Designers', path: '/inventory?tab=designers', entitlementKey: 'inventory.designers', searchKeywords: ['designers', 'brands'] },
      { id: 'vendors', label: 'Vendors', path: '/inventory?tab=vendors', entitlementKey: 'inventory.vendors', searchKeywords: ['vendors', 'suppliers'] },
      { id: 'inventory_list', label: 'Stock Ledgers', path: '/inventory?tab=inventory', searchKeywords: ['gowns', 'inventory', 'dresses'] },
      { id: 'purchases', label: 'Purchase Orders', path: '/inventory?tab=purchases', entitlementKey: 'inventory.purchase_orders', searchKeywords: ['purchase orders', 'po'], badgeKey: 'delayedOrders' },
      { id: 'receiving', label: 'Receiving', path: '/inventory?tab=receiving', entitlementKey: 'inventory.receiving', searchKeywords: ['receiving', 'shipments'] },
      { id: 'transfers', label: 'Transfers', path: '/inventory?tab=transfers', entitlementKey: 'inventory.transfers', searchKeywords: ['transfers', 'interstore'], badgeKey: 'inTransitTransfers' },
      { id: 'counts', label: 'Counts', path: '/inventory?tab=counts', entitlementKey: 'inventory.counts', searchKeywords: ['counts', 'physical inventory'] },
      { id: 'adjustments', label: 'Adjustments', path: '/inventory?tab=adjustments', entitlementKey: 'inventory.adjustments', searchKeywords: ['adjustments', 'corrections'] }
    ]
  },
  {
    id: 'team',
    sidebarLabel: 'Team',
    pageTitle: 'Team & Workforce',
    icon: Users,
    path: '/team',
    entitlementKey: 'team',
    roles: ['Owner', 'Manager'],
    children: [
      { id: 'staff', label: 'Employees', path: '/team?tab=employees', entitlementKey: 'team.employees', searchKeywords: ['staff', 'team', 'employees'] },
      { id: 'scheduling', label: 'Scheduling', path: '/team?tab=scheduling', entitlementKey: 'team.scheduling', searchKeywords: ['shifts', 'roster'] },
      { id: 'timeclock', label: 'Time Clock', path: '/team?tab=timeclock', entitlementKey: 'team.timeclock', searchKeywords: ['time clock', 'punch'] },
      { id: 'payroll', label: 'Payroll', path: '/team?tab=payroll', entitlementKey: 'team.payroll', searchKeywords: ['payroll'] },
      { id: 'commissions', label: 'Commissions', path: '/team?tab=commissions', entitlementKey: 'team.commissions', searchKeywords: ['commissions'] }
    ]
  },
  {
    id: 'growth',
    sidebarLabel: 'Growth',
    pageTitle: 'Growth & Marketing',
    icon: Sparkles,
    path: '/growth',
    entitlementKey: 'growth',
    roles: ['Owner'],
    children: [
      { id: 'leads', label: 'Leads', path: '/growth?tab=leads', entitlementKey: 'growth.leads', searchKeywords: ['leads', 'inquiries', 'funnel'] },
      { id: 'campaigns', label: 'Campaigns', path: '/growth?tab=campaigns', entitlementKey: 'growth.campaigns', searchKeywords: ['campaigns', 'marketing'] },
      { id: 'google', label: 'Google Ads', path: '/growth?tab=google', entitlementKey: 'growth.google', searchKeywords: ['google', 'ads'] },
      { id: 'meta', label: 'Meta Ads', path: '/growth?tab=meta', entitlementKey: 'growth.meta', searchKeywords: ['meta', 'facebook', 'instagram'] },
      { id: 'email', label: 'Email Marketing', path: '/growth?tab=email', entitlementKey: 'growth.email', searchKeywords: ['email', 'newsletters'] },
      { id: 'attribution', label: 'Attribution', path: '/growth?tab=attribution', entitlementKey: 'growth.attribution', searchKeywords: ['attribution', 'roi', 'roas'] },
      { id: 'website', label: 'Website', path: '/growth?tab=website', entitlementKey: 'growth.website', searchKeywords: ['website', 'builder'] }
    ]
  },
  {
    id: 'reports',
    sidebarLabel: 'Reports',
    pageTitle: 'Analytics & Reporting',
    icon: BarChart3,
    path: '/reports',
    entitlementKey: 'reports',
    roles: ['Owner', 'Manager'],
    children: [
      { id: 'executive', label: 'Executive', path: '/reports?tab=executive', entitlementKey: 'reports.executive', searchKeywords: ['executive', 'dashboard'] },
      { id: 'sales_reports', label: 'Sales', path: '/reports?tab=sales', entitlementKey: 'reports.sales', searchKeywords: ['sales', 'revenue'] },
      { id: 'inventory_reports', label: 'Inventory', path: '/reports?tab=inventory', entitlementKey: 'reports.inventory', searchKeywords: ['inventory', 'stock'] },
      { id: 'team_reports', label: 'Team', path: '/reports?tab=team', entitlementKey: 'reports.team', searchKeywords: ['team', 'performance'] },
      { id: 'marketing_reports', label: 'Marketing', path: '/reports?tab=marketing', entitlementKey: 'reports.marketing', searchKeywords: ['marketing', 'campaigns'] }
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
      { id: 'settings', label: 'Settings', path: '/settings', searchKeywords: ['settings', 'configuration'] }
    ]
  }
];

// ... (other types unchanged for now)
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

