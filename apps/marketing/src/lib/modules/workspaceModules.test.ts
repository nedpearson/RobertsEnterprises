import { describe, it, expect } from 'vitest';
import { MODULE_REGISTRY } from './moduleRegistry';

/**
 * Every module key a workspace tab gates on MUST exist in the registry, or the
 * tab silently vanishes AND has no toggle in Settings -> Modules. That drift
 * (tabs used 'scheduling.core' while the registry had 'appointments.core') is
 * what left ~37 tabs ungoverned. This test fails if a Customers-workspace tab
 * references a module the registry doesn't define.
 */
const CUSTOMERS_TAB_MODULES = [
  'customers.core',
  'communications.core',
  'customers.style_profiles',
  'customers.measurements',
  'customers.portal',
];

describe('workspace module keys are registered', () => {
  it('registers every Customers-workspace tab module', () => {
    for (const key of CUSTOMERS_TAB_MODULES) {
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
});
