
import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { Users, Building2, CreditCard, Activity, AlertTriangle, CloudRain, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { monthlyPriceCentsForPlan } from '@/config/commercialCatalog';
import { formatCents } from '@/data/vowosData';

export function PlatformCommandCenter() {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<any>({
    total_organizations: 0,
    mrr: 0,
    active_users: 0,
    at_risk: 0,
    open_tickets: 0,
    failed_jobs: 0
  });

  useEffect(() => {
    // In a real app, this would call an aggregated RPC. For now we do a simple data fetch.
    const loadMetrics = async () => {
      try {
        const { count: orgCount } = await supabase.from('businesses').select('*', { count: 'exact', head: true }).is('parent_id', null);
        
        // Placeholder aggregations for Command Center metrics based on our new Phase 1 schema
        const { count: atRiskCount } = await supabase.from('integration_sync_status').select('*', { count: 'exact', head: true }).eq('status', 'FAILED');
        const { data: subs } = await supabase.from('organization_subscriptions').select('plan_id').eq('status', 'ACTIVE');
        const mrrCents = (subs || []).reduce((acc, sub) => {
          const cents = monthlyPriceCentsForPlan(sub.plan_id || '') || 0;
          return acc + cents;
        }, 0);

        setMetrics({
          total_organizations: orgCount || 0,
          mrr: mrrCents,
          active_users: 0,
          at_risk: atRiskCount || 0,
          open_tickets: 0,
          failed_jobs: 0
        });
      } catch (e) {
        console.error(e);
      }
    };
    loadMetrics();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Command Center</h1>
        <p className="text-stone-500">Executive operations cockpit for VowOS SaaS.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="cursor-pointer hover:bg-stone-50" onClick={() => navigate('/platform/organizations')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Organizations</CardTitle>
            <Building2 className="h-4 w-4 text-stone-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.total_organizations}</div>
            <p className="text-xs text-stone-500">All provisioned tenants</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-stone-50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Monthly Recurring Revenue</CardTitle>
            <CreditCard className="h-4 w-4 text-stone-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCents(metrics.mrr)}</div>
            <p className="text-xs text-stone-500">Across active paid plans</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-orange-50" onClick={() => navigate('/platform/organizations?status=AT_RISK')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-orange-700">At Risk Organizations</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-700">{metrics.at_risk}</div>
            <p className="text-xs text-orange-600">Failing integrations or low health</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-red-50" onClick={() => navigate('/platform/jobs')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-red-700">Failed Jobs</CardTitle>
            <CloudRain className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700">{metrics.failed_jobs}</div>
            <p className="text-xs text-red-600">Requires immediate retry</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-stone-50" onClick={() => navigate('/platform/support')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
            <ShieldAlert className="h-4 w-4 text-stone-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.open_tickets}</div>
            <p className="text-xs text-stone-500">Active customer support cases</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
