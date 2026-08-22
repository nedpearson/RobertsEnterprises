import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertOctagon, Activity, Plus } from 'lucide-react';
import { useCallback } from 'react';
import { getIncidents } from '@/lib/platform/platformDataSource';
import { usePlatformData } from '@/lib/platform/usePlatformData';
import { PlatformDemoBanner, PlatformTableState } from '@/components/platform/PlatformStates';

import { supabase } from "@/lib/supabase";
export default function IncidentsView() {
  const { toast } = useToast();
  const { data: incidents, error, refetch } = usePlatformData(useCallback(() => getIncidents(), []));

  const handleResolve = async (id: string) => {
    if (!id) return;
    await supabase.from("platform_incidents").update({ status: "RESOLVED" }).eq("id", id);
    refetch();
  };

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
      <PlatformDemoBanner />
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
                <TableCell className="text-xs text-stone-500">{inc.started}</TableCell>
                <TableCell className="text-right">
  <Button variant="ghost" size="sm" className="text-xs mr-2" onClick={() => toast({ title: "Incident Details", description: "Incident details view is under construction." })}>View</Button>
  {inc.status !== "RESOLVED" && (
    <Button onClick={() => handleResolve((inc as any).full_id)} variant="outline" size="sm" className="text-xs text-emerald-600 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-700">Resolve</Button>
  )}
</TableCell>
              </TableRow>
            ))}
            {incidents.length === 0 && (
              <PlatformTableState
                colSpan={7}
                error={error}
                empty="No incidents on record."
                emptyHint="Declare one when a platform-wide issue starts, so impact and timeline are captured from minute zero."
              />
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
