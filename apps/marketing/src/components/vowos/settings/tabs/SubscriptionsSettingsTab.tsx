import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Switch, toast, Badge } from '@vowos/design-system';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useTenantEntitlements } from '@/hooks/useTenantEntitlements';
import { useAuth } from '@/contexts/AuthContext';
import { PLAN_ORDER, PLANS, VOWOS_CATALOG, type CommercialPlan } from '@/config/commercialCatalog';
import { BillingAdapter } from '@/lib/services/billingAdapter';
import { INDUSTRY_PACKS } from '@/config/industryPacks';
import { entitlementService } from '@/lib/features/entitlementService';
import type { FeatureKey } from '@/lib/features/featureCatalog';
import { supabase } from '@/lib/supabase';

interface SubscriptionsSettingsTabProps {
  onDirtyChange: (isDirty: boolean) => void;
  registerSaveRef: (fn: () => Promise<boolean>) => void;
  resetTrigger: number;
}

const planRank = (plan: CommercialPlan | null | undefined) =>
  plan ? PLAN_ORDER.indexOf(plan) : -1;

export function SubscriptionsSettingsTab({
  onDirtyChange,
  registerSaveRef,
}: SubscriptionsSettingsTabProps) {
  const { tenant } = useAuth();
  const {
    plan,
    subscriptionStatus,
    can,
    isStaffing,
    refresh,
    industryPackId,
  } = useTenantEntitlements();
  const [busyKey, setBusyKey] = useState<string | null>(null);

  useEffect(() => {
    registerSaveRef(async () => true);
    onDirtyChange(false);
  }, [registerSaveRef, onDirtyChange]);

  const currentPlan = plan && PLANS[plan as CommercialPlan] ? (plan as CommercialPlan) : null;
  const currentPlanDef = currentPlan ? PLANS[currentPlan] : null;
  const status = subscriptionStatus || 'UNKNOWN';
  const statusHealthy = ['ACTIVE', 'TRIALING', 'COMPED'].includes(status);

  const catalogModules = useMemo(() => Object.values(VOWOS_CATALOG.modules), []);

  const toggleFeature = async (featureId: FeatureKey, currentState: boolean) => {
    if (!tenant?.id) {
      toast({ title: 'Organization unavailable', description: 'Reload the workspace and try again.', variant: 'destructive' });
      return;
    }

    setBusyKey(featureId);
    try {
      await entitlementService.setCustomerToggle(tenant.id, featureId, !currentState);
      await refresh();
      toast({
        title: !currentState ? 'Feature enabled' : 'Feature hidden',
        description: !currentState
          ? 'The feature is now available to authorized users in this organization.'
          : 'The feature is hidden from normal organization workflows; its data was not deleted.',
      });
    } catch (err) {
      toast({
        title: 'Feature setting not changed',
        description: err instanceof Error ? err.message : 'Unable to update this feature.',
        variant: 'destructive',
      });
    } finally {
      setBusyKey(null);
    }
  };

  const handleManageBilling = async () => {
    if (!tenant?.id) return;
    setBusyKey('billing');
    try {
      const { url } = await BillingAdapter.createCustomerPortalSession({
        businessId: tenant.id,
        returnUrl: window.location.href,
      });
      window.location.href = url;
    } catch (err) {
      toast({
        title: 'Billing portal unavailable',
        description: err instanceof Error ? err.message : 'Unable to open billing management.',
        variant: 'destructive',
      });
    } finally {
      setBusyKey(null);
    }
  };

  const changeIndustryPack = async (packId: string) => {
    if (!tenant?.id || packId === industryPackId) return;
    setBusyKey(`industry:${packId}`);
    try {
      const { error } = await supabase.rpc('update_organization_industry_pack', {
        p_business_id: tenant.id,
        p_industry_pack: packId,
      });
      if (error) throw error;
      entitlementService.invalidateCache();
      await refresh();
      toast({
        title: 'Industry experience updated',
        description: 'Workspace terminology will now reflect the selected retail model.',
      });
    } catch (err) {
      toast({
        title: 'Industry pack not changed',
        description: err instanceof Error ? err.message : 'Unable to update the industry pack.',
        variant: 'destructive',
      });
    } finally {
      setBusyKey(null);
    }
  };

  if (isStaffing) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-stone-300" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{currentPlanDef?.label || 'Subscription'}</CardTitle>
          <CardDescription>
            Your plan determines commercial entitlement. Organization settings below can simplify the workspace by hiding optional capabilities, but cannot unlock paid features.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className={`rounded-xl border p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${statusHealthy ? 'border-emerald-200 bg-emerald-50/60' : 'border-amber-200 bg-amber-50/60'}`}>
            <div className="flex items-start gap-3">
              {statusHealthy
                ? <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
                : <AlertCircle className="mt-0.5 h-5 w-5 text-amber-600" />}
              <div>
                <p className="text-sm font-semibold text-stone-900">Subscription {status.replace('_', ' ').toLowerCase()}</p>
                <p className="text-xs text-stone-600">
                  {currentPlanDef
                    ? `${currentPlanDef.includedUsers === 'unlimited' ? 'Unlimited' : currentPlanDef.includedUsers} users · ${currentPlanDef.includedLocations === 'unlimited' ? 'Unlimited' : currentPlanDef.includedLocations} location${currentPlanDef.includedLocations === 1 ? '' : 's'} included at public list pricing.`
                    : 'No canonical commercial plan could be resolved for this organization.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-brand-primary ring-1 ring-stone-200 transition-colors hover:bg-stone-50 disabled:opacity-50"
              onClick={handleManageBilling}
              disabled={!tenant?.id || busyKey === 'billing'}
            >
              {busyKey === 'billing' ? 'Opening…' : 'Manage Billing'}
            </button>
          </div>

          {currentPlanDef && (
            <div>
              <p className="text-sm font-semibold text-stone-900">What this plan is built for</p>
              <p className="mt-1 text-sm text-stone-500">{currentPlanDef.bestFor}</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {currentPlanDef.highlights.map((highlight) => (
                  <div key={highlight} className="flex items-start gap-2 text-xs text-stone-600">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                    {highlight}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Retail Experience</CardTitle>
          <CardDescription>
            Adapt terminology without creating a separate product or database. Your organization, brands, locations and history stay intact.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Object.values(INDUSTRY_PACKS).map((pack) => {
              const selected = industryPackId === pack.id;
              return (
                <button
                  type="button"
                  key={pack.id}
                  onClick={() => void changeIndustryPack(pack.id)}
                  disabled={busyKey !== null}
                  className={`p-4 rounded-xl border text-left transition-all ${selected ? 'border-brand-primary bg-brand-soft/50 ring-1 ring-focus-ring' : 'border-stone-200 hover:border-stone-300'}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-sm text-stone-900">{pack.label}</h4>
                    {selected && <CheckCircle2 className="h-4 w-4 text-brand-primary" />}
                  </div>
                  <p className="text-xs text-stone-500">{pack.description}</p>
                  <div className="mt-3 text-[10px] uppercase font-bold text-stone-400 space-y-1">
                    <div>Customer: <span className="text-stone-700">{pack.terminology.customer}</span></div>
                    <div>Product: <span className="text-stone-700">{pack.terminology.product}</span></div>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Modules & Features</CardTitle>
          <CardDescription>
            Keep daily navigation focused. Included optional features can be enabled or hidden here. Features above your plan stay locked until an upgrade or approved add-on is provisioned by VowOS.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            {catalogModules.map((module) => (
              <section key={module.id} className="rounded-xl border border-stone-200 p-4">
                <h4 className="font-semibold text-stone-900 text-sm">{module.label}</h4>
                <div className="mt-3 space-y-2">
                  {Object.values(module.features).map((feature) => {
                    const requiredPlan = feature.planRecommendation;
                    const entitledByPlan = currentPlan !== null && planRank(currentPlan) >= planRank(requiredPlan);
                    const active = can(feature.id);
                    const locked = !entitledByPlan;
                    const canToggle = entitledByPlan && !feature.beta;

                    return (
                      <div key={feature.id} className={`flex items-center justify-between gap-4 rounded-lg border p-3 ${locked ? 'border-stone-100 bg-stone-50/70' : 'border-stone-200 bg-white'}`}>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <p className={`text-sm font-medium ${locked ? 'text-stone-500' : 'text-stone-900'}`}>{feature.label}</p>
                            {entitledByPlan && <Badge variant="secondary" className="text-[9px]">Included</Badge>}
                            {feature.beta && <Badge variant="secondary" className="text-[9px] bg-violet-50 text-violet-700">Beta</Badge>}
                            {feature.addOnEligible && locked && <Badge variant="secondary" className="text-[9px] bg-blue-50 text-blue-700">Add-on eligible</Badge>}
                          </div>
                          <p className="mt-0.5 text-xs text-stone-500">{feature.description}</p>
                          {locked && (
                            <p className="mt-1 text-[11px] font-medium text-amber-700">Requires {PLANS[requiredPlan].label}{feature.addOnEligible ? ' or an approved add-on' : ''}</p>
                          )}
                        </div>

                        {canToggle ? (
                          <Switch
                            checked={active}
                            onCheckedChange={() => void toggleFeature(feature.id, active)}
                            disabled={busyKey !== null}
                          />
                        ) : locked ? (
                          <LockIcon />
                        ) : (
                          <div className="h-5 w-5 rounded-full bg-emerald-100 flex items-center justify-center">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function LockIcon() {
  return (
    <div className="h-5 w-5 rounded-full bg-stone-100 flex items-center justify-center" aria-label="Upgrade required">
      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-stone-400">
        <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    </div>
  );
}
