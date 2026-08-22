import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, Building2, DollarSign, Loader2, Plus, Users } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { createPlatformLead, type PlatformLeadRecord } from '@/lib/platform/platformOperationsService';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface LeadFormState {
  firstName: string;
  lastName: string;
  email: string;
  companyName: string;
  phone: string;
  leadType: 'DEMO' | 'PLAN_REQUEST';
  source: string;
  estimatedMrrDollars: string;
  notes: string;
}

const EMPTY_FORM: LeadFormState = {
  firstName: '',
  lastName: '',
  email: '',
  companyName: '',
  phone: '',
  leadType: 'DEMO',
  source: 'PLATFORM_ADMIN',
  estimatedMrrDollars: '',
  notes: '',
};

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

export default function PlatformSalesView() {
  const [leads, setLeads] = useState<PlatformLeadRecord[]>([]);
  const [activeTrials, setActiveTrials] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<PlatformLeadRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<LeadFormState>(EMPTY_FORM);

  const loadSalesData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [leadsRes, trialsRes] = await Promise.all([
        supabase.from('platform_leads').select('*').order('created_at', { ascending: false }),
        supabase
          .from('organization_subscriptions')
          .select('*', { count: 'exact', head: true })
          .in('status', ['TRIAL', 'TRIALING']),
      ]);
      if (leadsRes.error) throw leadsRes.error;
      if (trialsRes.error) throw trialsRes.error;
      setLeads((leadsRes.data || []) as PlatformLeadRecord[]);
      setActiveTrials(trialsRes.count || 0);
    } catch (err: any) {
      const message = err?.message || 'Failed to load corporate sales data.';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSalesData();
  }, [loadSalesData]);

  const metrics = useMemo(() => {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const newDemos = leads.filter((lead) => lead.lead_type === 'DEMO' && new Date(lead.created_at).getTime() >= sevenDaysAgo).length;
    const closedStatuses = new Set(['CONVERTED', 'ACTIVE', 'CLOSED_WON', 'TRIAL_ACTIVE', 'TRIAL ACTIVE']);
    const won = leads.filter((lead) => closedStatuses.has(String(lead.status).toUpperCase())).length;
    const pipelineValueCents = leads
      .filter((lead) => !['CLOSED_LOST', 'LOST', 'CANCELLED'].includes(String(lead.status).toUpperCase()))
      .reduce((sum, lead) => sum + Number(lead.estimated_mrr_cents || 0), 0);
    return {
      newDemos,
      pipelineValueCents,
      conversionRate: leads.length ? (won / leads.length) * 100 : null,
    };
  }, [leads]);

  const setField = <K extends keyof LeadFormState>(key: K, value: LeadFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleCreateLead = async () => {
    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim() || !form.companyName.trim()) {
      toast.error('First name, last name, email, and company are required.');
      return;
    }
    const estimatedDollars = Number(form.estimatedMrrDollars || 0);
    if (!Number.isFinite(estimatedDollars) || estimatedDollars < 0) {
      toast.error('Estimated MRR must be a valid non-negative amount.');
      return;
    }

    setSaving(true);
    try {
      const persisted = await createPlatformLead({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        companyName: form.companyName.trim(),
        phone: form.phone.trim() || undefined,
        leadType: form.leadType,
        source: form.source.trim() || 'PLATFORM_ADMIN',
        estimatedMrrCents: Math.round(estimatedDollars * 100),
        notes: form.notes.trim() || undefined,
      });
      setCreateOpen(false);
      setForm(EMPTY_FORM);
      await loadSalesData();
      setSelectedLead(persisted);
      toast.success('Lead created and persisted.');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create lead.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-serif text-stone-900 tracking-tight">VowOS Corporate Sales</h2>
          <p className="text-sm text-stone-500">Manage demo requests, trials, and subscription conversions.</p>
        </div>
        <Button className="bg-brand-primary text-white" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Create Lead
        </Button>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex items-center justify-between gap-4 p-4">
            <p className="text-sm text-red-800">Corporate Sales could not load authoritative data: {error}</p>
            <Button variant="outline" size="sm" onClick={() => void loadSalesData()}>Retry</Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <MetricCard title="New Demo Requests" value={String(metrics.newDemos)} subtitle="In last 7 days" icon={<Activity className="h-4 w-4 text-stone-400" />} />
        <MetricCard title="Active Trials" value={String(activeTrials)} subtitle="Currently evaluating" icon={<Building2 className="h-4 w-4 text-stone-400" />} />
        <MetricCard title="Pipeline Value" value={money.format(metrics.pipelineValueCents / 100)} subtitle="Expected MRR of open leads" icon={<DollarSign className="h-4 w-4 text-stone-400" />} />
        <MetricCard title="Conversion Rate" value={metrics.conversionRate === null ? '—' : `${metrics.conversionRate.toFixed(1)}%`} subtitle="Lead to active/closed won" icon={<Users className="h-4 w-4 text-stone-400" />} />
      </div>

      <Card className="border-stone-200">
        <CardHeader>
          <CardTitle className="text-lg font-serif text-stone-900">Sales Pipeline</CardTitle>
          <CardDescription>Persisted VowOS corporate inquiries and opportunities.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Expected MRR</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="py-10 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-stone-400" /></TableCell></TableRow>
              ) : !error && leads.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="py-10 text-center text-sm text-stone-500">No corporate leads yet. Create one to start the pipeline.</TableCell></TableRow>
              ) : leads.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell className="font-medium">{lead.company_name}</TableCell>
                  <TableCell>
                    <div>{lead.first_name} {lead.last_name}</div>
                    <div className="text-xs text-stone-500">{lead.email}</div>
                  </TableCell>
                  <TableCell><Badge variant="outline">{lead.source || lead.lead_type}</Badge></TableCell>
                  <TableCell><Badge variant="secondary">{lead.status}</Badge></TableCell>
                  <TableCell>{money.format(Number(lead.estimated_mrr_cents || 0) / 100)}</TableCell>
                  <TableCell className="text-sm text-stone-500">{new Date(lead.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right"><Button variant="ghost" size="sm" onClick={() => setSelectedLead(lead)}>View 360</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Corporate Lead</DialogTitle>
            <DialogDescription>Create a persisted VowOS sales opportunity. Required fields are marked.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2 md:grid-cols-2">
            <Field label="First Name *"><Input value={form.firstName} onChange={(e) => setField('firstName', e.target.value)} /></Field>
            <Field label="Last Name *"><Input value={form.lastName} onChange={(e) => setField('lastName', e.target.value)} /></Field>
            <Field label="Email *"><Input type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} /></Field>
            <Field label="Phone"><Input value={form.phone} onChange={(e) => setField('phone', e.target.value)} /></Field>
            <Field label="Company *"><Input value={form.companyName} onChange={(e) => setField('companyName', e.target.value)} /></Field>
            <Field label="Estimated Monthly Revenue">
              <Input type="number" min="0" step="1" value={form.estimatedMrrDollars} onChange={(e) => setField('estimatedMrrDollars', e.target.value)} placeholder="399" />
            </Field>
            <Field label="Lead Type">
              <Select value={form.leadType} onValueChange={(value) => setField('leadType', value as LeadFormState['leadType'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="DEMO">Demo</SelectItem><SelectItem value="PLAN_REQUEST">Plan Request</SelectItem></SelectContent>
              </Select>
            </Field>
            <Field label="Source"><Input value={form.source} onChange={(e) => setField('source', e.target.value)} placeholder="Referral, Website, Outbound..." /></Field>
            <div className="md:col-span-2 space-y-2">
              <Label>Notes</Label>
              <textarea className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.notes} onChange={(e) => setField('notes', e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={() => void handleCreateLead()} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create Lead</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(selectedLead)} onOpenChange={(open) => !open && setSelectedLead(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader><DialogTitle>{selectedLead?.company_name || 'Lead'}</DialogTitle><DialogDescription>Persisted corporate sales lead details.</DialogDescription></DialogHeader>
          {selectedLead && (
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
              <Detail label="Contact" value={`${selectedLead.first_name} ${selectedLead.last_name}`} />
              <Detail label="Status" value={selectedLead.status} />
              <Detail label="Email" value={selectedLead.email} />
              <Detail label="Phone" value={selectedLead.phone || '—'} />
              <Detail label="Source" value={selectedLead.source || selectedLead.lead_type} />
              <Detail label="Expected MRR" value={money.format(Number(selectedLead.estimated_mrr_cents || 0) / 100)} />
              <div className="col-span-2"><dt className="text-xs uppercase tracking-wide text-stone-400">Notes</dt><dd className="mt-1 whitespace-pre-wrap text-stone-800">{selectedLead.notes || '—'}</dd></div>
            </dl>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MetricCard({ title, value, subtitle, icon }: { title: string; value: string; subtitle: string; icon: React.ReactNode }) {
  return <Card className="border-stone-200"><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-stone-500">{title}</CardTitle>{icon}</CardHeader><CardContent><div className="text-2xl font-bold text-stone-900">{value}</div><p className="text-xs text-stone-500">{subtitle}</p></CardContent></Card>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs uppercase tracking-wide text-stone-400">{label}</dt><dd className="mt-1 text-stone-800">{value}</dd></div>;
}
