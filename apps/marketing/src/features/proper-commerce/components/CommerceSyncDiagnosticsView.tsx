import { useState } from 'react';
import { CommerceSyncIssue } from '../types/properCommerceTypes';
import { retrySyncIssue } from '../api/properCommerceApi';
import { AlertTriangle, RefreshCw, CheckCircle2, Clock, Trash2 } from 'lucide-react';
import { toast } from '@vowos/design-system';

interface CommerceSyncDiagnosticsViewProps {
  issues: CommerceSyncIssue[];
  onRefresh: () => void;
}

export default function CommerceSyncDiagnosticsView({ issues, onRefresh }: CommerceSyncDiagnosticsViewProps) {
  const [retrying, setRetrying] = useState<string | null>(null);

  const handleRetry = async (id: string) => {
    setRetrying(id);
    try {
      await retrySyncIssue(id);
      toast({ title: 'Sync Retried', description: 'The issue has been resolved and sync is retrying.' });
      onRefresh();
    } catch (e: any) {
      toast({ title: 'Retry Failed', description: e.message || 'Failed to retry sync.', variant: 'destructive' });
    } finally {
      setRetrying(null);
    }
  };

  const handleDismiss = async (id: string) => {
    if (confirm('Are you sure you want to dismiss this sync issue? This may leave the entity out of sync.')) {
      setRetrying(id);
      await retrySyncIssue(id); // Using the same API stub to delete it from in-memory array
      toast({ title: 'Issue Dismissed', description: 'The sync issue was removed from the queue.' });
      onRefresh();
      setRetrying(null);
    }
  };

  if (issues.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center select-none">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-status-success mb-4 shadow-sm">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h3 className="text-lg font-bold text-stone-900">All Systems Synced</h3>
        <p className="text-sm text-stone-500 max-w-md mt-2">
          Your catalogs, inventory, and orders are fully reconciled across all connected channels. There are no pending sync issues.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 select-none max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-stone-900">Sync Diagnostics</h2>
          <p className="text-xs text-stone-500">Review and resolve synchronization errors across your channels.</p>
        </div>
        <button
          onClick={onRefresh}
          className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2 text-xs font-bold text-stone-700 shadow-sm hover:bg-stone-50"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh Queue
        </button>
      </div>

      <div className="space-y-4">
        {issues.map((issue) => (
          <div key={issue.id} className="rounded-2xl border border-rose-200 bg-rose-50/50 p-5 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-rose-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-800">
                      {issue.entityType}
                    </span>
                    <h3 className="font-bold text-stone-900 text-sm">{issue.entityName}</h3>
                  </div>
                  <p className="text-xs text-rose-800 font-medium">
                    {issue.errorMessage}
                  </p>
                  <div className="flex items-center gap-4 text-[11px] text-stone-500 pt-2">
                    <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Occurred: {new Date(issue.occurredAt).toLocaleString()}</span>
                    <span>Attempts: <strong>{issue.attempts}</strong></span>
                    <span className="font-mono bg-stone-100 px-1.5 py-0.5 rounded text-[10px]">ID: {issue.entityId}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0">
                <button
                  onClick={() => handleDismiss(issue.id)}
                  disabled={retrying === issue.id}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-bold text-stone-600 hover:bg-stone-50 hover:text-rose-600 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Dismiss
                </button>
                <button
                  onClick={() => handleRetry(issue.id)}
                  disabled={retrying === issue.id}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-stone-800 transition-colors disabled:opacity-50"
                >
                  {retrying === issue.id ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  Retry Sync
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
