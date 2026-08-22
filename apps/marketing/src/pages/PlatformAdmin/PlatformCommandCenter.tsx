import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { Users, Building2, CreditCard, AlertTriangle, CloudRain, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { monthlyPriceCentsForPlan } from '@/config/commercialCatalog';

type PlatformMetrics = {
  total_organizations: number;
  mrr: number;
  active_users: number;
  at_risk: number;
  open_tickets: number;
  failed_jobs: number | null;
};

const formatCurrencyFromCents = (cents: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(cents / 100);

export function PlatformCommandCenter() {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<PlatformMetrics>({
    total_organizations: 0,
    mrr: 0,
    active_users: 0,
    at_risk: 0,
    open_tickets: 0,
    failed_jobs: null,
  });

  useEffect(() => {
    let cancelled = false;

    const loadMetrics = async () => {
      const [organizationsResult, healthResult, subscriptionsResult, usersResult, ticketsResult, failedJobsResult] = await Promise.all([
        supabase.from('businesses').select('*', { count: 'exact', head: true }).is('parent_id', null),
        supabase.from('organization_health_scores').select('*', { count: 'exact', head: true }).eq('health_status', 'AT_RISK'),
        supabase.from('organization_subscriptions').select('plan_id, effective_price_cents, account_type').eq('status', 'ACTIVE'),
        supabase.from('business_memberships').select('*', { count: 'exact', head: true }).eq('status', 'ACTIVE'),
        supabase.from('support_tickets').select('*', { count: 'exact', head: true }).eq('status', 'OPEN'),
        supabase.from('platform_failed_jobs').select('*', { count: 'exact', head: true }),
      ]);

      const errors = [
        organizationsResult.error,
        healthResult.error,
        subscriptionsResult.error,
        usersResult.error,
        ticketsResult.error,
        failedJobsResult.error,
      ].filter(Boolean);

      if (errors.length > 0) {
        console.error('One or more platform command center metrics failed to load', errors);
      }

      const mrrCents = subscriptionsResult.error
        ? 0
        : (subscriptionsResult.data || []).reduce((total, subscription) => {
            if ((subscription.account_type || '').toUpperCase() === 'COMPED') return total;
            if (typeof subscription.effective_price_cents === 'number') {
              return total + Math.max(0, subscription.effective_price_cents);
            }
            return total + (monthlyPriceCentsForPlan(subscription.plan_id || '') ?? 0);
          }, 0);

      if (!cancelled) {
        setMetrics({
          total_organizations: organizationsResult.error ? 0 : organizationsResult.count || 0,
          mrr: mrrCents,
          active_users: usersResult.error ? 0 : usersResult.count || 0,
          at_risk: healthResult.error ? 0 : healthResult.count || 0,
          open_tickets: ticketsResult.error ? 0 : ticketsResult.count || 0,
          failed_jobs: failedJobsResult.error ? null : failedJobsResult.count || 0,
        });
      }
    };

    void loadMetrics();
    return () => {
      cancelled = true;
    };
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
            <p className="text-xs text-stone-500">Customer tenant organizations</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-stone-50" onClick={() => navigate('/platform/sales')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Monthly Recurring Revenue</CardTitle>
            <CreditCard className="h-4 w-4 text-stone-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrencyFromCents(metrics.mrr)}</div>
            <p className="text-xs text-stone-500">Across active effective subscription prices</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-stone-50" onClick={() => navigate('/platform/users')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Memberships</CardTitle>
            <Users className="h-4 w-4 text-stone-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.active_users}</div>
            <p className="text-xs text-stone-500">Active tenant memberships</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-orange-50" onClick={() => navigate('/platform/organizations?status=AT_RISK')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-orange-700">At Risk Organizations</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-700">{metrics.at_risk}</div>
            <p className="text-xs text-orange-600">Organizations currently scored at risk</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-red-50" onClick={() => navigate('/platform/jobs')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-red-700">Failed Jobs</CardTitle>
            <CloudRain className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700">{metrics.failed_jobs ?? '—'}</div>
            <p className="text-xs text-red-600">Canonical platform failed-job queue</p>
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
