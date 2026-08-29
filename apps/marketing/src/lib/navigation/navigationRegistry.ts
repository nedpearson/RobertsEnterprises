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
    moduleKey: 'core.dashboard',
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
    moduleKey: 'scheduling.core',
    entitlementKey: 'appointments',
    roles: ['Owner', 'Manager', 'Stylist', 'Front Desk'],
    isCoreWorkspace: true,
    children: [
      { id: 'schedule', label: 'Schedule', path: '/appointments?tab=calendar&mode=calendar', moduleKey: 'scheduling.core', searchKeywords: ['calendar', 'schedule'] },
      { id: 'requests', label: 'Requests', path: '/appointments?tab=booking-requests&mode=requests', moduleKey: 'scheduling.online', entitlementKey: 'appointments.online_booking', searchKeywords: ['booking requests'] },
    ]
  },
  {
    id: 'customers',
    sidebarLabel: 'Customers',
    pageTitle: 'Customers & Communications',
    icon: Users,
    path: '/customers',
    moduleKey: 'customers.core',
    entitlementKey: 'customers',
    roles: ['Owner', 'Manager', 'Stylist', 'Front Desk', 'Seamstress'],
    isCoreWorkspace: true,
    children: [
      { id: 'customers_list', label: 'Customer 360', path: '/customers?tab=customer-360', moduleKey: 'customers.core', searchKeywords: ['bride', 'customers', 'clients'] },
      { id: 'communications', label: 'Inbox', path: '/customers?tab=inbox', moduleKey: 'communications.core', searchKeywords: ['messages', 'sms', 'email', 'inbox'], badgeKey: 'unreadMessages' },
      { id: 'followups', label: 'Follow-Ups', path: '/customers?tab=follow-ups', moduleKey: 'customers.core', entitlementKey: 'customers.follow_up', searchKeywords: ['follow-ups'] }
    ]
  },
  {
    id: 'sales',
    sidebarLabel: 'Sales',
    pageTitle: 'Sales & Operations',
    icon: Receipt,
    path: '/sales',
    moduleKey: 'sales.core',
    entitlementKey: 'sales',
    roles: ['Owner', 'Manager', 'Stylist', 'Front Desk', 'Seamstress'],
    isCoreWorkspace: true,
    children: [
      { id: 'invoices', label: 'Invoices & Payments', path: '/sales?tab=invoices', moduleKey: 'sales.core', searchKeywords: ['invoices', 'payments', 'billing'], badgeKey: 'overdueInvoices' },
      { id: 'pos', label: 'POS', path: '/sales?tab=pos', moduleKey: 'sales.core', searchKeywords: ['pos', 'checkout', 'register'] },
      { id: 'contracts', label: 'Contracts & Quotes', path: '/sales?tab=contracts', moduleKey: 'sales.contracts', entitlementKey: 'sales.quotes', searchKeywords: ['quotes', 'contracts', 'agreements'] },
      { id: 'alterations', label: 'Alterations', path: '/sales?tab=alterations', moduleKey: 'alterations.core', searchKeywords: ['alterations', 'fittings'] }
    ]
  },
  {
    id: 'inventory',
    sidebarLabel: 'Inventory',
    pageTitle: 'Inventory & Catalog',
    icon: Shirt,
    path: '/inventory',
    moduleKey: 'inventory.core',
    entitlementKey: 'inventory',
    roles: ['Owner', 'Manager'],
    isCoreWorkspace: true,
    children: [
      { id: 'catalog', label: 'Catalogs', path: '/inventory?tab=catalogs', moduleKey: 'inventory.catalogs', entitlementKey: 'inventory.catalog', searchKeywords: ['catalog', 'products'] },
      { id: 'designers', label: 'Designers', path: '/inventory?tab=designers', moduleKey: 'inventory.core', entitlementKey: 'inventory.designers', searchKeywords: ['designers', 'brands'] },
      { id: 'vendors', label: 'Vendors', path: '/inventory?tab=vendors', moduleKey: 'inventory.core', entitlementKey: 'inventory.vendors', searchKeywords: ['vendors', 'suppliers'] },
      { id: 'inventory_list', label: 'Stock Ledgers', path: '/inventory?tab=inventory', moduleKey: 'inventory.core', searchKeywords: ['gowns', 'inventory', 'dresses'] },
      { id: 'purchases', label: 'Purchase Orders', path: '/inventory?tab=purchases', moduleKey: 'purchasing.core', entitlementKey: 'inventory.purchase_orders', searchKeywords: ['purchase orders', 'po'], badgeKey: 'delayedOrders' },
      { id: 'receiving', label: 'Receiving', path: '/inventory?tab=receiving', moduleKey: 'purchasing.core', entitlementKey: 'inventory.receiving', searchKeywords: ['receiving', 'shipments'] },
      { id: 'transfers', label: 'Transfers', path: '/inventory?tab=transfers', moduleKey: 'transfers.core', entitlementKey: 'inventory.transfers', searchKeywords: ['transfers', 'interstore'], badgeKey: 'inTransitTransfers' },
      { id: 'counts', label: 'Counts', path: '/inventory?tab=counts', moduleKey: 'inventory.counts', entitlementKey: 'inventory.counts', searchKeywords: ['counts', 'physical inventory'] },
      { id: 'adjustments', label: 'Adjustments', path: '/inventory?tab=adjustments', moduleKey: 'inventory.core', entitlementKey: 'inventory.adjustments', searchKeywords: ['adjustments', 'corrections'] }
    ]
  },
  {
    id: 'team',
    sidebarLabel: 'Team',
    pageTitle: 'Team & Workforce',
    icon: Users,
    path: '/team',
    moduleKey: 'team.core',
    entitlementKey: 'team',
    roles: ['Owner', 'Manager'],
    isCoreWorkspace: true,
    children: [
      { id: 'staff', label: 'Employees', path: '/team?tab=employees', moduleKey: 'team.core', entitlementKey: 'team.employees', searchKeywords: ['staff', 'team', 'employees'] },
      { id: 'scheduling', label: 'Scheduling', path: '/team?tab=scheduling', moduleKey: 'team.core', entitlementKey: 'team.scheduling', searchKeywords: ['shifts', 'roster'] },
      { id: 'timeclock', label: 'Time Clock', path: '/team?tab=timeclock', moduleKey: 'team.timeclock', entitlementKey: 'team.timeclock', searchKeywords: ['time clock', 'punch'] },
      { id: 'payroll', label: 'Payroll', path: '/team?tab=payroll', moduleKey: 'team.payroll', entitlementKey: 'team.payroll', searchKeywords: ['payroll'] },
      { id: 'commissions', label: 'Commissions', path: '/team?tab=commissions', moduleKey: 'team.payroll', entitlementKey: 'team.commissions', searchKeywords: ['commissions'] }
    ]
  },
  {
    id: 'growth',
    sidebarLabel: 'Growth',
    pageTitle: 'Growth & Marketing',
    icon: Sparkles,
    path: '/growth',
    moduleKey: 'growth.core',
    entitlementKey: 'growth',
    roles: ['Owner'],
    isCoreWorkspace: true,
    children: [
      { id: 'leads', label: 'Leads', path: '/growth?tab=leads', moduleKey: 'growth.leads', entitlementKey: 'growth.leads', searchKeywords: ['leads', 'inquiries', 'funnel'] },
      { id: 'campaigns', label: 'Campaigns', path: '/growth?tab=social&view=campaigns', moduleKey: 'growth.social', entitlementKey: 'growth.campaigns', searchKeywords: ['campaigns', 'ads', 'marketing'] },
      { id: 'social', label: 'Social & Content', path: '/growth?tab=social&view=content', moduleKey: 'growth.social', entitlementKey: 'growth.meta', searchKeywords: ['social', 'content', 'instagram', 'facebook', 'meta'] },
      { id: 'email', label: 'Email & Automations', path: '/growth?tab=social&view=automations', moduleKey: 'growth.social', entitlementKey: 'growth.email', searchKeywords: ['email', 'newsletters', 'automations'] },
      { id: 'seo', label: 'SEO', path: '/growth?tab=seo', moduleKey: 'growth.seo', entitlementKey: 'growth.website', searchKeywords: ['seo', 'search console'] },
      { id: 'google', label: 'Google & Local', path: '/growth?tab=google', moduleKey: 'growth.google', entitlementKey: 'growth.google', searchKeywords: ['google', 'ads', 'local', 'maps'] },
      { id: 'reviews', label: 'Reviews', path: '/growth?tab=reviews', moduleKey: 'growth.reviews', entitlementKey: 'growth.google', searchKeywords: ['reviews', 'reputation'] },
      { id: 'competitors', label: 'Competitors', path: '/growth?tab=competitors', moduleKey: 'growth.competitors', searchKeywords: ['competitors', 'market'] },
      { id: 'attribution', label: 'Attribution', path: '/growth?tab=attribution', moduleKey: 'growth.attribution', entitlementKey: 'growth.attribution', searchKeywords: ['attribution', 'roi', 'roas'] },
      { id: 'website', label: 'Website', path: '/growth?tab=website', moduleKey: 'growth.website', entitlementKey: 'growth.website', searchKeywords: ['website', 'builder'] }
    ]
  },
  {
    id: 'reports',
    sidebarLabel: 'Reports',
    pageTitle: 'Analytics & Reporting',
    icon: BarChart3,
    path: '/reports',
    moduleKey: 'reports.core',
    entitlementKey: 'reports',
    roles: ['Owner', 'Manager'],
    isCoreWorkspace: true,
    children: [
      { id: 'executive', label: 'Executive & Analytics', path: '/reports?tab=analytics', moduleKey: 'reports.analytics', entitlementKey: 'reports.executive', searchKeywords: ['executive', 'analytics', 'dashboard'] },
      { id: 'sales_reports', label: 'Sales', path: '/reports?tab=sales', moduleKey: 'reports.core', entitlementKey: 'reports.sales', searchKeywords: ['sales', 'revenue'] },
      { id: 'accounting_reports', label: 'Accounting', path: '/reports?tab=accounting', moduleKey: 'reports.accounting', entitlementKey: 'reports.financial', searchKeywords: ['accounting', 'ledgers', 'finance'] },
      { id: 'team_reports', label: 'Team', path: '/reports?tab=staff', moduleKey: 'reports.staff', entitlementKey: 'reports.team', searchKeywords: ['team', 'staff', 'performance'] },
      { id: 'marketing_reports', label: 'Marketing', path: '/reports?tab=marketing', moduleKey: 'reports.marketing', entitlementKey: 'reports.marketing', searchKeywords: ['marketing', 'campaigns'] }
    ]
  },
  {
    id: 'settings',
    sidebarLabel: 'Settings',
    pageTitle: 'Settings',
    icon: SlidersHorizontal,
    path: '/settings',
    moduleKey: 'settings.core',
    roles: ['Owner', 'Manager'],
    isCoreWorkspace: true,
    children: [
      { id: 'settings', label: 'Settings', path: '/settings', moduleKey: 'settings.core', searchKeywords: ['settings', 'configuration'] }
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
  /** Module-registry key (lib/modules/moduleRegistry) used for workspace on/off gating. */
  moduleKey?: string;
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
      moduleKey: w.moduleKey,
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
        moduleKey: c.moduleKey || w.moduleKey,
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


/**
 * Canonical tab id for every workspace. Deep links (`?tab=`) MUST use one of these
 * values — a tab id that does not exist here silently drops the user on the
 * workspace default, which is what made the drill-downs look broken.
 * Kept in sync with the workspace pages by `src/tests/navigation-tab-integrity.test.ts`.
 */
export const WORKSPACE_TAB_IDS: Record<string, readonly string[]> = {
  today: [],
  appointments: ['calendar', 'booking-requests', 'workforce', 'capacity', 'operations'],
  customers: [
    'customers', 'customer-360', 'inbox', 'follow-ups', 'style-profiles', 'measurements',
    'try-ons', 'favorites', 'files', 'customer-portal', 'timeline'
  ],
  sales: [
    'invoices', 'payments', 'contracts', 'alterations', 'orders', 'pos', 'layaway',
    'payment-plans', 'returns', 'refunds', 'pickup'
  ],
  inventory: [
    'inventory', 'products', 'purchases', 'receiving', 'transfers', 'vendors', 'designers',
    'counts', 'catalogs', 'adjustments', 'reservations', 'special-orders'
  ],
  team: ['employees', 'scheduling', 'timeclock', 'payroll', 'commissions'],
  growth: [
    'overview', 'leads', 'social', 'seo', 'google', 'reviews', 'competitors',
    'attribution', 'website', 'connections'
  ],
  reports: ['sales', 'analytics', 'accounting', 'marketing', 'staff'],
  settings: [
    'organization',
    'locations',
    'subscriptions',
    'go-live',
    'payments',
    'sales',
    'alterations',
    'commission',
    'booking',
    'scheduling',
    'inventory',
    'purchasing',
    'transfers',
    'communications',
    'automations',
    'notifications',
    'documents',
    'modules',
    'integrations',
    'ai-models',
    'reporting',
    'security',
    'data',
    'audit',
    'system-health',
    'feature-flags'
  ]
};

/** Legacy/aliased tab ids that used to appear in links, mapped onto a real tab. */
export const TAB_ALIASES: Record<string, Record<string, string>> = {
  customers: { followups: 'follow-ups', 'follow_up': 'follow-ups', customer360: 'customer-360' },
  sales: { quotes: 'contracts', invoice: 'invoices', checkout: 'pos' },
  inventory: { catalog: 'catalogs', 'special_orders': 'special-orders', stock: 'inventory' },
  reports: { executive: 'analytics', team: 'staff', inventory: 'analytics', financial: 'accounting' },
  growth: {
    campaigns: 'social', marketing: 'social', meta: 'social', facebook: 'social',
    instagram: 'social', email: 'social', social_content: 'social',
    local: 'google', local_seo: 'google', reputation: 'reviews', builder: 'website'
  },
  appointments: {
    overview: 'calendar', schedule: 'calendar', appointments: 'calendar', requests: 'booking-requests',
    online: 'operations', 'online-booking': 'operations', 'check-in': 'operations', 'no-shows': 'operations',
    'follow-up': 'operations', 'appointment-types': 'operations', reminders: 'operations', availability: 'operations',
    resources: 'operations'
  },
  team: { staff: 'employees', schedules: 'scheduling' }
};

/**
 * Resolves a requested tab id for a workspace to a real tab id.
 * Returns `undefined` when there is no sensible match so the caller can fall back.
 */
export function resolveWorkspaceTab(workspaceId: string, requested: string | null | undefined): string | undefined {
  if (!requested) return undefined;
  const valid = WORKSPACE_TAB_IDS[workspaceId];
  if (!valid || valid.length === 0) return undefined;
  if (valid.includes(requested)) return requested;
  const alias = TAB_ALIASES[workspaceId]?.[requested];
  return alias && valid.includes(alias) ? alias : undefined;
}

/** Second-level route segment (from the feature registry) -> workspace tab. */
const FEATURE_ROUTE_TABS: Record<string, string> = {
  'appointments/calendar': 'calendar',
  'appointments/online': 'operations',
  'growth/ai': 'social',
  'growth/automations': 'social',
  'growth/leads': 'leads',
  'growth/reviews': 'reviews',
  'inventory/catalogs': 'catalogs',
  'inventory/purchasing': 'purchases',
  'inventory/transfers': 'transfers',
  'reports/inventory': 'analytics',
  'reports/sales': 'sales',
  'sales/alterations': 'alterations',
  'sales/contracts': 'contracts',
  'sales/invoices': 'invoices',
  'team/commissions': 'commissions',
  'team/schedules': 'scheduling'
};

/** Extra query params a feature route needs to land on the right sub-view. */
const FEATURE_ROUTE_EXTRA: Record<string, string> = {
  'growth/ai': 'view=copilot',
  'growth/automations': 'view=automations'
};

/**
 * Turns a feature-registry route (e.g. `/demo/inventory/catalogs`) into a real
 * in-app path (`/inventory?tab=catalogs`). Previously these were handed to
 * `getPathForView` as if they were view keys, which always resolved to `/`.
 */
export function resolveFeatureRoute(route: string): string {
  const clean = route.replace(/^\/demo(?=\/|$)/, '') || '/';
  const segments = clean.split('/').filter(Boolean);
  if (segments.length === 0) return '/today';
  const workspace = segments[0];
  if (!WORKSPACE_TAB_IDS[workspace]) return `/${workspace}`;
  if (segments.length === 1) return `/${workspace}`;
  const key = `${workspace}/${segments[1]}`;
  const tab = FEATURE_ROUTE_TABS[key] || resolveWorkspaceTab(workspace, segments[1]);
  if (!tab) return `/${workspace}`;
  const extra = FEATURE_ROUTE_EXTRA[key];
  return `/${workspace}?tab=${tab}${extra ? `&${extra}` : ''}`;
}
