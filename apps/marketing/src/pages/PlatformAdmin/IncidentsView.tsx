import { useCallback, useState } from 'react';
import { AlertOctagon, Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { createPlatformIncident, updatePlatformIncidentStatus } from '@/lib/platform/platformOperationsService';
import { getIncidents } from '@/lib/platform/platformDataSource';
import { usePlatformData } from '@/lib/platform/usePlatformData';
import { PlatformDemoBanner, PlatformTableState } from '@/components/platform/PlatformStates';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface IncidentForm {
  title: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  affectedScope: string;
}

const EMPTY_FORM: IncidentForm = { title: '', severity: 'MEDIUM', affectedScope: '' };

export default function IncidentsView() {
  const { data: incidents, error, refetch } = usePlatformData(useCallback(() => getIncidents(), []));
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<any | null>(null);
  const [form, setForm] = useState<IncidentForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!form.title.trim()) {
      toast.error('Incident title is required.');
      return;
    }
    setSaving(true);
    try {
      await createPlatformIncident({ title: form.title.trim(), severity: form.severity, affectedScope: form.affectedScope.trim() || undefined });
      setCreateOpen(false);
      setForm(EMPTY_FORM);
      await refetch();
      toast.success('Incident declared and persisted.');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to declare incident.');
    } finally {
      setSaving(false);
    }
  };

  const handleStatus = async (incident: any, status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED') => {
    const id = incident?.full_id || incident?.id;
    if (!id) return;
    setSaving(true);
    try {
      await updatePlatformIncidentStatus(id, status);
      await refetch();
      setSelected((current: any) => current ? { ...current, status: status === 'OPEN' ? 'INVESTIGATING' : status } : null);
      toast.success(`Incident ${status === 'RESOLVED' ? 'resolved' : 'updated'}.`);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update incident.');
    } finally {
      setSaving(false);
    }
  };

  const severityBadge = (severity: string) => {
    switch (severity) {
      case 'SEV-1': return <Badge variant="outline" className="bg-rose-100 text-rose-800 border-rose-300 font-bold">{severity}</Badge>;
      case 'SEV-2': return <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300 font-semibold">{severity}</Badge>;
      case 'SEV-3': return <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">{severity}</Badge>;
      default: return <Badge variant="outline">{severity}</Badge>;
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
      case 'INVESTIGATING': return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">{status === 'OPEN' ? 'Open' : 'Investigating'}</Badge>;
      case 'MONITORING': return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Monitoring</Badge>;
      case 'RESOLVED': return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Resolved</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <PlatformDemoBanner />
      <div className="flex items-center justify-between gap-4">
        <div><h2 className="text-xl font-serif text-stone-800">Incident Management</h2><p className="text-sm text-stone-500">Track and resolve platform-wide operational incidents.</p></div>
        <Button className="bg-stone-900 text-white" onClick={() => setCreateOpen(true)}><Plus className="mr-2 h-4 w-4" /> Declare Incident</Button>
      </div>

      <Card className="shadow-xs border-stone-200/60">
        <Table>
          <TableHeader><TableRow><TableHead>Incident ID</TableHead><TableHead>Severity</TableHead><TableHead>Status</TableHead><TableHead>Title</TableHead><TableHead>Customer Impact</TableHead><TableHead>Started</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
          <TableBody>
            {incidents.map((incident) => (
              <TableRow key={incident.id}>
                <TableCell className="font-mono text-xs text-stone-500">{incident.id}</TableCell>
                <TableCell>{severityBadge(incident.severity)}</TableCell>
                <TableCell>{statusBadge(incident.status)}</TableCell>
                <TableCell className="text-sm font-medium">{incident.title}</TableCell>
                <TableCell className="text-xs text-stone-500">{incident.affected}</TableCell>
                <TableCell className="text-xs text-stone-500">{incident.started}</TableCell>
                <TableCell className="text-right"><Button variant="ghost" size="sm" onClick={() => setSelected(incident)}>View</Button>{incident.status !== 'RESOLVED' && <Button variant="outline" size="sm" className="ml-2 text-emerald-700" onClick={() => void handleStatus(incident, 'RESOLVED')} disabled={saving}>Resolve</Button>}</TableCell>
              </TableRow>
            ))}
            {incidents.length === 0 && <PlatformTableState colSpan={7} error={error} empty="No incidents on record." emptyHint="Declare one when a platform-wide issue starts so impact and timeline are captured immediately." />}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader><DialogTitle>Declare Platform Incident</DialogTitle><DialogDescription>Create an auditable incident record immediately.</DialogDescription></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Title *</Label><Input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Provider outage affecting inbound appointments" /></div>
            <div className="space-y-2"><Label>Severity</Label><Select value={form.severity} onValueChange={(value) => setForm((current) => ({ ...current, severity: value as IncidentForm['severity'] }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="LOW">Low</SelectItem><SelectItem value="MEDIUM">Medium</SelectItem><SelectItem value="HIGH">High</SelectItem><SelectItem value="CRITICAL">Critical</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label>Affected Scope</Label><Input value={form.affectedScope} onChange={(event) => setForm((current) => ({ ...current, affectedScope: event.target.value }))} placeholder="Meta integrations / multiple organizations" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setCreateOpen(false)} disabled={saving}>Cancel</Button><Button onClick={() => void handleCreate()} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Declare Incident</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><AlertOctagon className="h-5 w-5 text-orange-500" />{selected?.title || 'Incident'}</DialogTitle><DialogDescription>{selected?.id} · {selected?.started}</DialogDescription></DialogHeader>
          {selected && <div className="space-y-5"><div className="flex gap-2">{severityBadge(selected.severity)}{statusBadge(selected.status)}</div><div className="rounded-lg border bg-stone-50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-stone-400">Affected Scope</p><p className="mt-1 text-sm text-stone-800">{selected.affected || 'Platform wide'}</p></div><div><p className="text-xs font-semibold uppercase tracking-wide text-stone-400">Summary</p><p className="mt-1 text-sm text-stone-700">{selected.summary || 'No additional incident summary recorded.'}</p></div></div>}
          <DialogFooter>{selected?.status !== 'RESOLVED' && <><Button variant="outline" onClick={() => void handleStatus(selected, 'INVESTIGATING')} disabled={saving}>Mark Investigating</Button><Button onClick={() => void handleStatus(selected, 'RESOLVED')} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Resolve</Button></>}</DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
