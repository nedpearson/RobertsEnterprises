import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useTenantEntitlements } from '@/hooks/useTenantEntitlements';
import { VOWOS_CATALOG, CommercialPlan, PLANS } from '@/config/commercialCatalog';
import { toast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { BillingAdapter } from '@/lib/services/billingAdapter';
import { INDUSTRY_PACKS, IndustryPackId } from '@/config/industryPacks';

interface SubscriptionsSettingsTabProps {
  onDirtyChange: (isDirty: boolean) => void;
  registerSaveRef: (fn: () => Promise<boolean>) => void;
  resetTrigger: number;
}

export function SubscriptionsSettingsTab({
  onDirtyChange,
  registerSaveRef,
  resetTrigger,
}: SubscriptionsSettingsTabProps) {
  const { plan, addOns, can, isStaffing, refresh, industryPackId } = useTenantEntitlements();
  const [loading, setLoading] = useState(false);

  // We are not saving data through the standard settings save pattern right now.
  // Module toggles are immediate.
  useEffect(() => {
    registerSaveRef(async () => true);
    onDirtyChange(false);
  }, [registerSaveRef, onDirtyChange]);

  const toggleAddOn = async (featureId: string, currentState: boolean) => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // Fetch the tenant's current subscription record
      const { data: tenantProfile } = await supabase
        .from('staff_profiles')
        .select('business_id')
        .eq('id', session.user.id)
        .single();
        
      if (!tenantProfile?.business_id) throw new Error('No business ID found');

      const { data: subData, error: subError } = await supabase
        .from('tenant_subscriptions')
        .select('*')
        .eq('business_id', tenantProfile.business_id)
        .single();

      if (subError) throw subError;

      const currentAddOns = Array.isArray(subData.add_ons) ? subData.add_ons : [];
      let newAddOns: string[];

      if (currentState) {
        newAddOns = currentAddOns.filter(id => id !== featureId);
      } else {
        newAddOns = [...currentAddOns, featureId];
      }

      const { error: updateError } = await supabase
        .from('tenant_subscriptions')
        .update({ add_ons: newAddOns })
        .eq('id', subData.id);

      if (updateError) throw updateError;
      
      toast({
        title: 'Module Updated',
        description: currentState ? 'Module deactivated successfully.' : 'Module activated successfully.',
      });

      // Refresh entitlements
      await refresh();
    } catch (err) {
      console.error(err);
      toast({
        title: 'Error updating module',
        description: 'Failed to update module status. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleManageBilling = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { data: tenantProfile } = await supabase
        .from('staff_profiles')
        .select('business_id')
        .eq('id', session.user.id)
        .single();
        
      if (!tenantProfile?.business_id) throw new Error('No business ID found');

      const { url } = await BillingAdapter.createCustomerPortalSession({
        businessId: tenantProfile.business_id,
        returnUrl: window.location.href,
      });

      window.location.href = url;
    } catch (err) {
      console.error(err);
      toast({ title: 'Error opening portal', description: 'Failed to open billing portal.', variant: 'destructive' });
    }
  };

  if (isStaffing) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-stone-300" />
      </div>
    );
  }

  const currentPlanDef = plan ? PLANS[plan as CommercialPlan] : null;

  const changeIndustryPack = async (packId: string) => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { data: tenantProfile } = await supabase
        .from('staff_profiles')
        .select('business_id')
        .eq('id', session.user.id)
        .single();
        
      if (!tenantProfile?.business_id) throw new Error('No business ID found');

      const { data: subData, error: subError } = await supabase
        .from('tenant_subscriptions')
        .select('id')
        .eq('business_id', tenantProfile.business_id)
        .single();

      if (subError) throw subError;

      const { error: updateError } = await supabase
        .from('tenant_subscriptions')
        .update({ industry_pack: packId })
        .eq('id', subData.id);

      if (updateError) throw updateError;
      
      toast({ title: 'Industry Pack Updated', description: 'Your workspace terminology has been updated.' });
      await refresh();
    } catch (err) {
      console.error(err);
      toast({ title: 'Error', description: 'Could not update industry pack.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Current Plan: {currentPlanDef ? currentPlanDef.label : 'Unknown'}</CardTitle>
          <CardDescription>
            You are currently on the {plan} plan. Your plan includes core capabilities. Add-on modules can be activated below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 flex items-center justify-between">
             <div className="flex items-center gap-3">
               <CheckCircle2 className="h-5 w-5 text-emerald-500" />
               <div>
                 <p className="text-sm font-semibold text-stone-900">Subscription Active</p>
                 <p className="text-xs text-stone-500">Your account is in good standing.</p>
               </div>
             </div>
              <button
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 px-3 py-1.5 rounded-lg transition-colors"
                onClick={handleManageBilling}
              >
                Manage Billing
              </button>
            </div>
          
          <div className="mt-6 border-t pt-4">
            <h4 className="text-sm font-semibold text-stone-900 mb-2">Sales Demo Preview</h4>
            <p className="text-xs text-stone-500 mb-3">
              Temporarily override your current plan to preview features. Only applies to your local browser.
            </p>
            <div className="flex gap-2">
              {Object.keys(PLANS).map((p) => {
                const planKey = p as CommercialPlan;
                const isSelected = typeof window !== 'undefined' && localStorage.getItem('vowos_demo_plan_override') === planKey;
                const isActual = planKey === plan && !localStorage.getItem('vowos_demo_plan_override');
                return (
                  <button
                    key={planKey}
                    onClick={() => {
                      if (planKey === plan) {
                        localStorage.removeItem('vowos_demo_plan_override');
                      } else {
                        localStorage.setItem('vowos_demo_plan_override', planKey);
                      }
                      window.location.reload();
                    }}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                      isSelected ? 'border-rose-500 bg-rose-50 text-rose-700' : 
                      isActual ? 'border-emerald-500 bg-emerald-50 text-emerald-700' :
                      'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                    }`}
                  >
                    {PLANS[planKey].label}
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Industry Pack</CardTitle>
          <CardDescription>
            Choose your retail vertical. This customizes the terminology used throughout the platform.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Object.values(INDUSTRY_PACKS).map(pack => (
              <div 
                key={pack.id} 
                onClick={() => !loading && changeIndustryPack(pack.id)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${industryPackId === pack.id ? 'border-rose-500 bg-rose-50/50 ring-1 ring-rose-500' : 'border-stone-200 hover:border-stone-300'}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-sm text-stone-900">{pack.label}</h4>
                  {industryPackId === pack.id && <CheckCircle2 className="h-4 w-4 text-rose-500" />}
                </div>
                <p className="text-xs text-stone-500">{pack.description}</p>
                <div className="mt-3 text-[10px] uppercase font-bold text-stone-400 space-y-1">
                  <div>Customer: <span className="text-stone-700">{pack.terminology.customer}</span></div>
                  <div>Product: <span className="text-stone-700">{pack.terminology.product}</span></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-stone-900">Module Visibility & Add-Ons</h3>
        <p className="text-sm text-stone-500 -mt-2">
          Toggle optional modules to customize your workspace. Some modules require an additional fee or a higher base plan.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.values(VOWOS_CATALOG.modules).map(module => (
            <div key={module.id} className="space-y-3">
              <h4 className="font-semibold text-stone-800 text-sm">{module.label}</h4>
              <div className="space-y-2">
                {Object.values(module.features).map(feature => {
                  if (!feature.addOnEligible && !currentPlanDef?.includedFeatures.includes(feature.id)) {
                    // Not eligible as add-on and not in base plan, don't show or show locked
                    return null;
                  }

                  const isIncludedInPlan = currentPlanDef?.includedFeatures.includes(feature.id);
                  const isAddOnActive = addOns.includes(feature.id);
                  const isActive = isIncludedInPlan || isAddOnActive;
                  
                  // If it's included in plan, we don't let them toggle it off here for simplicity,
                  // or maybe we do? "Module toggle UI for Owners".
                  // Let's allow toggling if it's an addOn.
                  const canToggle = feature.addOnEligible && !isIncludedInPlan;

                  return (
                    <div key={feature.id} className={`flex items-center justify-between p-3 rounded-lg border ${isActive ? 'bg-white border-stone-200' : 'bg-stone-50/50 border-stone-100'} transition-colors`}>
                      <div className="pr-4">
                        <p className={`text-sm font-medium ${isActive ? 'text-stone-900' : 'text-stone-500'}`}>
                          {feature.label}
                        </p>
                        <div className="flex gap-2 mt-1">
                          {isIncludedInPlan && <Badge variant="secondary" className="text-[9px] bg-stone-100 text-stone-500 hover:bg-stone-100">Included</Badge>}
                          {feature.addOnEligible && !isIncludedInPlan && <Badge variant="secondary" className="text-[9px] bg-blue-50 text-blue-600 hover:bg-blue-50 border-blue-100">Add-On</Badge>}
                        </div>
                      </div>
                      
                      {canToggle ? (
                        <Switch
                          checked={isAddOnActive}
                          onCheckedChange={() => toggleAddOn(feature.id, isAddOnActive)}
                          disabled={loading}
                        />
                      ) : (
                        isIncludedInPlan ? (
                          <div className="h-5 w-5 rounded-full bg-emerald-100 flex items-center justify-center">
                             <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          </div>
                        ) : (
                           <LockIcon />
                        )
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LockIcon() {
  return (
    <div className="h-5 w-5 rounded-full bg-stone-100 flex items-center justify-center">
      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-stone-400">
        <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    </div>
  );
}
