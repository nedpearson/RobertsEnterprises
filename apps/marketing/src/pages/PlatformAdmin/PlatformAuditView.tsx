import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Shield, Settings, User } from 'lucide-react';
import { useState } from 'react';

const MOCK_AUDIT_LOGS = [
  { id: 'log-1', actor: 'nedpearson@gmail.com', role: 'PLATFORM_OWNER', action: 'Modified System Status', target: 'Shopify Sync', reason: 'Marked as Degraded due to API limits', timestamp: '2026-08-12T11:45:00Z' },
  { id: 'log-2', actor: 'System', role: 'AUTOMATION', action: 'Failed Job Trigger', target: 'Email Delivery Queue', reason: 'Timeout on provider', timestamp: '2026-08-12T10:15:00Z' },
  { id: 'log-3', actor: 'nedpearson@gmail.com', role: 'PLATFORM_OWNER', action: 'Entered Support Mode', target: 'Magnolia Bridal', reason: 'Assisting with Data Migration', timestamp: '2026-08-11T16:30:00Z' },
];

export default function PlatformAuditView() {
  const [logs] = useState(MOCK_AUDIT_LOGS);

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
              <TableHead>Role</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Timestamp</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="font-medium text-xs flex items-center gap-2">
                  {log.actor === 'System' ? <Settings className="w-3.5 h-3.5 text-stone-400" /> : <User className="w-3.5 h-3.5 text-brand-primary" />}
                  {log.actor}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-[10px]">{log.role}</Badge>
                </TableCell>
                <TableCell className="text-xs">{log.action}</TableCell>
                <TableCell className="text-xs font-medium text-stone-700">{log.target}</TableCell>
                <TableCell className="text-xs text-stone-500">{log.reason}</TableCell>
                <TableCell className="text-xs text-stone-400">{new Date(log.timestamp).toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
