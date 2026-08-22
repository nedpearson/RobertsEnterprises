import { useCallback, useState } from 'react';
import { CheckCircle2, Loader2, RotateCw, Search } from 'lucide-react';
import { toast } from 'sonner';
import { getFailedJobs } from '@/lib/platform/platformDataSource';
import { isIntegrationRecoverableJob, recoverFailedJob } from '@/lib/platform/platformJobRecoveryService';
import { usePlatformData } from '@/lib/platform/usePlatformData';
import { PlatformDemoBanner, PlatformTableState } from '@/components/platform/PlatformStates';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function FailedJobsView() {
  const { data: jobs, error, loading, refetch } = usePlatformData(useCallback(() => getFailedJobs(), []));
  const [recoveringId, setRecoveringId] = useState<string | null>(null);
  const [selected, setSelected] = useState<any | null>(null);
  const [search, setSearch] = useState('');

  const filtered = jobs.filter((job: any) => {
    const needle = search.trim().toLowerCase();
    return !needle || [job.org, job.type, job.status, job.lastError, job.correlationId]
      .some((value) => String(value || '').toLowerCase().includes(needle));
  });

  const handleRecovery = async (job: any) => {
    if (!isIntegrationRecoverableJob(job.type)) {
      toast.error('This job type does not have a safe executable recovery adapter. Inspect it and move it through engineering/manual review instead of simulating a retry.');
      return;
    }
    setRecoveringId(job.id);
    try {
      const result = await recoverFailedJob({ jobId: job.id, businessId: job.orgId || null, jobType: job.type });
      if (result.success) toast.success(result.message);
      else toast.error(result.message);
      refetch();
    } catch (err: any) {
      toast.error(err?.message || 'Failed-job recovery failed.');
    } finally {
      setRecoveringId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'FAILED': return <Badge variant="outline" className="border-rose-200 bg-rose-50 text-rose-600">Failed</Badge>;
      case 'RETRYING': return <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">Retrying</Badge>;
      case 'MANUAL_REVIEW': return <Badge variant="outline" className="border-purple-200 bg-purple-50 text-purple-700">Manual Review</Badge>;
      case 'PROCESSING': return <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">Processing</Badge>;
      case 'RECOVERED': return <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">Recovered</Badge>;
      case 'CANCELLED': return <Badge variant="outline">Cancelled</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <PlatformDemoBanner />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-serif text-stone-800">Failed Job Center</h2>
          <p className="text-sm text-stone-500">Recover provider-backed failures through the real integration recovery engine; unsupported jobs are never given a fake retry.</p>
        </div>
        <div className="relative"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-stone-400" /><Input className="w-72 pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search jobs, orgs, errors..." /></div>
      </div>

      {error && <Card className="border-red-200 bg-red-50"><CardContent className="flex items-center justify-between gap-4 p-4"><p className="text-sm text-red-800">Failed-job data could not be loaded: {error}</p><Button variant="outline" size="sm" onClick={refetch}>Retry Load</Button></CardContent></Card>}

      <Card className="shadow-xs border-stone-200/60">
        <Table>
          <TableHeader><TableRow><TableHead>Organization</TableHead><TableHead>Job Type</TableHead><TableHead>Status</TableHead><TableHead>Attempts</TableHead><TableHead>Last Error</TableHead><TableHead>Next Retry</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
          <TableBody>
            {loading && jobs.length === 0 ? <TableRow><TableCell colSpan={7} className="py-12 text-center"><Loader2 className="mx-auto h-7 w-7 animate-spin text-stone-400" /></TableCell></TableRow> : filtered.map((job: any) => {
              const recoverable = isIntegrationRecoverableJob(job.type);
              const recovering = recoveringId === job.id;
              return (
                <TableRow key={job.id}>
                  <TableCell className="text-xs font-medium">{job.org}</TableCell>
                  <TableCell className="text-xs">{job.type}</TableCell>
                  <TableCell>{getStatusBadge(job.status)}</TableCell>
                  <TableCell className="text-xs">{job.attempts}</TableCell>
                  <TableCell className="max-w-[260px] truncate text-xs text-stone-500" title={job.lastError}>{job.lastError}</TableCell>
                  <TableCell className="text-xs text-stone-500">{job.nextRetry}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2"><Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setSelected(job)}>Inspect</Button>{!['RECOVERED', 'CANCELLED'].includes(job.status) && <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => void handleRecovery(job)} disabled={!recoverable || recovering || ['RETRYING', 'PROCESSING'].includes(job.status)} title={recoverable ? 'Run provider recovery and reconciliation' : 'No safe automated recovery adapter for this job type'}>{recovering ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <RotateCw className="mr-1 h-3 w-3" />}{recoverable ? 'Recover Now' : 'Manual Review'}</Button>}</div>
                  </TableCell>
                </TableRow>
              );
            })}
            {!loading && filtered.length === 0 && <PlatformTableState colSpan={7} error={error} empty="No failed jobs match the current view." emptyHint="Recovered jobs remain auditable; active failures will appear here when recorded." />}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader><DialogTitle>{selected?.type || 'Failed Job'}</DialogTitle><DialogDescription>{selected?.org} · Correlation {selected?.correlationId}</DialogDescription></DialogHeader>
          {selected && <div className="space-y-4"><div className="flex items-center gap-2">{getStatusBadge(selected.status)}{isIntegrationRecoverableJob(selected.type) ? <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700"><CheckCircle2 className="mr-1 h-3 w-3" />Auto-recovery adapter available</Badge> : <Badge variant="outline">Manual engineering review</Badge>}</div><div className="rounded-lg border bg-stone-50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-stone-400">Last Error</p><p className="mt-1 whitespace-pre-wrap text-sm text-stone-800">{selected.lastError || 'No error detail recorded.'}</p></div><dl className="grid grid-cols-2 gap-4 text-sm"><Detail label="Job ID" value={selected.id} /><Detail label="Organization ID" value={selected.orgId || '—'} /><Detail label="Attempts" value={String(selected.attempts)} /><Detail label="Next Retry" value={selected.nextRetry || '—'} /></dl></div>}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs uppercase tracking-wide text-stone-400">{label}</dt><dd className="mt-1 break-all text-stone-800">{value}</dd></div>;
}
