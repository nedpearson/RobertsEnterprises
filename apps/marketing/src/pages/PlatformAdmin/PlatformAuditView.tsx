import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, RefreshCw, Search, User } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface SystemEventRow {
  id: string;
  event_type: string;
  organization_id: string | null;
  actor_id: string | null;
  severity: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
  businesses?: { name?: string | null } | null;
}

export default function PlatformAuditView() {
  const [logs, setLogs] = useState<SystemEventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: queryError } = await supabase
        .from('system_events')
        .select('id,event_type,organization_id,actor_id,severity,payload,created_at,businesses:organization_id(name)')
        .order('created_at', { ascending: false })
        .limit(250);
      if (queryError) throw queryError;
      setLogs((data || []) as unknown as SystemEventRow[]);
    } catch (err: any) {
      setLogs([]);
      setError(err?.message || 'Failed to load platform audit events.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return logs;
    return logs.filter((log) => [log.event_type, log.businesses?.name, log.organization_id, log.actor_id, log.severity, JSON.stringify(log.payload || {})]
      .some((value) => String(value || '').toLowerCase().includes(needle)));
  }, [logs, search]);

  const severityClass = (severity?: string | null) => {
    const normalized = String(severity || 'INFO').toUpperCase();
    if (normalized === 'CRITICAL' || normalized === 'ERROR') return 'border-red-200 bg-red-50 text-red-700';
    if (normalized === 'WARNING' || normalized === 'WARN') return 'border-amber-200 bg-amber-50 text-amber-700';
    return 'border-stone-200 bg-stone-50 text-stone-600';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><h2 className="text-xl font-serif text-stone-800">Platform Audit Log</h2><p className="text-sm text-stone-500">Immutable domain and administrative events recorded by the control plane.</p></div>
        <div className="flex gap-2"><div className="relative"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-stone-400" /><Input className="w-72 pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search events, organizations, actors..." /></div><Button variant="outline" size="icon" onClick={() => void load()} disabled={loading} aria-label="Refresh audit log"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></Button></div>
      </div>

      {error && <Card className="border-red-200 bg-red-50"><CardContent className="flex items-center justify-between gap-4 p-4"><p className="text-sm text-red-800">Audit events could not be loaded: {error}</p><Button variant="outline" size="sm" onClick={() => void load()}>Retry</Button></CardContent></Card>}

      <Card className="shadow-xs border-stone-200/60">
        <Table>
          <TableHeader><TableRow><TableHead>Actor</TableHead><TableHead>Event</TableHead><TableHead>Organization</TableHead><TableHead>Severity</TableHead><TableHead>Payload</TableHead><TableHead>Timestamp</TableHead></TableRow></TableHeader>
          <TableBody>
            {loading && logs.length === 0 ? <TableRow><TableCell colSpan={6} className="py-12 text-center"><Loader2 className="mx-auto h-7 w-7 animate-spin text-stone-400" /></TableCell></TableRow> : !error && filtered.length === 0 ? <TableRow><TableCell colSpan={6} className="py-12 text-center text-stone-500">No audit events match the current search.</TableCell></TableRow> : filtered.map((log) => (
              <TableRow key={log.id}>
                <TableCell><div className="flex items-center gap-2 text-xs font-medium"><User className="h-3.5 w-3.5 text-brand-primary" />{log.actor_id ? log.actor_id.substring(0, 8) : 'System'}</div></TableCell>
                <TableCell><Badge variant="outline" className="text-[10px]">{log.event_type}</Badge></TableCell>
                <TableCell className="text-xs"><div>{log.businesses?.name || 'Platform'}</div>{log.organization_id && <div className="font-mono text-[10px] text-stone-400">{log.organization_id.substring(0, 8)}</div>}</TableCell>
                <TableCell><Badge variant="outline" className={`text-[10px] ${severityClass(log.severity)}`}>{log.severity || 'INFO'}</Badge></TableCell>
                <TableCell className="max-w-[420px]"><pre className="max-h-24 overflow-auto whitespace-pre-wrap break-words text-[10px] text-stone-500">{JSON.stringify(log.payload || {}, null, 2)}</pre></TableCell>
                <TableCell className="whitespace-nowrap text-xs text-stone-400">{new Date(log.created_at).toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
