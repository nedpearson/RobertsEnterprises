import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RotateCw, CheckCircle2 } from 'lucide-react';
import { useCallback, useState } from 'react';
import { getFailedJobs } from '@/lib/platform/platformDataSource';
import { usePlatformData } from '@/lib/platform/usePlatformData';
import { PlatformDemoBanner, PlatformTableState } from '@/components/platform/PlatformStates';

export default function FailedJobsView() {
  const { data: loaded, error } = usePlatformData(useCallback(() => getFailedJobs(), []));
  // Local optimistic overlay for retries. Retry is presentational until the
  // control-plane job API exists — it must not claim a queue write it cannot make.
  const [overrides, setOverrides] = useState<Record<string, { status: string; attempts: number }>>({});
  const jobs = loaded.map((j) => (overrides[j.id] ? { ...j, ...overrides[j.id] } : j));

  const handleRetry = (id: string) => {
    const job = jobs.find((j) => j.id === id);
    if (!job) return;
    setOverrides((prev) => ({ ...prev, [id]: { status: 'PROCESSING', attempts: job.attempts + 1 } }));
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'FAILED': return <Badge variant="outline" className="bg-rose-50 text-rose-600 border-rose-200">Failed</Badge>;
      case 'RETRYING': return <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200">Retrying</Badge>;
      case 'MANUAL_REVIEW': return <Badge variant="outline" className="bg-purple-50 text-purple-600 border-purple-200">Manual Review</Badge>;
      case 'PROCESSING': return <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">Processing</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
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
            {jobs.map((job) => (
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
                    disabled={job.status === 'PROCESSING'}
                  >
                    <RotateCw className="w-3 h-3 mr-1" />
                    Retry Now
                  </Button>
                </TableCell>
              </TableRow>
            ))}
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
