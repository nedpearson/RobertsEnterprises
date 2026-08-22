import { useCallback, useEffect, useState } from 'react';
import { Activity, AlertTriangle, Building2, CloudRain, CreditCard, Headphones, Loader2, PlugZap, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getCommandCenterMetrics, type PlatformCommandCenterMetrics } from '@/lib/platform/platformOperationsService';

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

export function PlatformCommandCenter() {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<PlatformCommandCenterMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setMetrics(await getCommandCenterMetrics());
    } catch (err: any) {
      setMetrics(null);
      setError(err?.message || 'Unable to load authoritative platform metrics.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMetrics();
  }, [loadMetrics]);

  if (loading && !metrics) {
    return <div className="flex min-h-[360px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-stone-400" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Command Center</h1>
          <p className="text-stone-500">Executive operations cockpit for the live VowOS SaaS platform.</p>
        </div>
        <div className="text-right">
          {metrics?.generated_at && <p className="text-xs text-stone-400">Updated {new Date(metrics.generated_at).toLocaleTimeString()}</p>}
          <Button variant="outline" size="sm" className="mt-2" onClick={() => void loadMetrics()} disabled={loading}>Refresh</Button>
        </div>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex items-center justify-between gap-4 p-4">
            <div><p className="font-medium text-red-900">Command Center data unavailable</p><p className="text-sm text-red-700">{error}</p></div>
            <Button variant="outline" size="sm" onClick={() => void loadMetrics()}>Retry</Button>
          </CardContent>
        </Card>
      )}

      {metrics && (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard title="Total Organizations" value={String(metrics.total_organizations)} subtitle={`${metrics.new_organizations_7d} new in 7 days · ${metrics.new_organizations_30d} in 30 days`} icon={<Building2 className="h-4 w-4" />} onClick={() => navigate('/platform/organizations')} />
            <MetricCard title="Monthly Recurring Revenue" value={money.format(metrics.mrr_cents / 100)} subtitle="Persisted effective pricing on active subscriptions" icon={<CreditCard className="h-4 w-4" />} onClick={() => navigate('/platform/organizations')} />
            <MetricCard title="Active Trials" value={String(metrics.active_trials)} subtitle="Organizations currently evaluating VowOS" icon={<Activity className="h-4 w-4" />} onClick={() => navigate('/platform/organizations?status=TRIAL')} />
            <MetricCard title="Active Users (30d)" value={String(metrics.active_users_30d)} subtitle="Tenant users with a recent sign-in" icon={<Users className="h-4 w-4" />} onClick={() => navigate('/platform/users')} />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            <MetricCard title="At Risk" value={String(metrics.at_risk)} subtitle="Suspended/read-only or failing integration" icon={<AlertTriangle className="h-4 w-4" />} tone="warning" onClick={() => navigate('/platform/organizations?status=AT_RISK')} />
            <MetricCard title="Open Tickets" value={String(metrics.open_tickets)} subtitle="Customer support requiring attention" icon={<Headphones className="h-4 w-4" />} onClick={() => navigate('/platform/support')} />
            <MetricCard title="Failed Jobs" value={String(metrics.failed_jobs)} subtitle="Failed or manual-review jobs" icon={<CloudRain className="h-4 w-4" />} tone="danger" onClick={() => navigate('/platform/jobs')} />
            <MetricCard title="Open Incidents" value={String(metrics.open_incidents)} subtitle="Unresolved platform incidents" icon={<AlertTriangle className="h-4 w-4" />} tone="danger" onClick={() => navigate('/platform/incidents')} />
            <MetricCard title="Integration Failures" value={String(metrics.integration_failures)} subtitle="Provider connections reporting failure" icon={<PlugZap className="h-4 w-4" />} tone={metrics.integration_failures > 0 ? 'warning' : 'default'} onClick={() => navigate('/platform/integrations')} />
          </div>
        </>
      )}
    </div>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  icon,
  onClick,
  tone = 'default',
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  onClick: () => void;
  tone?: 'default' | 'warning' | 'danger';
}) {
  const toneClass = tone === 'danger' ? 'border-red-200 hover:bg-red-50' : tone === 'warning' ? 'border-orange-200 hover:bg-orange-50' : 'hover:bg-stone-50';
  const textClass = tone === 'danger' ? 'text-red-700' : tone === 'warning' ? 'text-orange-700' : 'text-stone-900';
  return (
    <Card className={`cursor-pointer transition-colors ${toneClass}`} onClick={onClick} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') onClick(); }}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <span className={textClass}>{icon}</span>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${textClass}`}>{value}</div>
        <p className="text-xs text-stone-500">{subtitle}</p>
      </CardContent>
    </Card>
  );
}
