import { useCallback, useEffect, useMemo, useState } from 'react';
import { BarChart3, CreditCard, Loader2, RefreshCw, Target, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface DemoLead {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  company_name: string;
  status: string;
  lead_type: string;
  source?: string | null;
  created_at: string;
  converted_at?: string | null;
}

interface FunnelMetrics {
  demoRequests: number;
  trials: number;
  paidOrganizations: number;
}

export default function DemoAnalyticsView() {
  const [metrics, setMetrics] = useState<FunnelMetrics>({ demoRequests: 0, trials: 0, paidOrganizations: 0 });
  const [leads, setLeads] = useState<DemoLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [leadResult, orgResult] = await Promise.all([
        supabase.from('platform_leads').select('id,first_name,last_name,email,company_name,status,lead_type,source,created_at,converted_at').eq('lead_type', 'DEMO').order('created_at', { ascending: false }),
        supabase.from('businesses').select('id,organization_type,status').is('parent_id', null),
      ]);
      if (leadResult.error) throw leadResult.error;
      if (orgResult.error) throw orgResult.error;

      const demoLeads = (leadResult.data || []) as DemoLead[];
      const organizations = orgResult.data || [];
      setLeads(demoLeads);
      setMetrics({
        demoRequests: demoLeads.length,
        trials: organizations.filter((org: any) => ['TRIAL', 'TRIALING'].includes(String(org.organization_type || org.status).toUpperCase())).length,
        paidOrganizations: organizations.filter((org: any) => ['PAID', 'ACTIVE'].includes(String(org.organization_type || org.status).toUpperCase())).length,
      });
    } catch (err: any) {
      setLeads([]);
      setMetrics({ demoRequests: 0, trials: 0, paidOrganizations: 0 });
      setError(err?.message || 'Demo funnel data could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const requestToTrial = metrics.demoRequests > 0 ? (metrics.trials / metrics.demoRequests) * 100 : null;
  const trialToPaid = metrics.trials > 0 ? (metrics.paidOrganizations / metrics.trials) * 100 : null;
  const conversionStatuses = useMemo(() => new Set(['CONVERTED', 'ACTIVE', 'TRIAL_ACTIVE', 'TRIAL ACTIVE', 'CLOSED_WON']), []);
  const convertedDemoLeads = leads.filter((lead) => conversionStatuses.has(String(lead.status).toUpperCase())).length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif text-stone-900">Corporate Demo Funnel</h1>
          <p className="mt-1 text-sm text-stone-500">Persisted VowOS demo requests and organization conversions. External website engagement is not shown unless a real analytics source is connected.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh</Button>
      </div>

      {error && <Card className="border-red-200 bg-red-50"><CardContent className="flex items-center justify-between gap-4 p-4"><p className="text-sm text-red-800">{error}</p><Button variant="outline" size="sm" onClick={() => void load()}>Retry</Button></CardContent></Card>}

      {loading && leads.length === 0 && !error ? <Card><CardContent className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-stone-400" /></CardContent></Card> : <>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Metric title="Demo Requests" value={String(metrics.demoRequests)} subtitle="Persisted corporate demo leads" icon={<Users className="h-5 w-5 text-indigo-500" />} />
          <Metric title="Trials" value={String(metrics.trials)} subtitle={requestToTrial === null ? 'No demo-request baseline yet' : `${requestToTrial.toFixed(1)}% of demo requests`} icon={<Target className="h-5 w-5 text-amber-500" />} />
          <Metric title="Paid Organizations" value={String(metrics.paidOrganizations)} subtitle={trialToPaid === null ? 'No trial baseline yet' : `${trialToPaid.toFixed(1)}% of current trials`} icon={<CreditCard className="h-5 w-5 text-emerald-500" />} />
          <Metric title="Converted Demo Leads" value={String(convertedDemoLeads)} subtitle="Lead record marked active/won/converted" icon={<BarChart3 className="h-5 w-5 text-rose-500" />} />
        </div>

        <Card>
          <CardHeader><CardTitle>Demo Request Pipeline</CardTitle><CardDescription>Authoritative platform_leads records. No invented GA4/Mixpanel counts.</CardDescription></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Company</TableHead><TableHead>Contact</TableHead><TableHead>Source</TableHead><TableHead>Status</TableHead><TableHead>Requested</TableHead></TableRow></TableHeader>
              <TableBody>
                {!error && leads.length === 0 ? <TableRow><TableCell colSpan={5} className="py-12 text-center text-stone-500">No demo requests have been recorded yet.</TableCell></TableRow> : leads.map((lead) => (
                  <TableRow key={lead.id}><TableCell className="font-medium">{lead.company_name}</TableCell><TableCell><div>{lead.first_name} {lead.last_name}</div><div className="text-xs text-stone-500">{lead.email}</div></TableCell><TableCell><Badge variant="outline">{lead.source || 'Unknown'}</Badge></TableCell><TableCell><Badge variant="secondary">{lead.status}</Badge></TableCell><TableCell className="text-sm text-stone-500">{new Date(lead.created_at).toLocaleString()}</TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50/40">
          <CardContent className="p-4 text-sm text-blue-900">
            Website visitors, demo starts, chapter completion, pricing views, and path analytics are intentionally marked unavailable until VowOS has a real GA4/PostHog/Mixpanel or first-party event source connected. The previous hard-coded counts were removed rather than presented as production facts.
          </CardContent>
        </Card>
      </>}
    </div>
  );
}

function Metric({ title, value, subtitle, icon }: { title: string; value: string; subtitle: string; icon: React.ReactNode }) {
  return <Card><CardContent className="pt-6"><div className="flex items-center gap-3 text-stone-500">{icon}<span className="text-sm font-medium">{title}</span></div><div className="mt-2 text-3xl font-bold text-stone-900">{value}</div><p className="mt-1 text-xs text-stone-500">{subtitle}</p></CardContent></Card>;
}
