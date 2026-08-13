import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertOctagon, Activity, Plus } from 'lucide-react';
import { useState } from 'react';

const MOCK_INCIDENTS = [
  { id: 'INC-001', severity: 'SEV-2', status: 'OPEN', title: 'Shopify Webhook Delivery Failures', affected: '3 Organizations', started: '2026-08-12T09:30:00Z', updated: '2026-08-12T10:15:00Z' },
  { id: 'INC-002', severity: 'SEV-3', status: 'INVESTIGATING', title: 'Elevated API Latency on /bookings', affected: 'Global', started: '2026-08-12T08:00:00Z', updated: '2026-08-12T08:45:00Z' },
  { id: 'INC-003', severity: 'SEV-1', status: 'RESOLVED', title: 'Database Connection Pool Exhaustion', affected: 'Global', started: '2026-08-10T14:00:00Z', updated: '2026-08-10T15:30:00Z' },
];

export default function IncidentsView() {
  const [incidents, setIncidents] = useState(MOCK_INCIDENTS);

  const getSeverityBadge = (sev: string) => {
    switch(sev) {
      case 'SEV-1': return <Badge variant="outline" className="bg-rose-100 text-rose-800 border-rose-300 font-bold">{sev}</Badge>;
      case 'SEV-2': return <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300 font-semibold">{sev}</Badge>;
      case 'SEV-3': return <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">{sev}</Badge>;
      default: return <Badge variant="outline">{sev}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'OPEN': return <Badge variant="outline" className="bg-rose-50 text-rose-600 border-rose-200">Open</Badge>;
      case 'INVESTIGATING': return <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200">Investigating</Badge>;
      case 'MONITORING': return <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">Monitoring</Badge>;
      case 'RESOLVED': return <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200">Resolved</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-serif text-stone-800">Incident Management</h2>
          <p className="text-sm text-stone-500">Track and resolve platform-wide operational incidents.</p>
        </div>
        <Button className="bg-stone-900 text-white">
          <Plus className="w-4 h-4 mr-2" /> Declare Incident
        </Button>
      </div>

      <Card className="shadow-xs border-stone-200/60">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Incident ID</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Title / Description</TableHead>
              <TableHead>Customer Impact</TableHead>
              <TableHead>Started</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {incidents.map((inc) => (
              <TableRow key={inc.id}>
                <TableCell className="font-mono text-xs text-stone-500">{inc.id}</TableCell>
                <TableCell>{getSeverityBadge(inc.severity)}</TableCell>
                <TableCell>{getStatusBadge(inc.status)}</TableCell>
                <TableCell className="text-sm font-medium">{inc.title}</TableCell>
                <TableCell className="text-xs text-stone-500">{inc.affected}</TableCell>
                <TableCell className="text-xs text-stone-500">{new Date(inc.started).toLocaleString()}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" className="text-xs">
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
