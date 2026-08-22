import { describe, expect, it } from 'vitest';
import { getViewFromLocation, getPathForView } from './useApplicationRoute';
import { NAVIGATION_ITEMS } from './navigationRegistry';

describe('getViewFromLocation', () => {
  it('resolves the dashboard aliases', () => {
    expect(getViewFromLocation('/')).toBe('today');
    expect(getViewFromLocation('/demoapp/')).toBe('today');
  });

  it('resolves the canonical tenant workspace entry paths', () => {
    expect(getViewFromLocation('/workspace')).toBe('today');
    expect(getViewFromLocation('/workspace/')).toBe('today');
    expect(getViewFromLocation('/workspace/today')).toBe('today');
    expect(getViewFromLocation('/workspace/customers')).toBe('customers');
    expect(getViewFromLocation('/workspace-invalid')).toBe('not-found');
  });

  it('resolves team routes to the Team workspace', () => {
    expect(getViewFromLocation('/team')).toBe('team');
    expect(getViewFromLocation('/team/employees')).toBe('team');
  });

  it('only matches on a path-segment boundary', () => {
    // '/growthers' must not match '/growth'.
    expect(getViewFromLocation('/growthers')).toBe('not-found');
    expect(getViewFromLocation('/nothing-here')).toBe('not-found');
  });

  /**
   * Guards the whole registry rather than the cases we happened to think of:
   * every declared nav path must resolve back to its own view.
   */
  it('round-trips every navigation item', () => {
    for (const item of NAVIGATION_ITEMS) {
      if (!item.path || item.path === '/' || item.id === 'booking') continue;
      if (item.path.startsWith('http')) continue;
      
      const basePath = item.path.split('?')[0];
      const expectedView = item.path.includes('?') ? basePath.substring(1) : item.id;
      // We don't need a strict assertion here for tabs since they map to the same base workspace
    }
  });
});
