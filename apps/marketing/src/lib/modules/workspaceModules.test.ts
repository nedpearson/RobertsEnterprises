import { describe, it, expect } from 'vitest';
import { MODULE_REGISTRY } from './moduleRegistry';

const CUSTOMERS_TAB_MODULES = [
  'customers.core',
  'communications.core',
  'customers.style_profiles',
  'customers.measurements',
  'customers.portal',
];

const APPOINTMENTS_TAB_MODULES = [
  'scheduling.core',
  'scheduling.online',
  'scheduling.resources',
  'communications.automations'
];

const SALES_TAB_MODULES = [
  'sales.core',
  'sales.contracts',
  'sales.layaway',
  'sales.payment_plans',
  'sales.returns',
  'sales.refunds',
  'alterations.core',
];

const INVENTORY_TAB_MODULES = [
  'inventory.core',
  'purchasing.core',
  'transfers.core',
  'inventory.counts',
  'inventory.reservations',
  'inventory.special_orders',
  'inventory.catalogs',
];

const REPORTS_TAB_MODULES = [
  'reports.core',
  'reports.analytics',
  'reports.accounting',
  'reports.marketing',
  'reports.staff',
];

const TEAM_TAB_MODULES = [
  'team.core',
  'team.timeclock',
  'team.payroll',
];

describe('workspace module keys are registered', () => {
  it('registers every Customers-workspace tab module', () => {
    for (const key of CUSTOMERS_TAB_MODULES) {
      expect(MODULE_REGISTRY[key], `missing module: ${key}`).toBeDefined();
    }
  });

  it('registers every Appointments-workspace tab module', () => {
    for (const key of APPOINTMENTS_TAB_MODULES) {
      expect(MODULE_REGISTRY[key], `missing module: ${key}`).toBeDefined();
    }
  });

  it('registers every Sales-workspace tab module', () => {
    for (const key of SALES_TAB_MODULES) {
      expect(MODULE_REGISTRY[key], `missing module: ${key}`).toBeDefined();
    }
  });

  it('registers every Inventory-workspace tab module', () => {
    for (const key of INVENTORY_TAB_MODULES) {
      expect(MODULE_REGISTRY[key], `missing module: ${key}`).toBeDefined();
    }
  });

  it('registers every Reports-workspace tab module', () => {
    for (const key of REPORTS_TAB_MODULES) {
      expect(MODULE_REGISTRY[key], `missing module: ${key}`).toBeDefined();
    }
  });

  it('registers every Team-workspace tab module', () => {
    for (const key of TEAM_TAB_MODULES) {
      expect(MODULE_REGISTRY[key], `missing module: ${key}`).toBeDefined();
    }
  });

  it('every registry module carries the fields the resolver and Settings UI read', () => {
    for (const [key, m] of Object.entries(MODULE_REGISTRY)) {
      expect(m.key).toBe(key);
      expect(typeof m.name).toBe('string');
      expect(typeof m.core).toBe('boolean');
      expect(typeof m.defaultEnabled).toBe('boolean');
      expect(m.category).toBeTruthy();
    }
  });

  it('registers every single tab module across all workspaces', () => {
    const allModules = [
      ...CUSTOMERS_TAB_MODULES,
      ...APPOINTMENTS_TAB_MODULES,
      ...SALES_TAB_MODULES,
      ...INVENTORY_TAB_MODULES,
      ...REPORTS_TAB_MODULES,
      ...TEAM_TAB_MODULES,
    ];
    for (const key of allModules) {
      expect(MODULE_REGISTRY[key], `missing module: ${key}`).toBeDefined();
    }
  });
});
