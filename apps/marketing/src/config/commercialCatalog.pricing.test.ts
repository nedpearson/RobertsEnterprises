import { describe, it, expect } from 'vitest';
import { PLANS, monthlyPriceCentsForPlan } from './commercialCatalog';

describe('monthlyPriceCentsForPlan — the one source of platform pricing', () => {
  it('prices every catalog plan in cents', () => {
    for (const [id, plan] of Object.entries(PLANS)) {
      expect(monthlyPriceCentsForPlan(id)).toBe(Math.round(plan.monthly * 100));
    }
  });

  it('returns null, not 0, for plan ids the catalog does not sell', () => {
    // 'starter' and 'elite' are the ids the old hardcoded platform map priced
    // at $0 and $999. They do not exist in the catalog and must never price
    // silently again.
    expect(monthlyPriceCentsForPlan('starter')).toBeNull();
    expect(monthlyPriceCentsForPlan('elite')).toBeNull();
    expect(monthlyPriceCentsForPlan('')).toBeNull();
  });
});
