export enum ModuleReleaseState {
  DEVELOPMENT = 'DEVELOPMENT',
  INTERNAL = 'INTERNAL',
  BETA = 'BETA',
  PRODUCTION = 'PRODUCTION',
  DEPRECATED = 'DEPRECATED'
}

export enum ModuleCategory {
  CORE = 'CORE',
  APPOINTMENTS = 'APPOINTMENTS',
  CUSTOMERS = 'CUSTOMERS',
  SALES = 'SALES',
  INVENTORY = 'INVENTORY',
  TEAM = 'TEAM',
  GROWTH = 'GROWTH',
  REPORTS = 'REPORTS',
  CONNECTIONS = 'CONNECTIONS',
  ADVANCED = 'ADVANCED'
}

export interface ModuleDefinition {
  /** Unique identifier for the module (e.g., 'growth.reviews') */
  key: string;
  /** Human-readable full name */
  name: string;
  /** Short name for navigation menus */
  shortName: string;
  /** Description for the Settings -> Modules UI */
  description: string;
  
  category: ModuleCategory;
  releaseState: ModuleReleaseState;
  
  /** If true, the module cannot be disabled by the user */
  core: boolean;
  
  /** The subscription entitlement key required to access this module (e.g., 'growth.marketing'). If null, available to all plans. */
  entitlementFeatureKey: string | null;
  
  /** Whether the module is enabled by default for new tenants who are entitled to it */
  defaultEnabled: boolean;
  
  /** Keys of modules that must be enabled for this module to function */
  dependencies: string[];
  
  /** Keys of parent modules this feature belongs to. If parents are disabled, this is hidden. */
  parentModuleKeys?: string[];
  
  /** Route path for navigation */
  route?: string;
  
  /** Search keywords for the global search */
  searchKeywords?: string[];
  
  /** Mobile specific priorities, undefined means do not show in bottom nav */
  mobilePriority?: number;
}

export const MODULE_REGISTRY: Record<string, ModuleDefinition> = {
  // Core & Today
  'core.dashboard': {
    key: 'core.dashboard',
    name: 'Dashboard & Today',
    shortName: 'Today',
    description: 'Your daily overview, tasks, and immediate actions.',
    category: ModuleCategory.CORE,
    releaseState: ModuleReleaseState.PRODUCTION,
    core: true,
    entitlementFeatureKey: null,
    defaultEnabled: true,
    dependencies: [],
    route: '/today',
    searchKeywords: ['home', 'dashboard', 'today'],
    mobilePriority: 1
  },

  // Appointments
  'appointments.core': {
    key: 'appointments.core',
    name: 'Appointments',
    shortName: 'Appointments',
    description: 'Schedule, manage, and check-in appointments.',
    category: ModuleCategory.APPOINTMENTS,
    releaseState: ModuleReleaseState.PRODUCTION,
    core: true,
    entitlementFeatureKey: null,
    defaultEnabled: true,
    dependencies: [],
    route: '/appointments',
    searchKeywords: ['appointments', 'calendar', 'schedule'],
    mobilePriority: 2
  },

  // Customers
  'customers.core': {
    key: 'customers.core',
    name: 'Customers',
    shortName: 'Customers',
    description: 'Customer directory, 360 profiles, and communications.',
    category: ModuleCategory.CUSTOMERS,
    releaseState: ModuleReleaseState.PRODUCTION,
    core: true,
    entitlementFeatureKey: null,
    defaultEnabled: true,
    dependencies: [],
    route: '/customers',
    searchKeywords: ['customers', 'brides', 'clients', 'directory'],
    mobilePriority: 3
  },
  'customers.style_profiles': {
    key: 'customers.style_profiles',
    name: 'Style Profiles',
    shortName: 'Style Profiles',
    description: 'Track each bride silhouette, designer and aesthetic preferences.',
    category: ModuleCategory.CUSTOMERS,
    releaseState: ModuleReleaseState.PRODUCTION,
    core: false,
    entitlementFeatureKey: null,
    defaultEnabled: true,
    dependencies: ['customers.core'],
    parentModuleKeys: ['customers.core'],
    searchKeywords: ['style profiles']
  },
  'customers.measurements': {
    key: 'customers.measurements',
    name: 'Measurements',
    shortName: 'Measurements',
    description: 'Store and compare fitting measurements per bride.',
    category: ModuleCategory.CUSTOMERS,
    releaseState: ModuleReleaseState.PRODUCTION,
    core: false,
    entitlementFeatureKey: null,
    defaultEnabled: true,
    dependencies: ['customers.core'],
    parentModuleKeys: ['customers.core'],
    searchKeywords: ['measurements']
  },
  'customers.portal': {
    key: 'customers.portal',
    name: 'Customer Portal',
    shortName: 'Customer Portal',
    description: 'Give each bride a private link to their gown, contract and appointments.',
    category: ModuleCategory.CUSTOMERS,
    releaseState: ModuleReleaseState.PRODUCTION,
    core: false,
    entitlementFeatureKey: null,
    defaultEnabled: true,
    dependencies: ['customers.core'],
    parentModuleKeys: ['customers.core'],
    searchKeywords: ['customer portal']
  },
  'communications.core': {
    key: 'communications.core',
    name: 'Unified Inbox',
    shortName: 'Unified Inbox',
    description: 'Two-way SMS and email with brides in one thread per customer.',
    category: ModuleCategory.CUSTOMERS,
    releaseState: ModuleReleaseState.PRODUCTION,
    core: false,
    entitlementFeatureKey: null,
    defaultEnabled: true,
    dependencies: ['customers.core'],
    searchKeywords: ['unified inbox']
  },
  'communications.automations': {
    key: 'communications.automations',
    name: 'Automated Reminders',
    shortName: 'Automated Reminders',
    description: 'Automatic appointment reminders and follow-up messages.',
    category: ModuleCategory.CUSTOMERS,
    releaseState: ModuleReleaseState.PRODUCTION,
    core: false,
    entitlementFeatureKey: null,
    defaultEnabled: true,
    dependencies: ['customers.core'],
    parentModuleKeys: ['communications.core'],
    searchKeywords: ['automated reminders']
  },


  // Sales
  'sales.core': {
    key: 'sales.core',
    name: 'Sales & POS',
    shortName: 'Sales',
    description: 'Point of sale, transactions, contracts, and invoices.',
    category: ModuleCategory.SALES,
    releaseState: ModuleReleaseState.PRODUCTION,
    core: true,
    entitlementFeatureKey: null,
    defaultEnabled: true,
    dependencies: [],
    route: '/sales',
    searchKeywords: ['sales', 'pos', 'register', 'checkout'],
    mobilePriority: 4
  },
  'sales.alterations': {
    key: 'sales.alterations',
    name: 'Alterations & Fitting',
    shortName: 'Alterations',
    description: 'Track alterations, fittings, and seamstress tasks.',
    category: ModuleCategory.SALES,
    releaseState: ModuleReleaseState.PRODUCTION,
    core: false,
    entitlementFeatureKey: 'sales.alterations',
    defaultEnabled: false,
    dependencies: ['sales.core'],
    parentModuleKeys: ['sales.core'],
    route: '/sales?tab=alterations',
    searchKeywords: ['alterations', 'fittings', 'sewing']
  },

  // Inventory
  'inventory.core': {
    key: 'inventory.core',
    name: 'Inventory',
    shortName: 'Inventory',
    description: 'Product catalog, stock levels, and purchasing.',
    category: ModuleCategory.INVENTORY,
    releaseState: ModuleReleaseState.PRODUCTION,
    core: false,
    entitlementFeatureKey: null,
    defaultEnabled: true,
    dependencies: [],
    route: '/inventory',
    searchKeywords: ['inventory', 'catalog', 'products', 'stock']
  },
  'inventory.transfers': {
    key: 'inventory.transfers',
    name: 'Multi-Location Transfers',
    shortName: 'Transfers',
    description: 'Manage inventory transfers between locations.',
    category: ModuleCategory.INVENTORY,
    releaseState: ModuleReleaseState.PRODUCTION,
    core: false,
    entitlementFeatureKey: 'inventory.transfers',
    defaultEnabled: false,
    dependencies: ['inventory.core'],
    parentModuleKeys: ['inventory.core'],
    route: '/inventory?tab=transfers',
    searchKeywords: ['transfers', 'shipping', 'locations']
  },

  // Team
  'team.core': {
    key: 'team.core',
    name: 'Team',
    shortName: 'Team',
    description: 'Manage employees, roles, and schedules.',
    category: ModuleCategory.TEAM,
    releaseState: ModuleReleaseState.PRODUCTION,
    core: false,
    entitlementFeatureKey: null,
    defaultEnabled: true,
    dependencies: [],
    route: '/team',
    searchKeywords: ['team', 'employees', 'staff']
  },
  'team.timeclock': {
    key: 'team.timeclock',
    name: 'Time Clock',
    shortName: 'Time Clock',
    description: 'Employee punch-in, punch-out, and timesheets.',
    category: ModuleCategory.TEAM,
    releaseState: ModuleReleaseState.PRODUCTION,
    core: false,
    entitlementFeatureKey: 'team.timeclock',
    defaultEnabled: true,
    dependencies: ['team.core'],
    parentModuleKeys: ['team.core'],
    route: '/team?tab=timeclock',
    searchKeywords: ['time clock', 'shifts', 'hours']
  },
  'team.payroll': {
    key: 'team.payroll',
    name: 'Payroll & Commissions',
    shortName: 'Payroll',
    description: 'Manage payroll exports and automated sales commissions.',
    category: ModuleCategory.TEAM,
    releaseState: ModuleReleaseState.PRODUCTION,
    core: false,
    entitlementFeatureKey: 'payroll.core',
    defaultEnabled: false,
    dependencies: ['team.core'],
    parentModuleKeys: ['team.core'],
    route: '/team?tab=payroll',
    searchKeywords: ['payroll', 'commissions', 'wages']
  },

  // Growth
  'growth.core': {
    key: 'growth.core',
    name: 'Growth & Marketing',
    shortName: 'Growth',
    description: 'Central hub for marketing, leads, and analytics.',
    category: ModuleCategory.GROWTH,
    releaseState: ModuleReleaseState.PRODUCTION,
    core: false,
    entitlementFeatureKey: 'growth.marketing',
    defaultEnabled: true,
    dependencies: [],
    route: '/growth',
    searchKeywords: ['growth', 'marketing', 'campaigns']
  },
  'growth.leads': {
    key: 'growth.leads',
    name: 'Leads Pipeline',
    shortName: 'Leads',
    description: 'Track and convert prospective customers.',
    category: ModuleCategory.GROWTH,
    releaseState: ModuleReleaseState.PRODUCTION,
    core: false,
    entitlementFeatureKey: 'growth.leads',
    defaultEnabled: true,
    dependencies: ['growth.core'],
    parentModuleKeys: ['growth.core'],
    route: '/growth?tab=leads',
    searchKeywords: ['leads', 'prospects', 'pipeline']
  },
  'growth.social': {
    key: 'growth.social',
    name: 'Social Media',
    shortName: 'Social',
    description: 'Schedule posts and track social engagement.',
    category: ModuleCategory.GROWTH,
    releaseState: ModuleReleaseState.PRODUCTION,
    core: false,
    entitlementFeatureKey: 'growth.social_content',
    defaultEnabled: true,
    dependencies: ['growth.core'],
    parentModuleKeys: ['growth.core'],
    route: '/growth?tab=social',
    searchKeywords: ['social', 'instagram', 'facebook']
  },
  'growth.seo': {
    key: 'growth.seo',
    name: 'Technical SEO',
    shortName: 'SEO',
    description: 'Monitor website health and search visibility.',
    category: ModuleCategory.GROWTH,
    releaseState: ModuleReleaseState.PRODUCTION,
    core: false,
    entitlementFeatureKey: 'growth.seo',
    defaultEnabled: true,
    dependencies: ['growth.core'],
    parentModuleKeys: ['growth.core'],
    route: '/growth?tab=seo',
    searchKeywords: ['seo', 'search', 'rankings']
  },
  'growth.google': {
    key: 'growth.google',
    name: 'Google Business',
    shortName: 'Google',
    description: 'Manage your local Google Business profile.',
    category: ModuleCategory.GROWTH,
    releaseState: ModuleReleaseState.PRODUCTION,
    core: false,
    entitlementFeatureKey: 'growth.local_seo',
    defaultEnabled: true,
    dependencies: ['growth.core'],
    parentModuleKeys: ['growth.core'],
    route: '/growth?tab=google',
    searchKeywords: ['google', 'business profile', 'maps']
  },
  'growth.reviews': {
    key: 'growth.reviews',
    name: 'Review Management',
    shortName: 'Reviews',
    description: 'Automate review requests and respond to feedback.',
    category: ModuleCategory.GROWTH,
    releaseState: ModuleReleaseState.PRODUCTION,
    core: false,
    entitlementFeatureKey: 'growth.reputation',
    defaultEnabled: true,
    dependencies: ['growth.core'],
    parentModuleKeys: ['growth.core'],
    route: '/growth?tab=reviews',
    searchKeywords: ['reviews', 'reputation', 'feedback']
  },
  'growth.competitors': {
    key: 'growth.competitors',
    name: 'Competitor Intel',
    shortName: 'Competitors',
    description: 'Track local competitors and market positioning.',
    category: ModuleCategory.GROWTH,
    releaseState: ModuleReleaseState.PRODUCTION,
    core: false,
    entitlementFeatureKey: 'growth.competitors',
    defaultEnabled: false,
    dependencies: ['growth.core'],
    parentModuleKeys: ['growth.core'],
    route: '/growth?tab=competitors',
    searchKeywords: ['competitors', 'intelligence', 'market']
  },
  'growth.attribution': {
    key: 'growth.attribution',
    name: 'Marketing Attribution',
    shortName: 'Attribution',
    description: 'Track return on ad spend and marketing ROI.',
    category: ModuleCategory.GROWTH,
    releaseState: ModuleReleaseState.PRODUCTION,
    core: false,
    entitlementFeatureKey: 'growth.attribution',
    defaultEnabled: false,
    dependencies: ['growth.core'],
    parentModuleKeys: ['growth.core'],
    route: '/growth?tab=attribution',
    searchKeywords: ['attribution', 'roas', 'roi']
  },
  'growth.website': {
    key: 'growth.website',
    name: 'Website Builder',
    shortName: 'Website',
    description: 'Manage your VowOS-hosted storefront.',
    category: ModuleCategory.GROWTH,
    releaseState: ModuleReleaseState.PRODUCTION,
    core: false,
    entitlementFeatureKey: 'growth.website',
    defaultEnabled: false,
    dependencies: ['growth.core'],
    parentModuleKeys: ['growth.core'],
    route: '/growth?tab=website',
    searchKeywords: ['website', 'builder', 'storefront']
  },

  // Reports
  'reports.core': {
    key: 'reports.core',
    name: 'Reports',
    shortName: 'Reports',
    description: 'Standard business reporting and analytics.',
    category: ModuleCategory.REPORTS,
    releaseState: ModuleReleaseState.PRODUCTION,
    core: false,
    entitlementFeatureKey: 'reports.core',
    defaultEnabled: true,
    dependencies: [],
    route: '/reports',
    searchKeywords: ['reports', 'analytics', 'data']
  },
  'reports.accounting': {
    key: 'reports.accounting',
    name: 'Advanced Accounting',
    shortName: 'Accounting',
    description: 'Detailed ledgers, reconciliation, and exports.',
    category: ModuleCategory.REPORTS,
    releaseState: ModuleReleaseState.PRODUCTION,
    core: false,
    entitlementFeatureKey: 'reports.advanced',
    defaultEnabled: false,
    dependencies: ['reports.core'],
    parentModuleKeys: ['reports.core'],
    route: '/reports?tab=accounting',
    searchKeywords: ['accounting', 'ledgers', 'reconciliation']
  },

  // Connections
  'integrations.shopify': {
    key: 'integrations.shopify',
    name: 'Shopify',
    shortName: 'Shopify',
    description: 'Sync online sales and inventory with Shopify.',
    category: ModuleCategory.CONNECTIONS,
    releaseState: ModuleReleaseState.PRODUCTION,
    core: false,
    entitlementFeatureKey: 'integrations.shopify',
    defaultEnabled: false,
    dependencies: [],
    route: '/settings?tab=integrations',
    searchKeywords: ['shopify', 'ecommerce', 'online store']
  },

  // Settings
  'settings.core': {
    key: 'settings.core',
    name: 'Settings',
    shortName: 'Settings',
    description: 'Manage your VowOS configuration.',
    category: ModuleCategory.CORE,
    releaseState: ModuleReleaseState.PRODUCTION,
    core: true,
    entitlementFeatureKey: null,
    defaultEnabled: true,
    dependencies: [],
    route: '/settings',
    searchKeywords: ['settings', 'configuration', 'preferences']
  }
};

export function getModuleDefinition(key: string): ModuleDefinition | undefined {
  return MODULE_REGISTRY[key];
}

export function getAllModules(): ModuleDefinition[] {
  return Object.values(MODULE_REGISTRY);
}

export function getModulesByCategory(category: ModuleCategory): ModuleDefinition[] {
  return Object.values(MODULE_REGISTRY).filter(m => m.category === category);
}

export function getChildModules(parentKey: string): ModuleDefinition[] {
  return Object.values(MODULE_REGISTRY).filter(m => m.parentModuleKeys?.includes(parentKey));
}
