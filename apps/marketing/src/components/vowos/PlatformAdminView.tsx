import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@vowos/design-system';
import { Badge } from '@vowos/design-system';
import { Building, Loader2, ShieldAlert } from 'lucide-react';
import { toast } from '@vowos/design-system';
import { CommercialPlan } from '@/config/commercialCatalog';
import { useAuth } from '@/contexts/AuthContext';
import { PlatformRole } from '@/lib/auth/roles';

export function PlatformAdminView() {
  const { userContext, loading: authLoading } = useAuth();
  const isPlatformAdmin =
    userContext?.platform_role === PlatformRole.PLATFORM_OWNER ||
    userContext?.platform_role === PlatformRole.SUPER_ADMIN;
  const [loading, setLoading] = useState(false);
  const [tenants, setTenants] = useState<any[]>([]);

  const fetchTenants = async () => {
    if (!isPlatformAdmin) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select(`
          id,
          name,
          created_at,
          organization_subscriptions (
            id,
            plan_id,
            status,
            addons,
            industry_pack
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTenants(data || []);
    } catch (err) {
      console.error(err);
      toast({ title: 'Error fetching tenants', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isPlatformAdmin) void fetchTenants();
  // Fetch only when the verified platform role becomes available.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlatformAdmin]);

  const updateTenantPlan = async (subId: string, newPlan: CommercialPlan) => {
    if (!isPlatformAdmin) return;
    try {
      const { error } = await supabase
        .from('organization_subscriptions')
        .update({ plan_id: newPlan })
        .eq('id', subId);

      if (error) throw error;
      toast({ title: 'Plan updated successfully' });
      await fetchTenants();
    } catch (err) {
      console.error(err);
      toast({ title: 'Error updating plan', variant: 'destructive' });
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-stone-300" />
      </div>
    );
  }

  if (!isPlatformAdmin) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center rounded-3xl border border-dashed border-rose-200 bg-white px-6 py-16 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-900 text-white">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <h1 className="mt-5 text-2xl font-semibold text-stone-900">Platform administrator access required</h1>
        <p className="mt-2 text-sm text-stone-500">
          Tenant ownership does not grant access to the VowOS platform command center.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900 tracking-tight">Platform Admin</h1>
          <p className="text-stone-500 mt-1">Global view of all tenants and their subscriptions.</p>
        </div>
        <Badge variant="outline" className="bg-brand-soft text-brand-primary-hover border-border-subtle uppercase tracking-widest text-[10px]">
          <ShieldAlert className="h-3 w-3 mr-1" />
          Platform Access
        </Badge>
      </div>

      <div className="grid gap-4">
        {tenants.map((tenant) => {
          const sub = tenant.organization_subscriptions?.[0] || {};
          return (
            <Card key={tenant.id}>
              <CardContent className="p-6 flex flex-col md:flex-row gap-6 md:items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center">
                    <Building className="h-6 w-6 text-stone-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-stone-900">{tenant.name}</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <p className="text-xs text-stone-500 font-mono">{tenant.id}</p>
                      <Badge variant="outline" className="capitalize text-[10px]">{sub.status || 'unknown'}</Badge>
                      <Badge variant="secondary" className="text-[10px]">{sub.industry_pack || 'bridal'}</Badge>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-end">
                    <span className="text-xs text-stone-500 uppercase font-bold tracking-wider mb-1">Current Plan</span>
                    <select
                      className="border-stone-200 rounded-md text-sm font-medium focus:ring-focus-ring focus:border-brand-primary"
                      value={sub.plan_id || 'essentials'}
                      onChange={(event) => updateTenantPlan(sub.id, event.target.value as CommercialPlan)}
                    >
                      <option value="essentials">Essentials</option>
                      <option value="pro">Pro</option>
                      <option value="enterprise">Enterprise</option>
                    </select>
                  </div>

                  <div className="flex flex-col items-end">
                    <span className="text-xs text-stone-500 uppercase font-bold tracking-wider mb-1">Add-ons</span>
                    <div className="flex gap-1">
                      {sub.addons?.length ? (
                        sub.addons.map((addon: string) => <Badge key={addon} variant="outline" className="text-[10px]">{addon}</Badge>)
                      ) : (
                        <span className="text-xs text-stone-400">None</span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
