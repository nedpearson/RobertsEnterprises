import { describe, expect, it } from 'vitest';
import { getViewFromLocation, getPathForView } from './useApplicationRoute';
import { NAVIGATION_ITEMS } from './navigationRegistry';

describe('getViewFromLocation', () => {
  it('resolves the dashboard aliases', () => {
    expect(getViewFromLocation('/')).toBe('dashboard');
    expect(getViewFromLocation('/dashboard')).toBe('dashboard');
    expect(getViewFromLocation('/demoapp/')).toBe('dashboard');
  });

  it('resolves nested growth routes to themselves, not to their parent', () => {
    // Regression: a first-match prefix search returned 'marketing' for all of
    // these because '/growth' is declared before them and is a string prefix.
    expect(getViewFromLocation('/growth')).toBe('marketing');
    expect(getViewFromLocation('/growth/seo')).toBe('seo');
    expect(getViewFromLocation('/growth/local')).toBe('local_seo');
    expect(getViewFromLocation('/growth/reputation')).toBe('reputation');
    expect(getViewFromLocation('/growth/competitors')).toBe('competitors');
    expect(getViewFromLocation('/growth/attribution')).toBe('attribution');
    expect(getViewFromLocation('/growth/website')).toBe('website_builder');
    expect(getViewFromLocation('/growth/leads')).toBe('leads');
  });

  it('applies the same rule under the /demoapp prefix', () => {
    expect(getViewFromLocation('/demoapp/growth/reputation')).toBe('reputation');
    expect(getViewFromLocation('/demoapp/growth')).toBe('marketing');
  });

  it('only matches on a path-segment boundary', () => {
    // '/growthers' must not match '/growth'.
    expect(getViewFromLocation('/growthers')).toBe('not-found');
    expect(getViewFromLocation('/nothing-here')).toBe('not-found');
  });

  it('keeps deep sub-paths on their owning view', () => {
    expect(getViewFromLocation('/growth/reputation/some/detail')).toBe('reputation');
  });

  /**
   * Guards the whole registry rather than the cases we happened to think of:
   * every declared nav path must resolve back to its own view.
   */
  it('round-trips every navigation item', () => {
    for (const item of NAVIGATION_ITEMS) {
      if (!item.path || item.path === '/' || item.id === 'booking') continue;
      if (item.path.startsWith('http')) continue;
      const resolved = getViewFromLocation(item.path);
      expect(resolved, `${item.id} (${item.path}) resolved to ${resolved}`).toBe(item.id);
    }
  });

  it('getPathForView is the inverse for growth views', () => {
    for (const id of ['seo', 'local_seo', 'reputation', 'attribution', 'website_builder'] as const) {
      expect(getViewFromLocation(getPathForView(id))).toBe(id);
    }
  });
});
