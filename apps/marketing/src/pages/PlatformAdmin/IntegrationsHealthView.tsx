import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ShoppingBag, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';

export default function IntegrationsHealthView() {
  const [integrations] = useState<any[]>([]);

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'HEALTHY': return <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200">Healthy</Badge>;
      case 'ACTION REQUIRED': return <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200">Action Required</Badge>;
      case 'UNKNOWN': return <Badge variant="outline" className="bg-stone-50 text-stone-600 border-stone-200">Unknown</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-xl font-serif text-stone-800">Integrations Health</h2>
        <p className="text-sm text-stone-500">Monitor external provider connections across all organizations.</p>
      </div>

      <Card className="shadow-xs border-stone-200/60">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Organization</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Sync</TableHead>
              <TableHead>Sync Errors (24h)</TableHead>
              <TableHead>Details</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {MOCK_INTEGRATIONS.map((int) => (
              <TableRow key={int.id}>
                <TableCell className="font-medium text-xs">{int.org}</TableCell>
                <TableCell className="text-xs flex items-center gap-2">
                  <ShoppingBag className="w-3.5 h-3.5 text-stone-400" />
                  {int.provider}
                </TableCell>
                <TableCell>{getStatusBadge(int.status)}</TableCell>
                <TableCell className="text-xs text-stone-500">{int.lastSync !== 'N/A' ? new Date(int.lastSync).toLocaleString() : 'N/A'}</TableCell>
                <TableCell className="text-xs text-stone-500">{int.errors}</TableCell>
                <TableCell className="text-xs text-stone-500 max-w-[200px] truncate" title={int.details}>
                  {int.details}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" className="text-xs">
                    Inspect
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
