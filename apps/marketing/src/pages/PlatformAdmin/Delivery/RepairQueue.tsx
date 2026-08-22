import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertOctagon, ExternalLink, Loader2, RefreshCw, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { getDeliveryIncidents, getRepairAttempts, type DeliveryIncident, type RepairAttempt } from '@/lib/platform/platformDeliveryService';

const ACTIVE = new Set(['DETECTED', 'COLLECTING', 'READY', 'REPAIRING', 'VALIDATING', 'PR_CREATED', 'CI_RUNNING', 'CI_FAILED', 'READY_TO_DEPLOY', 'DEPLOYING', 'VERIFYING', 'BLOCKED', 'ESCALATED']);

export default function RepairQueue() {
  const [incidents, setIncidents] = useState<DeliveryIncident[]>([]);
  const [attempts, setAttempts] = useState<RepairAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<DeliveryIncident | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [incidentRows, attemptRows] = await Promise.all([getDeliveryIncidents(100), getRepairAttempts(100)]);
      setIncidents(incidentRows);
      setAttempts(attemptRows);
    } catch (err: any) {
      setIncidents([]);
      setAttempts([]);
      setError(err?.message || 'Repair queue could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const active = incidents.filter((incident) => ACTIVE.has(incident.status));
  const recent = incidents.filter((incident) => !ACTIVE.has(incident.status)).slice(0, 25);
  const attemptByIncident = useMemo(() => new Map(attempts.map((attempt) => [attempt.incident_id, attempt])), [attempts]);

  return (
    <div className="space-y-6">
      <div className="flex justify-end"><Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh</Button></div>
      {error && <Card className="border-red-200 bg-red-50"><CardContent className="flex items-center justify-between gap-4 p-4"><p className="text-sm text-red-800">{error}</p><Button variant="outline" size="sm" onClick={() => void load()}>Retry</Button></CardContent></Card>}

      <Card>
        <CardHeader><CardTitle>Active Repair Operations</CardTitle></CardHeader>
        <CardContent>
          {loading && incidents.length === 0 ? <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-stone-400" /></div> : !error && active.length === 0 ? <div className="py-12 text-center"><Wrench className="mx-auto mb-4 h-12 w-12 text-stone-300" /><h3 className="text-lg font-medium text-stone-900">No active repair incidents</h3><p className="mt-1 text-stone-500">No CI/CD incident is currently recorded as requiring repair.</p></div> : <div className="space-y-3">{active.map((incident) => <IncidentRow key={incident.id} incident={incident} attempt={attemptByIncident.get(incident.id)} onView={() => setSelected(incident)} />)}</div>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Recent Repair History</CardTitle></CardHeader>
        <CardContent>
          {!error && recent.length === 0 ? <p className="py-8 text-center text-sm text-stone-500">No recovered or rolled-back incidents have been recorded yet.</p> : <div className="space-y-3">{recent.map((incident) => <IncidentRow key={incident.id} incident={incident} attempt={attemptByIncident.get(incident.id)} onView={() => setSelected(incident)} />)}</div>}
        </CardContent>
      </Card>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle>{selected?.workflow || 'Delivery Incident'}</DialogTitle><DialogDescription>{selected?.repository} · {selected?.commit_sha.slice(0, 12)}</DialogDescription></DialogHeader>
          {selected && <div className="space-y-5 text-sm"><div className="flex flex-wrap gap-2"><Badge variant="outline">{selected.status}</Badge><Badge variant="outline">{selected.branch}</Badge><Badge variant="outline">{selected.failure_fingerprint}</Badge></div><div className="rounded-lg border bg-stone-50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-stone-400">Error Summary</p><p className="mt-1 whitespace-pre-wrap text-stone-800">{selected.error_summary || 'No sanitized error summary was persisted.'}</p></div><dl className="grid grid-cols-2 gap-4"><Detail label="Failed Job" value={selected.failed_job || '—'} /><Detail label="Failed Step" value={selected.failed_step || '—'} /><Detail label="Occurrences" value={String(selected.occurrence_count)} /><Detail label="Repair Attempts" value={String(selected.repair_attempts)} /><Detail label="First Seen" value={new Date(selected.first_seen).toLocaleString()} /><Detail label="Last Seen" value={new Date(selected.last_seen).toLocaleString()} /></dl><a className="inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:underline" href={`https://github.com/${selected.repository}/commit/${selected.commit_sha}`} target="_blank" rel="noreferrer">Open failing commit <ExternalLink className="h-4 w-4" /></a></div>}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function IncidentRow({ incident, attempt, onView }: { incident: DeliveryIncident; attempt?: RepairAttempt; onView: () => void }) {
  return <div className="flex items-center justify-between gap-4 rounded-lg border border-stone-200 bg-stone-50 p-4"><div className="flex min-w-0 items-start gap-3"><AlertOctagon className={`mt-0.5 h-5 w-5 ${['RECOVERED'].includes(incident.status) ? 'text-emerald-500' : 'text-red-500'}`} /><div className="min-w-0"><p className="font-medium text-stone-900">{incident.workflow}</p><p className="mt-1 truncate font-mono text-xs text-stone-500">{incident.error_summary || incident.failure_fingerprint}</p><div className="mt-2 flex flex-wrap gap-2"><Badge variant="outline">{incident.status}</Badge><Badge variant="outline">{incident.commit_sha.slice(0, 8)}</Badge>{attempt && <Badge variant="outline">Attempt {attempt.attempt_number}: {attempt.status}</Badge>}</div></div></div><div className="flex shrink-0 flex-col items-end gap-2"><span className="text-xs text-stone-500">{new Date(incident.last_seen).toLocaleString()}</span><Button variant="outline" size="sm" onClick={onView}>Inspect</Button></div></div>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs uppercase tracking-wide text-stone-400">{label}</dt><dd className="mt-1 text-stone-800">{value}</dd></div>;
}
