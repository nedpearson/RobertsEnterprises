import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Settings, ShieldAlert, Building } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { CommercialPlan } from '@/config/commercialCatalog';

export function PlatformAdminView() {
  const [loading, setLoading] = useState(true);
  const [tenants, setTenants] = useState<any[]>([]);

  const fetchTenants = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select(`
          id,
          name,
          created_at,
          tenant_subscriptions (
            id,
            plan,
            status,
            addons,
            overrides,
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
    fetchTenants();
  }, []);

  const updateTenantPlan = async (subId: string, newPlan: CommercialPlan) => {
    try {
      const { error } = await supabase
        .from('tenant_subscriptions')
        .update({ plan: newPlan })
        .eq('id', subId);

      if (error) throw error;
      toast({ title: 'Plan updated successfully' });
      fetchTenants();
    } catch (err) {
      console.error(err);
      toast({ title: 'Error updating plan', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-stone-300" />
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
        <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 uppercase tracking-widest text-[10px]">
          <ShieldAlert className="h-3 w-3 mr-1" />
          Superuser Access
        </Badge>
      </div>

      <div className="grid gap-4">
        {tenants.map(tenant => {
          const sub = tenant.tenant_subscriptions?.[0] || {};
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
                      className="border-stone-200 rounded-md text-sm font-medium focus:ring-rose-500 focus:border-rose-500"
                      value={sub.plan || 'essentials'}
                      onChange={(e) => updateTenantPlan(sub.id, e.target.value as CommercialPlan)}
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
                        sub.addons.map((a: string) => <Badge key={a} variant="outline" className="text-[10px]">{a}</Badge>)
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
