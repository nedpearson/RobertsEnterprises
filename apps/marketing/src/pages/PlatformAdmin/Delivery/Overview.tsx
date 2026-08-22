import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, GitBranch, Loader2, RefreshCw, ServerCrash, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getDeliverySnapshot, type PlatformDeployment } from '@/lib/platform/platformDeliveryService';

interface SnapshotState {
  current: PlatformDeployment | null;
  lastHealthy: PlatformDeployment | null;
  openIncidents: unknown[];
  activeRepairs: unknown[];
  deployments: PlatformDeployment[];
}

export default function Overview() {
  const [snapshot, setSnapshot] = useState<SnapshotState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getDeliverySnapshot();
      setSnapshot({ current: data.current, lastHealthy: data.lastHealthy, openIncidents: data.openIncidents, activeRepairs: data.activeRepairs, deployments: data.deployments });
    } catch (err: any) {
      setSnapshot(null);
      setError(err?.message || 'Delivery data could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const parity = useMemo(() => {
    if (!snapshot?.current || !snapshot.lastHealthy) return 'UNKNOWN';
    return snapshot.current.commit_sha === snapshot.lastHealthy.commit_sha && snapshot.current.status === 'HEALTHY' ? 'IN_SYNC' : 'DRIFT';
  }, [snapshot]);

  if (loading && !snapshot) return <Card><CardContent className="flex items-center justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-stone-400" /></CardContent></Card>;

  return (
    <div className="space-y-6">
      <div className="flex justify-end"><Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh</Button></div>
      {error && <Card className="border-red-200 bg-red-50"><CardContent className="flex items-center justify-between gap-4 p-4"><p className="text-sm text-red-800">{error}</p><Button variant="outline" size="sm" onClick={() => void load()}>Retry</Button></CardContent></Card>}

      {snapshot && <>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <StatusCard label="Current Production" value={snapshot.current?.commit_sha?.slice(0, 8) || 'Not recorded'} detail={snapshot.current ? `${snapshot.current.service} · ${snapshot.current.status}` : 'No production deployment record'} icon={<GitBranch className="h-8 w-8 text-stone-200" />} />
          <StatusCard label="Last Healthy" value={snapshot.lastHealthy?.commit_sha?.slice(0, 8) || 'Not recorded'} detail={snapshot.lastHealthy ? new Date(snapshot.lastHealthy.deployment_completed || snapshot.lastHealthy.created_at).toLocaleString() : 'No healthy deployment recorded'} icon={<CheckCircle2 className="h-8 w-8 text-emerald-200" />} />
          <StatusCard label="Open Delivery Incidents" value={String(snapshot.openIncidents.length)} detail="CI/deployment incidents not recovered" icon={<ServerCrash className="h-8 w-8 text-rose-200" />} />
          <StatusCard label="Active Repairs" value={String(snapshot.activeRepairs.length)} detail="Pending, running, or validating" icon={<Wrench className="h-8 w-8 text-blue-200" />} />
        </div>

        <Card>
          <CardHeader><CardTitle>Release Parity Monitor</CardTitle><CardDescription>Compares the latest recorded production deployment with the latest deployment certified healthy. If no authoritative deployment data exists, VowOS says Unknown rather than fabricating a green state.</CardDescription></CardHeader>
          <CardContent>
            {parity === 'IN_SYNC' ? <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-800"><CheckCircle2 className="h-5 w-5" /><div><p className="font-medium">IN SYNC</p><p className="text-sm opacity-90">Current production matches the latest recorded healthy deployment.</p></div></div> : parity === 'DRIFT' ? <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800"><AlertTriangle className="h-5 w-5" /><div><p className="font-medium">DRIFT / UNHEALTHY RELEASE</p><p className="text-sm opacity-90">Production does not match the latest healthy deployment or is not marked healthy.</p></div></div> : <div className="flex items-center gap-3 rounded-lg border border-stone-200 bg-stone-50 p-4 text-stone-700"><AlertTriangle className="h-5 w-5" /><div><p className="font-medium">UNKNOWN</p><p className="text-sm opacity-90">Deployment ingestion has not yet recorded enough data to prove release parity.</p></div></div>}
          </CardContent>
        </Card>
      </>}
    </div>
  );
}

function StatusCard({ label, value, detail, icon }: { label: string; value: string; detail: string; icon: React.ReactNode }) {
  return <Card><CardContent className="pt-6"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-medium text-stone-500">{label}</p><p className="mt-1 text-2xl font-bold font-mono">{value}</p><p className="mt-1 text-xs text-stone-400">{detail}</p></div>{icon}</div></CardContent></Card>;
}
