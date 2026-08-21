import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Shield, Settings, User } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function PlatformAuditView() {
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    supabase.from('system_events')
      .select('*, businesses(name)')
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (data) setLogs(data);
      });
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-xl font-serif text-stone-800">Platform Audit Log</h2>
        <p className="text-sm text-stone-500">Immutable record of platform-level administrative actions.</p>
      </div>

      <Card className="shadow-xs border-stone-200/60">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Actor</TableHead>
              <TableHead>Event Type</TableHead>
              <TableHead>Target Entity</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Details</TableHead>
              <TableHead>Timestamp</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="font-medium text-xs flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-brand-primary" />
                  {log.actor_type}: {log.actor_id?.substring(0,8) || 'System'}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-[10px]">{log.event_type}</Badge>
                </TableCell>
                <TableCell className="text-xs">{log.entity_type} {log.entity_id ? `(${log.entity_id.substring(0,8)})` : ''}</TableCell>
                <TableCell className="text-xs font-medium text-stone-700">{log.status}</TableCell>
                <TableCell className="text-xs text-stone-500">{log.details ? JSON.stringify(log.details) : ''}</TableCell>
                <TableCell className="text-xs text-stone-400">{new Date(log.created_at).toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
