export interface ServerModuleDefinition {
  key: string;
  core: boolean;
  dependencies: string[];
}

const definitions: ServerModuleDefinition[] = [
  { key: 'scheduling.core', core: true, dependencies: [] },
  { key: 'scheduling.online', core: false, dependencies: ['scheduling.core'] },
  { key: 'scheduling.resources', core: false, dependencies: ['scheduling.core'] },

  { key: 'core.dashboard', core: true, dependencies: [] },
  { key: 'appointments.core', core: true, dependencies: [] },

  { key: 'customers.core', core: true, dependencies: [] },
  { key: 'customers.style_profiles', core: false, dependencies: ['customers.core'] },
  { key: 'customers.measurements', core: false, dependencies: ['customers.core'] },
  { key: 'customers.portal', core: false, dependencies: ['customers.core'] },
  { key: 'communications.core', core: false, dependencies: ['customers.core'] },
  { key: 'communications.automations', core: false, dependencies: ['customers.core', 'communications.core'] },

  { key: 'sales.core', core: true, dependencies: [] },
  { key: 'sales.contracts', core: false, dependencies: ['sales.core'] },
  { key: 'sales.layaway', core: false, dependencies: ['sales.core'] },
  { key: 'sales.payment_plans', core: false, dependencies: ['sales.core'] },
  { key: 'sales.returns', core: false, dependencies: ['sales.core'] },
  { key: 'sales.refunds', core: false, dependencies: ['sales.core'] },
  { key: 'sales.alterations', core: false, dependencies: ['sales.core'] },
  { key: 'alterations.core', core: false, dependencies: ['sales.core'] },

  { key: 'inventory.core', core: false, dependencies: [] },
  { key: 'inventory.counts', core: false, dependencies: ['inventory.core'] },
  { key: 'inventory.reservations', core: false, dependencies: ['inventory.core'] },
  { key: 'inventory.special_orders', core: false, dependencies: ['inventory.core'] },
  { key: 'inventory.catalogs', core: false, dependencies: ['inventory.core'] },
  { key: 'inventory.transfers', core: false, dependencies: ['inventory.core'] },
  { key: 'purchasing.core', core: false, dependencies: ['inventory.core'] },
  { key: 'transfers.core', core: false, dependencies: ['inventory.core'] },

  { key: 'team.core', core: false, dependencies: [] },
  { key: 'team.timeclock', core: false, dependencies: ['team.core'] },
  { key: 'team.payroll', core: false, dependencies: ['team.core'] },

  { key: 'growth.core', core: false, dependencies: [] },
  { key: 'growth.leads', core: false, dependencies: ['growth.core'] },
  { key: 'growth.social', core: false, dependencies: ['growth.core'] },
  { key: 'growth.seo', core: false, dependencies: ['growth.core'] },
  { key: 'growth.google', core: false, dependencies: ['growth.core'] },
  { key: 'growth.reviews', core: false, dependencies: ['growth.core'] },
  { key: 'growth.competitors', core: false, dependencies: ['growth.core'] },
  { key: 'growth.attribution', core: false, dependencies: ['growth.core'] },
  { key: 'growth.website', core: false, dependencies: ['growth.core'] },

  { key: 'reports.core', core: true, dependencies: [] },
  { key: 'reports.accounting', core: false, dependencies: ['reports.core'] },
  { key: 'reports.analytics', core: false, dependencies: ['reports.core'] },
  { key: 'reports.marketing', core: false, dependencies: ['reports.core'] },
  { key: 'reports.staff', core: false, dependencies: ['reports.core'] },

  { key: 'integrations.shopify', core: false, dependencies: [] },
  { key: 'settings.core', core: true, dependencies: [] },
];

export const SERVER_MODULE_CATALOG = Object.freeze(
  Object.fromEntries(definitions.map((definition) => [definition.key, Object.freeze(definition)])) as Record<string, ServerModuleDefinition>,
);

export const SERVER_MODULE_KEYS = Object.freeze(definitions.map((definition) => definition.key));
