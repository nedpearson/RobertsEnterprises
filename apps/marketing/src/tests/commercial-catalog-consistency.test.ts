import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { MASTER_FEATURE_CATALOG } from '@/lib/features/featureCatalog';
import { PLAN_ORDER, PLANS, monthlyPriceCentsForPlan } from '@/config/commercialCatalog';

const rank = (plan: keyof typeof PLANS) => PLAN_ORDER.indexOf(plan);

describe('VowOS commercial packaging', () => {
  it('publishes exactly the four canonical commercial plans', () => {
    expect(Object.keys(PLANS)).toEqual(['essentials', 'growth', 'pro', 'enterprise']);
  });

  it('keeps public list pricing monotonic and competitor-comparable', () => {
    expect(PLANS.essentials.monthly).toBe(149);
    expect(PLANS.growth.monthly).toBe(249);
    expect(PLANS.pro.monthly).toBe(349);
    expect(PLANS.enterprise.monthly).toBe(499);
    expect(PLAN_ORDER.map((plan) => PLANS[plan].monthly)).toEqual([149, 249, 349, 499]);
  });

  it('derives plan inclusion from the master runtime feature catalog', () => {
    for (const feature of Object.values(MASTER_FEATURE_CATALOG)) {
      if (feature.platform_only) continue;
      for (const plan of PLAN_ORDER) {
        const shouldBeIncluded = rank(plan) >= rank(feature.minimum_plan);
        expect(
          PLANS[plan].includedFeatures.includes(feature.feature_key),
          `${feature.feature_key} inclusion mismatch for ${plan}`,
        ).toBe(shouldBeIncluded);
      }
    }
  });

  it('uses the same price book for MRR helpers and legacy aliases', () => {
    expect(monthlyPriceCentsForPlan('essentials')).toBe(14900);
    expect(monthlyPriceCentsForPlan('growth')).toBe(24900);
    expect(monthlyPriceCentsForPlan('pro')).toBe(34900);
    expect(monthlyPriceCentsForPlan('enterprise')).toBe(49900);
    expect(monthlyPriceCentsForPlan('starter')).toBe(14900);
    expect(monthlyPriceCentsForPlan('elite')).toBe(49900);
    expect(monthlyPriceCentsForPlan('comped')).toBe(0);
    expect(monthlyPriceCentsForPlan('typo-plan')).toBeNull();
  });
});

describe('subscription stale-path guardrails', () => {
  const runtimeFiles = [
    'src/lib/features/entitlementService.ts',
    'src/lib/services/entitlementService.ts',
    'src/hooks/useTenantEntitlements.ts',
    'src/components/vowos/settings/tabs/SubscriptionsSettingsTab.tsx',
  ];

  it('does not read or write the deprecated tenant_subscriptions table at runtime', () => {
    for (const file of runtimeFiles) {
      const source = readFileSync(resolve(process.cwd(), file), 'utf8');
      expect(source, file).not.toContain(".from('tenant_subscriptions')");
      expect(source, file).not.toContain('.from("tenant_subscriptions")');
    }
  });

  it('does not hardcode every tenant to the Pro plan', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/hooks/useTenantEntitlements.ts'), 'utf8');
    expect(source).not.toContain("const plan = 'pro'");
    expect(source).not.toContain('const plan = "pro"');
  });
});
