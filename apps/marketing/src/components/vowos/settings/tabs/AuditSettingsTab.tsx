import { useEffect, useState } from 'react';
import { History, Loader2, Search } from 'lucide-react';
import { SettingsCard } from '../components/SettingsCard';
import { supabase } from '@/lib/supabase';

interface AuditLogEntry {
  actor: string;
  action: string;
  tab: string;
  reason: string;
  timestamp: string;
}

interface AuditSettingsTabProps {
  onDirtyChange: (dirty: boolean) => void;
  registerSaveRef: (saveFn: () => Promise<boolean>) => void;
  resetTrigger: number;
}

const DEFAULT_AUDIT_LOGS: AuditLogEntry[] = [
  { actor: 'nedpearson@gmail.com', action: 'Changed card surcharge Amex fee', tab: 'payments', reason: 'Offset elevated Amex transaction card rates.', timestamp: '2026-07-20T17:15:00Z' },
  { actor: 'nedpearson@gmail.com', action: 'Modified Baton Rouge holiday exceptions', tab: 'locations', reason: 'Extended closed holiday schedule for Christmas.', timestamp: '2026-07-20T17:12:00Z' },
  { actor: 'nedpearson@gmail.com', action: 'Connected Stripe account', tab: 'payments', reason: 'Initialized live Stripe connection.', timestamp: '2026-07-20T17:10:00Z' },
];

export function AuditSettingsTab({
  onDirtyChange,
  registerSaveRef,
  resetTrigger,
}: AuditSettingsTabProps) {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [filter, setFilter] = useState('');
  const [errorState, setErrorState] = useState<string | null>(null);

  useEffect(() => {
    onDirtyChange(false);
    registerSaveRef(async () => true);
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    setErrorState(null);
    try {
      const { data, error } = await supabase
        .from('settings_versions')
        .select('change_reason, changed_at, changed_by, settings_values(setting_namespace)')
        .order('changed_at', { ascending: false })
        .limit(50);

      if (error) {
        throw error;
      }

      if (data && data.length > 0) {
        const realLogs = data.map((d: any) => ({
          actor: d.changed_by ? `User ${d.changed_by.slice(0,8)}` : 'System',
          action: `Modified ${d.settings_values?.setting_namespace || 'settings'}`,
          tab: d.settings_values?.setting_namespace || 'unknown',
          reason: d.change_reason || 'System update',
          timestamp: d.changed_at,
        }));
        setLogs(realLogs);
      } else {
        setLogs([]);
      }
    } catch (err: any) {
      console.error('Failed to load audit logs:', err);
      setErrorState(err.message || "Failed to load audit logs from the database.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [resetTrigger]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-10 text-sm text-stone-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading audit history…
      </div>
    );
  }

  if (errorState) {
    return (
      <div className="flex items-center gap-2 py-10 text-sm text-red-500 font-medium">
        Could not load these settings: {errorState}
      </div>
    );
  }

  const filteredLogs = logs.filter(
    (log) =>
      log.actor.toLowerCase().includes(filter.toLowerCase()) ||
      log.action.toLowerCase().includes(filter.toLowerCase()) ||
      log.reason.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <SettingsCard
        title="Immutable Audit Logs"
        description="View records of all administrative actions, settings changes, and security events. Audit logs are append-only."
        icon={<History className="h-5 w-5" />}
      >
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Filter audit logs by actor, action or reason..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full rounded-lg border border-stone-200 bg-white py-2 pl-9 pr-4 text-sm outline-none focus:border-stone-900 transition-colors"
            />
          </div>

          <div className="rounded-xl border border-stone-200 overflow-hidden bg-white">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 font-bold uppercase tracking-wider">
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Actor</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">Reason / Scope</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredLogs.map((log, idx) => (
                  <tr key={idx} className="hover:bg-stone-50/50">
                    <td className="p-3 text-stone-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="p-3 font-semibold text-stone-700 whitespace-nowrap">
                      {log.actor}
                    </td>
                    <td className="p-3 text-stone-600 font-medium">
                      <span className="rounded bg-brand-soft text-brand-primary px-1.5 py-0.5 text-[10px] font-semibold uppercase mr-2">
                        {log.tab}
                      </span>
                      {log.action}
                    </td>
                    <td className="p-3 text-stone-500 leading-normal italic">
                      "{log.reason}"
                    </td>
                  </tr>
                ))}
                {filteredLogs.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-stone-400 italic">
                      No matching audit logs found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </SettingsCard>
    </div>
  );
}
