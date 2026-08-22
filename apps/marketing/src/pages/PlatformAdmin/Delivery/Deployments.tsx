import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Clock, Loader2, RefreshCw, Rocket, ShieldAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getPlatformDeployments, type PlatformDeployment } from '@/lib/platform/platformDeliveryService';

export default function Deployments() {
  const [deployments, setDeployments] = useState<PlatformDeployment[]>([]);
  const [selected, setSelected] = useState<PlatformDeployment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setDeployments(await getPlatformDeployments(100));
    } catch (err: any) {
      setDeployments([]);
      setError(err?.message || 'Deployment history could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const statusClass = (status: string) => {
    if (status === 'HEALTHY') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    if (['FAILED', 'DEGRADED'].includes(status)) return 'border-red-200 bg-red-50 text-red-700';
    if (status === 'ROLLED_BACK') return 'border-amber-200 bg-amber-50 text-amber-700';
    return 'border-blue-200 bg-blue-50 text-blue-700';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end"><Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh</Button></div>
      {error && <Card className="border-red-200 bg-red-50"><CardContent className="flex items-center justify-between gap-4 p-4"><p className="text-sm text-red-800">{error}</p><Button variant="outline" size="sm" onClick={() => void load()}>Retry</Button></CardContent></Card>}

      <Card>
        <CardHeader><CardTitle>Production Deployments</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Deployment</TableHead><TableHead>Service</TableHead><TableHead>Environment</TableHead><TableHead>Commit</TableHead><TableHead>Status</TableHead><TableHead>Completed</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
            <TableBody>
              {loading && deployments.length === 0 ? <TableRow><TableCell colSpan={7} className="py-12 text-center"><Loader2 className="mx-auto h-7 w-7 animate-spin text-stone-400" /></TableCell></TableRow> : !error && deployments.length === 0 ? <TableRow><TableCell colSpan={7} className="py-12 text-center text-stone-500">No Railway deployment records have been ingested yet. VowOS will not fabricate a deployment history.</TableCell></TableRow> : deployments.map((deployment) => (
                <TableRow key={deployment.id}>
                  <TableCell className="font-mono text-xs">{deployment.railway_deployment_id}</TableCell>
                  <TableCell>{deployment.service}</TableCell>
                  <TableCell><Badge variant="outline">{deployment.environment}</Badge></TableCell>
                  <TableCell className="font-mono text-xs">{deployment.commit_sha.slice(0, 12)}</TableCell>
                  <TableCell><Badge variant="outline" className={statusClass(deployment.status)}>{deployment.status}</Badge></TableCell>
                  <TableCell className="text-xs text-stone-500">{deployment.deployment_completed ? new Date(deployment.deployment_completed).toLocaleString() : 'In progress / not recorded'}</TableCell>
                  <TableCell className="text-right"><Button variant="outline" size="sm" onClick={() => setSelected(deployment)}>Inspect</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Rocket className="h-5 w-5" />Deployment {selected?.railway_deployment_id}</DialogTitle><DialogDescription>{selected?.service} · {selected?.environment}</DialogDescription></DialogHeader>
          {selected && <div className="space-y-4"><div className="flex items-center gap-2"><Badge variant="outline" className={statusClass(selected.status)}>{selected.status}</Badge>{selected.can_rollback ? <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700"><CheckCircle2 className="mr-1 h-3 w-3" />Rollback eligible</Badge> : <Badge variant="outline"><ShieldAlert className="mr-1 h-3 w-3" />Rollback not recorded as safe</Badge>}</div><dl className="grid grid-cols-2 gap-4 text-sm"><Detail label="Commit SHA" value={selected.commit_sha} /><Detail label="Railway ID" value={selected.railway_deployment_id} /><Detail label="Started" value={selected.deployment_started ? new Date(selected.deployment_started).toLocaleString() : '—'} /><Detail label="Completed" value={selected.deployment_completed ? new Date(selected.deployment_completed).toLocaleString() : '—'} /><Detail label="Created" value={new Date(selected.created_at).toLocaleString()} /><Detail label="Updated" value={new Date(selected.updated_at).toLocaleString()} /></dl><div className="flex items-center gap-2 rounded-lg border bg-stone-50 p-3 text-xs text-stone-600"><Clock className="h-4 w-4" />Rollback is intentionally not exposed as a UI action until an authenticated Railway rollback endpoint and migration-safety gate are present. This prevents a decorative button from pretending to protect production.</div></div>}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs uppercase tracking-wide text-stone-400">{label}</dt><dd className="mt-1 break-all text-stone-800">{value}</dd></div>;
}
