import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RotateCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { useCallback, useState } from 'react';
import { getFailedJobs, retryJob } from '@/lib/platform/platformDataSource';
import { usePlatformData } from '@/lib/platform/usePlatformData';
import { PlatformDemoBanner, PlatformTableState } from '@/components/platform/PlatformStates';
import { useToast } from '@/components/ui/use-toast';

export default function FailedJobsView() {
  const { toast } = useToast();
  const { data: loaded, error, refetch } = usePlatformData(useCallback(() => getFailedJobs(), []));
  const [retryingIds, setRetryingIds] = useState<Record<string, boolean>>({});
  const [optimisticOverrides, setOptimisticOverrides] = useState<Record<string, { status: string; attempts: number }>>({});

  const jobs = loaded.map((j) => (optimisticOverrides[j.id] ? { ...j, ...optimisticOverrides[j.id] } : j));

  const handleRetry = async (id: string) => {
    const job = jobs.find((j) => j.id === id);
    if (!job || retryingIds[id]) return;

    setRetryingIds((prev) => ({ ...prev, [id]: true }));
    setOptimisticOverrides((prev) => ({
      ...prev,
      [id]: { status: 'PROCESSING', attempts: job.attempts + 1 },
    }));

    try {
      const res = await retryJob(id);
      if (res.success) {
        toast({
          title: 'Job Re-enqueued',
          description: res.message || `Job ${id} re-enqueued for processing.`,
        });
        await refetch();
      } else {
        toast({
          title: 'Retry Failed',
          description: res.message || 'Failed to re-enqueue background job.',
          variant: 'destructive',
        });
        // Revert optimistic override on failure
        setOptimisticOverrides((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }
    } catch (err: any) {
      toast({
        title: 'Retry Error',
        description: err.message || 'An unexpected network error occurred.',
        variant: 'destructive',
      });
      setOptimisticOverrides((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } finally {
      setRetryingIds((prev) => ({ ...prev, [id]: false }));
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'FAILED':
        return <Badge variant="outline" className="bg-rose-50 text-rose-600 border-rose-200">Failed</Badge>;
      case 'RETRYING':
        return <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200">Retrying</Badge>;
      case 'MANUAL_REVIEW':
        return <Badge variant="outline" className="bg-purple-50 text-purple-600 border-purple-200">Manual Review</Badge>;
      case 'PROCESSING':
        return <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">Processing</Badge>;
      case 'COMPLETED':
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <PlatformDemoBanner />
      <div>
        <h2 className="text-xl font-serif text-stone-800">Failed Job Center</h2>
        <p className="text-sm text-stone-500">Canonical monitoring for background jobs, retries, and dead-letter queues.</p>
      </div>

      <Card className="shadow-xs border-stone-200/60">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Organization</TableHead>
              <TableHead>Job Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Attempts</TableHead>
              <TableHead>Last Error</TableHead>
              <TableHead>Next Retry</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.map((job) => {
              const isRetrying = Boolean(retryingIds[job.id]);
              return (
                <TableRow key={job.id}>
                  <TableCell className="font-medium text-xs">{job.org}</TableCell>
                  <TableCell className="text-xs">{job.type}</TableCell>
                  <TableCell>{getStatusBadge(job.status)}</TableCell>
                  <TableCell className="text-xs">{job.attempts}</TableCell>
                  <TableCell className="text-xs text-stone-500 max-w-[200px] truncate" title={job.lastError}>
                    {job.lastError}
                  </TableCell>
                  <TableCell className="text-xs text-stone-500">{job.nextRetry}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => handleRetry(job.id)}
                      disabled={job.status === 'PROCESSING' || isRetrying}
                    >
                      <RotateCw className={`w-3 h-3 mr-1 ${isRetrying ? 'animate-spin' : ''}`} />
                      {isRetrying ? 'Retrying...' : 'Retry Now'}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {jobs.length === 0 && (
              <PlatformTableState
                colSpan={7}
                error={error}
                empty="No failed jobs."
                emptyHint="Every background job in the last 24 hours completed on its first attempt."
              />
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
