import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CalendarDays, Clock, Loader2, RefreshCw, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { getOrganizations, isPlatformDemoPlane, subscribePlatformPlane } from '@/lib/platform/platformDataSource';
import { PlatformDemoBanner } from '@/components/platform/PlatformStates';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface OrgRow {
  id: string;
  name: string;
  slug: string;
  onboardingStatus: string;
  onboardingPct: number | null;
  operationalStatus: string;
  healthStatus: string;
  healthScore: number | null;
  openTickets: number;
  createdAt: string;
}

export default function CustomerSuccessWorkspace() {
  const [organizations, setOrganizations] = useState<OrgRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (isPlatformDemoPlane()) {
        const { data } = await getOrganizations();
        setOrganizations(data.map((org: any) => ({
          id: org.id,
          name: org.name,
          slug: org.slug,
          onboardingStatus: org.onboardingStatus || 'UNKNOWN',
          onboardingPct: org.onboardingPct ?? null,
          operationalStatus: org.operationalStatus || 'UNKNOWN',
          healthStatus: org.healthStatus || 'UNKNOWN',
          healthScore: org.healthScore ?? null,
          openTickets: org.openTickets || 0,
          createdAt: org.createdAt,
        })));
        return;
      }

      const { data, error: rpcError } = await supabase.rpc('platform_get_organizations', {
        p_search: null,
        p_status: null,
        p_page: 1,
        p_page_size: 100,
      });
      if (rpcError) throw rpcError;
      const rows = Array.isArray((data as any)?.data) ? (data as any).data : [];
      setOrganizations(rows.map((org: any) => ({
        id: org.id,
        name: org.name,
        slug: org.slug || '',
        onboardingStatus: org.onboarding_status || 'UNKNOWN',
        onboardingPct: org.onboarding_status === 'COMPLETE' ? 100 : null,
        operationalStatus: org.status || 'UNKNOWN',
        healthStatus: org.health_status || 'UNKNOWN',
        healthScore: typeof org.health_score === 'number' ? org.health_score : null,
        openTickets: Number(org.open_tickets || 0),
        createdAt: org.created_at,
      })));
    } catch (err: any) {
      setOrganizations([]);
      setError(err?.message || 'Failed to load customer-success data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const unsubscribe = subscribePlatformPlane(() => { void load(); });
    return unsubscribe;
  }, [load]);

  const healthBadge = (org: OrgRow) => {
    const health = org.healthStatus.toUpperCase();
    if (health === 'CRITICAL') return <Badge className="bg-red-100 text-red-800">Critical</Badge>;
    if (health === 'AT_RISK') return <Badge className="bg-orange-100 text-orange-800">At Risk</Badge>;
    if (health === 'HEALTHY') return <Badge className="bg-emerald-100 text-emerald-800">Healthy</Badge>;
    if (org.onboardingStatus !== 'COMPLETE') return <Badge className="bg-blue-100 text-blue-800">Onboarding</Badge>;
    return <Badge variant="outline">Unknown</Badge>;
  };

  const newOrganizations = organizations.filter((org) => new Date(org.createdAt).getTime() >= Date.now() - 30 * 24 * 60 * 60 * 1000).length;
  const inOnboarding = organizations.filter((org) => !['COMPLETE', 'COMPLETED'].includes(org.onboardingStatus)).length;
  const healthy = organizations.filter((org) => org.healthStatus === 'HEALTHY' && org.operationalStatus === 'ACTIVE').length;
  const atRisk = organizations.filter((org) => ['AT_RISK', 'CRITICAL'].includes(org.healthStatus)).length;

  return (
    <div className="space-y-6">
      <PlatformDemoBanner />
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">Customer Success Workspace</h1>
          <p className="text-stone-500">Organization onboarding, support pressure, and health sourced from the same control-plane model used by the directory.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh</Button>
      </div>

      {error && <Card className="border-red-200 bg-red-50"><CardContent className="flex items-center justify-between gap-4 p-4"><p className="text-sm text-red-800">Customer-success data unavailable: {error}</p><Button variant="outline" size="sm" onClick={() => void load()}>Retry</Button></CardContent></Card>}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Metric title="New Organizations" value={newOrganizations} subtitle="in last 30 days" icon={<CalendarDays className="h-4 w-4 text-muted-foreground" />} />
        <Metric title="In Onboarding" value={inOnboarding} subtitle="setup not marked complete" icon={<Clock className="h-4 w-4 text-muted-foreground" />} />
        <Metric title="Healthy & Active" value={healthy} subtitle="control-plane health = healthy" icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />} />
        <Metric title="At Risk" value={atRisk} subtitle="critical or at-risk accounts" icon={<AlertCircle className="h-4 w-4 text-red-500" />} />
      </div>

      <Card>
        <CardHeader><CardTitle>Organization 360 Health</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Organization</TableHead><TableHead>Health</TableHead><TableHead>Onboarding</TableHead><TableHead>Open Tickets</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
            <TableBody>
              {loading && organizations.length === 0 ? <TableRow><TableCell colSpan={5} className="py-10 text-center"><Loader2 className="mx-auto h-7 w-7 animate-spin text-stone-400" /></TableCell></TableRow> : !error && organizations.length === 0 ? <TableRow><TableCell colSpan={5} className="py-10 text-center text-stone-500">No organizations are currently provisioned.</TableCell></TableRow> : organizations.map((org) => (
                <TableRow key={org.id}>
                  <TableCell className="font-medium"><div>{org.name}</div><div className="text-xs text-stone-500">{org.slug || org.id}</div></TableCell>
                  <TableCell><div className="flex items-center gap-2">{healthBadge(org)}{org.healthScore !== null && <span className="text-xs text-stone-400">{org.healthScore}/100</span>}</div></TableCell>
                  <TableCell>{org.onboardingPct === null ? <span className="text-xs text-stone-400">{org.onboardingStatus.replace(/_/g, ' ')}</span> : <div className="flex items-center gap-2"><div className="h-2.5 w-24 rounded-full bg-stone-200"><div className="h-2.5 rounded-full bg-brand-primary" style={{ width: `${Math.max(0, Math.min(100, org.onboardingPct))}%` }} /></div><span className="text-xs text-stone-500">{org.onboardingPct}%</span></div>}</TableCell>
                  <TableCell>{org.openTickets > 0 ? <span className="font-medium text-red-600">{org.openTickets}</span> : <span className="text-stone-400">0</span>}</TableCell>
                  <TableCell><Button variant="outline" size="sm" asChild><Link to={`/platform/tenant/${org.id}`}>View 360</Link></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ title, value, subtitle, icon }: { title: string; value: number; subtitle: string; icon: React.ReactNode }) {
  return <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">{title}</CardTitle>{icon}</CardHeader><CardContent><div className="text-2xl font-bold">{value}</div><p className="text-xs text-muted-foreground">{subtitle}</p></CardContent></Card>;
}
