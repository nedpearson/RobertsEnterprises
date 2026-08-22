import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock, GitCommitHorizontal, Loader2, RefreshCw, Rocket, ShieldAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getDeliverySnapshot, type DeliveryIncident, type PlatformDeployment, type RepairAttempt } from '@/lib/platform/platformDeliveryService';

export default function ReleaseDashboardView() {
  const [deployments, setDeployments] = useState<PlatformDeployment[]>([]);
  const [incidents, setIncidents] = useState<DeliveryIncident[]>([]);
  const [repairs, setRepairs] = useState<RepairAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const snapshot = await getDeliverySnapshot();
      setDeployments(snapshot.deployments);
      setIncidents(snapshot.incidents);
      setRepairs(snapshot.repairs);
    } catch (err: any) {
      setDeployments([]);
      setIncidents([]);
      setRepairs([]);
      setError(err?.message || 'Release data could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const current = deployments.find((deployment) => deployment.environment.toLowerCase() === 'production') || deployments[0] || null;
  const healthy = deployments.filter((deployment) => deployment.status === 'HEALTHY').length;
  const failed = deployments.filter((deployment) => ['FAILED', 'DEGRADED', 'ROLLED_BACK'].includes(deployment.status)).length;
  const successfulRepairs = repairs.filter((repair) => repair.status === 'SUCCESS').length;
  const releaseStatus = current?.status || 'UNKNOWN';
  const releaseTone = releaseStatus === 'HEALTHY' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : releaseStatus === 'UNKNOWN' ? 'border-stone-200 bg-stone-50 text-stone-600' : 'border-amber-200 bg-amber-50 text-amber-700';
  const incidentCount = useMemo(() => incidents.filter((incident) => !['RECOVERED', 'ROLLED_BACK'].includes(incident.status)).length, [incidents]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div><h2 className="text-2xl font-serif text-stone-800">Release Engineering</h2><p className="mt-1 text-stone-500">Recorded deployment health, repair outcomes, and production release history.</p></div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh</Button>
      </div>

      {error && <Card className="border-red-200 bg-red-50"><CardContent className="flex items-center justify-between gap-4 p-4"><p className="text-sm text-red-800">{error}</p><Button variant="outline" size="sm" onClick={() => void load()}>Retry</Button></CardContent></Card>}

      {loading && deployments.length === 0 && !error ? <Card><CardContent className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-stone-400" /></CardContent></Card> : <>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Rocket className="h-5 w-5 text-indigo-500" /><h3 className="font-medium text-stone-700">Current Production</h3></div><div className="mt-2 text-2xl font-serif text-stone-900">{current?.commit_sha.slice(0, 8) || 'Not recorded'}</div><Badge variant="outline" className={`mt-2 ${releaseTone}`}>{releaseStatus}</Badge></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-emerald-500" /><h3 className="font-medium text-stone-700">Healthy Deployments</h3></div><div className="mt-2 text-2xl font-medium text-stone-900">{healthy}</div><p className="mt-1 text-sm text-stone-500">of {deployments.length} recorded</p></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><ShieldAlert className="h-5 w-5 text-amber-500" /><h3 className="font-medium text-stone-700">Open Delivery Incidents</h3></div><div className="mt-2 text-2xl font-medium text-stone-900">{incidentCount}</div><p className="mt-1 text-sm text-stone-500">{failed} failed/degraded/rolled-back releases</p></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><GitCommitHorizontal className="h-5 w-5 text-blue-500" /><h3 className="font-medium text-stone-700">Successful Repairs</h3></div><div className="mt-2 text-2xl font-medium text-stone-900">{successfulRepairs}</div><p className="mt-1 text-sm text-stone-500">Persisted repair attempts only</p></CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><GitCommitHorizontal className="h-5 w-5" />Deployment History</CardTitle><CardDescription>Real rows recorded by the VowOS delivery pipeline. Test certifications are not displayed unless they are actually persisted.</CardDescription></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Commit</TableHead><TableHead>Service</TableHead><TableHead>Environment</TableHead><TableHead>Status</TableHead><TableHead>Railway Deployment</TableHead><TableHead>Deployed</TableHead></TableRow></TableHeader>
              <TableBody>
                {!error && deployments.length === 0 ? <TableRow><TableCell colSpan={6} className="py-12 text-center text-stone-500">No deployment records have been ingested. The previous hard-coded release history has been removed.</TableCell></TableRow> : deployments.map((deployment) => (
                  <TableRow key={deployment.id}><TableCell className="font-mono text-xs">{deployment.commit_sha.slice(0, 12)}</TableCell><TableCell>{deployment.service}</TableCell><TableCell><Badge variant="outline">{deployment.environment}</Badge></TableCell><TableCell><Badge variant="outline" className={deployment.status === 'HEALTHY' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : ['FAILED','DEGRADED'].includes(deployment.status) ? 'border-red-200 bg-red-50 text-red-700' : 'border-stone-200'}>{deployment.status}</Badge></TableCell><TableCell className="font-mono text-xs">{deployment.railway_deployment_id}</TableCell><TableCell className="text-sm text-stone-500"><span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{new Date(deployment.deployment_completed || deployment.created_at).toLocaleString()}</span></TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </>}
    </div>
  );
}
